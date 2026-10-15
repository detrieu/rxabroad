// Türkiye: two spreadsheets that TİTCK, the medicines agency, reissues every week.
//   Licensed products    https://www.titck.gov.tr/dinamikmodul/85   brand, ingredient, ATC code, licence number,
//                                                                    and whether the licence is suspended
//   E-prescription list  https://www.titck.gov.tr/dinamikmodul/43   packs on sale, each with its prescription type:
//                                                                    Normal, Yeşil (green), Kırmızı (red), Mor, Turuncu
//
// A red or green prescription marks a narcotic or psychotropic, so the lists confirm a controlled status. They do
// not say whether a "Normal" product needs a prescription at all, so over-the-counter, ask-the-pharmacist and
// prescription entries can't be compared: those stay a person's call.

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, aggregateStatus, brandMatches, isCombo, leadingNames, norm, sheetRows, statusPool } from './lib.mjs';

const LICENSED = 'https://www.titck.gov.tr/dinamikmodul/85';
const ON_SALE = 'https://www.titck.gov.tr/dinamikmodul/43';
const DIR = path.join(ROOT, 'node_modules/.cache/rxabroad-verify/tr');
const TABLE = path.join(DIR, 'table.json');
const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;
const UA = { 'User-Agent': 'rxabroad-verify (+https://rxabroad.vercel.app)' };

export const registry = { code: 'TR', name: 'TİTCK licensed medicines lists (Türkiye)' };
export const cannotDetect = ['OTC', 'PHARMACY', 'MIXED', 'RX'];

// Prescription type → status. Purple and orange prescriptions are for blood products and similar, not for
// narcotics or psychotropics.
const RX_TYPE = { NORMAL: 'NOT_CONTROLLED', MOR: 'NOT_CONTROLLED', TURUNCU: 'NOT_CONTROLLED', YESIL: 'CONTROLLED', KIRMIZI: 'CONTROLLED' };

// The ingredient as the lists write it, for medicines they file under another ATC code than ours and under a
// Turkish name our English one doesn't start.
const TR_NAMES = {
  'calcium-carbonate': ['KALSIYUM KARBONAT'], 'hydrocortisone-cream': ['HIDROKORTIZON'], 'antibiotic-ointment': ['BASITRASIN'],
  'oral-rehydration-salts': ['ORAL REHIDRASYON'], 'polyethylene-glycol': ['MAKROGOL', 'POLIETILEN GLIKOL'], epinephrine: ['EPINEFRIN', 'ADRENALIN'],
  meclozine: ['MEKLIZIN'], pseudoephedrine: ['PSODOEFEDRIN'],
};

/** The newest spreadsheet a list page links to. File names carry the issue date and a random id. */
async function newest(page) {
  const res = await fetch(page, { headers: UA });
  if (!res.ok) throw new Error(`${page} answered ${res.status}`);
  const files = [...(await res.text()).matchAll(/href="([^"]+\.xlsx)"/g)].map(([, href]) => {
    const [, d, m, y] = href.match(/(\d{2})\.(\d{2})\.(\d{4})/) ?? [];
    return { url: new URL(href, page).href, date: y ? `${y}-${m}-${d}` : '' };
  });
  if (!files.length) throw new Error(`${page} no longer links to a spreadsheet`);
  return files.sort((a, b) => b.date.localeCompare(a.date))[0];
}

/** One list as plain rows. Columns are found by their headings, so a reordered file still reads correctly. */
async function readList(page, headings) {
  const file = await newest(page);
  const res = await fetch(file.url, { headers: UA });
  if (!res.ok) throw new Error(`${file.url} answered ${res.status}`);
  const xlsx = path.join(DIR, 'list.xlsx');
  fs.writeFileSync(xlsx, Buffer.from(await res.arrayBuffer()));
  const sheet = sheetRows(xlsx);
  fs.rmSync(xlsx, { force: true });

  // A title sits above the headings, so look for the row that names the barcode column.
  const at = sheet.findIndex((r) => Object.values(r).some((v) => norm(v) === 'BARKOD'));
  if (at < 0) throw new Error(`${page}: the spreadsheet no longer has a "Barkod" column`);
  const col = {};
  for (const [key, heading] of Object.entries(headings)) {
    col[key] = Object.keys(sheet[at]).find((k) => norm(sheet[at][k]).startsWith(heading));
    if (!col[key]) throw new Error(`${page}: the spreadsheet no longer has a "${heading}" column`);
  }
  const rows = sheet.slice(at + 1).map((r) => Object.fromEntries(Object.entries(col).map(([key, c]) => [key, (r[c] ?? '').replace(/\s+/g, ' ').trim()])));
  return { date: file.date, rows: rows.filter((r) => r.barcode && r.name) };
}

const atcCode = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
const parts = (s) => s.split(/[+,/;]| ve | and /i).map(norm).filter(Boolean);

async function loadTable(log) {
  fs.mkdirSync(DIR, { recursive: true });
  if (fs.existsSync(TABLE) && Date.now() - fs.statSync(TABLE).mtimeMs < CHECK_EVERY_MS) return JSON.parse(fs.readFileSync(TABLE, 'utf8'));

  log('downloading the TİTCK lists (about 4 MB)');
  const licensed = await readList(LICENSED, { barcode: 'BARKOD', name: 'URUN ADI', ingredient: 'ETKIN MADDE', atc: 'ATC KODU', holder: 'RUHSAT SAHIBI', licence: 'RUHSAT NUMARASI', suspended: 'RUHSATI ASKIDA' });
  const onSale = await readList(ON_SALE, { barcode: 'BARKOD', name: 'ILAC ADI', atc: 'ATC KODU', ingredient: 'ATC ADI', holder: 'FIRMA ADI', rx: 'RECETE TURU' });
  if (licensed.rows.length < 10000 || onSale.rows.length < 3000) {
    throw new Error(`TİTCK lists read as only ${licensed.rows.length} and ${onSale.rows.length} rows; their layout may have changed`);
  }

  // One product per barcode. The suspended column is 0 for a licence in force; 1 to 3 give the reason it isn't.
  const byBarcode = new Map();
  for (const r of licensed.rows) {
    const names = parts(r.ingredient);
    byBarcode.set(r.barcode, {
      barcode: r.barcode, name: r.name, licence: r.licence || null, holder: r.holder || null, current: !r.suspended || r.suspended === '0',
      atcs: [atcCode(r.atc)].filter(Boolean), names, single: names.length <= 1, rx: null,
    });
  }
  // The e-prescription list names the ATC substance in English and says "combinations" for a mixed product.
  for (const r of onSale.rows) {
    const p = byBarcode.get(r.barcode) ?? { barcode: r.barcode, name: r.name, licence: null, holder: r.holder || null, current: true, atcs: [], names: [], single: true };
    const atc = atcCode(r.atc);
    if (atc && !p.atcs.includes(atc)) p.atcs.push(atc);
    if (/combination/i.test(r.ingredient)) p.single = false;
    else p.names.push(...parts(r.ingredient).filter((n) => !p.names.includes(n)));
    p.rx = norm(r.rx) || null;
    byBarcode.set(r.barcode, p);
  }
  const table = { licensed: licensed.date, onSale: onSale.date, products: [...byBarcode.values()] };
  fs.writeFileSync(TABLE, JSON.stringify(table));
  return table;
}

let table;

export async function open() {
  table = await loadTable((m) => process.stderr.write(`\n${m}\n`));
  return { version: `${table.products.length} products, lists of ${table.licensed} and ${table.onSale}` };
}

const isSingle = (p) => p.single;
const summarise = (p) => ({ licence: p.licence, barcode: p.barcode, product: p.name, ingredient: p.names.join(' + '), prescription: p.rx, holder: p.holder });

export async function verify({ drug, entry, parsed, keys }) {
  const coded = (p) => p.atcs.some((a) => a === drug.atc || (drug.atc.length < 7 && a.startsWith(drug.atc)));
  // The two lists can file one product under different ATC codes (gabapentin moved from N03 to N02), so also
  // accept the names used on the single-ingredient products that carry our code. A name has to recur to count.
  const tally = new Map();
  for (const p of table.products) if (isSingle(p) && coded(p)) for (const n of p.names) tally.set(n, (tally.get(n) ?? 0) + 1);
  const total = [...tally.values()].reduce((a, b) => a + b, 0);
  const names = [...new Set([...keys, ...(TR_NAMES[drug.id] ?? []), ...[...tally].filter(([, n]) => n >= 2 && n >= total * 0.2).map(([name]) => name)])];
  const contains = (p) => coded(p) || p.names.some((g) => names.some((n) => g.startsWith(n)));
  const current = table.products.filter((p) => p.current && contains(p));

  const flags = [];
  if (!isCombo(drug) && current.length && !current.some(isSingle)) {
    flags.push(`Only licensed in combination with other ingredients here (${leadingNames(current.map((p) => p.name)).join(', ')})`);
  }
  const brands = parsed.names.map((name) => {
    const named = table.products.filter((p) => brandMatches(p.name, name));
    // Packs on sale first: they carry the prescription type.
    const matched = named.filter((p) => p.current && contains(p)).sort((a, b) => !!b.rx - !!a.rx);
    if (matched.length) {
      if (!matched[0].rx) flags.push(`"${name}" is licensed, but none of its packs is on the e-prescription list of products on sale`);
      return { name, id: matched[0].licence ?? matched[0].barcode, url: LICENSED, confirmed: true, note: null, matched: matched[0].name, rows: matched };
    }
    const lapsed = named.filter(contains);
    const listed = leadingNames(current.filter(isSingle).map((p) => p.name));
    const note = lapsed.length ? `licensed, but the licence is suspended on all ${lapsed.length} of its packs`
      : named.length ? `licensed under this name with ${named[0].names.join(' + ') || 'another ingredient'}, not this ingredient`
      : `not in the TİTCK lists${listed.length ? ` (for this ingredient they list ${listed.join(', ')})` : ''}`;
    return { name, id: null, url: null, confirmed: false, note, rows: [] };
  });

  const scoped = parsed.kind === 'brand' ? brands.flatMap((b) => b.rows) : current;
  const pool = statusPool(drug, scoped, isSingle).filter((p) => RX_TYPE[p.rx]);
  const types = {};
  for (const p of pool) types[p.rx] = (types[p.rx] ?? 0) + 1;
  const registryStatus = aggregateStatus(pool.map((p) => RX_TYPE[p.rx]));
  // run.mjs can't compare these statuses, so a controlled finding has to be raised here or it would go unreported.
  if (registryStatus === 'CONTROLLED' && entry.status !== 'CONTROLLED') {
    flags.push(`Entry says ${entry.status}, but the e-prescription list puts it on a red or green (controlled) prescription`);
  }

  const first = current.find((p) => p.rx) ?? current[0];
  return {
    ingredient: { registered: current.length > 0, id: first?.licence ?? first?.barcode ?? null, url: LICENSED, searched: drug.atc, currentProducts: current.length, onSale: current.filter((p) => p.rx).length },
    brands: brands.map(({ rows, ...b }) => ({ ...b, products: rows.slice(0, 6).map(summarise) })),
    registryStatus,
    statusEvidence: pool.length ? { source: 'TİTCK e-prescription list, prescription type', products: types } : null,
    flags,
  };
}
