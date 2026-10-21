import type { Country, CountryCode, CountryEntry, Drug, Symptom } from './types';
import drugsJson from './drugs.json';
import { COUNTRIES as COUNTRY_LIST } from './countries';
import { STATUS } from './status';
import { MERGED_SYMPTOMS, SYMPTOMS as SYMPTOM_LIST } from './symptoms';

export * from './types';
export { STATUS };
export { KIT_GROUPS } from './kit';

export const COUNTRIES: readonly Country[] = COUNTRY_LIST;
export const DRUGS = drugsJson as Drug[];
export const SYMPTOMS: readonly Symptom[] = SYMPTOM_LIST;

const FALLBACK_ENTRY: CountryEntry = {
  brand: 'Unavailable', status: 'UNCONFIRMED', confidence: 'low', note: null, source: null,
};

export function entryFor(drug: Drug, code: CountryCode): CountryEntry {
  return drug.countries[code] ?? FALLBACK_ENTRY;
}

// Countries not yet checked against an official registry: none of their entries carry a registry check.
const IN_PROGRESS = new Set(COUNTRY_LIST.map((c) => c.code).filter((code) => !DRUGS.some((d) => d.countries[code]?.verified)));
export const isInProgress = (code: CountryCode) => IN_PROGRESS.has(code);
export const IN_PROGRESS_NOTE =
  'These entries have not been checked against the official medicines registry yet. Confirm with a local pharmacist before relying on them.';

export function statusMeta(status: string) {
  return STATUS[status as keyof typeof STATUS] ?? STATUS.UNCONFIRMED;
}

export const getDrug = (id: string) => DRUGS.find((d) => d.id === id);
export const getCountryBySlug = (slug: string) => COUNTRIES.find((c) => c.slug === slug);
export const getCountry = (code: string) => COUNTRIES.find((c) => c.code === code);
export const getSymptom = (id: string) => SYMPTOMS.find((s) => s.id === (MERGED_SYMPTOMS[id] ?? id));
export const drugsFor = (symptom: Symptom) => DRUGS.filter((d) => d.symptoms?.includes(symptom.id));

export function isSafeSource(source: string | null): source is string {
  return !!source && /^https?:\/\//i.test(source);
}
