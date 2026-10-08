'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { BanIcon, PlaneIcon, SearchIcon, ShieldAlertIcon, Trash2Icon } from 'lucide-react';
import { COUNTRIES, DRUGS, entryFor, getCountry, getDrug, type Country, type CountryCode, type Drug } from '@/data';
import { useMyDestinations, useMyMeds } from '@/lib/my-meds';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { BRINGING_ANCHOR, hasBringingGuide } from './BringingGuide';
import { Flag } from './Flag';
import { StatusPill } from './StatusPill';
import { PrintButton } from './Toolbar';
import { TripsPanel } from './TripsPanel';
import { PassportStamp } from './PassportStamp';
import { SaveExportGuide } from './SaveExportGuide';

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

// Country-specific advice for travelers carrying controlled medicines, replacing the generic caution.
// `source` is set where the text restates a rule the country publishes. `byDrug` covers countries whose
// rule differs by medicine (Japan treats narcotics, psychotropics and stimulants differently).
type Rule = { text: string; source?: string };
const JP_PERMIT = 'https://www.ncd.mhlw.go.jp/en/application2.html';
const JP_NARCOTIC: Rule = {
  text: 'Controlled here — a narcotic under Japanese law. You need written permission from a Regional Bureau of Health and Welfare before you travel: apply at least 14 days ahead with a doctor’s certificate. Without it you cannot bring it in, even with a prescription. Bring no more than a one-month supply.',
  source: JP_PERMIT,
};
const jpPsychotropic = (limit: string): Rule => ({
  text: `Controlled here — a psychotropic under Japanese law. You may carry up to ${limit} in total without permission (not injections). For more, carry a doctor’s certificate stating your condition and the amount you need. Bring no more than a one-month supply.`,
  source: 'https://www.ncd.mhlw.go.jp/dl_data/keitai/total.pdf',
});
const CONTROLLED_RULE: Partial<Record<CountryCode, Rule & { byDrug?: Record<string, Rule> }>> = {
  US: {
    text: 'Controlled here — keep it in the original labeled pharmacy container and bring only what you need (as a rule of thumb, no more than a 90-day supply). Arriving from abroad, declare it at customs and carry a prescription or doctor’s note in English.',
    source: 'https://www.cbp.gov/travel/us-citizens/know-before-you-go/prohibited-and-restricted-items',
  },
  SG: {
    text: 'Controlled here — you need approval from Singapore’s Health Sciences Authority before you travel, and may bring at most a 3-month supply, in the original labeled container. No approval is needed if you stay inside the airport transit zone.',
    source: 'https://file.go.gov.sg/document-guide-for-bringing-in-personal-medications.pdf',
  },
  CA: {
    text: 'Controlled here — bring no more than a 90-day supply, in the labeled container your pharmacy dispensed it in, and declare it to customs on arrival. A doctor’s letter is optional.',
    source: 'https://www.canada.ca/en/health-canada/services/health-concerns/controlled-substances-precursor-chemicals/controlled-substances/compliance-monitoring/travelling-into-and-out-of-canada-with-prescription-medication-containing-controlled-substances.html',
  },
  JP: {
    text: 'Controlled here — Japan’s rule depends on the medicine. Narcotics and stimulant raw materials need written permission before you travel (apply at least 14 days ahead); psychotropics are allowed up to a set quantity. Check which applies to yours. Bring no more than a one-month supply.',
    source: JP_PERMIT,
    byDrug: {
      oxycodone: JP_NARCOTIC,
      hydrocodone: JP_NARCOTIC,
      alprazolam: jpPsychotropic('72 mg'),
      methylphenidate: jpPsychotropic('2.16 g'),
      pseudoephedrine: {
        text: 'Controlled here — products with more than 10% pseudoephedrine count as a stimulant raw material and need written permission before you travel (apply at least 14 days ahead with a doctor’s certificate). Products with 10% or less are outside that rule. Bring no more than a one-month supply.',
        source: JP_PERMIT,
      },
      amphetamine: {
        text: 'Banned here — do not bring it. Japan does not let any traveler bring in amphetamine or methamphetamine medicines, even with a prescription. Ask your doctor about an alternative before you travel.',
        source: JP_PERMIT,
      },
    },
  },
};

export function MyMedsCard() {
  const { meds, toggle, clear, setMeds } = useMyMeds();
  const [dests, setDests] = useMyDestinations();
  const [filter, setFilter] = useState('');
  const legs = dests.map(getCountry).filter((c): c is Country => !!c);
  const options = DRUGS.filter((d) => matchesFilter(d, filter.trim()));
  const savedDrugs = meds.map(getDrug).filter((d): d is Drug => !!d);

  return (
    <>
    <SaveExportGuide hasCard={legs.length > 0 && savedDrugs.length > 0} cardCount={legs.length} />
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] print:block">
      {/* Saved trips + builder */}
      <div className="no-print grid grid-cols-[minmax(0,1fr)] gap-4 lg:sticky lg:top-4">
      <TripsPanel meds={meds} dests={dests} setMeds={setMeds} setDests={setDests} />
      <section aria-labelledby="pick-heading" className="bg-card rounded-2xl border p-5 shadow-sm">
        <h2 id="pick-heading" className="font-heading text-lg font-bold">Build your card</h2>

        <div className="mt-4 mb-1.5 flex items-baseline justify-between gap-2">
          <p id="dest-label" className="text-muted-foreground font-mono text-[0.65rem] tracking-[0.2em] uppercase">
            Destinations {dests.length > 0 && `· ${dests.length} selected`}
          </p>
          {dests.length > 0 && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground -my-2 py-2 font-mono text-[0.65rem] tracking-wider uppercase underline-offset-4 hover:underline"
              onClick={() => setDests([])}
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-muted-foreground mb-2 text-xs">Pick one or more, in the order you&apos;ll visit. Each gets its own card.</p>
        {/* Radix appends newly pressed values, so the array order is the order of selection = trip order. */}
        <ToggleGroup
          type="multiple"
          value={dests}
          onValueChange={(v) => setDests(v as CountryCode[])}
          spacing={1.5}
          className="w-full flex-wrap"
          aria-labelledby="dest-label"
        >
          {COUNTRIES.map((c) => {
            const leg = dests.indexOf(c.code);
            return (
              <ToggleGroupItem
                key={c.code}
                value={c.code}
                aria-label={leg >= 0 ? `${c.name}, leg ${leg + 1}` : c.name}
                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-8 gap-1.5 rounded-full border px-2.5 text-xs data-[state=on]:border-transparent"
              >
                <Flag code={c.code} className="h-3" />
                {c.name}
                {leg >= 0 && (
                  <span className="bg-primary-foreground text-primary grid size-4 place-items-center rounded-full font-mono text-[0.6rem] font-semibold">
                    {leg + 1}
                  </span>
                )}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>

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
        {/* Radix lays the viewport content out as a table, which grows to the longest name; block keeps it to the column width. */}
        <ScrollArea className="mt-2 h-72 rounded-lg border [&_[data-slot=scroll-area-viewport]>div]:!block">
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
      </div>

      {/* One boarding pass per leg of the trip */}
      <div className="grid gap-6">
        {legs.length === 0 ? (
          <TravelPass country={null} leg={0} legs={0} drugs={savedDrugs} onRemove={toggle} />
        ) : (
          legs.map((country, i) => (
            <TravelPass key={country.code} country={country} leg={i + 1} legs={legs.length} drugs={savedDrugs} onRemove={toggle} />
          ))
        )}

        <div className="no-print -mt-3 flex justify-end">
          <PrintButton label={legs.length > 1 ? `Print ${legs.length} cards / Save as PDF` : 'Print card / Save as PDF'} />
        </div>
      </div>
    </div>
    </>
  );
}

interface TravelPassProps {
  country: Country | null;
  leg: number;
  legs: number;
  drugs: Drug[];
  onRemove: (id: string) => void;
}

function TravelPass({ country, leg, legs, drugs, onRemove }: TravelPassProps) {
  const headingId = `card-heading-${country?.code ?? 'empty'}`;
  return (
    <section aria-labelledby={headingId} className="travel-card ticket bg-card overflow-hidden rounded-2xl border shadow-md">
      <header className="guilloche text-navy-foreground flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-3">
        <span className="text-gold font-heading flex items-center gap-2 text-sm font-bold tracking-[0.2em] whitespace-nowrap uppercase">
          <PlaneIcon className="size-4 -rotate-45" /> Rx Abroad
        </span>
        <h2 id={headingId} className="font-mono text-[0.65rem] tracking-[0.25em] whitespace-nowrap uppercase">
          {country ? `${country.name} card` : 'Travel meds card'}
          {legs > 1 && <span className="text-gold"> · Leg {leg} of {legs}</span>}
        </h2>
      </header>

      <div className="flex">
        <div className="min-w-0 flex-1">
          <dl className="grid grid-cols-2 gap-4 border-b px-5 py-4 sm:grid-cols-3">
            <Field label="Destination">
              {country ? (
                <span className="flex items-center gap-2"><Flag code={country.code} /> {country.name}</span>
              ) : '—'}
            </Field>
            <Field label="Medicines">{drugs.length || '—'}</Field>
            <Field label="Show to" className="hidden sm:block">Pharmacist</Field>
          </dl>

          {!country || drugs.length === 0 ? (
            <p className="text-muted-foreground px-5 py-10 text-center text-sm">
              {!country && drugs.length === 0
                ? 'Pick your destinations and the medicines you take. Your cards appear here, ready to print.'
                : !country
                  ? 'Now choose one or more destinations to see what to ask for there.'
                  : `Add the medicines you take to see what to ask for in ${country.name}.`}
            </p>
          ) : (
            <ol>
              {drugs.map((drug) => {
                const entry = entryFor(drug, country.code);
                const countryRule = CONTROLLED_RULE[country.code];
                const rule: Rule | undefined = countryRule?.byDrug?.[drug.id] ?? (entry.status === 'CONTROLLED' ? countryRule : undefined);
                // A medicine that isn't sold here can still be controlled for travelers carrying their own.
                const caution = CAUTION[entry.status] ?? (rule ? CAUTION.CONTROLLED : undefined);
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
                        <span>
                          {rule?.text ?? caution.text}
                          {rule?.source && (
                            <>
                              {' '}
                              <a href={rule.source} target="_blank" rel="noopener noreferrer" className="no-print underline underline-offset-2">
                                Official rule
                              </a>
                            </>
                          )}
                          {rule && hasBringingGuide(country.code) && (
                            <>
                              {' · '}
                              <Link href={`/country/${country.slug}#${BRINGING_ANCHOR}`} className="no-print underline underline-offset-2">
                                How to apply
                              </Link>
                            </>
                          )}
                        </span>
                      </p>
                    )}
                    {entry.verified?.checks.includes('brand') && entry.confidence !== 'low' ? (
                      <p className="text-ink-otc mt-1.5 text-xs">Registry-verified: {entry.verified.registry}.</p>
                    ) : entry.confidence !== 'high' && (
                      <p className="text-ink-mixed mt-1.5 text-xs">
                        {entry.confidence === 'low'
                          ? 'Unconfirmed — verify with a local pharmacist.'
                          : 'General market knowledge, not registry-checked.'}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      className="travel-card__remove no-print hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20 mt-3"
                      onClick={() => onRemove(drug.id)}
                      aria-label={`Remove ${drug.generic} from my travel card`}
                    >
                      <Trash2Icon /> Remove
                    </Button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Stub */}
        <div className="perforation hidden w-44 shrink-0 flex-col items-center gap-3 px-4 py-5 text-center sm:flex">
          <span className="text-muted-foreground font-mono text-[0.6rem] tracking-[0.2em] uppercase">
            {legs > 1 ? `Leg ${leg} · To` : 'To'}
          </span>
          <span className="font-heading text-5xl leading-none font-extrabold tracking-tight">{country?.code ?? '—'}</span>
          {country && <Flag code={country.code} className="h-6" />}
          <span className="text-muted-foreground font-mono text-[0.6rem] tracking-[0.2em] uppercase">
            {drugs.length} med{drugs.length === 1 ? '' : 's'}
          </span>
          {country && <PassportStamp country={country} leg={leg} legs={legs} className="mt-auto" />}
        </div>
      </div>

      <p className="text-muted-foreground border-t border-dashed px-5 py-3 text-[0.72rem]">
        Rx Abroad seed data — not medical or legal advice. Confirm with a local pharmacist or physician.
      </p>
    </section>
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
