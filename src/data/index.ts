import type { Country, CountryCode, CountryEntry, Drug } from './types';
import drugsJson from './drugs.json';
import { COUNTRIES as COUNTRY_LIST } from './countries';
import { STATUS } from './status';

export * from './types';
export { STATUS };

export const COUNTRIES: readonly Country[] = COUNTRY_LIST;
export const DRUGS = drugsJson as Drug[];

const FALLBACK_ENTRY: CountryEntry = {
  brand: 'Unavailable', status: 'UNCONFIRMED', confidence: 'low', note: null, source: null,
};

export function entryFor(drug: Drug, code: CountryCode): CountryEntry {
  return drug.countries[code] ?? FALLBACK_ENTRY;
}

export function statusMeta(status: string) {
  return STATUS[status as keyof typeof STATUS] ?? STATUS.UNCONFIRMED;
}

export const getDrug = (id: string) => DRUGS.find((d) => d.id === id);
export const getCountryBySlug = (slug: string) => COUNTRIES.find((c) => c.slug === slug);
export const getCountry = (code: string) => COUNTRIES.find((c) => c.code === code);

export function isSafeSource(source: string | null): source is string {
  return !!source && /^https?:\/\//i.test(source);
}
