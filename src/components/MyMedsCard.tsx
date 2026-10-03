'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { BanIcon, PlaneIcon, SearchIcon, ShieldAlertIcon, Trash2Icon, XIcon } from 'lucide-react';
import { COUNTRIES, DRUGS, entryFor, getCountry, getDrug, type CountryCode, type Drug } from '@/data';
import { useMyDestination, useMyMeds } from '@/lib/my-meds';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Flag } from './Flag';
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

const CAUTION: Partial<Record<string, { icon: typeof BanIcon; ink: string; text: string }>> = {
  BANNED: {
    icon: BanIcon,
    ink: 'text-ink-banned bg-ink-banned/8 border-ink-banned/30',
    text: 'Banned here — do not bring it. Ask your doctor about an alternative before you travel.',
  },
  CONTROLLED: {
    icon: ShieldAlertIcon,
    ink: 'text-ink-controlled bg-ink-controlled/8 border-ink-controlled/30',
    text: 'Controlled here — carry your prescription and a doctor’s letter, in original packaging. Some countries require advance permission.',
  },
};

export function MyMedsCard() {
  const { meds, toggle, clear } = useMyMeds();
  const [dest, setDest] = useMyDestination();
  const [filter, setFilter] = useState('');
  const country = dest ? getCountry(dest) : undefined;
  const options = DRUGS.filter((d) => matchesFilter(d, filter.trim()));
  const savedDrugs = meds.map(getDrug).filter((d): d is Drug => !!d);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] print:block">
      {/* Builder */}
      <section aria-labelledby="pick-heading" className="no-print bg-card rounded-2xl border p-5 shadow-sm lg:sticky lg:top-4">
        <h2 id="pick-heading" className="font-heading text-lg font-bold">Build your card</h2>

        <label htmlFor="dest" className="text-muted-foreground mt-4 mb-1.5 block font-mono text-[0.65rem] tracking-[0.2em] uppercase">
          Destination
        </label>
        <Select value={dest ?? ''} onValueChange={(v) => setDest(v as CountryCode)}>
          <SelectTrigger id="dest" className="w-full">
            <SelectValue placeholder="Choose a country…" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                <Flag code={c.code} /> {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label htmlFor="meds-filter" className="text-muted-foreground mt-5 mb-1.5 block font-mono text-[0.65rem] tracking-[0.2em] uppercase">
          Your medicines {meds.length > 0 && `· ${meds.length} selected`}
        </label>
        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            id="meds-filter"
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Brand or generic, e.g. Zoloft"
            autoComplete="off"
            spellCheck={false}
            className="pl-8"
          />
        </div>
        <ScrollArea className="mt-2 h-72 rounded-lg border">
          <div role="group" aria-label="Medicines" className="p-1">
            {options.length === 0 && <p className="text-muted-foreground p-3 text-sm italic">No medicines match “{filter}”.</p>}
            {options.map((d) => {
              const checked = meds.includes(d.id);
              return (
                <label
                  key={d.id}
                  className={cn('hover:bg-muted flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm', checked && 'bg-secondary')}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(d.id)} />
                  <span className="min-w-0">
                    <span className="block font-medium">{d.generic}</span>
                    {d.usAlt && <span className="text-muted-foreground block truncate text-xs">{d.usAlt}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </ScrollArea>
        {meds.length > 0 && (
          <Button variant="ghost" size="sm" className="text-muted-foreground mt-3" onClick={clear}>
            <Trash2Icon /> Clear all
          </Button>
        )}
      </section>

      {/* Boarding pass */}
      <div>
        <section aria-labelledby="card-heading" className="travel-card ticket bg-card overflow-hidden rounded-2xl border shadow-md">
          <header className="guilloche text-navy-foreground flex items-center justify-between gap-3 px-5 py-3">
            <span className="text-gold font-heading flex items-center gap-2 text-sm font-bold tracking-[0.2em] uppercase">
              <PlaneIcon className="size-4 -rotate-45" /> Pill Trotter
            </span>
            <h2 id="card-heading" className="font-mono text-[0.65rem] tracking-[0.25em] uppercase">Travel meds card</h2>
          </header>

          <div className="flex">
            <div className="min-w-0 flex-1">
              <dl className="grid grid-cols-2 gap-4 border-b px-5 py-4 sm:grid-cols-3">
                <Field label="Destination">
                  {country ? (
                    <span className="flex items-center gap-2"><Flag code={country.code} /> {country.name}</span>
                  ) : '—'}
                </Field>
                <Field label="Medicines">{savedDrugs.length || '—'}</Field>
                <Field label="Show to" className="hidden sm:block">Pharmacist</Field>
              </dl>

              {!country || savedDrugs.length === 0 ? (
                <p className="text-muted-foreground px-5 py-10 text-center text-sm">
                  {!country && savedDrugs.length === 0
                    ? 'Pick a destination and the medicines you take. Your card appears here, ready to print.'
                    : !country
                      ? 'Now choose a destination to see what to ask for there.'
                      : `Add the medicines you take to see what to ask for in ${country.name}.`}
                </p>
              ) : (
                <ol>
                  {savedDrugs.map((drug) => {
                    const entry = entryFor(drug, country.code);
                    const caution = CAUTION[entry.status];
                    return (
                      <li key={drug.id} className="travel-card__row border-t px-5 py-4 first:border-t-0">
                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                          <div className="min-w-0 flex-1 basis-48">
                            <Link href={`/drug/${drug.id}`} className="font-heading text-lg font-bold underline-offset-4 hover:underline">
                              {drug.generic}
                            </Link>
                            {drug.usAlt && <p className="text-muted-foreground text-xs">{drug.usAlt}</p>}
                          </div>
                          <span className="shrink-0"><StatusPill status={entry.status} /></span>
                        </div>
                        <p className="mt-2 text-base">
                          <span className="text-muted-foreground mr-2 font-mono text-[0.6rem] tracking-[0.16em] uppercase">Ask for</span>
                          <span className="font-semibold">{entry.brand}</span>
                        </p>
                        {entry.note && <p className="text-muted-foreground mt-1 text-[0.82rem] leading-relaxed">{entry.note}</p>}
                        {caution && (
                          <p className={cn('mt-2 flex gap-2 rounded-lg border px-3 py-2 text-[0.8rem] leading-snug', caution.ink)}>
                            <caution.icon className="mt-0.5 size-4 shrink-0" />
                            {caution.text}
                          </p>
                        )}
                        {entry.confidence !== 'high' && (
                          <p className="text-ink-mixed mt-1.5 text-xs">
                            {entry.confidence === 'low'
                              ? 'Unconfirmed — verify with a local pharmacist.'
                              : 'General market knowledge, not brand-verified.'}
                          </p>
                        )}
                        <Button
                          variant="ghost"
                          size="xs"
                          className="travel-card__remove no-print text-muted-foreground mt-1 -ml-2"
                          onClick={() => toggle(drug.id)}
                        >
                          <XIcon /> Remove
                        </Button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            {/* Stub */}
            <div className="perforation hidden w-44 shrink-0 flex-col items-center gap-3 px-4 py-5 text-center sm:flex">
              <span className="text-muted-foreground font-mono text-[0.6rem] tracking-[0.2em] uppercase">To</span>
              <span className="font-heading text-5xl leading-none font-extrabold tracking-tight">{country?.code ?? '—'}</span>
              {country && <Flag code={country.code} className="h-6" />}
              <span className="text-muted-foreground font-mono text-[0.6rem] tracking-[0.2em] uppercase">
                {savedDrugs.length} med{savedDrugs.length === 1 ? '' : 's'}
              </span>
              <span aria-hidden="true" className="barcode text-foreground/80 mt-auto h-12 w-full" />
            </div>
          </div>

          <p className="text-muted-foreground border-t border-dashed px-5 py-3 text-[0.72rem]">
            Pill Trotter seed data — not medical or legal advice. Confirm with a local pharmacist or physician.
          </p>
        </section>

        <div className="no-print mt-3 flex justify-end">
          <PrintButton label="Print card / Save as PDF" />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-muted-foreground font-mono text-[0.6rem] tracking-[0.2em] uppercase">{label}</dt>
      <dd className="font-heading mt-0.5 text-base font-semibold">{children}</dd>
    </div>
  );
}
