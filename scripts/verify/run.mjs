// Checks one country's entries in src/data/drugs.json against that country's official drug registry.
//
// Usage: node scripts/verify/run.mjs <US|CA|SG|FR|GB> [--write] [--no-cache]
//
// Without --write this is a dry run: it only writes research/verification/<CC>.json (the evidence and
// every mismatch). With --write it also updates drugs.json, under these rules:
//   - `brand`, `status` and `note` are never edited. Mismatches are reported for a person to decide.
//   - `verified` is attached when the registry confirms the entry, and removed when it no longer does.
//   - US only: an entry whose brand is withdrawn or doubtful is verified on its generic ingredient instead.
//   - `confidence` goes medium → high only when the registry confirms everything the entry claims: brand, ingredient and
//     legal status for a branded entry, or ingredient and legal status for a "sold generic" entry that names no brand.
//     It never goes down.
//
// A registry shows that a product is registered with that ingredient and legal class. It does not show
// that it is the brand a pharmacy is most likely to stock.

import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT, compareStatus, createClient, ingredientKeys, loadDrugs, parseBrand, saveDrugs,
} from './lib.mjs';

const ADAPTERS = {
  US: './us-rxnorm.mjs',
  CA: './ca-dpd.mjs',
  SG: './sg-hsa.mjs',
  FR: './fr-bdpm.mjs',
  GB: './gb-mhra.mjs',
};

const args = process.argv.slice(2);
const code = (args.find((a) => !a.startsWith('--')) ?? '').toUpperCase();
const write = args.includes('--write');
if (!ADAPTERS[code]) {
  console.error(`Usage: node scripts/verify/run.mjs <${Object.keys(ADAPTERS).join('|')}> [--write] [--no-cache]`);
  process.exit(1);
}

const adapter = await import(ADAPTERS[code]);
const useCache = !args.includes('--no-cache');
const session = await adapter.open({ createClient: (opts) => createClient({ ...opts, useCache }) });
const checked = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
const drugs = loadDrugs();
const entries = [];

for (const drug of drugs) {
  const entry = drug.countries[code];
  if (!entry) continue;
  const parsed = parseBrand(entry.brand);
  const res = await adapter.verify({ drug, entry, parsed, keys: ingredientKeys(drug) });

  const brandsConfirmed = parsed.kind === 'brand' && res.brands.length > 0 && res.brands.every((b) => b.confirmed);
  const statusResult = compareStatus(entry.status, res.registryStatus, adapter.cannotDetect);

  // `doubtful`: the registry still lists the brand, but a second source says it's no longer sold.
  const brandsSolid = brandsConfirmed && !res.brands.some((b) => b.doubtful);
  const onIngredient = parsed.kind === 'brand' && !brandsSolid && adapter.fallbackToIngredient && res.ingredient.registered;

  let checks = [];
  if (parsed.kind === 'brand') checks = brandsSolid ? ['brand', 'ingredient'] : onIngredient ? ['ingredient'] : [];
  else if (parsed.kind === 'generic') checks = res.ingredient.registered ? ['ingredient'] : [];
  else if (parsed.kind === 'other') checks = res.ingredient.registered && statusResult === 'agree' ? ['ingredient'] : [];
  if (checks.length && statusResult === 'agree') checks.push('status');

  const anchor = (onIngredient ? null : res.brands.find((b) => b.confirmed)) ?? res.ingredient;
  const verified = checks.length && anchor.id
    ? { registry: adapter.registry.name, id: String(anchor.id), url: anchor.url, checked, checks }
    : null;

  const flags = [...(res.flags ?? [])];
  for (const b of res.brands) if (!b.confirmed) flags.push(`Brand "${b.name}" not confirmed: ${b.note ?? 'not found'}`);
  if (parsed.kind === 'unavailable' && res.ingredient.registered) {
    flags.push(`Entry says "${entry.brand}" but the registry lists products with this ingredient`);
  }
  if (parsed.kind === 'generic' && !res.ingredient.registered) flags.push('Ingredient not found in this registry');
  if (statusResult === 'differ') flags.push(`Status differs: entry ${entry.status}, registry ${res.registryStatus}`);

  // A generic-only entry makes no brand claim, so there is no brand to confirm.
  const genericConfirmed = parsed.kind === 'generic' && checks.includes('ingredient');
  const raise = entry.confidence === 'medium' && (brandsSolid || genericConfirmed) && statusResult === 'agree';

  entries.push({
    id: drug.id,
    generic: drug.generic,
    brand: entry.brand,
    kind: parsed.kind,
    brands: res.brands,
    ingredient: res.ingredient,
    status: { entry: entry.status, registry: res.registryStatus, result: statusResult, evidence: res.statusEvidence ?? null },
    verified,
    confidence: raise ? { from: 'medium', to: 'high' } : { from: entry.confidence, to: entry.confidence },
    flags,
  });

  if (write) {
    if (verified) entry.verified = verified;
    else if (entry.verified?.registry === adapter.registry.name) delete entry.verified;
    if (raise) entry.confidence = 'high';
    if (res.drugPatch?.rxcui) drug.rxcui = res.drugPatch.rxcui;
  }
  process.stderr.write('.');
}
process.stderr.write('\n');

const count = (f) => entries.filter(f).length;
const brandEntries = entries.filter((e) => e.kind === 'brand');
const summary = {
  entries: entries.length,
  brandEntries: brandEntries.length,
  brandEntriesConfirmed: brandEntries.filter((e) => e.brands.every((b) => b.confirmed)).length,
  brandNames: brandEntries.reduce((n, e) => n + e.brands.length, 0),
  brandNamesConfirmed: brandEntries.reduce((n, e) => n + e.brands.filter((b) => b.confirmed).length, 0),
  verified: count((e) => e.verified),
  statusAgree: count((e) => e.status.result === 'agree'),
  statusDiffer: count((e) => e.status.result === 'differ'),
  statusNotComparable: count((e) => e.status.result === 'na'),
  confidenceRaised: count((e) => e.confidence.from !== e.confidence.to),
  flagged: count((e) => e.flags.length > 0),
};

const outDir = path.join(ROOT, 'research/verification');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `${code}.json`);
fs.writeFileSync(out, JSON.stringify({
  country: code, registry: adapter.registry.name, registryVersion: session?.version ?? null, checked, summary, entries,
}, null, 2) + '\n');

if (write) {
  // Keep `rxcui` next to `atc` rather than after the long `countries` block.
  saveDrugs(drugs.map(({ id, generic, usAlt, cls, atc, rxcui, kit, countries, ...rest }) => ({
    id, generic, usAlt, cls, atc, ...(rxcui ? { rxcui } : {}), ...(kit ? { kit } : {}), ...rest, countries,
  })));
}

console.log(`${code} · ${adapter.registry.name}${session?.version ? ` (${session.version})` : ''}`);
console.log(`  brand names confirmed   ${summary.brandNamesConfirmed} of ${summary.brandNames} (${summary.brandEntriesConfirmed} of ${summary.brandEntries} entries fully)`);
console.log(`  entries verified        ${summary.verified} of ${summary.entries}`);
console.log(`  legal status            ${summary.statusAgree} agree · ${summary.statusDiffer} differ · ${summary.statusNotComparable} not comparable`);
console.log(`  confidence medium→high  ${summary.confidenceRaised}`);
console.log(`\n  Needs a look (${summary.flagged}):`);
for (const e of entries) for (const f of e.flags) console.log(`    ${e.id}: ${f}`);
console.log(`\nWrote ${path.relative(ROOT, out)}${write ? ' and updated src/data/drugs.json' : ' (dry run; pass --write to update drugs.json)'}`);
