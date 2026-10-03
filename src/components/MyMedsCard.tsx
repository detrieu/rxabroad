'use client';

import Link from 'next/link';
import { useState } from 'react';
import { COUNTRIES, DRUGS, entryFor, getCountry, getDrug, type CountryCode, type Drug } from '@/data';
import { useMyDestination, useMyMeds } from '@/lib/my-meds';
import { StatusPill } from './StatusPill';
import { PrintButton } from './Toolbar';

function matchesFilter(drug: Drug, q: string) {
  if (!q) return true;
  const hay = [drug.generic, drug.usAlt, drug.cls, ...Object.values(drug.countries).map((e) => e?.brand)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

const CAUTION: Partial<Record<string, string>> = {
  BANNED: 'Banned here — do not bring it. Ask a doctor about an alternative before you travel.',
  CONTROLLED: 'Controlled here — carry your prescription and a doctor’s letter, in original packaging. Some countries need advance permission.',
};

export function MyMedsCard() {
  const { meds, toggle, clear } = useMyMeds();
  const [dest, setDest] = useMyDestination();
  const [filter, setFilter] = useState('');
  const country = dest ? getCountry(dest) : undefined;
  const options = DRUGS.filter((d) => matchesFilter(d, filter.trim()));
  const savedDrugs = meds.map(getDrug).filter((d): d is Drug => !!d);

  return (
    <div className="meds-layout">
      <section className="no-print" aria-labelledby="pick-heading">
        <h2 id="pick-heading" className="visually-hidden">Build your card</h2>
        <label className="field-label" htmlFor="dest">Destination</label>
        <select
          id="dest"
          className="select"
          value={dest ?? ''}
          onChange={(e) => setDest((e.target.value || null) as CountryCode | null)}
        >
          <option value="">Choose a country…</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>

        <label className="field-label" htmlFor="meds-filter" style={{ marginTop: '1.1rem' }}>
          Your medicines {meds.length > 0 && `(${meds.length} selected)`}
        </label>
        <input
          id="meds-filter"
          className="meds-filter"
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by brand or generic name, e.g. “Zoloft”"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="meds-picker" role="group" aria-label="Medicines">
          {options.length === 0 && <div className="meds-empty">No medicines match “{filter}”.</div>}
          {options.map((d) => (
            <label key={d.id} className="meds-option">
              <input type="checkbox" checked={meds.includes(d.id)} onChange={() => toggle(d.id)} />
              <span>{d.generic}</span>
              {d.usAlt && <span className="meds-option__alt">{d.usAlt}</span>}
            </label>
          ))}
        </div>
      </section>

      <section className="travel-card" aria-labelledby="card-heading">
        <div className="travel-card__head">
          <h2 id="card-heading" className="travel-card__title">My travel meds</h2>
          {country && <span className="travel-card__dest">{country.code} · {country.name}</span>}
        </div>

        {!country || savedDrugs.length === 0 ? (
          <p className="travel-card__lead">
            {!country && savedDrugs.length === 0
              ? 'Pick a destination and the medicines you take — your card appears here, ready to print.'
              : !country
                ? 'Now choose a destination to see what to ask for there.'
                : 'Add the medicines you take to see what to ask for in ' + country.name + '.'}
          </p>
        ) : (
          <>
            <p className="travel-card__lead">
              Show this at a pharmacy in {country.name}. The <em>italic</em> name is the international generic
              name every pharmacist knows.
            </p>
            {savedDrugs.map((drug) => {
              const entry = entryFor(drug, country.code);
              const caution = CAUTION[entry.status];
              return (
                <div key={drug.id} className="travel-card__row">
                  <span className="travel-card__generic">
                    <Link className="plain-link" href={`/drug/${drug.id}`}>{drug.generic}</Link>
                  </span>
                  <StatusPill status={entry.status} />
                  <span className="travel-card__ask">
                    <span className="travel-card__ask-label">Ask for</span>
                    {entry.brand}
                  </span>
                  {entry.note && <span className="travel-card__note">{entry.note}</span>}
                  {caution && <span className="travel-card__warn">{caution}</span>}
                  {entry.confidence !== 'high' && (
                    <span className="travel-card__warn" style={{ color: 'var(--amber)' }}>
                      {entry.confidence === 'low'
                        ? '? Unconfirmed — verify with a local pharmacist.'
                        : '† General market knowledge, not brand-verified.'}
                    </span>
                  )}
                  <button
                    type="button"
                    className="print-btn travel-card__remove"
                    style={{ gridColumn: '1 / -1' }}
                    onClick={() => toggle(drug.id)}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </>
        )}
        <p className="travel-card__foot">
          Pill Trotter seed data — not medical or legal advice. Confirm with a local pharmacist or physician.
        </p>
      </section>

      <div className="toolbar no-print" style={{ justifyContent: 'space-between' }}>
        {meds.length > 0 ? (
          <button type="button" className="print-btn" onClick={clear}>Clear my meds</button>
        ) : <span />}
        <PrintButton label="Print card / Save as PDF" />
      </div>
    </div>
  );
}
