'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchIcon, XIcon } from 'lucide-react';
import { COUNTRIES, DRUGS, KIT_GROUPS, getCountry, type CountryCode, type Drug } from '@/data';
import { drugMatches, visibleCountries } from '@/lib/search';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CONTAINER } from './Masthead';
import { DrugEntry } from './DrugEntry';
import { Flag } from './Flag';
import { PrintButton, SourcesToggle } from './Toolbar';
import { StepNumber, StepStrip, stepStates } from './Steps';
import { UsNameHint } from './UsNameHint';
import { useMyDestinations, useMyMeds } from '@/lib/my-meds';

/** Reads ?q= and ?c=JP,FR so a shared link restores the same view. */
export function Formulary() {
  const params = useSearchParams();
  const initialCountries = (params.get('c') ?? '')
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter((c): c is CountryCode => !!getCountry(c));
  return <FormularyView initialQuery={params.get('q') ?? ''} initialCountries={initialCountries} syncUrl />;
}

const NONE: CountryCode[] = [];

type View = 'essentials' | 'other' | 'all';
const VIEWS: { id: View; label: string; count: number; matches: (d: Drug) => boolean }[] = [
  { id: 'essentials', label: 'Travel essentials', matches: (d: Drug) => !!d.kit },
  { id: 'other', label: 'Other', matches: (d: Drug) => !d.kit },
  { id: 'all', label: 'All', matches: () => true },
].map((v) => ({ ...v, id: v.id as View, count: DRUGS.filter(v.matches).length }));

interface FormularyViewProps {
  initialQuery?: string;
  initialCountries?: CountryCode[];
  syncUrl?: boolean;
}

export function FormularyView({ initialQuery = '', initialCountries = [], syncUrl = false }: FormularyViewProps) {
  const [rawQuery, setRawQuery] = useState(initialQuery);
  // Destinations are shared with the travel card. A link's ?c= wins for this view until the traveler
  // changes the selection; with no ?c=, the homepage opens on the saved destinations.
  const [dests, setDests] = useMyDestinations();
  const [picked, setPicked] = useState<CountryCode[] | null>(initialCountries.length ? initialCountries : null);
  const active = picked ?? (syncUrl ? dests : NONE);
  const setActive = (codes: CountryCode[]) => {
    setPicked(codes);
    if (syncUrl) setDests(codes);
  };
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

  // The view tabs narrow the browsing list; a search always looks through every medicine.
  const [view, setView] = useState<View>('essentials');
  const current = VIEWS.find((v) => v.id === view)!;
  const results = useMemo(
    () =>
      DRUGS.filter((drug) => !!query || current.matches(drug))
        .map((drug) => ({ drug, match: drugMatches(drug, query) }))
        .filter((r) => r.match.matches)
        .map((r) => ({ ...r, countries: visibleCountries(r.match, query, activeSet) })),
    [query, activeSet, current],
  );
  const grouped = view === 'essentials' && !query;

  const { meds } = useMyMeds();
  const [s1, s2, s3] = stepStates([!!query, active.length > 0, meds.length > 0]);

  const shouldOpen = !!query || active.length > 0;
  const filtering = !!query || active.length > 0;

  return (
    <>
      <section className="guilloche text-navy-foreground no-print relative overflow-hidden pb-10">
        <div className={`${CONTAINER} pt-8 sm:pt-12`}>
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-10">
          <div>
          <p className="text-gold mb-3 font-mono text-[0.68rem] tracking-[0.3em] uppercase">
            {DRUGS.length} medicines · {COUNTRIES.length} destinations
          </p>
          <h1 className="font-heading max-w-2xl text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl">
            Know what to ask for, <span className="text-gold">wherever you land.</span>
          </h1>
          <p className="text-navy-foreground/75 mt-4 max-w-xl text-[0.95rem] leading-relaxed text-pretty">
            Every medicine has one international generic name and a different brand almost everywhere you go. Find the
            name a local pharmacist will recognize.
          </p>

          </div>
          {/* Overview beside the headline on wide screens; on smaller screens the numbered labels carry the steps. */}
          <StepStrip
            tone="navy"
            vertical
            className="mt-2 hidden rounded-xl border border-white/12 bg-white/5 p-4 backdrop-blur-[1px] lg:block"
            steps={[
              { title: 'Search a medicine', hint: 'A brand or generic you take, e.g. Zoloft', state: s1 },
              { title: 'Pick where you’re going', hint: 'One or more destinations', state: s2 },
              { title: 'Ask for the local name', hint: 'Show it at the pharmacy, or add it to your travel card', state: s3 },
            ]}
          />
          </div>

          <label htmlFor="search" className="text-navy-foreground mt-7 mb-2.5 flex items-center gap-2 text-sm font-semibold">
            <StepNumber n={1} state={s1} tone="navy" />
            Search a medicine you take
          </label>
          <div className="relative max-w-2xl">
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
              aria-describedby="search-hint"
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

          <p id="search-hint" className="text-navy-foreground/60 mt-2 text-xs">
            Brand (Claritin), generic (loratadine), or a country name all work.
          </p>

          <div className="mt-6">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <p id="dest-label" className="text-navy-foreground flex items-center gap-2 text-sm font-semibold">
                <StepNumber n={2} state={s2} tone="navy" />
                Where are you headed?
              </p>
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
              aria-labelledby="dest-label"
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
        <div className="no-print bg-card mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 shadow-sm">
          <StepNumber n={3} state={s3} />
          <p className="text-sm leading-snug">
            <span className="font-semibold">Ask for the local name. </span>
            <span className="text-muted-foreground">
              {filtering ? (
                <>
                  Show the pharmacist the name after <span className="text-foreground font-mono text-[0.7rem] tracking-[0.12em] uppercase">Ask for</span>.
                  Taking it on your trip? Tap <span className="text-foreground font-medium">Add to travel card</span> to build a printable card.
                </>
              ) : (
                <>Open any medicine below to see what it&apos;s called in each country, or use steps 1 and 2 to narrow the list.</>
              )}
            </span>
          </p>
        </div>
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v as View)}
          spacing={2}
          aria-label="Which medicines to list"
          className="no-print mb-4 flex-wrap"
        >
          {VIEWS.map((v) => (
            <ToggleGroupItem
              key={v.id}
              value={v.id}
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-9 gap-2 rounded-full border px-3.5 text-[0.8rem] data-[state=on]:border-transparent"
            >
              {v.label}
              <span className="font-mono text-[0.7rem] opacity-70">{v.count}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground font-mono text-xs tracking-wide" aria-live="polite">
            {query
              ? `${results.length} of ${DRUGS.length} medicines match “${query}”`
              : `${results.length} ${view === 'essentials' ? 'travel essentials' : view === 'other' ? 'other medicines' : 'medicines'}${
                  active.length ? ` · ${active.length} destination${active.length > 1 ? 's' : ''}` : ''
                }`}
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
              <UsNameHint query={query} onSearch={setRawQuery} />
            </div>
          ) : grouped ? (
            KIT_GROUPS.map((group) => {
              const items = results.filter((r) => r.drug.kit === group.id);
              if (items.length === 0) return null;
              return (
                <section key={group.id} aria-labelledby={`kit-${group.id}`} className="grid gap-4 not-first:mt-4">
                  <div className="border-b pb-2">
                    <h2 id={`kit-${group.id}`} className="font-heading text-lg font-bold tracking-tight">
                      {group.title} <span className="text-muted-foreground font-mono text-xs font-normal">{items.length}</span>
                    </h2>
                    <p className="text-muted-foreground text-sm">{group.hint}</p>
                  </div>
                  {items.map(({ drug, match, countries }) => (
                    <DrugEntry key={drug.id} drug={drug} countries={countries} query={query} open={shouldOpen} countryHits={match.countryHits} />
                  ))}
                </section>
              );
            })
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
