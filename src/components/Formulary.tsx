'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchIcon, XIcon } from 'lucide-react';
import { COUNTRIES, DRUGS, getCountry, type CountryCode } from '@/data';
import { drugMatches, visibleCountries } from '@/lib/search';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CONTAINER } from './Masthead';
import { DrugEntry } from './DrugEntry';
import { Flag } from './Flag';
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
  const [active, setActive] = useState<CountryCode[]>(initialCountries);
  const activeSet = useMemo(() => new Set(active), [active]);
  const query = rawQuery.trim();
  const searchRef = useRef<HTMLInputElement>(null);

  // Mirror state into the URL. replaceState keeps history clean and skips a router round-trip;
  // typing is debounced.
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
      const codes = COUNTRIES.filter((c) => activeSet.has(c.code)).map((c) => c.code);
      if (codes.length) url.searchParams.set('c', codes.join(','));
      else url.searchParams.delete('c');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }, 250);
    return () => clearTimeout(t);
  }, [query, activeSet, syncUrl]);

  // "/" focuses search, like most search-first sites.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== '/' || e.metaKey || e.ctrlKey || t.closest('input, textarea, select, [contenteditable]')) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(
    () =>
      DRUGS.map((drug) => ({ drug, match: drugMatches(drug, query) }))
        .filter((r) => r.match.matches)
        .map((r) => ({ ...r, countries: visibleCountries(r.match, query, activeSet) })),
    [query, activeSet],
  );

  const shouldOpen = !!query || active.length > 0;
  const filtering = !!query || active.length > 0;

  return (
    <>
      <section className="guilloche text-navy-foreground no-print relative overflow-hidden pb-10">
        <div className={`${CONTAINER} pt-8 sm:pt-12`}>
          <p className="text-gold mb-3 font-mono text-[0.68rem] tracking-[0.3em] uppercase">
            {DRUGS.length} medicines · {COUNTRIES.length} destinations
          </p>
          <h1 className="font-heading max-w-2xl text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl">
            Know what to ask for, <span className="text-gold">wherever you land.</span>
          </h1>
          <p className="text-navy-foreground/75 mt-4 max-w-xl text-[0.95rem] leading-relaxed text-pretty">
            Every medicine has one international generic name and a different brand almost everywhere you go. Search a
            brand, a generic, or a country to see what to ask for at the pharmacy counter.
          </p>

          <div className="relative mt-7 max-w-2xl">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2" />
            <Input
              ref={searchRef}
              id="search"
              type="text"
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              placeholder="Try “Claritin”, “paracetamol”, or “Japan”"
              autoComplete="off"
              spellCheck={false}
              aria-label="Search medicines by brand, generic name, or country"
              className="bg-card text-card-foreground dark:bg-card h-14 rounded-xl border-0 pr-12 pl-12 text-base shadow-lg md:text-base"
            />
            {rawQuery ? (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2"
                onClick={() => {
                  setRawQuery('');
                  searchRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <XIcon />
              </Button>
            ) : (
              <kbd className="text-muted-foreground bg-muted pointer-events-none absolute top-1/2 right-4 hidden -translate-y-1/2 rounded border px-1.5 font-mono text-xs sm:block">
                /
              </kbd>
            )}
          </div>

          <div className="mt-6">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <p className="text-navy-foreground/70 font-mono text-[0.65rem] tracking-[0.2em] uppercase">Where are you headed?</p>
              {active.length > 0 && (
                <button
                  type="button"
                  className="text-gold font-mono text-[0.68rem] tracking-wider uppercase underline-offset-4 hover:underline"
                  onClick={() => setActive([])}
                >
                  Clear ({active.length})
                </button>
              )}
            </div>
            <ToggleGroup
              type="multiple"
              value={active}
              onValueChange={(v) => setActive(v as CountryCode[])}
              spacing={2}
              className="-mx-4 w-[calc(100%+2rem)] flex-nowrap overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:w-full sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
              aria-label="Filter by destination"
            >
              {COUNTRIES.map((co) => (
                <ToggleGroupItem
                  key={co.code}
                  value={co.code}
                  aria-label={co.name}
                  className="text-navy-foreground/90 hover:text-navy-foreground data-[state=on]:bg-gold data-[state=on]:text-navy h-9 gap-2 rounded-full border border-white/15 bg-white/5 px-3 text-[0.8rem] hover:bg-white/12 data-[state=on]:border-transparent"
                >
                  <Flag code={co.code} className="h-3.5" />
                  {co.name}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
      </section>

      <section className={`${CONTAINER} pt-6`} aria-label="Results">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground font-mono text-xs tracking-wide" aria-live="polite">
            {filtering
              ? query
                ? `${results.length} of ${DRUGS.length} medicines match “${query}”`
                : `${results.length} medicines · ${active.length} destination${active.length > 1 ? 's' : ''}`
              : `All ${DRUGS.length} medicines`}
          </p>
          <div className="no-print flex items-center gap-1">
            <SourcesToggle />
            <PrintButton />
          </div>
        </div>

        <div id="list" className="grid gap-4">
          {results.length === 0 ? (
            <div className="bg-card rounded-2xl border border-dashed p-10 text-center">
              <p className="font-heading text-lg font-semibold">No matches</p>
              <p className="text-muted-foreground mt-1 text-sm">Try a different brand, generic name, or destination.</p>
            </div>
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
        </div>
      </section>
    </>
  );
}
