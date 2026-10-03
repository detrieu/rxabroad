'use client';

import { useCallback, useMemo } from 'react';
import { DRUGS, getCountry, type CountryCode } from '@/data';
import { useStoredString } from './storage';

const MEDS_KEY = 'pt-my-meds';
const DEST_KEY = 'pt-my-dest';
const KNOWN_IDS = new Set(DRUGS.map((d) => d.id));

/** The traveler's saved med list (drug ids, in the order they were added). */
export function useMyMeds() {
  const [raw, setRaw] = useStoredString(MEDS_KEY);
  const meds = useMemo(
    () => (raw ? raw.split(',').filter((id) => KNOWN_IDS.has(id)) : []),
    [raw],
  );
  const save = useCallback((ids: string[]) => setRaw(ids.length ? ids.join(',') : null), [setRaw]);
  const toggle = useCallback(
    (id: string) => save(meds.includes(id) ? meds.filter((m) => m !== id) : [...meds, id]),
    [meds, save],
  );
  const clear = useCallback(() => save([]), [save]);
  return { meds, toggle, clear };
}

/**
 * The trip's destinations, in the order the traveler picked them (one travel card per leg).
 * Stored comma-separated; a value saved by the old single-destination version still parses.
 */
export function useMyDestinations(): [CountryCode[], (codes: CountryCode[]) => void] {
  const [raw, setRaw] = useStoredString(DEST_KEY);
  const dests = useMemo(
    () => [...new Set(raw ? raw.split(',') : [])].filter((c): c is CountryCode => !!getCountry(c)),
    [raw],
  );
  const save = useCallback((codes: CountryCode[]) => setRaw(codes.length ? codes.join(',') : null), [setRaw]);
  return [dests, save];
}
