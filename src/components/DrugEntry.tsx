import Link from 'next/link';
import { entryFor, isSafeSource, type Country, type CountryCode, type Drug } from '@/data';
import { Highlight } from './Highlight';
import { StatusPill } from './StatusPill';
import { ConfBadge } from './ConfBadge';
import { AddMedButton } from './AddMedButton';

type CountryHits = Partial<Record<CountryCode, true>>;

interface DrugEntryProps {
  drug: Drug;
  countries: readonly Country[];
  query?: string;
  open?: boolean;
  countryHits?: CountryHits;
}

/** Collapsible formulary entry: drug header + per-destination table. */
export function DrugEntry({ drug, countries, query, open, countryHits }: DrugEntryProps) {
  return (
    <details className="entry" open={open}>
      <summary className="entry__summary">
        <span className="entry__generic">
          <Link href={`/drug/${drug.id}`}><Highlight text={drug.generic} query={query} /></Link>
        </span>
        <span className="entry__disclosure" aria-hidden="true">▸</span>
        <span className="entry__meta">
          {drug.usAlt && <span className="entry__usalt"><Highlight text={drug.usAlt} query={query} /></span>}
          <span className="entry__class">{drug.cls}</span>
          <span className="entry__atc">{drug.atc}</span>
        </span>
      </summary>
      <div className="entry__table-actions">
        <AddMedButton drugId={drug.id} generic={drug.generic} />
      </div>
      <DrugTable drug={drug} countries={countries} query={query} countryHits={countryHits} />
    </details>
  );
}

interface DrugTableProps {
  drug: Drug;
  countries: readonly Country[];
  query?: string;
  countryHits?: CountryHits;
}

export function DrugTable({ drug, countries, query, countryHits = {} }: DrugTableProps) {
  return (
    <div className="entry__table" role="table" aria-label={`${drug.generic} by destination`}>
      <div className="entry__row entry__row--head" role="row">
        <span role="columnheader">Destination</span>
        <span role="columnheader">Sold as</span>
        <span role="columnheader">Status</span>
      </div>
      {countries.length === 0 ? (
        <div className="entry__row entry__row--empty" role="row">
          No destinations match the current search and filters.
        </div>
      ) : (
        countries.map((co) => (
          <CountryRow key={co.code} drug={drug} country={co} query={query} isMatch={!!countryHits[co.code]} />
        ))
      )}
    </div>
  );
}

function CountryRow({ drug, country, query, isMatch }: { drug: Drug; country: Country; query?: string; isMatch: boolean }) {
  const entry = entryFor(drug, country.code);
  return (
    <div className={'entry__row' + (isMatch ? ' is-match' : '')} role="row">
      <span className="entry__country" role="cell">
        <span className="entry__iso">{country.code}</span>
        <Link href={`/country/${country.slug}`}><Highlight text={country.name} query={query} /></Link>
      </span>
      <span className="entry__brand" role="cell">
        <Highlight text={entry.brand} query={query} />
        <ConfBadge confidence={entry.confidence} />
      </span>
      <span className="entry__status" role="cell"><StatusPill status={entry.status} /></span>
      {entry.note && <span className="entry__note">{entry.note}</span>}
      <SourceLink source={entry.source} />
    </div>
  );
}

export function SourceLink({ source }: { source: string | null }) {
  if (!isSafeSource(source)) return null;
  return (
    <span className="entry__source-row">
      <a className="entry__source" href={source} target="_blank" rel="noopener noreferrer">Source ↗</a>
    </span>
  );
}
