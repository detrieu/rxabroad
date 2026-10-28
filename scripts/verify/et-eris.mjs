// Ethiopia: the register of approved products in eRIS, the regulator EFDA's licensing system.
// https://eris.efda.gov.et/public/products · the service behind that page exports the whole register as one
// spreadsheet, no key.
//
// A row has the brand name, a product name written "BRAND - INGREDIENT - STRENGTH - FORM", the marketing
// authorisation number, the licence holder and the expiry date. Applicants type the ingredient themselves and
// some are misspelt ("Amoxacilline"), so a missing ingredient is reported but proves nothing.
//
// The register has no legal class. That comes from a second document, EFDA's Over-the-Counter Medicines List:
// a medicine on it may be dispensed without a prescription under a pharmacist's supervision, and anything else
// needs one. The list is a PDF, so what it says about our medicines is keyed in by hand below, and each run only
// checks that the file is still the one those lines were read from.

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, brandMatches, hasIngredient, leadingNames, norm, unxml } from './lib.mjs';

const API = 'https://api.eris.efda.gov.et/api/Public/Product';
const PAGE = 'https://eris.efda.gov.et/public/products';
const DIR = path.join(ROOT, 'node_modules/.cache/rxabroad-verify/et');
const TABLE = path.join(DIR, 'table.json');
const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;
const UA = { 'User-Agent': 'rxabroad-verify (+https://rxabroad.vercel.app)' };

export const registry = { code: 'ET', name: 'EFDA register of approved medicines (Ethiopia)' };
export const cannotDetect = ['MIXED', 'CONTROLLED'];

const OTC_LIST = {
  url: 'https://www.efda.gov.et/wp-content/uploads/2022/09/OTC-medicines-list.pdf',
  edition: 'third edition, July 2022',
  sha256: '13527629744421b88a899379ac7a3b8c5b84d7c6d32d84a8c18c5f95afaacaf3',
  // Our medicines that the list names on their own, with the forms it allows.
  listed: {
    paracetamol: 'tablets, syrup, drops and suppositories', ibuprofen: '200 to 400 mg tablets or capsules, suspension and suppositories',
    aspirin: '300 and 500 mg tablets', loratadine: '10 mg tablets and syrup', dimenhydrinate: '50 mg tablets',
    albuterol: 'inhaler (0.1 mg a dose) and syrup', 'diclofenac-gel': 'gel, 1% to 2.32%', guaifenesin: 'tablets, capsules and syrup',
    dextromethorphan: 'syrup', 'calcium-carbonate': 'chewable tablets', simeticone: 'chewable tablets, capsules and oral drops',
    'oral-rehydration-salts': 'sachets', bisacodyl: '5 and 10 mg tablets and suppositories', 'polyethylene-glycol': '10 g and 17 g sachets',
    levonorgestrel: '0.75 mg and 1.5 mg tablets', scopolamine: '0.6 mg tablets (hyoscine hydrobromide)',
  },
  // Named only inside combination products, so the ingredient on its own is not over the counter.
  comboOnly: {
    diphenhydramine: 'a cough syrup with sodium citrate and ammonium chloride, and a cold tablet with paracetamol and pseudoephedrine',
    pseudoephedrine: 'cold and allergy combinations (with loratadine, paracetamol, ibuprofen or cough medicines)',
  },
};

/** Whether the list on EFDA's site is still the file OTC_LIST was read from: 'same', 'changed' or 'unreachable'. */
async function listState() {
  try {
    const res = await fetch(OTC_LIST.url, { headers: UA });
    if (!res.ok) return 'unreachable';
    return crypto.createHash('sha256').update(Buffer.from(await res.arrayBuffer())).digest('hex') === OTC_LIST.sha256 ? 'same' : 'changed';
  } catch {
    return 'unreachable';
  }
}

/** Rows of the export as arrays of cell text. It writes every cell inline, with no cell references or shared strings. */
function exportRows(file) {
  const xml = execFileSync('unzip', ['-p', file, 'xl/worksheets/sheet1.xml'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return [...xml.matchAll(/<x:row>(.*?)<\/x:row>/gs)].map(([, row]) =>
    [...row.matchAll(/<x:c[^>]*?(?:\/>|>(?:<x:v>([^<]*)<\/x:v>)?<\/x:c>)/g)].map(([, v]) => unxml(v ?? '').replace(/\s+/g, ' ').trim()));
}

/** "10/11/2031 00:00:00" (month first) → "2031-10-11". */
const isoDate = (s) => s.replace(/^(\d{2})\/(\d{2})\/(\d{4}).*$/, '$3-$1-$2');

async function loadTable(log) {
  fs.mkdirSync(DIR, { recursive: true });
  if (fs.existsSync(TABLE) && Date.now() - fs.statSync(TABLE).mtimeMs < CHECK_EVERY_MS) return JSON.parse(fs.readFileSync(TABLE, 'utf8'));

  log('downloading the EFDA register (under 1 MB)');
  // The report definition gives the report's id and its filters; the export wants the filters sent back.
  const def = await fetch(`${API}/ListReport`, { headers: UA });
  if (!def.ok) throw new Error(`${API}/ListReport answered ${def.status}`);
  const { report, filters } = await def.json();
  const type = filters.find((f) => f.parameterName === 'submoduletype');
  const medicine = type?.data?.find((t) => t.name === 'Medicine');
  if (!medicine) throw new Error('the EFDA register no longer offers a "Medicine" product type');
  const body = filters.map((f) => ({ ...f, data: undefined, value: f === type ? medicine.id : null }));
  const res = await fetch(`${API}/List/Export/Excel/${report.id}`, { method: 'POST', headers: { ...UA, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`the EFDA export answered ${res.status}`);
  const xlsx = path.join(DIR, 'register.xlsx');
  fs.writeFileSync(xlsx, Buffer.from(await res.arrayBuffer()));
  const rows = exportRows(xlsx);
  fs.rmSync(xlsx, { force: true });

  // A letterhead sits above the headings. Find the columns by their headings, so a reordered file still reads correctly.
  const at = rows.findIndex((r) => r.includes('MA Number'));
  const col = (heading) => {
    const i = at < 0 ? -1 : rows[at].indexOf(heading);
    if (i < 0) throw new Error(`the EFDA export no longer has a "${heading}" column`);
    return i;
  };
  const c = { ma: col('MA Number'), brand: col('Brand Name'), name: col('Product Name'), holder: col('License Holder'), expires: col('Expiry Date') };
  const today = new Date().toLocaleDateString('en-CA');
  const products = rows.slice(at + 1).filter((r) => r[c.ma] && r[c.name]).map((r) => {
    const brand = r[c.brand] || r[c.name].split(' - ')[0];
    const rest = r[c.name].toUpperCase().startsWith(`${brand.toUpperCase()} - `) ? r[c.name].slice(brand.length + 3) : r[c.name];
    const ingredient = rest.split(' - ')[0].trim();
    const expires = isoDate(r[c.expires] ?? '');
    return { ma: r[c.ma], brand, name: r[c.name], ingredient, single: !/[+,/&]| and | with /i.test(ingredient), holder: r[c.holder] || null, expires, current: !expires || expires >= today };
  });
  if (products.length < 2000) throw new Error(`the EFDA export read as only ${products.length} rows; its layout may have changed`);
  const table = { downloaded: today, otcList: await listState(), products };
  fs.writeFileSync(TABLE, JSON.stringify(table));
  return table;
}

let table;

export async function open() {
  table = await loadTable((m) => process.stderr.write(`\n${m}\n`));
  if (table.otcList === 'unreachable') process.stderr.write(`ET: note: could not download the over-the-counter list to check it is unchanged (${OTC_LIST.url})\n`);
  return { version: `${table.products.length} products, exported ${table.downloaded}; over-the-counter list, ${OTC_LIST.edition}` };
}

// A replaced list may have moved medicines on or off it, so the statuses below can't be trusted until someone re-reads it.
export const checkGap = () =>
  (table?.otcList === 'changed' ? `EFDA has replaced its over-the-counter list (this check was written from the ${OTC_LIST.edition}). Re-read ${OTC_LIST.url} and update OTC_LIST in et-eris.mjs.` : null);

const isSingle = (p) => p.single;
// Entries about one form only: clinic adrenaline ampoules are not auto-injectors.
const ET_FORM = { epinephrine: /AUTO ?INJECT|\bPEN\b/ };
const summarise = (p) => ({ maNumber: p.ma, product: p.name, expires: p.expires, holder: p.holder });

export async function verify({ drug, parsed, keys }) {
  const contains = (p) => hasIngredient(p.ingredient, keys) && (ET_FORM[drug.id]?.test(norm(p.name)) ?? true);
  const current = table.products.filter((p) => p.current && contains(p));

  const brands = parsed.names.map((name) => {
    const named = table.products.filter((p) => brandMatches(p.brand, name));
    const matched = named.filter((p) => p.current && contains(p));
    if (matched.length) return { name, id: matched[0].ma, url: PAGE, confirmed: true, note: null, matched: matched[0].brand, rows: matched };
    const expired = named.filter(contains);
    const listed = leadingNames(current.filter(isSingle).map((p) => p.brand));
    const note = expired.length ? `registered, but all ${expired.length} of its registrations have expired`
      : named.length ? `registered under this name with ${named[0].ingredient || 'another ingredient'}, not this ingredient`
      : `not in the EFDA register${listed.length ? ` (for this ingredient it lists ${listed.join(', ')})` : ''}`;
    return { name, id: null, url: null, confirmed: false, note, rows: [] };
  });

  // What the register calls it, so a "sold generic" entry can be read against real product names.
  const first = current.find(isSingle) ?? current[0];
  return {
    ingredient: { registered: current.length > 0, id: first?.ma ?? null, url: PAGE, searched: keys.join(', '), currentRegistrations: current.length, soldAs: leadingNames(current.filter(isSingle).map((p) => p.brand)) },
    brands: brands.map(({ rows, ...b }) => ({ ...b, products: rows.slice(0, 6).map(summarise) })),
    registryStatus: OTC_LIST.listed[drug.id] ? 'NO_RX' : 'RX',
    statusEvidence: {
      source: `EFDA Over-the-Counter Medicines List, ${OTC_LIST.edition}`, url: OTC_LIST.url,
      listed: OTC_LIST.listed[drug.id] ?? (OTC_LIST.comboOnly[drug.id] ? `only in combinations: ${OTC_LIST.comboOnly[drug.id]}` : 'not on the list'),
    },
    flags: [],
  };
}
