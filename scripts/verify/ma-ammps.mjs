// Morocco: the Liste Marocaine des Médicaments of the Agence Marocaine du Médicament et des Produits de Santé (AMMPS).
// https://www.ammps.gov.ma/basesdedonnes/liste_marocaine_des_medicaments · a public search page, no key.
//
// The search matches any part of the name, active substance, form or class, 20 rows a page. A row has the product
// name, strength, form, active substances, class, the company and whether it is marketed ("Commercialisé"), only
// authorised ("AMM sans prix") or withdrawn ("Non Commercialisé"). Its detail panel adds the authorisation status
// and whether it is the originator or a generic. Nothing gives the legal class, so prescription, OTC and
// controlled status can't be checked.

import { brandMatches, hasIngredient, leadingNames, norm } from './lib.mjs';

const LIST = 'https://www.ammps.gov.ma/basesdedonnes/liste_marocaine_des_medicaments';

export const registry = { code: 'MA', name: 'AMMPS Liste Marocaine des Médicaments' };
export const cannotDetect = ['OTC', 'PHARMACY', 'RX', 'CONTROLLED'];

// The substance as the list writes it, where the English name doesn't lead to it.
const MA_NAMES = {
  'oral-rehydration-salts': ['SODIUM CITRATE', 'CITRATE DE SODIUM'],
  'calcium-carbonate': ['CARBONATE DE CALCIUM', 'CALCIUM CARBONATE'],
  'polyethylene-glycol': ['MACROGOL'],
  'hydrocortisone-cream': ['HYDROCORTISONE'],
  'diclofenac-gel': ['DICLOFENAC'],
  'antibiotic-ointment': ['NEOMYCINE', 'BACITRACINE'],
  albuterol: ['SALBUTAMOL'],
  epinephrine: ['ADRENALINE', 'EPINEPHRINE'],
};
// Scopolamine butylbromide is a different medicine (for cramps) from the motion-sickness patch.
const MA_NOT = { scopolamine: /BUTYL/ };
// Entries about one form only: hospital adrenaline ampoules are not auto-injectors.
const MA_FORM = {
  epinephrine: /STYLO|AUTO ?INJECT/, scopolamine: /PATCH|TRANSDERM/, oxymetazoline: /NASAL/,
  'hydrocortisone-cream': /CREME|POMMADE/, 'diclofenac-gel': /GEL/,
};

let client;

const clean = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** Rows of one result page, each joined to its detail panel. */
function parsePage(html) {
  const panels = new Map();
  for (const [, id, body] of html.matchAll(/id="medicamentModal(\d+)"(.*?)(?=id="medicamentModal\d+"|$)/gs)) {
    const text = clean(body);
    panels.set(id, {
      authorisation: text.match(/Statut AMM (.+?) Statut commercialisation/)?.[1] ?? null,
      origin: text.match(/PP \/ GN (\S+)/)?.[1] ?? null,
    });
  }
  const tbody = html.match(/<tbody>(.*?)<\/tbody>/s)?.[1] ?? '';
  return [...tbody.matchAll(/<tr>(.*?)<\/tr>/gs)].map(([, tr]) => {
    const c = [...tr.matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map((m) => clean(m[1]));
    const id = tr.match(/medicamentModal(\d+)/)?.[1] ?? null;
    return {
      id, name: c[0] ?? '', strength: c[1] ?? '', form: c[2] ?? '', text: c[3] ?? '', holder: c[5] ?? '',
      // "Commercialisé Export" is made for export and "Commercialisé AO" supplied through tenders, not to pharmacies.
      marketing: c[6] ?? '', current: /^Commercialis[ée]$/i.test(c[6] ?? ''),
      single: !(c[3] ?? '').includes('//'), ...panels.get(id),
    };
  }).filter((r) => r.name);
}

/** Every row the search returns, across pages. */
async function search(term) {
  const url = (page) => `${LIST}?search=${encodeURIComponent(term)}${page > 1 ? `&page=${page}` : ''}`;
  const first = await client.text(url(1));
  const last = Math.max(1, ...[...first.matchAll(/[?&](?:amp;)?page=(\d+)/g)].map((m) => Number(m[1])));
  const rows = parsePage(first);
  for (let p = 2; p <= last; p++) rows.push(...parsePage(await client.text(url(p))));
  return rows;
}

export async function open({ createClient }) {
  client = createClient({ perSecond: 2 });
  return {};
}

const summarise = (p) => ({ id: p.id, product: p.name, strength: p.strength, form: p.form, ingredients: p.text.slice(0, 120), marketing: p.marketing, origin: p.origin, holder: p.holder });

export async function verify({ drug, parsed, keys }) {
  const stems = [...new Set([...keys, ...(MA_NAMES[drug.id] ?? [])])];
  const contains = (p) => hasIngredient(p.text, stems) && !MA_NOT[drug.id]?.test(norm(p.text)) && (MA_FORM[drug.id]?.test(norm(p.form)) ?? true);
  const found = new Map();
  for (const stem of stems) for (const p of await search(stem)) if (contains(p)) found.set(p.id ?? `${p.name} ${p.strength}`, p);
  const all = [...found.values()];
  const current = all.filter((p) => p.current);

  const brands = [];
  for (const name of parsed.names) {
    // The list sometimes splits a brand ("NOVO RAPID FLEXPEN" for NovoRapid).
    const compact = (s) => norm(s).replace(/ /g, '');
    const named = [...await search(name), ...all].filter((p) => brandMatches(p.name, name) || compact(p.name).startsWith(compact(name)));
    const rows = named.filter((p) => p.current && contains(p));
    if (rows.length) {
      brands.push({ name, id: rows[0].id, url: `${LIST}?search=${encodeURIComponent(name)}`, confirmed: true, note: null, matched: rows[0].name, rows });
      continue;
    }
    const notMarketed = named.filter(contains);
    const listed = leadingNames(current.filter((p) => p.single).map((p) => p.name));
    const note = notMarketed.length ? `listed, but not marketed (${[...new Set(notMarketed.map((p) => p.marketing))].join(', ')})`
      : named.length ? `listed under this name with ${named[0].text.slice(0, 60) || 'another substance'}, not this ingredient`
      : `not in the list${listed.length ? ` (for this ingredient it lists ${listed.join(', ')})` : ''}`;
    brands.push({ name, id: null, url: null, confirmed: false, note, rows: [] });
  }

  return {
    ingredient: {
      registered: current.length > 0, id: current[0]?.id ?? null,
      url: `${LIST}?search=${encodeURIComponent(stems[0])}`, searched: stems.join(', '),
      marketedProducts: current.length, otherProducts: all.length - current.length,
    },
    brands: brands.map(({ rows, ...b }) => ({ ...b, products: rows.slice(0, 6).map(summarise) })),
    registryStatus: null,
    statusEvidence: null,
    flags: [],
  };
}
