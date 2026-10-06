// United States: RxNorm (brand ↔ ingredient, ATC) plus openFDA's NDC directory (OTC vs prescription, DEA schedule).
// Both are free and need no key. https://lhncbc.nlm.nih.gov/RxNav/APIs/RxNormAPIs.html · https://open.fda.gov/apis/drug/ndc/

import { aggregateStatus, norm, primaryIngredient, statusPool } from './lib.mjs';

const RX = 'https://rxnav.nlm.nih.gov/REST';
const NDC = 'https://api.fda.gov/drug/ndc.json';

export const registry = { code: 'US', name: 'RxNorm (U.S. National Library of Medicine)' };
// "Behind the counter" (pseudoephedrine) is a sales restriction, not a product type either source records.
export const cannotDetect = ['PHARMACY'];
// What a US name has to match abroad is the generic. When a US brand is withdrawn or has no current FDA
// listing, the entry is verified on its ingredient instead of being left unverified.
export const fallbackToIngredient = true;

let rx;
let fda;

export async function open({ createClient }) {
  rx = createClient({ perSecond: 8 }); // NLM allows 20/s
  fda = createClient({ perSecond: 3 }); // openFDA allows 240/min without a key
  const v = await rx.json(`${RX}/version.json`);
  return { version: `RxNorm ${v.version}` };
}

const q = encodeURIComponent;
const pageUrl = (rxcui) => `https://mor.nlm.nih.gov/RxNav/search?searchBy=RXCUI&searchTerm=${rxcui}`;

async function exactId(name) {
  const r = await rx.json(`${RX}/rxcui.json?name=${q(name)}&search=2`);
  return r?.idGroup?.rxnormId?.[0] ?? null;
}

async function properties(rxcui) {
  return (await rx.json(`${RX}/rxcui/${rxcui}/properties.json`))?.properties ?? null;
}

async function ingredientsOf(rxcui) {
  const r = await rx.json(`${RX}/rxcui/${rxcui}/related.json?tty=IN`);
  return (r?.relatedGroup?.conceptGroup ?? []).flatMap((g) => g.conceptProperties ?? []).map((c) => ({ rxcui: c.rxcui, name: c.name }));
}

async function approximate(term, activeOnly) {
  const r = await rx.json(`${RX}/approximateTerm.json?term=${q(term)}&maxEntries=4&option=${activeOnly ? 1 : 0}`);
  return [...new Set((r?.approximateGroup?.candidate ?? []).map((c) => c.rxcui))].slice(0, 3);
}

/** "Toprol-XL" is filed as "Toprol", "Xtampza ER" as "Xtampza", "Cortizone-10" as "Cortizone". */
function nameVariants(name) {
  const spaced = name.replace(/-/g, ' ');
  return [...new Set([name, spaced, spaced.replace(/\s+(ER|XL|XR|SR|CR|LA|DR|\d+)$/i, '')])];
}

async function findIngredient(drug) {
  const name = primaryIngredient(drug);
  let id = await exactId(name);
  if (!id) return { registered: false, searched: name };
  let props = await properties(id);
  if (props && props.tty !== 'IN') {
    const base = (await ingredientsOf(id))[0];
    if (base) { id = base.rxcui; props = await properties(id); }
  }
  return { registered: true, id, name: props?.name ?? name, url: pageUrl(id), searched: name };
}

async function findBrand(name, ingredientId) {
  const judge = async (id, via, matched) => {
    const ins = await ingredientsOf(id);
    const ok = !!ingredientId && ins.some((i) => i.rxcui === ingredientId);
    return {
      name, id, url: pageUrl(id), via, matched, ingredients: ins.map((i) => i.name),
      confirmed: ok, note: ok ? null : `listed with ${ins.map((i) => i.name).join(' + ') || 'no ingredient'}, not this ingredient`,
    };
  };

  for (const v of nameVariants(name)) {
    const id = await exactId(v);
    if (id) return judge(id, v === name ? 'exact' : 'normalised', v);
  }

  // No brand concept by that exact name: look for an active branded product carrying it, e.g. "… [Xtampza]".
  // RxNorm also keeps dose-form records for withdrawn brands that link to nothing; those don't count.
  const base = norm(nameVariants(name).at(-1));
  for (const id of await approximate(name, true)) {
    const props = await properties(id);
    if (props && ` ${norm(props.name)} `.includes(` ${base} `) && (await ingredientsOf(id)).length) {
      return judge(id, 'approximate', props.name);
    }
  }

  // Still nothing active. An obsolete concept by this name means the brand has left the US market.
  for (const id of await approximate(name, false)) {
    const h = await rx.json(`${RX}/rxcui/${id}/historystatus.json`);
    const meta = h?.rxcuiStatusHistory;
    if (meta && norm(meta.attributes?.name) === base && meta.metaData?.status !== 'Active') {
      return {
        name, id, url: pageUrl(id), via: 'obsolete', matched: meta.attributes.name, ingredients: [], confirmed: false,
        note: `RxNorm lists it only as an obsolete concept (${meta.metaData.status}); likely no longer marketed in the US`,
      };
    }
  }
  return { name, id: null, url: null, via: null, matched: null, ingredients: [], confirmed: false, note: 'not found in RxNorm' };
}

/** OTC / prescription / DEA schedule for the matching NDC products. */
async function ndcProducts(search) {
  const r = await fda.json(`${NDC}?search=${search}&limit=100`);
  return (r?.results ?? []).map((p) => ({
    type: p.product_type, dea: p.dea_schedule ?? null, ingredients: (p.active_ingredients ?? []).length,
  }));
}

function ndcStatus(drug, products) {
  const pool = statusPool(drug, products.filter((p) => /^HUMAN (OTC|PRESCRIPTION) DRUG$/.test(p.type)), (p) => p.ingredients === 1);
  const each = pool.map((p) => (p.dea ? 'CONTROLLED' : p.type === 'HUMAN OTC DRUG' ? 'OTC' : 'RX'));
  const tally = {};
  for (const s of each) tally[s] = (tally[s] ?? 0) + 1;
  return { status: aggregateStatus(each), tally };
}

export async function verify({ drug, parsed }) {
  const flags = [];
  const ingredient = await findIngredient(drug);

  if (ingredient.registered) {
    const p = await rx.json(`${RX}/rxcui/${ingredient.id}/property.json?propName=ATC`);
    const atc = (p?.propConceptGroup?.propConcept ?? []).map((c) => c.propValue);
    ingredient.atc = atc;
    if (atc.length === 0) flags.push(`ATC: RxNorm has no ATC code on this ingredient concept (entry has ${drug.atc})`);
    else if (!atc.includes(drug.atc)) flags.push(`ATC differs: entry ${drug.atc}, RxNorm ${atc.join(', ')}`);
  } else {
    flags.push(`Ingredient "${ingredient.searched}" not found in RxNorm`);
  }

  const brands = [];
  for (const name of parsed.names) brands.push(await findBrand(name, ingredient.id));

  // Legal class from openFDA, scoped to the confirmed brands (or to the ingredient when there is no brand).
  let products = [];
  let scope = null;
  const generic = ingredient.registered ? `generic_name:"${q(ingredient.name)}"` : null;
  if (generic) {
    for (const b of brands.filter((x) => x.confirmed)) {
      const brand = nameVariants(b.name).at(-1);
      const found = await ndcProducts(`brand_name:"${q(brand)}"+AND+${generic}`);
      // RxNorm can keep a brand active after its last FDA listing lapses.
      if (found.length === 0) b.doubtful = true;
      if (found.length === 0) flags.push(`Brand "${b.name}" is active in RxNorm but has no current FDA NDC listing; it may no longer be sold under that name`);
      products.push(...found);
    }
    if (products.length) scope = 'brand';
    else if (parsed.kind !== 'unavailable') {
      products = await ndcProducts(generic);
      if (products.length) scope = 'ingredient';
    }
  }
  const { status, tally } = ndcStatus(drug, products);

  return {
    ingredient,
    brands,
    registryStatus: status,
    statusEvidence: scope ? { source: 'openFDA NDC directory', scope, products: tally } : null,
    flags,
    drugPatch: ingredient.registered ? { rxcui: ingredient.id } : null,
  };
}
