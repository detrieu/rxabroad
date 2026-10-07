// United Kingdom: the MHRA's product index (the regulator's published SPCs and patient leaflets), the search
// behind https://products.mhra.gov.uk. Free; the query key below is the public one that site ships to browsers.
// It confirms a brand is licensed with an ingredient. It does not carry the legal category (GSL / P / POM):
// that comes from the NHS dm+d (gb-dmd.mjs) when a TRUD_API_KEY is available. Without one, legal status is
// left unchecked and the adapter behaves as MHRA-only.

import { aggregateStatus, brandMatches, hasIngredient, leadingNames, norm, primaryIngredient, statusPool } from './lib.mjs';
import { loadDmd } from './gb-dmd.mjs';

const INDEX = 'https://mhraproducts4853.search.windows.net/indexes/products-index/docs';
const PUBLIC_QUERY_KEY = '17CCFC430C1A78A169B392A35A99C49D';

export const registry = { code: 'GB', name: 'MHRA Products (UK medicines regulator)' };
export const cannotDetect = [];

/** Without dm+d the check can't read legal status; run.mjs refuses to --write in that state. */
export const checkGap = () =>
  dmd ? null : 'Legal status can’t be checked without NHS dm+d: add TRUD_API_KEY to .env.local (see the README), then run again.';

// British approved names where they differ from the INN the app uses.
const UK_NAMES = {
  scopolamine: ['HYOSCINE HYDROBROMIDE'],
  // Licensed rehydration salts (Dioralyte) are listed by their components.
  'oral-rehydration-salts': ['GLUCOSE'],
};
// Substance names that must match in full: plain "HYOSCINE" (the patch) but not "HYOSCINE BUTYLBROMIDE" (Buscopan).
const UK_EXACT = {
  scopolamine: ['HYOSCINE'],
};

let mhra;
let dmd = null;

const LEGAL = { GSL: 'OTC', P: 'PHARMACY', POM: 'RX' };
/** Schedules 1 to 4 of the Misuse of Drugs Regulations; Schedule 5 (e.g. low-dose codeine) is not treated as controlled. */
const isControlled = (schedule) => /^Schedule [1-4]\b/.test(schedule ?? '');
const classesOf = (p) => (isControlled(p.schedule) ? ['CONTROLLED'] : p.legal.map((l) => LEGAL[l]).filter(Boolean));

export async function open({ createClient }) {
  mhra = createClient({ perSecond: 3 });
  dmd = await loadDmd({ log: (m) => process.stderr.write(`\n${m}\n`) });
  if (dmd) registry.name = 'MHRA Products + NHS dm+d (UK)';
  return { version: dmd ? `dm+d ${dmd.releaseDate}` : undefined };
}

const pageUrl = (text) => `https://products.mhra.gov.uk/search/?search=${encodeURIComponent(text)}&page=1`;
const licence = (pl) => String(pl ?? '').replace(/^(PL(?:GB|NI|PI)?)(\d{5})(\d{4})$/, '$1 $2/$3');

/** Current SPC and leaflet records matching `text`; assessment reports are skipped because they outlive the licence. */
async function search(text, fields) {
  const params = new URLSearchParams({
    'api-key': PUBLIC_QUERY_KEY, 'api-version': '2017-11-11', search: text, searchMode: 'all',
    $filter: "doc_type ne 'Par'", $top: '250', $select: 'product_name,substance_name,pl_number,doc_type',
  });
  if (fields) params.set('searchFields', fields);
  const rows = (await mhra.json(`${INDEX}?${params}`))?.value ?? [];
  return rows.filter((r) => r.product_name);
}

/** One record can cover several product names: "NUROFEN EXPRESS 342MG CAPLETS, NUROFEN TENSION HEADACHE". */
const namesOf = (row) => row.product_name.split(/,\s*/);
const contains = (row, keys, exact = []) =>
  hasIngredient((row.substance_name ?? []).join(' / '), keys) || (row.substance_name ?? []).some((s) => exact.includes(s));
const summarise = (row) => ({ licence: licence(row.pl_number?.[0]), product: row.product_name, substances: row.substance_name });
const unique = (rows) => [...new Map(rows.map((r) => [r.product_name, r])).values()];

export async function verify({ drug, parsed, keys: baseKeys }) {
  const keys = [...baseKeys, ...(UK_NAMES[drug.id] ?? [])];
  const exact = UK_EXACT[drug.id] ?? [];

  const brands = [];
  for (const name of parsed.names) {
    const named = (await search(`"${name}"`, 'product_name')).filter((r) => namesOf(r).some((n) => brandMatches(n, name)));
    const matched = unique(named.filter((r) => contains(r, keys, exact)));
    if (matched.length) {
      brands.push({
        name, id: licence(matched[0].pl_number?.[0]), url: pageUrl(name), confirmed: true, note: null,
        matched: matched[0].product_name, products: matched.slice(0, 6).map(summarise),
      });
    } else {
      brands.push({
        name, id: null, url: null, confirmed: false, products: [],
        note: named.length
          ? `licensed under this name with ${(named[0].substance_name ?? []).join(' + ') || 'another ingredient'}, not this ingredient`
          : 'no current SPC or leaflet under this name',
      });
    }
  }

  // Is anything with this ingredient licensed at all? The substance field can't be searched directly,
  // so search the text and keep the records whose substances match.
  const term = (UK_NAMES[drug.id]?.[0] ?? primaryIngredient(drug)).toLowerCase();
  const licensed = unique((await search(term)).filter((r) => contains(r, keys, exact)));
  for (const b of brands) {
    if (!b.confirmed && !b.note.startsWith('licensed') && licensed.length) {
      b.note += ` (for this ingredient the MHRA lists ${leadingNames(licensed.map((r) => r.product_name)).join(', ')})`;
    }
  }

  // Legal class from dm+d: the packs still on the market for the confirmed brands, or for the ingredient when there is no brand.
  let registryStatus = null;
  let statusEvidence = null;
  if (dmd) {
    const withIngredient = dmd.products.filter(
      (p) => hasIngredient(p.ingredients.join(' '), keys) || p.ingredients.some((i) => exact.includes(norm(i))),
    );
    const scoped = parsed.kind === 'brand' ? withIngredient.filter((p) => parsed.names.some((n) => brandMatches(p.name, n))) : withIngredient;
    const pool = statusPool(drug, scoped.flatMap((p) => classesOf(p).map((legal) => ({ legal, single: p.ingredients.length === 1 }))), (e) => e.single);
    const tally = {};
    for (const e of pool) tally[e.legal] = (tally[e.legal] ?? 0) + 1;
    registryStatus = aggregateStatus(pool.map((e) => e.legal));
    if (pool.length) statusEvidence = { source: `NHS dm+d ${dmd.releaseDate}, packs on the market`, products: tally };
  }

  return {
    ingredient: {
      registered: licensed.length > 0 || brands.some((b) => b.confirmed),
      id: licence(licensed[0]?.pl_number?.[0]) || null, url: pageUrl(term), searched: term, licensedProducts: licensed.length,
    },
    brands,
    registryStatus,
    statusEvidence,
    flags: [],
  };
}
