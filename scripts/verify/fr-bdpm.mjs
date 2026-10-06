// France: the Base de données publique des médicaments (BDPM), from ANSM / HAS / Assurance Maladie.
// Free tab-separated downloads, Windows-1252 encoded, no header row.
// https://base-donnees-publique.medicaments.gouv.fr/telechargement

import { aggregateStatus, brandMatches, hasIngredient, leadingNames, statusPool } from './lib.mjs';

const BASE = 'https://base-donnees-publique.medicaments.gouv.fr';

export const registry = { code: 'FR', name: 'Base de données publique des médicaments (France)' };
export const cannotDetect = [];

let products; // [{ cis, name, marketed }]
let substances; // cis → { names: Set, codes: Set }   active substances only
let conditions; // cis → [prescription and dispensing conditions]

export async function open({ createClient }) {
  const client = createClient({ perSecond: 1 });
  const table = async (file) =>
    (await client.text(`${BASE}/download/file/${file}`, 'windows-1252')).split(/\r?\n/).filter(Boolean).map((l) => l.split('\t'));

  // CIS_bdpm: CIS, name, form, route, authorisation status, procedure, marketing status, …
  products = (await table('CIS_bdpm.txt')).map((r) => ({
    cis: r[0], name: r[1], marketed: r[4] === 'Autorisation active' && r[6] === 'Commercialisée',
  }));

  // CIS_COMPO: CIS, form, substance code, substance name, dose, per, nature (SA = active substance), link no.
  substances = new Map();
  for (const r of await table('CIS_COMPO_bdpm.txt')) {
    if (r[6] !== 'SA') continue;
    const s = substances.get(r[0]) ?? { names: new Set(), codes: new Set() };
    s.names.add(r[3]);
    s.codes.add(r[2]);
    substances.set(r[0], s);
  }

  // CIS_CPD: CIS, condition. A product with no row can be sold without a prescription.
  conditions = new Map();
  for (const r of await table('CIS_CPD_bdpm.txt')) conditions.set(r[0], [...(conditions.get(r[0]) ?? []), r[1]]);

  return { version: `${products.length} specialities` };
}

const pageUrl = (cis) => `${BASE}/medicament/${cis}/extrait`;
const contains = (p, keys) => hasIngredient([...(substances.get(p.cis)?.names ?? [])].join(' '), keys);
const isSingle = (p) => (substances.get(p.cis)?.codes.size ?? 0) === 1;

function legalClass(cis) {
  const c = (conditions.get(cis) ?? []).join(' | ');
  if (/stup[ée]fiant|ordonnance s[ée]curis[ée]e/i.test(c)) return 'CONTROLLED';
  if (/liste I|prescription|r[ée]serv[ée]/i.test(c)) return 'RX';
  return 'NO_RX'; // France doesn't record shelf vs behind-the-counter here
}

const summarise = (p) => ({ cis: p.cis, product: p.name, legal: legalClass(p.cis), conditions: conditions.get(p.cis) ?? [] });

export async function verify({ drug, parsed, keys }) {
  const onMarket = products.filter((p) => p.marketed && contains(p, keys));

  const brands = parsed.names.map((name) => {
    const named = products.filter((p) => brandMatches(p.name, name));
    const withIngredient = named.filter((p) => contains(p, keys));
    const marketed = withIngredient.filter((p) => p.marketed);
    if (marketed.length) {
      return { name, id: marketed[0].cis, url: pageUrl(marketed[0].cis), confirmed: true, note: null, matched: marketed[0].name, rows: marketed };
    }
    const listed = leadingNames(onMarket.filter(isSingle).map((p) => p.name));
    const note = named.length === 0 ? `not found in BDPM${listed.length ? ` (for this ingredient it lists ${listed.join(', ')})` : ''}`
      : withIngredient.length === 0 ? `registered under this name with ${[...(substances.get(named[0].cis)?.names ?? [])].join(' + ') || 'another ingredient'}, not this ingredient`
      : `registered, but none of its ${withIngredient.length} presentations is currently marketed`;
    return { name, id: null, url: null, confirmed: false, note, rows: [] };
  });

  const scoped = parsed.kind === 'brand' ? brands.flatMap((b) => b.rows) : onMarket;
  const pool = statusPool(drug, scoped, isSingle);
  const tally = {};
  for (const p of pool) { const l = legalClass(p.cis); tally[l] = (tally[l] ?? 0) + 1; }

  return {
    ingredient: {
      registered: onMarket.length > 0, id: onMarket[0]?.cis ?? null, url: onMarket[0] ? pageUrl(onMarket[0].cis) : null, marketedProducts: onMarket.length,
    },
    brands: brands.map(({ rows, ...b }) => ({ ...b, products: rows.slice(0, 6).map(summarise) })),
    registryStatus: aggregateStatus(pool.map((p) => legalClass(p.cis))),
    statusEvidence: pool.length ? { source: 'BDPM prescription and dispensing conditions', products: tally } : null,
    flags: [],
  };
}
