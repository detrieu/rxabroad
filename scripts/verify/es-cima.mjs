// Spain: CIMA, the medicines information centre of the regulator AEMPS. A free JSON service, no key.
// https://cima.aemps.es/cima/publico/home.html · REST: https://cima.aemps.es/cima/rest/medicamentos
//
// Searched by ATC code, marketed products only. Each product carries its prescription condition (cpresc):
// "Sin Receta", "Medicamento Sujeto A Prescripción Médica", with "Estupefacientes" (narcotics) or
// "Psicótropos" (psychotropics) appended, or a hospital-only class.

import { aggregateStatus, brandMatches, leadingNames, norm, statusPool } from './lib.mjs';

const REST = 'https://cima.aemps.es/cima/rest/medicamentos';
const PAGE_SIZE = 200;

export const registry = { code: 'ES', name: 'CIMA medicines register (AEMPS, Spain)' };
export const cannotDetect = [];

// Medicines CIMA files under another ATC code than ours, or shares a code between two ingredients
// (dimenhydrinate sits under diphenhydramine's). These are searched by their Spanish ingredient name instead.
const ES_NAMES = { diphenhydramine: 'difenhidramina', dimenhydrinate: 'dimenhidrinato', amphetamine: 'lisdexanfetamina', 'calcium-carbonate': 'calcio carbonato' };

let client;

/** Every marketed product matching the query, across pages. */
async function search(query) {
  const rows = [];
  for (let page = 1; ; page++) {
    const r = await client.json(`${REST}?${query}&comerc=1&pagina=${page}`);
    const batch = r?.resultados ?? [];
    rows.push(...batch.map((m) => ({ id: m.nregistro, name: m.nombre, holder: m.labtitular, cpresc: m.cpresc ?? '', vtm: m.vtm?.nombre ?? '' })));
    if (batch.length < PAGE_SIZE) return rows;
  }
}

export async function open({ createClient }) {
  client = createClient({ perSecond: 3 });
  return {};
}

const pageUrl = (id) => `https://cima.aemps.es/cima/publico/detalle.html?nregistro=${id}`;

function legalClass({ cpresc }) {
  if (/estupefaciente|psic[oó]tropo/i.test(cpresc)) return 'CONTROLLED';
  // Non-prescription medicines in Spain are sold only in pharmacies.
  if (/sin receta/i.test(cpresc)) return 'PHARMACY';
  return 'RX'; // prescription, hospital use, hospital diagnosis
}

const summarise = (p) => ({ nregistro: p.id, product: p.name, legal: legalClass(p), condition: p.cpresc });

/** The ingredient's Spanish name: what CIMA calls it on most of the products under its ATC code. */
export function spanishName(products) {
  const tally = new Map();
  for (const p of products) if (p.vtm && !p.vtm.includes('+')) tally.set(p.vtm, (tally.get(p.vtm) ?? 0) + 1);
  return [...tally].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export async function verify({ drug, parsed }) {
  const byName = ES_NAMES[drug.id];
  const ingredients = (p) => p.vtm.split('+').map((s) => norm(s));
  const coded = byName
    ? (await search(`practiv1=${encodeURIComponent(byName)}`)).filter((p) => ingredients(p).includes(norm(byName)))
    : drug.atc ? await search(`atc=${encodeURIComponent(drug.atc)}`) : [];
  const local = byName ?? spanishName(coded);
  const isSingle = (p) => !p.vtm.includes('+');

  const brands = [];
  for (const name of parsed.names) {
    let rows = coded.filter((p) => brandMatches(p.name, name));
    let note = null;
    if (!rows.length) {
      // CIMA may file the brand under another code than ours; accept it if it has the same ingredient.
      const named = (await search(`nombre=${encodeURIComponent(name)}`)).filter((p) => brandMatches(p.name, name));
      rows = local ? named.filter((p) => ingredients(p).some((i) => i === norm(local) || i.startsWith(`${norm(local)} `))) : [];
      if (!rows.length) {
        const listed = leadingNames(coded.map((p) => p.name));
        note = named.length ? `marketed under this name with ${named[0].vtm || 'another ingredient'}, not this ingredient`
          : `no marketed product of this name in CIMA${listed.length ? ` (for this ingredient it lists ${listed.join(', ')})` : ''}`;
      }
    }
    brands.push(rows.length
      ? { name, id: rows[0].id, url: pageUrl(rows[0].id), confirmed: true, note: null, matched: rows[0].name, rows }
      : { name, id: null, url: null, confirmed: false, note, rows: [] });
  }

  const pool = statusPool(drug, parsed.kind === 'brand' ? brands.flatMap((b) => b.rows) : coded, isSingle);
  const tally = {};
  for (const p of pool) tally[legalClass(p)] = (tally[legalClass(p)] ?? 0) + 1;

  return {
    ingredient: { registered: coded.length > 0, id: coded[0]?.id ?? null, url: coded[0] ? pageUrl(coded[0].id) : null, searched: byName ?? drug.atc, localName: local, marketedProducts: coded.length },
    brands: brands.map(({ rows, ...b }) => ({ ...b, products: rows.slice(0, 6).map(summarise) })),
    registryStatus: aggregateStatus(pool.map(legalClass)),
    statusEvidence: pool.length ? { source: 'CIMA prescription condition (cpresc)', products: tally } : null,
    flags: [],
  };
}
