// Singapore: the Health Sciences Authority's register of therapeutic products, published on data.gov.sg
// under the Singapore Open Data Licence. Free, no key. The whole register is one request (~5,500 rows).
// https://data.gov.sg/datasets/d_767279312753558cbf19d48344577084/view

import { aggregateStatus, brandMatches, hasIngredient, leadingNames, statusPool } from './lib.mjs';

const DATASET = 'd_767279312753558cbf19d48344577084';
const DATASET_URL = `https://data.gov.sg/datasets/${DATASET}/view`;

export const registry = { code: 'SG', name: 'HSA Register of Therapeutic Products (Singapore)' };
// Controlled drugs appear as plain "Prescription Only"; the register has no separate class for them.
export const cannotDetect = ['CONTROLLED'];

const LEGAL = { 'General Sale List': 'OTC', 'Pharmacy Only': 'PHARMACY', 'Prescription Only': 'RX' };
const ATC_RE = /^[A-Z]\d{2}[A-Z]{2}\d{2}$/;

let rows;

export async function open({ createClient }) {
  const client = createClient({ perSecond: 1 });
  const r = await client.json(`https://data.gov.sg/api/action/datastore_search?resource_id=${DATASET}&limit=10000`);
  rows = r.result.records;
  if (r.result.total > rows.length) throw new Error(`HSA register has ${r.result.total} rows but one page returned ${rows.length}; add paging`);
  return { version: `${rows.length} registered products` };
}

const isSingle = (row) => !row.Activeingredients.includes('&&');
const summarise = (row) => ({ licence: row.LicenceNo, product: row.Productname, legal: LEGAL[row.Forensicclassification] ?? null });

export async function verify({ drug, parsed, keys }) {
  const flags = [];
  const withIngredient = rows.filter((r) => hasIngredient(r.Activeingredients, keys));

  const brands = parsed.names.map((name) => {
    const matched = withIngredient.filter((r) => brandMatches(r.Productname, name));
    if (matched.length) {
      return { name, id: matched[0].LicenceNo, url: DATASET_URL, confirmed: true, note: null, matched: matched[0].Productname, rows: matched };
    }
    const elsewhere = rows.find((r) => brandMatches(r.Productname, name));
    const listed = leadingNames(withIngredient.filter(isSingle).map((r) => r.Productname));
    return {
      name, id: null, url: null, confirmed: false, rows: [],
      note: elsewhere
        ? `registered under this name with ${elsewhere.Activeingredients.replace(/&&/g, ' + ')}, not this ingredient`
        : `not in the HSA register${listed.length ? ` (for this ingredient it lists ${listed.join(', ')})` : ''}`,
    };
  });

  // The register carries its own ATC code per product: a second opinion on ours.
  const codes = new Set(withIngredient.filter(isSingle).map((r) => r.ATCCode).filter((c) => ATC_RE.test(c)));
  if (codes.size && !codes.has(drug.atc)) flags.push(`ATC differs: entry ${drug.atc}, HSA lists ${[...codes].slice(0, 4).join(', ')}`);

  const scoped = parsed.kind === 'brand' ? brands.flatMap((b) => b.rows) : withIngredient;
  const pool = statusPool(drug, scoped, isSingle);
  const tally = {};
  for (const r of pool) tally[r.Forensicclassification] = (tally[r.Forensicclassification] ?? 0) + 1;

  return {
    ingredient: {
      registered: withIngredient.length > 0, id: withIngredient[0]?.LicenceNo ?? null, url: DATASET_URL, registeredProducts: withIngredient.length,
    },
    brands: brands.map(({ rows: matched, ...b }) => ({ ...b, products: matched.slice(0, 6).map(summarise) })),
    registryStatus: aggregateStatus(pool.map((r) => LEGAL[r.Forensicclassification])),
    statusEvidence: pool.length ? { source: 'HSA forensic classification', products: tally } : null,
    flags,
  };
}
