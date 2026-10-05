import { COUNTRIES, DRUGS, type CountryCode } from '@/data';

export interface Trip {
  id: string;
  name: string;
  destinations: CountryCode[];
  meds: string[];
  updatedAt: string;
}

export interface TripInput {
  name: string;
  destinations: string[];
  meds: string[];
}

export const MAX_TRIPS_PER_USER = 50;
const COUNTRY_CODES = new Set<string>(COUNTRIES.map((c) => c.code));
const DRUG_IDS = new Set(DRUGS.map((d) => d.id));
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Keeps only known ids, de-duplicated, in the given order. Never trust client input. */
export function cleanTripInput(input: TripInput): TripInput {
  const name = String(input?.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 80) || 'My trip';
  const destinations = [...new Set((input?.destinations ?? []).map(String))].filter((c) => COUNTRY_CODES.has(c));
  const meds = [...new Set((input?.meds ?? []).map(String))].filter((id) => DRUG_IDS.has(id));
  return { name, destinations, meds };
}

export const isTripId = (id: unknown): id is string => typeof id === 'string' && UUID_RE.test(id);

/** Suggested name for a new trip, e.g. "Japan → France". */
export function defaultTripName(destinations: string[]) {
  const names = destinations.map((c) => COUNTRIES.find((x) => x.code === c)?.name).filter(Boolean);
  if (names.length === 0) return 'My trip';
  return names.length <= 3 ? names.join(' → ') : `${names.slice(0, 2).join(' → ')} + ${names.length - 2} more`;
}
