// Runs every country's check in turn: `npm run verify` (dry run) or `npm run verify:write`.
// A country that fails (or refuses to write) doesn't stop the others; the summary at the end says which.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const COUNTRIES = ['US', 'CA', 'SG', 'FR', 'GB', 'JP'];
const flags = process.argv.slice(2).filter((a) => a.startsWith('--'));
const write = flags.includes('--write');

const failed = [];
for (const code of COUNTRIES) {
  console.log(`\n=== ${code} ===`);
  const r = spawnSync(process.execPath, [path.join(dir, 'run.mjs'), code, ...flags], { stdio: 'inherit' });
  if (r.status !== 0) failed.push(code);
}

if (write) {
  console.log('\n=== confidence report ===');
  spawnSync(process.execPath, [path.join(dir, '../confidence-report.mjs')], { stdio: 'inherit' });
}

console.log(`\n${failed.length ? `Did not finish: ${failed.join(', ')}. See the messages above.` : `All ${COUNTRIES.length} countries checked${write ? ' and written' : ' (dry run; use `npm run verify:write` to update drugs.json)'}.`}`);
process.exit(failed.length ? 1 : 0);
