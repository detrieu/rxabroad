// NHS dm+d (dictionary of medicines and devices), the UK source for legal category (GSL / P / POM) and
// controlled-drug schedule. NHS TRUD publishes it weekly as a zip; downloading needs a free account.
// https://isd.digital.nhs.uk/trud/users/guest/filters/0/categories/6/items/24/releases
//
// The key is read from TRUD_API_KEY (environment or .env.local) and is never written anywhere.
// The release is unpacked into node_modules/.cache and boiled down to one compact table of
// products that still have a pack on the market: name, ingredients, legal categories, controlled-drug schedule.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const ITEM = 24;
const DIR = path.join(ROOT, 'node_modules/.cache/rxabroad-verify/dmd');
const TABLE = path.join(DIR, 'table.json');
const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;

function apiKey() {
  // Set in the environment (even to an empty string, to switch dm+d off) it wins over .env.local.
  if (process.env.TRUD_API_KEY !== undefined) return process.env.TRUD_API_KEY.trim() || null;
  try {
    const line = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('TRUD_API_KEY='));
    return line ? line.slice('TRUD_API_KEY='.length).trim().replace(/^["']|["']$/g, '') : null;
  } catch {
    return null;
  }
}

const tag = (xml, name) => xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1] ?? null;
const rows = (xml, name) => xml.matchAll(new RegExp(`<${name}>(.*?)</${name}>`, 'gs'));
const unxml = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

/** Legal category codes from the release's own lookup file: { '0001': 'GSL', ... }. */
function lookup(xml, name) {
  const block = xml.match(new RegExp(`<${name}>(.*?)</${name}>`, 's'))?.[1] ?? '';
  return Object.fromEntries([...rows(block, 'INFO')].map(([, i]) => [tag(i, 'CD'), unxml(tag(i, 'DESC') ?? '')]));
}

function build(dir) {
  const read = (prefix) => {
    const f = fs.readdirSync(dir).find((n) => n.startsWith(prefix) && n.endsWith('.xml'));
    if (!f) throw new Error(`dm+d release has no ${prefix} file`);
    return fs.readFileSync(path.join(dir, f), 'utf8');
  };

  const lookups = read('f_lookup');
  const legalNames = lookup(lookups, 'LEGAL_CATEGORY'); // GSL, P, POM, Not Applicable
  const controlNames = lookup(lookups, 'CONTROL_DRUG_CATEGORY'); // "Schedule 2 (CD)", ...

  const ingredientName = new Map([...rows(read('f_ingredient'), 'ING')].map(([, r]) => [tag(r, 'ISID'), unxml(tag(r, 'NM') ?? '')]));

  const vmp = read('f_vmp');
  const ingredientsOf = new Map();
  for (const [, r] of rows(vmp, 'VPI')) {
    const id = tag(r, 'VPID');
    ingredientsOf.set(id, [...(ingredientsOf.get(id) ?? []), ingredientName.get(tag(r, 'ISID'))].filter(Boolean));
  }
  const schedule = new Map();
  for (const [, r] of rows(vmp, 'CONTROL_INFO')) schedule.set(tag(r, 'VPID'), controlNames[tag(r, 'CATCD')] ?? null);

  // Legal categories of packs still on the market (no discontinuation code, not invalid).
  const legalOf = new Map();
  for (const [, r] of rows(read('f_ampp'), 'AMPP')) {
    if (r.includes('<DISCCD>') || r.includes('<INVALID>')) continue;
    const apid = tag(r, 'APID');
    const legal = legalNames[tag(r, 'LEGAL_CATCD')];
    if (apid && legal) legalOf.set(apid, new Set([...(legalOf.get(apid) ?? []), legal]));
  }

  const products = [];
  for (const [, r] of rows(read('f_amp'), 'AMP')) {
    if (r.includes('<INVALID>')) continue;
    const apid = tag(r, 'APID');
    if (!legalOf.has(apid)) continue;
    const vpid = tag(r, 'VPID');
    products.push({
      name: unxml(tag(r, 'NM') ?? ''),
      ingredients: ingredientsOf.get(vpid) ?? [],
      legal: [...legalOf.get(apid)],
      schedule: schedule.get(vpid) ?? null,
    });
  }
  return { legalNames, products };
}

/** The product table for the newest dm+d release, or null when there is no TRUD key. */
export async function loadDmd({ log = () => {} } = {}) {
  const key = apiKey();
  if (!key) return null;
  fs.mkdirSync(DIR, { recursive: true });

  if (fs.existsSync(TABLE) && Date.now() - fs.statSync(TABLE).mtimeMs < CHECK_EVERY_MS) return JSON.parse(fs.readFileSync(TABLE, 'utf8'));

  const res = await fetch(`https://isd.digital.nhs.uk/trud/api/v1/keys/${key}/items/${ITEM}/releases?latest`);
  if (!res.ok) throw new Error(`TRUD API answered ${res.status}. Is the account subscribed to the NHSBSA dm+d item?`);
  const release = (await res.json()).releases?.[0];
  if (!release) throw new Error('TRUD returned no dm+d release');

  if (fs.existsSync(TABLE)) {
    const cached = JSON.parse(fs.readFileSync(TABLE, 'utf8'));
    if (cached.release === release.id) {
      fs.utimesSync(TABLE, new Date(), new Date());
      return cached;
    }
  }

  log(`downloading dm+d ${release.name} (${release.releaseDate})`);
  const zip = path.join(DIR, 'dmd.zip');
  const dl = await fetch(release.archiveFileUrl);
  if (!dl.ok) throw new Error(`dm+d download answered ${dl.status}`);
  fs.writeFileSync(zip, Buffer.from(await dl.arrayBuffer()));
  const outer = path.join(DIR, 'outer');
  fs.rmSync(outer, { recursive: true, force: true });
  execFileSync('unzip', ['-o', '-q', zip, '-d', outer]);

  const table = { release: release.id, releaseDate: release.releaseDate, ...build(outer) };
  fs.writeFileSync(TABLE, JSON.stringify(table));
  fs.rmSync(outer, { recursive: true, force: true });
  fs.rmSync(zip, { force: true });
  return table;
}
