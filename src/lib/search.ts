import { COUNTRIES, type Country, type CountryCode, type Drug } from '@/data';

export interface DrugMatch {
  matches: boolean;
  /** Countries whose name, code, or local brand matched the query. */
  countryHits: Partial<Record<CountryCode, true>>;
  /** The query matched the drug itself (generic name, US name, class, ATC code). */
  drugLevelHit: boolean;
}

export function drugMatches(drug: Drug, query: string): DrugMatch {
  if (!query) return { matches: true, countryHits: {}, drugLevelHit: false };
  const q = query.toLowerCase();
  const drugLevelHit = [drug.generic, drug.usAlt, drug.cls, drug.atc].some(
    (f) => !!f && f.toLowerCase().includes(q),
  );
  const countryHits: DrugMatch['countryHits'] = {};
  for (const co of COUNTRIES) {
    const entry = drug.countries[co.code];
    const text = `${co.name} ${co.code} ${entry ? entry.brand : ''}`.toLowerCase();
    if (text.includes(q)) countryHits[co.code] = true;
  }
  return { matches: drugLevelHit || Object.keys(countryHits).length > 0, countryHits, drugLevelHit };
}

/**
 * Which country rows to show for a drug: when the query only hit specific countries
 * (e.g. "Ethiopia" or a local brand), narrow to those; then apply the chip filter.
 */
export function visibleCountries(
  match: DrugMatch,
  query: string,
  activeCountries: ReadonlySet<CountryCode>,
): Country[] {
  const hasCountryMatch = !!query && !match.drugLevelHit && Object.keys(match.countryHits).length > 0;
  return COUNTRIES.filter((co) => {
    const passesSearch = !hasCountryMatch || match.countryHits[co.code];
    const passesChips = activeCountries.size === 0 || activeCountries.has(co.code);
    return passesSearch && passesChips;
  });
}
