// Shared helpers for the registry verifiers. See run.mjs for usage.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DRUGS_PATH = path.join(ROOT, 'src/data/drugs.json');

// Registry responses are cached for a day, which is also what NLM asks of RxNorm API users.
const CACHE_DIR = path.join(ROOT, 'node_modules/.cache/rxabroad-verify');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const loadDrugs = () => JSON.parse(fs.readFileSync(DRUGS_PATH, 'utf8'));
export const saveDrugs = (drugs) => fs.writeFileSync(DRUGS_PATH, JSON.stringify(drugs, null, 2) + '\n');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * A polite HTTP client: throttled, retried, and disk-cached.
 * `json(url)` returns parsed JSON, or null on a 404 or an empty body (how openFDA and DPD say "no matches").
 * `text(url, encoding)` returns the decoded body.
 */
export function createClient({ perSecond = 5, useCache = true } = {}) {
  const gap = 1000 / perSecond;
  let next = 0;

  async function bytes(url) {
    const file = path.join(CACHE_DIR, crypto.createHash('sha1').update(url).digest('hex'));
    if (useCache && fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < CACHE_TTL_MS) {
      return fs.readFileSync(file);
    }
    for (let attempt = 0; ; attempt++) {
      const wait = next - Date.now();
      next = Math.max(Date.now(), next) + gap;
      if (wait > 0) await sleep(wait);
      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'rxabroad-verify (+https://rxabroad.vercel.app)' } });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        fs.mkdirSync(CACHE_DIR, { recursive: true });
        fs.writeFileSync(file, buf);
        return buf;
      } catch (err) {
        if (attempt >= 3) throw new Error(`${url}: ${err.message}`);
        await sleep(1500 * (attempt + 1));
      }
    }
  }

  return {
    async json(url) {
      const body = (await bytes(url))?.toString('utf8').trim();
      return body ? JSON.parse(body) : null;
    },
    async text(url, encoding = 'utf-8') {
      const buf = await bytes(url);
      return buf ? new TextDecoder(encoding).decode(buf) : null;
    },
  };
}

/** Uppercase, accents stripped, punctuation to spaces: "Diphénhydramine (chlorhydrate)" → "DIPHENHYDRAMINE CHLORHYDRATE". */
export function norm(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

// Names a registry may use for the ingredient when it differs from the INN in drugs.json.
const INGREDIENT_ALIASES = {
  paracetamol: ['ACETAMINOPHEN'],
  aspirin: ['ASPIRIN'],
  amphetamine: ['AMFETAMINE', 'DEXAMFETAMINE', 'DEXTROAMPHETAMINE'],
  'insulin-glargine': ['INSULINE GLARGINE'],
  'insulin-lispro': ['INSULINE LISPRO'],
  'insulin-aspart': ['INSULINE ASPART'],
  'insulin-regular': ['INSULINE HUMAINE', 'INSULIN REGULAR', 'INSULIN SOLUBLE', 'INSULIN SEMI SYNTHETIC', 'INSULIN INJECTION HUMAN'],
  'insulin-nph': ['INSULINE HUMAINE', 'INSULINE ISOPHANE', 'ISOPHANE INSULIN', 'INSULIN HUMAN', 'INSULIN NPH'],
  'insulin-detemir': ['INSULINE DETEMIR'],
  'insulin-degludec': ['INSULINE DEGLUDEC'],
  simeticone: ['SIMETHICONE'],
  guaifenesin: ['GUAIPHENESIN'],
  meclozine: ['MECLIZINE', 'MECLOZINE'],
  'polyethylene-glycol': ['MACROGOL'],
  epinephrine: ['ADRENALIN'],
};

/** A drug covering two ingredients ("Hydrocodone / Paracetamol combination") rather than one. */
export const isCombo = (drug) => drug.generic.includes(' / ');

/** The drug's first-listed ingredient, cleaned: "Acetylsalicylic acid (Aspirin)" → "Acetylsalicylic acid". */
export function primaryIngredient(drug) {
  return drug.generic.split(' / ')[0].replace(/\s*\(.*?\)/g, '').replace(/\s+combination$/i, '').trim();
}

/**
 * Normalised stems to look for in a registry's ingredient field. Truncated to 12 characters so
 * the English INN also matches its French form ("ATORVASTATIN" ⊂ "ATORVASTATINE").
 */
export function ingredientKeys(drug) {
  return [norm(primaryIngredient(drug)).slice(0, 12), ...(INGREDIENT_ALIASES[drug.id] ?? [])];
}

/** True when a key starts a word in `text`, so OMEPRAZOLE doesn't match ESOMEPRAZOLE. */
export function hasIngredient(text, keys) {
  const t = ` ${norm(text)}`;
  return keys.some((k) => t.includes(` ${k}`));
}

/**
 * "TYLENOL EXTRA STRENGTH" is a Tylenol product, and so is the run-together family name "IMODIUMCAPS"
 * for Imodium. Short brands must match a whole word. Callers also check the ingredient.
 */
export function brandMatches(productName, brand) {
  const p = norm(productName);
  const b = norm(brand);
  return !!b && (p === b || p.startsWith(`${b} `) || (b.length >= 5 && p.startsWith(b)));
}

/** The names a registry does list for an ingredient, most products first: context for a brand it doesn't. */
export function leadingNames(productNames, max = 6) {
  const tally = new Map();
  for (const n of productNames) {
    const first = norm(n).split(' ')[0];
    if (first) tally.set(first, (tally.get(first) ?? 0) + 1);
  }
  return [...tally].sort((a, b) => b[1] - a[1]).slice(0, max).map(([name]) => name);
}

const GENERIC_RE = /^(sold\b|generic\b|ask\b|french name)/i;
const UNAVAILABLE_RE = /^(not\b|no\b|unavailable|uncommon)/i;
const OTHER_RE = /^(prescription|pharmacy|otc\b|marketed|availability|labeled)/i;

/**
 * Reads the free-text "brand" field.
 *   brand        "Advil / Motrin", "Norvasc (mostly sold generic)"  → names to look up
 *   generic      "Sold generic", "Ask for it by the generic name…"  → only the ingredient can be checked
 *   unavailable  "Not commonly available"                            → a registry hit contradicts the entry
 *   other        "Pharmacy-only with purchase limits"               → a statement about status, not a name
 */
export function parseBrand(text) {
  const head = text.split(/\s+—\s+|;/)[0].trim();
  if (GENERIC_RE.test(head)) return { kind: 'generic', names: [] };
  if (UNAVAILABLE_RE.test(head)) return { kind: 'unavailable', names: [] };
  if (OTHER_RE.test(head)) return { kind: 'other', names: [] };
  const names = head
    .split(/\s+\/\s+|\s+or\s+/)
    .map((part) => part.replace(/\s*\(.*?\)/g, '').trim())
    .filter((n) => n && n.split(/\s+/).length <= 4 && !GENERIC_RE.test(n) && !UNAVAILABLE_RE.test(n) && !OTHER_RE.test(n));
  return names.length ? { kind: 'brand', names } : { kind: 'other', names: [] };
}

/**
 * Collapses per-product legal classes into one registry status.
 * NO_RX means "not prescription-only" where the registry can't tell shelf from behind-the-counter.
 */
export function aggregateStatus(list) {
  const all = list.filter(Boolean);
  // One odd product among dozens shouldn't recolour the whole ingredient: a class needs a 10% share to count.
  const set = new Set(all.filter((s) => all.filter((x) => x === s).length >= all.length * 0.1));
  if (set.size === 0) return null;
  if (set.has('CONTROLLED')) return 'CONTROLLED';
  if (set.size === 1) return [...set][0];
  return set.has('RX') ? 'MIXED' : 'NO_RX';
}

/**
 * Products to read the legal class from. A single-ingredient drug is judged on its single-ingredient
 * products (so "Panadol Cold Relief" doesn't colour "Panadol"), unless the brand only exists as a combination.
 */
export function statusPool(drug, products, isSingleIngredient) {
  if (isCombo(drug)) return products;
  const single = products.filter(isSingleIngredient);
  return single.length ? single : products;
}

/** 'agree' | 'differ' | 'na' (the registry can't speak to this status, or the entry makes no status claim). */
export function compareStatus(entryStatus, registryStatus, cannotDetect = []) {
  if (!registryStatus) return 'na';
  if (['BANNED', 'UNCONFIRMED', 'ASK_GENERIC', 'UNAVAILABLE'].includes(entryStatus)) return 'na';
  if (cannotDetect.includes(entryStatus)) return 'na';
  if (registryStatus === 'NO_RX') return entryStatus === 'OTC' || entryStatus === 'PHARMACY' ? 'agree' : 'differ';
  return entryStatus === registryStatus ? 'agree' : 'differ';
}
