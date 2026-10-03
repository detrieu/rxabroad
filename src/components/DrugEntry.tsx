import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ChevronDownIcon } from 'lucide-react';
import { entryFor, isSafeSource, statusMeta, type Country, type CountryCode, type Drug } from '@/data';
import { cn } from '@/lib/utils';
import { Flag } from './Flag';
import { Highlight } from './Highlight';
import { inkClass, StatusPill } from './StatusPill';
import { ConfBadge } from './ConfBadge';
import { AddMedButton } from './AddMedButton';

type CountryHits = Partial<Record<CountryCode, true>>;

// Hand-stamped look: each stamp lands at a slightly different angle.
const TILTS = [-2.5, 1.5, -1, 2, -3, 0.5, -1.5];
export const tilt = (i: number) => ({ '--stamp-tilt': `${TILTS[i % TILTS.length]}deg` }) as CSSProperties;

interface DrugEntryProps {
  drug: Drug;
  countries: readonly Country[];
  query?: string;
  open?: boolean;
  countryHits?: CountryHits;
}

/** A drug as a boarding pass: body (name, class, visa strip) + stub; opens to the destination table. */
export function DrugEntry({ drug, countries, query, open, countryHits }: DrugEntryProps) {
  const single = countries.length === 1 ? countries[0] : null;
  const singleEntry = single ? entryFor(drug, single.code) : null;

  return (
    <details
      className="ticket group bg-card text-card-foreground overflow-hidden rounded-2xl border shadow-sm transition-shadow open:shadow-md hover:shadow-md"
      open={open}
    >
      <summary className="flex cursor-pointer list-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="text-muted-foreground flex items-center gap-2 font-mono text-[0.65rem] tracking-[0.16em] uppercase">
            <span className="truncate">{drug.cls}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0">{drug.atc}</span>
          </div>
          <h2 className="font-heading mt-1 text-[1.6rem] leading-tight font-bold tracking-tight">
            <Link href={`/drug/${drug.id}`} className="hover:text-primary decoration-gold underline-offset-4 hover:underline">
              <Highlight text={drug.generic} query={query} />
            </Link>
          </h2>
          {drug.usAlt && (
            <p className="text-muted-foreground text-sm">
              <Highlight text={drug.usAlt} query={query} />
            </p>
          )}
          <VisaStrip drug={drug} countries={countries} />
        </div>

        <div className="perforation hidden w-40 shrink-0 flex-col items-center justify-center gap-2 px-4 py-5 text-center sm:flex">
          {single && singleEntry ? (
            <>
              <span className="flex items-center gap-1.5 font-mono text-[0.65rem] tracking-[0.16em] uppercase">
                <Flag code={single.code} /> {single.code}
              </span>
              <StatusPill status={singleEntry.status} size="sm" />
            </>
          ) : (
            <>
              <span className="text-muted-foreground font-mono text-[0.6rem] tracking-[0.2em] uppercase">Destinations</span>
              <span className="font-heading text-3xl leading-none font-bold tabular-nums">{countries.length}</span>
            </>
          )}
          <ChevronDownIcon className="text-muted-foreground size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </div>
        <ChevronDownIcon className="text-muted-foreground m-4 size-5 shrink-0 transition-transform group-open:rotate-180 sm:hidden" aria-hidden="true" />
      </summary>

      <div className="perforation-h">
        <div className="flex justify-end px-4 pt-3 sm:px-5">
          <AddMedButton drugId={drug.id} generic={drug.generic} />
        </div>
        <DrugTable drug={drug} countries={countries} query={query} countryHits={countryHits} />
      </div>
    </details>
  );
}

/** One small flag per destination, underlined in that country's stamp ink: a status overview at a glance. */
function VisaStrip({ drug, countries }: { drug: Drug; countries: readonly Country[] }) {
  if (countries.length <= 1) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Status by destination">
      {countries.map((co) => {
        const e = entryFor(drug, co.code);
        const label = `${co.name}: ${statusMeta(e.status).label}`;
        return (
          <li key={co.code} title={label} className={cn('flex flex-col items-center gap-[3px]', inkClass(e.status))}>
            <Flag code={co.code} className="h-3.5" />
            <span className="h-[3px] w-full rounded-full bg-(--ink)" />
            <span className="sr-only">{label}</span>
          </li>
        );
      })}
    </ul>
  );
}

interface DrugTableProps {
  drug: Drug;
  countries: readonly Country[];
  query?: string;
  countryHits?: CountryHits;
}

export function DrugTable({ drug, countries, query, countryHits = {} }: DrugTableProps) {
  if (countries.length === 0) {
    return <p className="text-muted-foreground px-5 py-6 text-sm italic">No destinations match the current search and filters.</p>;
  }
  return (
    <div role="table" aria-label={`${drug.generic} by destination`} className="pb-2">
      <div role="row" className="sr-only">
        <span role="columnheader">Destination</span>
        <span role="columnheader">Ask for</span>
        <span role="columnheader">Status</span>
      </div>
      {countries.map((co, i) => (
        <CountryRow key={co.code} index={i} drug={drug} country={co} query={query} isMatch={!!countryHits[co.code]} />
      ))}
    </div>
  );
}

function CountryRow({
  drug, country, query, isMatch, index,
}: { drug: Drug; country: Country; query?: string; isMatch: boolean; index: number }) {
  const entry = entryFor(drug, country.code);
  return (
    <div
      role="row"
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-t px-4 py-3.5 [.sr-only+&]:border-t-0 sm:grid-cols-[10.5rem_minmax(0,1fr)_auto] sm:px-5',
        isMatch && 'bg-mark/25',
      )}
    >
      <span role="cell" className="flex min-w-0 items-center gap-2 text-sm font-medium">
        <Flag code={country.code} className="h-4" />
        <Link href={`/country/${country.slug}`} className="truncate underline-offset-4 hover:underline">
          <Highlight text={country.name} query={query} />
        </Link>
      </span>
      <span role="cell" className="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:row-start-auto">
        <span className="text-muted-foreground mr-2 font-mono text-[0.6rem] tracking-[0.16em] uppercase">Ask for</span>
        <span className="font-semibold"><Highlight text={entry.brand} query={query} /></span>
        <ConfBadge confidence={entry.confidence} />
      </span>
      <span role="cell" className="col-start-2 row-start-1 justify-self-end sm:col-start-auto sm:row-start-auto" style={tilt(index)}>
        <StatusPill status={entry.status} />
      </span>
      {entry.note && <p className="text-muted-foreground col-span-full text-[0.82rem] leading-relaxed">{entry.note}</p>}
      <SourceLink source={entry.source} />
    </div>
  );
}

export function SourceLink({ source }: { source: string | null }) {
  if (!isSafeSource(source)) return null;
  let host = source;
  try { host = new URL(source).hostname.replace(/^www\./, ''); } catch { /* keep raw */ }
  return (
    <a
      className="source-link text-primary col-span-full w-fit font-mono text-[0.68rem] underline decoration-dotted underline-offset-4 hover:decoration-solid"
      href={source}
      target="_blank"
      rel="noopener noreferrer"
    >
      Source: {host} ↗
    </a>
  );
}
