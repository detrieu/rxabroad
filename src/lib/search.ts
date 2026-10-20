import { COUNTRIES, DRUGS, SYMPTOMS, type Country, type CountryCode, type Drug } from '@/data';

export interface DrugMatch {
  matches: boolean;
  /** Countries whose name, code, or local brand matched the query. */
  countryHits: Partial<Record<CountryCode, true>>;
  /** The query matched the drug itself (generic name, US name, class, ATC code, or a symptom it's sold for). */
  drugLevelHit: boolean;
}

/** Lowercase, accents dropped, punctuation as spaces: "Polisulfadê" and "polisulfade" compare equal. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/** Edits allowed for a misspelt word: none for short words, where one letter changes the medicine. */
const slack = (word: string) => (word.length >= 8 ? 2 : word.length >= 5 ? 1 : 0);

/** Whether a and b are within `max` single-letter edits (insert, delete, replace, or swap two neighbours). */
function near(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) row[j] = Math.min(row[j], prev2[j - 2] + 1);
    }
    if (Math.min(...row) > max) return false;
    [prev2, prev] = [prev, row];
  }
  return prev[b.length] <= max;
}

/**
 * Whether a folded query finds this text: as written anywhere in it, or, when `loose`, each query word close to a
 * word of the text (a misspelt brand, "claratyne" for Clarityne). A word being typed also matches the start of a
 * longer one, so results don't vanish halfway through it.
 */
function finds(text: string, q: string, loose: boolean): boolean {
  const hay = fold(text);
  if (hay.includes(q)) return true;
  if (!loose) return false;
  const words = hay.split(' ');
  return q.split(' ').every((t) => {
    const max = slack(t);
    return max > 0 && words.some((w) => near(t, w, max) || (w.length > t.length && near(t, w.slice(0, t.length), max)));
  });
}

/**
 * Misspellings are allowed only when nothing matches the query as typed, so "Clarityne" finds the four countries
 * that sell Clarityne and not every country that sells Claritin.
 */
export function drugMatches(drug: Drug, query: string): DrugMatch {
  return matchDrug(drug, query, !anyExact(query));
}

let last: { query: string; found: boolean } | undefined;
function anyExact(query: string): boolean {
  if (last?.query !== query) last = { query, found: DRUGS.some((d) => matchDrug(d, query, false).matches) };
  return last.found;
}

function matchDrug(drug: Drug, query: string, loose: boolean): DrugMatch {
  const q = fold(query);
  if (!q) return { matches: true, countryHits: {}, drugLevelHit: false };
  const symptoms = SYMPTOMS.filter((s) => drug.symptoms?.includes(s.id)).map((s) => `${s.title} ${s.keywords ?? ''}`);
  const drugLevelHit = [drug.generic, drug.usAlt, drug.cls, drug.atc, ...symptoms].some((f) => !!f && finds(f, q, loose));
  const countryHits: DrugMatch['countryHits'] = {};
  for (const co of COUNTRIES) {
    const entry = drug.countries[co.code];
    if (finds(`${co.name} ${co.code} ${entry?.brand ?? ''} ${entry?.localName ?? ''}`, q, loose)) countryHits[co.code] = true;
  }
  return { matches: drugLevelHit || Object.keys(countryHits).length > 0, countryHits, drugLevelHit };
}

/**
 * Which country rows to show for a drug: when the query only hit specific countries
 * (e.g. "Ethiopia" or a local brand), narrow to those; then apply the chip filter.
 * A local brand searched with destinations picked keeps those destinations too: someone with Clarityne
 * from Spain who is going to Türkiye wants the Türkiye row.
 */
export function visibleCountries(
  match: DrugMatch,
  query: string,
  activeCountries: ReadonlySet<CountryCode>,
): Country[] {
  const hasCountryMatch = !!query && !match.drugLevelHit && Object.keys(match.countryHits).length > 0;
  return COUNTRIES.filter((co) => {
    const chosen = activeCountries.has(co.code);
    if (hasCountryMatch && activeCountries.size > 0) return chosen || !!match.countryHits[co.code];
    const passesSearch = !hasCountryMatch || match.countryHits[co.code];
    return passesSearch && (activeCountries.size === 0 || chosen);
  });
}
