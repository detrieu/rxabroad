// Portugal: Infomed, the medicines database of the regulator INFARMED.
// https://extranet.infarmed.pt/INFOMED-fo/pesquisa-avancada.xhtml
//
// There is no download or API, only a search form (no account, no captcha). A search can combine an ATC code,
// a product name, the marketing status and the dispensing class. The result list names each product and its
// ingredient but not its class, so for each medicine we ask once per class:
//   MNSRM          no prescription, may also be sold outside pharmacies
//   MNSRM-EF       no prescription, pharmacy only
//   MSRM           prescription
//   MSRM especial  special prescription (narcotics and stimulants)
//
// The site answers "service not available" for minutes at a time. Requests are spaced out over two sessions,
// retried with long waits, and every answer is cached for a day.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, aggregateStatus, brandMatches, hasIngredient, leadingNames, loadDrugs, norm, statusPool } from './lib.mjs';

const FORM = 'https://extranet.infarmed.pt/INFOMED-fo/pesquisa-avancada.xhtml';
const DIR = path.join(ROOT, 'node_modules/.cache/rxabroad-verify/pt');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const UA = 'rxabroad-verify (+https://rxabroad.vercel.app)';
const SESSIONS = 2;
const GAP_MS = 1000; // between two requests of one session
const PAGE_SIZE = 100; // the most the result list shows per page
const TIMEOUT_MS = 90_000;

export const registry = { code: 'PT', name: 'Infomed medicines database (INFARMED, Portugal)' };
export const cannotDetect = [];

// Classificação quanto à dispensa, as numbered in the search form, and the status each stands for.
const CLASS_CODE = { MNSRM: '001', 'MNSRM-EF': '008', MSRM: '006', 'MSRM especial': '004' };
const CLASS_STATUS = { MNSRM: 'OTC', 'MNSRM-EF': 'PHARMACY', MSRM: 'RX', 'MSRM especial': 'CONTROLLED' };
const CLASSES = Object.keys(CLASS_CODE);

// The ingredient's Portuguese name, for medicines whose ATC code the form does not offer or finds nothing under.
const PT_NAMES = {
  dimenhydrinate: 'Dimenidrinato', amphetamine: 'Anfetamina', hydrocodone: 'Hidrocodona', 'bismuth-subsalicylate': 'Subsalicilato de bismuto', scopolamine: 'Escopolamina',
  guaifenesin: 'Guaifenesina', // the one marketed syrup is filed under another code than R05CA03
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const unhtml = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const plain = (html) => unhtml(html.replace(/<script.*?<\/script>/gs, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Result rows. Columns: id, authorisation status and name, ingredient, form, strength, holder, marketing. */
function resultRows(xml) {
  return xml.split(/<tr[^>]*data-ri="\d+"[^>]*>/).slice(1).map((tr) => {
    const cells = [...tr.matchAll(/<td[^>]*role="gridcell"[^>]*>(.*?)<\/td>/gs)].map(([, td]) => td);
    return {
      id: plain(cells[0] ?? ''), name: plain(cells[1]?.match(/<a[^>]*linkNome[^>]*>(.*?)<\/a>/s)?.[1] ?? ''), dci: plain(cells[2] ?? ''),
      form: plain(cells[3] ?? ''), strength: plain(cells[4] ?? ''), holder: plain(cells[5] ?? ''),
    };
  }).filter((r) => r.id && r.name);
}

/** One visit to the search form: its own cookie and page state. */
class Session {
  cookies = new Map();
  state = null;
  fields = null;
  last = 0;

  async request(form) {
    const wait = this.last + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    const cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    try {
      const res = await fetch(FORM, {
        method: form ? 'POST' : 'GET', body: form ? new URLSearchParams(form).toString() : undefined, signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          'User-Agent': UA, ...(cookie && { Cookie: cookie }),
          ...(form && { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'Faces-Request': 'partial/ajax', 'X-Requested-With': 'XMLHttpRequest' }),
        },
      });
      for (const c of res.headers.getSetCookie()) {
        const [, k, v] = c.match(/^([^=]+)=([^;]*)/) ?? [];
        if (k) this.cookies.set(k, v);
      }
      if (!res.ok) throw new Error(`Infomed answered ${res.status}`);
      return await res.text();
    } finally {
      this.last = Date.now();
    }
  }

  async start() {
    this.cookies.clear();
    const html = await this.request();
    const form = html.slice(html.indexOf('<form id="mainForm"'));
    this.state = html.match(/name="javax\.faces\.ViewState"[^>]*value="([^"]+)"/)?.[1] ?? null;
    if (!this.state || !form.includes('mainForm:btnDoSearch')) throw new Error('Infomed search form not shown');
    // Every field of the form goes back with a search, empty unless the search sets it.
    this.fields = { mainForm: 'mainForm' };
    for (const [tag, name] of form.matchAll(/<input[^>]*name="(mainForm:[^"]*)"[^>]*>/g)) this.fields[name] = unhtml(tag.match(/value="([^"]*)"/)?.[1] ?? '');
    for (const [, name] of form.matchAll(/<select[^>]*name="(mainForm:[^"]*)"/g)) this.fields[name] = '';
    this.fields['mainForm:dt-medicamentos_rppDD'] = String(PAGE_SIZE);
    this.atcCodes = [...form.matchAll(/value="REF_CLASS_ATC:([^"]+)"/g)].map(([, code]) => code);
  }

  /** A partial page update, the way the form's own buttons ask for one. */
  async update(source, execute, render, criteria, extra) {
    const xml = await this.request({
      'javax.faces.partial.ajax': 'true', 'javax.faces.source': source, 'javax.faces.partial.execute': execute, 'javax.faces.partial.render': render,
      [source]: source, ...this.fields, ...criteria, ...extra, 'javax.faces.ViewState': this.state,
    });
    const state = xml.match(/javax\.faces\.ViewState[^>]*><!\[CDATA\[(.*?)\]\]>/)?.[1];
    if (!xml.includes('<partial-response') || !state) throw new Error('Infomed did not answer the search (the session may have expired)');
    this.state = state;
    return xml;
  }

  async search(criteria) {
    if (!this.state) await this.start();
    const found = await this.update('mainForm:btnDoSearch', 'mainForm:pnlCriterios mainForm:btnDoSearch', 'messages mainForm:dt-medicamentos', criteria);
    const total = Number(found.match(/rowCount:(\d+)/)?.[1] ?? NaN);
    if (!Number.isInteger(total)) throw new Error('Infomed result list not recognised');
    // The list comes back on whatever page the previous search left it, so every page is asked for by position.
    const rows = [];
    for (let first = 0; first < total; first += PAGE_SIZE) {
      const page = resultRows(await this.update('mainForm:dt-medicamentos', 'mainForm:dt-medicamentos', 'mainForm:dt-medicamentos', criteria, {
        'mainForm:dt-medicamentos_pagination': 'true', 'mainForm:dt-medicamentos_first': String(first), 'mainForm:dt-medicamentos_rows': String(PAGE_SIZE),
        'mainForm:dt-medicamentos_encodeFeature': 'true',
      }));
      if (!page.length) throw new Error('Infomed returned an empty result page');
      rows.push(...page);
    }
    return { total, rows };
  }
}

/** Form fields for a search: by ATC code or ingredient name, and optionally product name, class and marketed packs only. */
const criteria = ({ atc, dci, name, cls, marketed = true }) => ({
  ...(atc && { 'mainForm:classif-atc_input': `REF_CLASS_ATC:${atc}` }),
  ...(dci && { 'mainForm:dci_input': dci }),
  ...(name && { 'mainForm:medicamento_input': name }),
  ...(cls && { 'mainForm:classif-dispensa_input': `REF_CLASS_DISP_MED:${CLASS_CODE[cls]}` }),
  ...(marketed && { 'mainForm:estado-comercializacao_input': 'REF_EST_COMERC:001' }),
});

const useCache = !process.argv.includes('--no-cache');
const keyOf = (q) => JSON.stringify(criteria(q));
const fileOf = (key) => path.join(DIR, `${crypto.createHash('sha1').update(key).digest('hex')}.json`);
const answers = new Map(); // key → { total, rows }

function cached(q) {
  const key = keyOf(q);
  if (answers.has(key)) return answers.get(key);
  const file = fileOf(key);
  if (!useCache || !fs.existsSync(file) || Date.now() - fs.statSync(file).mtimeMs >= CACHE_TTL_MS) return null;
  answers.set(key, JSON.parse(fs.readFileSync(file, 'utf8')));
  return answers.get(key);
}

/** Runs a step on a session, starting the session again after a failure. The waits add up to five minutes. */
async function patiently(session, label, step) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await step();
    } catch (err) {
      if (attempt >= 4) throw new Error(`Infomed ${label}: ${err.cause?.code ?? err.message}`);
      session.state = null;
      await sleep(20_000 * (attempt + 1));
    }
  }
}

async function ask(session, q) {
  const hit = cached(q);
  if (hit) return hit;
  const answer = await patiently(session, `search ${keyOf(q)}`, () => session.search(criteria(q)));
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(fileOf(keyOf(q)), JSON.stringify(answer));
  answers.set(keyOf(q), answer);
  process.stderr.write('·');
  return answer;
}

let sessions;
let atcCodes;

/** Runs the jobs across the sessions; each job is given the session that picked it up. */
async function spread(jobs) {
  const queue = [...jobs];
  await Promise.all(sessions.map(async (session) => {
    for (let job = queue.shift(); job; job = queue.shift()) await job(session);
  }));
}

/** What to search for a medicine: its ATC code, its Portuguese name where the form lacks the code, or nothing. */
const termFor = (drug) => (PT_NAMES[drug.id] ? { dci: PT_NAMES[drug.id] } : atcCodes.has(drug.atc) ? { atc: drug.atc } : null);

export async function open() {
  sessions = Array.from({ length: SESSIONS }, () => new Session());
  await patiently(sessions[0], 'search form', () => sessions[0].start());
  atcCodes = new Set(sessions[0].atcCodes);

  const terms = [...new Map(loadDrugs().filter((d) => d.countries.PT).map(termFor).filter(Boolean).map((t) => [JSON.stringify(t), t])).values()];
  const todo = terms.flatMap((t) => CLASSES.map((cls) => ({ ...t, cls }))).filter((q) => !cached(q));
  if (todo.length) process.stderr.write(`\nasking Infomed ${todo.length} questions, about ${Math.ceil((todo.length * 4.5) / SESSIONS / 60)} min\n`);
  await spread(todo.map((q) => (s) => ask(s, q)));
  // Hospital-only medicines sit in the restricted classes. Where the four classes came back empty, ask without
  // a class, so such a medicine is not reported as unregistered.
  const empty = terms.filter((t) => CLASSES.every((cls) => answers.get(keyOf({ ...t, cls })).total === 0));
  await spread(empty.map((t) => (s) => ask(s, t)));
  if (todo.length) process.stderr.write('\n');
  return { version: `searched ${new Date().toLocaleDateString('en-CA')}` };
}

const isSingle = (p) => !p.dci.includes('+');
const summarise = (p) => ({ id: p.id, product: p.name, ingredient: p.dci, form: p.form, strength: p.strength, class: p.cls, holder: p.holder });

/** The ingredient's Portuguese name: what Infomed calls it on most of the single-ingredient products found. */
function portugueseName(products) {
  const tally = new Map();
  for (const p of products) if (isSingle(p)) tally.set(p.dci, (tally.get(p.dci) ?? 0) + 1);
  return [...tally].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export async function verify({ drug, entry, parsed }) {
  const term = termFor(drug);
  // A search by ingredient name also finds longer names that contain it (butilescopolamina), so keep whole words.
  const wanted = (r) => !term?.dci || hasIngredient(r.dci, [norm(term.dci)]);
  const inClass = (q, cls) => (answers.get(keyOf({ ...q, cls }))?.rows ?? []).filter(wanted).map((r) => ({ ...r, cls }));
  const marketed = term ? CLASSES.flatMap((cls) => inClass(term, cls)) : [];
  const restricted = term && !marketed.length ? (answers.get(keyOf(term))?.rows ?? []).filter(wanted) : [];
  const local = PT_NAMES[drug.id] ?? portugueseName(marketed);

  const flags = [];
  if (restricted.length) flags.push(`Marketed only as restricted (hospital) medicines here: ${leadingNames(restricted.map((r) => r.name)).join(', ')}`);

  const brands = [];
  for (const name of parsed.names) {
    let rows = marketed.filter((r) => brandMatches(r.name, name));
    let note = null;
    if (!rows.length) {
      // Infomed may file the brand under another code than ours; accept it if it has the same ingredient.
      const word = name.split(/\s+/)[0];
      const named = [];
      for (const cls of CLASSES) named.push(...(await ask(sessions[0], { name: word, cls })).rows.filter((r) => brandMatches(r.name, name)).map((r) => ({ ...r, cls })));
      rows = local ? named.filter((r) => hasIngredient(r.dci, [norm(local)])) : [];
      if (!rows.length) {
        const listed = leadingNames(marketed.filter(isSingle).map((r) => r.name));
        const shelved = named.length ? [] : (await ask(sessions[0], { name: word, marketed: false })).rows.filter((r) => brandMatches(r.name, name));
        note = named.length ? `marketed under this name with ${named[0].dci || 'another ingredient'}, not this ingredient`
          : shelved.length ? `in Infomed (${shelved[0].dci}), but none of its packs is marketed, or only for hospital use`
          : `no product of this name in Infomed${listed.length ? ` (for this ingredient it lists ${listed.join(', ')})` : ''}`;
      }
    }
    brands.push(rows.length
      ? { name, id: rows[0].id, url: FORM, confirmed: true, note: null, matched: rows[0].name, rows }
      : { name, id: null, url: null, confirmed: false, note, rows: [] });
  }

  const pool = statusPool(drug, parsed.kind === 'brand' ? brands.flatMap((b) => b.rows) : marketed, isSingle);
  const tally = {};
  for (const p of pool) tally[p.cls] = (tally[p.cls] ?? 0) + 1;
  let registryStatus = aggregateStatus(pool.map((p) => CLASS_STATUS[p.cls]));
  // Benzodiazepines and tramadol are controlled substances in Portugal but are dispensed on an ordinary
  // prescription. So this class can confirm a controlled entry, and can't contradict one.
  const ordinary = entry.status === 'CONTROLLED' && registryStatus === 'RX';
  if (ordinary) registryStatus = null;

  const first = marketed.find(isSingle) ?? marketed[0] ?? restricted[0];
  return {
    ingredient: { registered: marketed.length + restricted.length > 0, id: first?.id ?? null, url: FORM, searched: term?.atc ?? term?.dci ?? null, localName: local, marketedProducts: marketed.length },
    brands: brands.map(({ rows, ...b }) => ({ ...b, products: rows.slice(0, 6).map(summarise) })),
    registryStatus,
    statusEvidence: pool.length ? {
      source: 'Infomed dispensing class (classificação quanto à dispensa)', products: tally,
      ...(ordinary && { note: 'on an ordinary prescription, which does not rule out a controlled substance' }),
    } : null,
    flags,
  };
}
