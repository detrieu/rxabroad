// Mexico: COFEPRIS's medicine registration viewer (Visor de Registros de Medicamentos).
// https://registros.cofepris.gob.mx/BRSDM/
//
// Its search form sits behind a captcha, but the site also offers the whole database as one spreadsheet
// ("Base Completa"): brand, generic name, ATC code, registration status and the legal class of sale
// (Fracción I to VI of article 226 of the Ley General de Salud).
//
// The file may not be complete (some well-known brands have no row, and local spellings differ: Elicuis,
// Jardianz, Lopresor). So a row confirms an entry, but a missing row does not show that a brand is gone.

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, aggregateStatus, brandMatches, leadingNames, norm, sheetRows, statusPool } from './lib.mjs';

const PAGE = 'https://registros.cofepris.gob.mx/BRSDM/';
const FILE = `${PAGE}public/completo/Visor_Registros_Medicamentos.xlsx`;
const DIR = path.join(ROOT, 'node_modules/.cache/rxabroad-verify/mx');
const TABLE = path.join(DIR, 'table.json');
const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;
const UA = { 'User-Agent': 'rxabroad-verify (+https://rxabroad.vercel.app)' };

export const registry = { code: 'MX', name: 'COFEPRIS medicine register (Mexico)' };
export const cannotDetect = [];

// Fracción → status. I is narcotics, II and III psychotropics; V is sold without a prescription in pharmacies
// only, VI anywhere.
const CLASS = { I: 'CONTROLLED', II: 'CONTROLLED', III: 'CONTROLLED', IV: 'RX', V: 'PHARMACY', VI: 'OTC' };

// The generic name as the register writes it, for medicines it files under a different ATC code than ours
// or under none that matches.
const MX_NAMES = {
  dimenhydrinate: ['DIMENHIDRINATO'], gabapentin: ['GABAPENTINA'], apixaban: ['APIXABAN'], hydrocodone: ['HIDROCODONA'],
  amphetamine: ['ANFETAMINA', 'DEXANFETAMINA', 'LISDEXANFETAMINA'], pseudoephedrine: ['PSEUDOEFEDRINA'], doxylamine: ['DOXILAMINA'],
  scopolamine: ['ESCOPOLAMINA'], 'atovaquone-proguanil': ['ATOVACUONA'], 'insulin-degludec': ['INSULINA DEGLUDEC'],
  'antibiotic-ointment': ['BACITRACINA'], meclozine: ['MECLOZINA'], 'insulin-regular': ['INSULINA HUMANA'], 'insulin-nph': ['INSULINA HUMANA'], epinephrine: ['EPINEFRINA', 'ADRENALINA'], acetazolamide: ['ACETAZOLAMIDA'],
};

async function loadTable(log) {
  fs.mkdirSync(DIR, { recursive: true });
  if (fs.existsSync(TABLE) && Date.now() - fs.statSync(TABLE).mtimeMs < CHECK_EVERY_MS) return JSON.parse(fs.readFileSync(TABLE, 'utf8'));

  log('downloading the COFEPRIS register (about 7 MB)');
  const res = await fetch(FILE, { headers: UA });
  if (!res.ok) throw new Error(`${FILE} answered ${res.status}`);
  const xlsx = path.join(DIR, 'register.xlsx');
  fs.writeFileSync(xlsx, Buffer.from(await res.arrayBuffer()));
  const [head, ...rows] = sheetRows(xlsx);
  fs.rmSync(xlsx, { force: true });
  // Find the columns by their headings, so a reordered file still reads correctly.
  const col = (heading) => {
    const found = Object.keys(head).find((k) => norm(head[k]) === norm(heading));
    if (!found) throw new Error(`COFEPRIS register no longer has a "${heading}" column`);
    return found;
  };
  const c = { reg: col('Número de Registro'), brand: col('Denominación Distintiva'), state: col('Estado'), fraction: col('Fracción'), generic: col('Denominacion Generica'), atc: col('Sustancia Química'), holder: col('Titular') };
  const products = rows.filter((r) => r[c.reg] && r[c.brand]).map((r) => ({
    reg: r[c.reg].trim(), brand: r[c.brand].trim(), current: r[c.state] === 'VIGENTE',
    fraction: r[c.fraction]?.match(/^\s*(VI|IV|V|III|II|I)\./)?.[1] ?? null,
    generics: (r[c.generic] ?? '').split('/').map((s) => s.trim()).filter(Boolean),
    atc: (r[c.atc] ?? '').trim().split(/\s+/)[0], holder: r[c.holder]?.trim() ?? null,
  }));
  if (products.length < 5000) throw new Error(`COFEPRIS register read as only ${products.length} rows; its layout may have changed`);
  const modified = res.headers.get('last-modified');
  const table = { released: modified ? new Date(modified).toLocaleDateString('en-CA') : null, products };
  fs.writeFileSync(TABLE, JSON.stringify(table));
  return table;
}

let table;

export async function open() {
  table = await loadTable((m) => process.stderr.write(`\n${m}\n`));
  return { version: `${table.products.length} registrations${table.released ? `, file of ${table.released}` : ''}` };
}

const isSingle = (p) => p.generics.length === 1;
const summarise = (p) => ({ registration: p.reg, product: p.brand, generic: p.generics.join(' / '), fraction: p.fraction, holder: p.holder });

export async function verify({ drug, parsed }) {
  // The register files some products under another ATC code than ours (a cream under the code for pessaries),
  // so also accept the generic names it uses on the single-ingredient products that do carry our code.
  // A name has to recur to count: one bupropion product is filed under simeticone's code by mistake.
  const tally = new Map();
  for (const p of table.products) if (p.atc === drug.atc && isSingle(p)) tally.set(norm(p.generics[0]), (tally.get(norm(p.generics[0])) ?? 0) + 1);
  const coded = [...tally.values()].reduce((a, b) => a + b, 0);
  const recurring = [...tally].filter(([, n]) => n >= 2 && n >= coded * 0.2).map(([name]) => name);
  const names = [...new Set([...(MX_NAMES[drug.id] ?? []), ...(recurring.length ? recurring : tally.keys())])];
  const named = (g) => names.some((n) => g === n || g.startsWith(`${n} `));
  const contains = (p) => p.generics.some((g) => named(norm(g))) || (!!drug.atc && p.atc.startsWith(drug.atc) && !(isSingle(p) && recurring.length));
  const current = table.products.filter((p) => p.current && contains(p));

  const brands = parsed.names.map((name) => {
    const named = table.products.filter((p) => brandMatches(p.brand, name));
    const matched = named.filter((p) => p.current && contains(p));
    if (matched.length) {
      return { name, id: matched[0].reg, url: PAGE, confirmed: true, note: null, matched: matched[0].brand, rows: matched };
    }
    const lapsed = named.filter(contains);
    const listed = leadingNames(current.filter(isSingle).map((p) => p.brand));
    const note = lapsed.length ? `registered, but its ${lapsed.length} registration${lapsed.length > 1 ? 's are' : ' is'} cancelled or revoked`
      : named.length ? `registered under this name with ${named[0].generics.join(' + ') || 'another ingredient'}, not this ingredient`
      : `not in the COFEPRIS file, which may be incomplete${listed.length ? ` (for this ingredient it lists ${listed.join(', ')})` : ''}`;
    return { name, id: null, url: null, confirmed: false, note, rows: [] };
  });

  const scoped = parsed.kind === 'brand' ? brands.flatMap((b) => b.rows) : current;
  const pool = statusPool(drug, scoped, isSingle).filter((p) => p.fraction);
  const classes = {};
  for (const p of pool) classes[p.fraction] = (classes[p.fraction] ?? 0) + 1;

  return {
    ingredient: { registered: current.length > 0, id: current[0]?.reg ?? null, url: PAGE, searched: drug.atc, currentRegistrations: current.length },
    brands: brands.map(({ rows, ...b }) => ({ ...b, products: rows.slice(0, 6).map(summarise) })),
    registryStatus: aggregateStatus(pool.map((p) => CLASS[p.fraction])),
    statusEvidence: pool.length ? { source: 'COFEPRIS Fracción (article 226, Ley General de Salud)', products: classes } : null,
    flags: [],
  };
}
