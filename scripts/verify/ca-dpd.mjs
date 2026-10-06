// Canada: Health Canada's Drug Product Database (DPD). Free, no key.
// https://health-products.canada.ca/api/documentation/dpd-documentation-en.html

import { aggregateStatus, brandMatches, hasIngredient, primaryIngredient, statusPool } from './lib.mjs';

const API = 'https://health-products.canada.ca/api/drug';

export const registry = { code: 'CA', name: 'Health Canada Drug Product Database' };
export const cannotDetect = [];

// How many products to look at per brand or ingredient. Each one costs up to three requests.
const MAX_SCANNED = 20;
const MAX_KEPT = 8;

let dpd;

export async function open({ createClient }) {
  dpd = createClient({ perSecond: 6 });
  return {};
}

const get = (endpoint, params) => dpd.json(`${API}/${endpoint}/?${new URLSearchParams({ ...params, lang: 'en', type: 'json' })}`);
const pageUrl = (drugCode) => `https://health-products.canada.ca/dpd-bdpp/info?lang=eng&code=${drugCode}`;

function legalClass(schedules) {
  const s = schedules.map((x) => x.toUpperCase());
  if (s.some((x) => /NARCOTIC|CDSA|CONTROLLED|TARGETED|SCHEDULE G/.test(x))) return 'CONTROLLED';
  if (s.some((x) => x.startsWith('PRESCRIPTION'))) return 'RX';
  // Shelf vs behind-the-counter is set by provincial schedules (NAPRA), which DPD doesn't carry.
  if (s.some((x) => x.startsWith('NON-PRESCRIPTION') || x === 'OTC' || x === 'ETHICAL')) return 'NO_RX';
  return null; // e.g. Schedule D (biologics) alone
}

async function marketedStatus(drugCode) {
  const s = await get('status', { id: drugCode });
  return (Array.isArray(s) ? s[0] : s)?.status ?? null;
}

async function legalClassOf(drugCode) {
  return legalClass(((await get('schedule', { id: drugCode })) ?? []).map((x) => x.schedule_name));
}

async function findBrand(name, keys) {
  const all = (await get('drugproduct', { brandname: name })) ?? [];
  const named = all
    .filter((p) => p.class_name === 'Human' && brandMatches(p.brand_name, name))
    .sort((a, b) => a.brand_name.length - b.brand_name.length);
  const miss = (note) => ({ name, id: null, url: null, confirmed: false, note, products: [] });
  if (named.length === 0) return miss('not found in DPD');

  const products = [];
  let notMarketed = 0;
  let otherIngredient = 0;
  for (const p of named.slice(0, MAX_SCANNED)) {
    if (products.length >= MAX_KEPT) break;
    if ((await marketedStatus(p.drug_code)) !== 'Marketed') { notMarketed++; continue; }
    const ingredients = ((await get('activeingredient', { id: p.drug_code })) ?? []).map((i) => i.ingredient_name);
    if (!hasIngredient(ingredients.join(' '), keys)) { otherIngredient++; continue; }
    products.push({
      code: p.drug_code, din: p.drug_identification_number, product: p.brand_name,
      single: p.number_of_ais === '1', legal: await legalClassOf(p.drug_code),
    });
  }
  if (products.length === 0) {
    return miss(otherIngredient
      ? 'registered under this name, but not with this ingredient'
      : `registered, but none of the ${notMarketed} products checked is currently marketed`);
  }
  return { name, id: products[0].code, url: pageUrl(products[0].code), confirmed: true, note: null, matched: products[0].product, products };
}

/** For entries with no brand to look up: is anything with this ingredient on the market? */
async function findIngredient(drug, keys) {
  const terms = [primaryIngredient(drug), ...keys.slice(1)].map((t) => t.toLowerCase());
  for (const term of terms) {
    const rows = (await get('activeingredient', { ingredientname: term })) ?? [];
    if (rows.length === 0) continue;
    // Newest registrations first: the oldest drug codes are mostly cancelled products.
    const codes = [...new Set(rows.map((r) => r.drug_code))].sort((a, b) => b - a);
    const products = [];
    for (const code of codes.slice(0, MAX_SCANNED)) {
      if (products.length >= MAX_KEPT) break;
      if ((await marketedStatus(code)) !== 'Marketed') continue;
      products.push({ code, single: true, legal: await legalClassOf(code) });
    }
    return {
      registered: products.length > 0, id: products[0]?.code ?? null, url: products[0] ? pageUrl(products[0].code) : null,
      searched: term, registeredProducts: codes.length, products,
    };
  }
  return { registered: false, id: null, url: null, searched: terms.join(', '), registeredProducts: 0, products: [] };
}

export async function verify({ drug, parsed, keys }) {
  const brands = [];
  for (const name of parsed.names) brands.push(await findBrand(name, keys));

  const ingredient = parsed.kind === 'brand'
    ? { registered: brands.some((b) => b.confirmed), products: brands.flatMap((b) => b.products) }
    : await findIngredient(drug, keys);

  const pool = statusPool(drug, ingredient.products, (p) => p.single);
  const tally = {};
  for (const p of pool) if (p.legal) tally[p.legal] = (tally[p.legal] ?? 0) + 1;

  return {
    ingredient: { ...ingredient, products: undefined },
    brands,
    registryStatus: aggregateStatus(pool.map((p) => p.legal)),
    statusEvidence: pool.length ? { source: 'DPD schedule, marketed products sampled', products: tally } : null,
    flags: [],
  };
}
