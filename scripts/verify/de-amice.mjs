// Germany: AMIce, the public drug information system of the regulators BfArM and PEI.
// https://portal.bfarm.de/amguifree/
//
// There is no download or API, only a search form behind an anonymous sign-in and a terms page. One search
// can combine an ATC code, a product name and a legal class (Verkaufsabgrenzung), and answers with the
// number of marketable human medicines plus up to 100 of their names. So for each medicine we ask once per
// legal class and read brands off the returned names.
//
// Searches take 6 to 9 seconds each, so they run in four sessions side by side (the site allows 200) and
// every answer is cached for a day.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, aggregateStatus, brandMatches, leadingNames, loadDrugs } from './lib.mjs';

const BASE = 'https://portal.bfarm.de/amguifree';
const DIR = path.join(ROOT, 'node_modules/.cache/rxabroad-verify/de');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const UA = 'rxabroad-verify (+https://rxabroad.vercel.app)';
const SESSIONS = 4;
const PAGE_SIZE = 100; // the most the site will list per page
const TIMEOUT_MS = 120_000;

export const registry = { code: 'DE', name: 'AMIce drug information system (BfArM, Germany)' };
export const cannotDetect = [];

// Verkaufsabgrenzung, as numbered in the search form.
const FREE = '1'; // freiverkäuflich: may be sold outside pharmacies
const PHARMACY = '2'; // apothekenpflichtig: pharmacy-only, no prescription
const RX = '3'; // verschreibungspflichtig
const NARCOTIC = '4'; // betäubungsmittelrezeptpflichtig
const CLASS_NAME = { [FREE]: 'free sale', [PHARMACY]: 'pharmacy-only', [RX]: 'prescription', [NARCOTIC]: 'narcotic prescription' };

// The substance name to search when AMIce files nothing under the ATC code in drugs.json.
const DE_SUBSTANCE = {
  dimenhydrinate: 'Dimenhydrinat', // filed under A04AB02 and R06AA52
  amphetamine: 'Dexamfetamin', // Germany markets dexamfetamine (N06BA02), not mixed amphetamine salts
  'antibiotic-ointment': 'Tyrothricin', // the local wound ointment uses tyrothricin, not bacitracin
  'polyethylene-glycol': 'Macrogol', // mostly combinations with electrolytes (A06AD65)
  pseudoephedrine: 'Pseudoephedrin', // only in combination cold remedies (R01BA52)
};

const F_ATC = 'MPD_ATC.ATC_TERM_CODE';
const F_NAME = 'MPD_NAME';
const F_SUBSTANCE = 'PPT.INT.SUBST.STF';

const unhtml = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&reg;/g, '®').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const plain = (html) => unhtml(html.replace(/<script.*?<\/script>|<style.*?<\/style>/gs, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** The value of a form field, whatever order and case its attributes come in. */
function field(html, name) {
  const tag = html.match(new RegExp(`<input[^>]*name="${name.replace(/[.:]/g, '\\$&')}"[^>]*>`, 'i'))?.[0];
  const value = tag?.match(/value="([^"]*)"/i)?.[1];
  return value === undefined ? null : unhtml(value);
}

/** One signed-in browser session: its own cookies, terms accepted, 100 results per page. */
class Session {
  jar = new Map(); // host → Map(cookie name → value)
  ready = false;

  async request(url, form) {
    let method = form ? 'POST' : 'GET';
    let body = form ? new URLSearchParams(form).toString() : undefined;
    for (let hop = 0; hop < 10; hop++) {
      const { host } = new URL(url);
      const cookies = [...(this.jar.get(host) ?? [])].map(([k, v]) => `${k}=${v}`).join('; ');
      const res = await fetch(url, {
        method, body, redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'User-Agent': UA, ...(cookies && { Cookie: cookies }), ...(body && { 'Content-Type': 'application/x-www-form-urlencoded' }) },
      });
      for (const c of res.headers.getSetCookie()) {
        const [, k, v] = c.match(/^([^=]+)=([^;]*)/) ?? [];
        if (k) this.jar.set(host, (this.jar.get(host) ?? new Map()).set(k, v));
      }
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        url = new URL(res.headers.get('location'), url).href;
        method = 'GET';
        body = undefined;
        continue;
      }
      if (!res.ok) throw new Error(`${url} answered ${res.status}`);
      // The portal's pages are Latin-1 whatever their header says.
      return new TextDecoder('latin1').decode(await res.arrayBuffer());
    }
    throw new Error(`${url}: too many redirects`);
  }

  async signIn() {
    this.jar.clear();
    // The portal hands a sign-in request to auth.bfarm.de, which answers for an anonymous user straight away.
    const ask = await this.request(`${BASE}/`);
    const idp = ask.match(/<form[^>]*action="([^"]+)"/i)?.[1];
    const samlRequest = field(ask, 'SAMLRequest');
    if (!idp || !samlRequest) throw new Error('AMIce no longer starts with its anonymous sign-in');
    const relay = field(ask, 'RelayState');
    const answer = await this.request(unhtml(idp), { SAMLRequest: samlRequest, ...(relay && { RelayState: relay }) });
    const samlResponse = field(answer, 'SAMLResponse');
    if (!samlResponse) throw new Error('AMIce anonymous sign-in did not complete');
    const relayBack = field(answer, 'RelayState');
    await this.request(`${BASE}/saml`, { SAMLResponse: samlResponse, ...(relayBack && { RelayState: relayBack }) });
    await this.request(`${BASE}/termsofuse.xhtml?accept=true`);

    const p = 'userSettingsForm:userPreferencesComponent:';
    const settings = await this.request(`${BASE}/usersettings.xhtml`);
    await this.request(`${BASE}/usersettings.xhtml`, {
      userSettingsForm: 'userSettingsForm', [`${p}titleLength`]: String(PAGE_SIZE), [`${p}timeout`]: '99', [`${p}automask`]: 'CBI_ON',
      [`${p}submitButton`]: 'speichern', 'jakarta.faces.ViewState': field(settings, 'jakarta.faces.ViewState'),
    });
    this.ready = true;
  }

  /** Marketable human medicines matching every [field, term] pair, within one legal class. */
  async search(terms, sale) {
    if (!this.ready) await this.signIn();
    const page = await this.request(`${BASE}/am/search.xhtml`);
    const state = field(page, 'jakarta.faces.ViewState');
    if (!state || !page.includes('searchForm')) throw new Error('AMIce search form not shown');

    const p = 'searchForm:searchInputsComponent:';
    const f = `${p}searchFilterComponent:`;
    const form = {
      searchForm: 'searchForm',
      [`${p}searchRows:0:searchTerm`]: terms[0][1], [`${p}searchRows:0:searchField`]: terms[0][0],
      [`${p}searchRows:1:operatorSelection`]: 'AND', [`${p}searchRows:1:firstSearchTerm`]: terms[1]?.[1] ?? '', [`${p}searchRows:1:searchField`]: terms[1]?.[0] ?? F_NAME,
      [`${f}beginnzulassung`]: '', [`${f}endezulassung`]: '',
      [`${f}verkehrsfaehige:verkehrsfaehige`]: 'AND', [`${f}humanarzneimittel:humanarzneimittel`]: 'MENSCH',
      [`${f}parallelimporte:parallelimporte`]: '', [`${f}verkaufsabgrenzungen:verkaufsabgrenzungen`]: sale,
      [`${f}homoeopathika:homoeopathika`]: '',
      // A substance search would otherwise also find it as an inactive ingredient (macrogol coats thousands of tablets).
      [`${f}stofftypoff:stofftypoff`]: terms[0][0] === F_SUBSTANCE ? 'A' : '',
      [`${p}suchestarten`]: 'Suche starten', 'jakarta.faces.ViewState': state,
    };
    for (const i of [2, 3, 4]) {
      form[`${p}expandedSearchRows:${i}:operatorSelection`] = 'AND';
      form[`${p}expandedSearchRows:${i}:searchTerm`] = '';
      form[`${p}expandedSearchRows:${i}:searchField`] = F_NAME;
    }
    let result = await this.request(`${BASE}/am/search.xhtml`, form);
    // Above 400 hits the site first asks whether to sort them.
    if (result.includes('sortAlertForm')) {
      result = await this.request(`${BASE}/am/searchresult.xhtml`, {
        sortAlertForm: 'sortAlertForm', 'sortAlertForm:showUnsortedResultButton': 'unsortiert ausgeben',
        'jakarta.faces.ViewState': field(result, 'jakarta.faces.ViewState'),
      });
    }

    const text = plain(result);
    if (/keine mit Ihrer Suchanfrage übereinstimmenden Dokumente/.test(text)) return { count: 0, rows: [] };
    const count = text.match(/Gefundene Dokumente:\s*(\d+)/)?.[1];
    if (count === undefined) throw new Error(`AMIce result page not recognised: ${text.slice(text.indexOf('Suchformulierung')).slice(0, 300)}`);
    // Columns: no., name, form, authorisation holder, Eingangsnummer, authorisation number, version.
    const rows = [...result.matchAll(/<tr[^>]*>(.*?)<\/tr>/gs)]
      .map(([, tr]) => [...tr.matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map(([, td]) => plain(td)))
      .filter((c) => c.length >= 6 && /^\d+\.$/.test(c[0]))
      .map((c) => ({ name: c[1], form: c[2], holder: c[3], enr: c[4], znr: c[5] }));
    return { count: Number(count), rows };
  }
}

const useCache = !process.argv.includes('--no-cache');
const keyOf = (terms, sale) => `${terms.map((t) => t.join('=')).join('&')}|${sale}${terms[0][0] === F_SUBSTANCE ? '|active' : ''}`;
const fileOf = (key) => path.join(DIR, `${crypto.createHash('sha1').update(key).digest('hex')}.json`);
const answers = new Map(); // key → { count, rows }

function cached(key) {
  if (answers.has(key)) return answers.get(key);
  const file = fileOf(key);
  if (!useCache || !fs.existsSync(file) || Date.now() - fs.statSync(file).mtimeMs >= CACHE_TTL_MS) return null;
  answers.set(key, JSON.parse(fs.readFileSync(file, 'utf8')));
  return answers.get(key);
}

async function ask(session, terms, sale) {
  const key = keyOf(terms, sale);
  const hit = cached(key);
  if (hit) return hit;
  let answer;
  for (let attempt = 0; !answer; attempt++) {
    try {
      answer = await session.search(terms, sale);
    } catch (err) {
      // The site drops connections and sessions now and then; an expired session shows up as an unexpected
      // page. Wait, sign in again and ask again.
      if (attempt >= 4) throw new Error(`AMIce search ${key}: ${err.cause?.code ?? err.message}`);
      session.ready = false;
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
    }
  }
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(fileOf(key), JSON.stringify(answer));
  answers.set(key, answer);
  process.stderr.write('·');
  return answer;
}

let sessions;

/** Runs the jobs across the sessions; each job is given the session that picked it up. */
async function spread(jobs) {
  const queue = [...jobs];
  await Promise.all(sessions.map(async (session) => {
    for (let job = queue.shift(); job; job = queue.shift()) await job(session);
  }));
}

/** What to search for a medicine: its ATC code, or its German substance name where the code finds nothing. */
const termFor = (drug) => (DE_SUBSTANCE[drug.id] ? [F_SUBSTANCE, DE_SUBSTANCE[drug.id]] : [F_ATC, drug.atc]);

export async function open() {
  sessions = Array.from({ length: SESSIONS }, () => new Session());
  const terms = [...new Map(loadDrugs().filter((d) => d.countries.DE).map((d) => [termFor(d).join('='), termFor(d)])).values()];
  const todo = terms.flatMap((t) => [PHARMACY, RX, NARCOTIC].map((sale) => [t, sale])).filter(([t, sale]) => !cached(keyOf([t], sale)));
  if (todo.length) process.stderr.write(`\nasking AMIce ${todo.length} questions, about ${Math.ceil((todo.length * 8) / SESSIONS / 60)} min\n`);
  await spread(todo.map(([t, sale]) => (s) => ask(s, [t], sale)));
  // Free sale is rare for these medicines, so only ask where the other three classes came back empty.
  const empty = terms.filter((t) => [PHARMACY, RX, NARCOTIC].every((sale) => answers.get(keyOf([t], sale)).count === 0));
  await spread(empty.map((t) => (s) => ask(s, [t], FREE)));
  if (todo.length) process.stderr.write('\n');
  return { version: `searched ${new Date().toLocaleDateString('en-CA')}` };
}

/** A brand's products in one class: from the names already listed, or by asking when that list was cut off at 100. */
async function brandRows(term, sale, name) {
  const all = answers.get(keyOf([term], sale)) ?? { count: 0, rows: [] };
  if (all.count === 0) return [];
  if (all.count <= all.rows.length) return all.rows.filter((r) => brandMatches(r.name, name));
  // The search matches from the start of a word, so the brand's first word is enough; the names are checked here.
  const word = name.split(/\s+/)[0].replace(/[^\x20-\x7e].*$/, '');
  if (!word) return [];
  return (await ask(sessions[0], [term, [F_NAME, word]], sale)).rows.filter((r) => brandMatches(r.name, name));
}

export async function verify({ drug, parsed }) {
  const term = termFor(drug);
  const byClass = Object.fromEntries([FREE, PHARMACY, RX, NARCOTIC].map((sale) => [sale, answers.get(keyOf([term], sale)) ?? { count: 0, rows: [] }]));
  const total = byClass[FREE].count + byClass[PHARMACY].count + byClass[RX].count;
  const first = [PHARMACY, RX, FREE].map((sale) => byClass[sale].rows[0]).find(Boolean);

  const brands = [];
  for (const name of parsed.names) {
    const rows = {};
    for (const sale of [FREE, PHARMACY, RX, NARCOTIC]) rows[sale] = await brandRows(term, sale, name);
    const hit = rows[PHARMACY][0] ?? rows[RX][0] ?? rows[FREE][0];
    if (hit) {
      brands.push({
        name, id: hit.znr || hit.enr, url: `${BASE}/`, confirmed: true, note: null, matched: hit.name, rows,
        products: [PHARMACY, RX, FREE].flatMap((sale) => rows[sale].slice(0, 3).map((r) => ({ product: r.name, holder: r.holder, authorisation: r.znr, legal: CLASS_NAME[sale] }))),
      });
    } else {
      const listed = leadingNames([PHARMACY, RX, FREE].flatMap((sale) => byClass[sale].rows.map((r) => r.name)));
      // AMIce may file the brand under another code than ours (SchlafTabs-ratiopharm is not under doxylamine's).
      const word = name.split(/\s+/)[0].replace(/[^\x20-\x7e].*$/, '');
      const elsewhere = word ? (await ask(sessions[0], [[F_NAME, word]], '')).rows.find((r) => brandMatches(r.name, name)) : null;
      brands.push({
        name, id: null, url: null, confirmed: false, rows,
        note: elsewhere ? `"${elsewhere.name}" is marketable, but AMIce files it under a different code than this ingredient's; check it by hand`
          : total ? `no marketable product of this name with this ingredient (AMIce lists ${listed.join(', ')})` : 'no marketable product with this ingredient found in AMIce',
        products: [],
      });
    }
  }

  // Judge the legal class on the named brands where they were found, else on everything with the ingredient.
  const confirmed = brands.filter((b) => b.confirmed);
  const n = (sale) => (confirmed.length ? confirmed.reduce((sum, b) => sum + b.rows[sale].length, 0) : byClass[sale].count);
  // A narcotic prescription medicine is also filed as prescription-only, so it is counted once.
  const tally = { 'free sale': n(FREE), 'pharmacy-only': n(PHARMACY), prescription: Math.max(0, n(RX) - n(NARCOTIC)), 'narcotic prescription': n(NARCOTIC) };
  const classes = [
    // Both are sold without a prescription; nearly all of them only in a pharmacy.
    ...Array(tally['free sale'] + tally['pharmacy-only']).fill('NO_RX'),
    ...Array(tally.prescription).fill('RX'),
    ...Array(tally['narcotic prescription']).fill('CONTROLLED'),
  ];

  return {
    ingredient: { registered: total > 0, id: first ? first.znr || first.enr : null, url: `${BASE}/`, searched: term[1], marketedProducts: total },
    brands: brands.map((b) => ({ ...b, rows: undefined })),
    registryStatus: aggregateStatus(classes),
    statusEvidence: classes.length ? { source: 'AMIce Verkaufsabgrenzung (legal class of sale)', products: Object.fromEntries(Object.entries(tally).filter(([, v]) => v)) } : null,
    flags: [],
  };
}
