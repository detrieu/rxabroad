'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { COUNTRIES, DRUGS, getCountry, type CountryCode } from '@/data';
import { drugMatches, visibleCountries } from '@/lib/search';
import { DrugEntry } from './DrugEntry';
import { PrintButton, SourcesToggle } from './Toolbar';

/** Reads ?q= and ?c=JP,FR so a shared link restores the same view. */
export function Formulary() {
  const params = useSearchParams();
  const initialCountries = (params.get('c') ?? '')
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter((c): c is CountryCode => !!getCountry(c));
  return <FormularyView initialQuery={params.get('q') ?? ''} initialCountries={initialCountries} syncUrl />;
}

interface FormularyViewProps {
  initialQuery?: string;
  initialCountries?: CountryCode[];
  syncUrl?: boolean;
}

export function FormularyView({ initialQuery = '', initialCountries = [], syncUrl = false }: FormularyViewProps) {
  const [rawQuery, setRawQuery] = useState(initialQuery);
  const [active, setActive] = useState<ReadonlySet<CountryCode>>(() => new Set(initialCountries));
  const query = rawQuery.trim();

  // Mirror state into the URL. replaceState keeps history clean and skips a router round-trip;
  // typing is debounced, chip toggles land on the next tick.
  const firstRun = useRef(true);
  useEffect(() => {
    if (!syncUrl) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(() => {
      const url = new URL(window.location.href);
      if (query) url.searchParams.set('q', query);
      else url.searchParams.delete('q');
      const codes = COUNTRIES.filter((c) => active.has(c.code)).map((c) => c.code);
      if (codes.length) url.searchParams.set('c', codes.join(','));
      else url.searchParams.delete('c');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }, 250);
    return () => clearTimeout(t);
  }, [query, active, syncUrl]);

  const results = useMemo(
    () =>
      DRUGS.map((drug) => ({ drug, match: drugMatches(drug, query) }))
        .filter((r) => r.match.matches)
        .map((r) => ({ ...r, countries: visibleCountries(r.match, query, active) })),
    [query, active],
  );

  const toggleCountry = (code: CountryCode) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const shouldOpen = !!query || active.size > 0;

  return (
    <>
      <div className="searchbar">
        <input
          id="search"
          type="text"
          value={rawQuery}
          onChange={(e) => setRawQuery(e.target.value)}
          placeholder="Try “Claritin”, “paracetamol”, or “Ethiopia”…"
          autoComplete="off"
          spellCheck={false}
          aria-label="Search medicines by brand, generic name, or country"
        />
        <div className="searchbar__meta">
          <div className="searchbar__count" aria-live="polite">
            {query
              ? `${results.length} of ${DRUGS.length} medicines match “${query}”`
              : `${DRUGS.length} medicines in the formulary`}
          </div>
          <div className="searchbar__actions">
            <SourcesToggle />
            <PrintButton />
          </div>
        </div>
      </div>

      <div className="chips" role="group" aria-label="Scope the table to a destination">
        {COUNTRIES.map((co) => (
          <button
            key={co.code}
            type="button"
            className="chip"
            aria-pressed={active.has(co.code)}
            onClick={() => toggleCountry(co.code)}
          >
            {co.code} · {co.name}
          </button>
        ))}
      </div>

      <main className="list" id="list">
        {results.length === 0 ? (
          <p style={{ color: 'var(--ink-dim)', padding: '2rem 0' }}>
            No matches. Try a different brand, generic name, or destination.
          </p>
        ) : (
          results.map(({ drug, match, countries }) => (
            <DrugEntry
              key={drug.id}
              drug={drug}
              countries={countries}
              query={query}
              open={shouldOpen}
              countryHits={match.countryHits}
            />
          ))
        )}
      </main>
    </>
  );
}
