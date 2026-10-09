import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SearchIcon } from 'lucide-react';
import { COUNTRIES, DRUGS, entryFor, getCountryBySlug, type CountryCode, type Status } from '@/data';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/StatusPill';
import { EntryBadges } from '@/components/ConfBadge';
import { SourceLink } from '@/components/DrugEntry';
import { BringingGuide } from '@/components/BringingGuide';
import { Flag } from '@/components/Flag';
import { CONTAINER } from '@/components/Masthead';
import { PageHero } from '@/components/PageHero';
import { PrintButton, SourcesToggle } from '@/components/Toolbar';

export const dynamicParams = false;

export function generateStaticParams() {
  return COUNTRIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<'/country/[slug]'>): Promise<Metadata> {
  const country = getCountryBySlug((await params).slug);
  if (!country) return {};
  return {
    title: `Medicines in ${country.name}: local brand names & rules`,
    description:
      `Traveling to ${country.name}? See what ${DRUGS.length} common medicines are sold as locally, whether ` +
      `they need a prescription, and which are controlled or banned.`,
    alternates: { canonical: `/country/${country.slug}` },
  };
}

// A country-wide rule worth knowing before reading the list.
const FOOTNOTE: Partial<Record<CountryCode, string>> = {
  DE: 'In Germany, medicines that need no prescription are still kept behind the pharmacy counter. Ask the pharmacist (Apotheke) for them; you will not find them on a shelf or in a supermarket.',
};

// Most restrictive first, so the risky ones lead the summary.
const SUMMARY_ORDER: Status[] = ['BANNED', 'CONTROLLED', 'RX', 'MIXED', 'PHARMACY', 'OTC', 'ASK_GENERIC', 'UNAVAILABLE', 'UNCONFIRMED'];

export default async function CountryPage({ params }: PageProps<'/country/[slug]'>) {
  const country = getCountryBySlug((await params).slug);
  if (!country) notFound();

  const rows = DRUGS.map((drug) => ({ drug, entry: entryFor(drug, country.code) }));
  const counts = rows.reduce<Partial<Record<Status, number>>>((acc, { entry }) => {
    acc[entry.status] = (acc[entry.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main>
      <PageHero
        eyebrow={<>Destination · {country.code}</>}
        title={
          <span className="flex items-center gap-4">
            <Flag code={country.code} className="h-[0.75em] shadow-lg" />
            {country.name}
          </span>
        }
      >
        What {DRUGS.length} common medicines are sold as in {country.name}, and whether you can buy them over the
        counter. Take extra care with anything controlled or banned if you&apos;re bringing your own.
      </PageHero>

      <div className={CONTAINER}>
        {/* Visa page: stamp counts */}
        <div className="bg-card -mt-5 rounded-2xl border p-5 shadow-sm">
          <p className="text-muted-foreground mb-4 font-mono text-[0.65rem] tracking-[0.2em] uppercase">Entry summary</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-4">
            {SUMMARY_ORDER.filter((s) => counts[s]).map((s) => (
              <li key={s} className="flex items-center gap-2.5">
                <StatusPill status={s} size="sm" />
                <span className="font-heading text-xl font-bold tabular-nums">{counts[s]}</span>
              </li>
            ))}
          </ul>
          {FOOTNOTE[country.code] && (
            <p className="text-muted-foreground mt-4 text-[0.82rem] leading-relaxed">{FOOTNOTE[country.code]}</p>
          )}
        </div>

        <BringingGuide code={country.code} name={country.name} />

        <div className="no-print mt-6 mb-3 flex flex-wrap items-center justify-between gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/?c=${country.code}`}><SearchIcon /> Search within {country.name}</Link>
          </Button>
          <div className="flex gap-1">
            <SourcesToggle />
            <PrintButton />
          </div>
        </div>

        <div role="table" aria-label={`Medicines in ${country.name}`} className="ticket bg-card overflow-hidden rounded-2xl border shadow-sm">
          <div role="row" className="sr-only">
            <span role="columnheader">Medicine</span>
            <span role="columnheader">Ask for</span>
            <span role="columnheader">Status</span>
          </div>
          {rows.map(({ drug, entry }) => (
            <div
              key={drug.id}
              role="row"
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-t px-4 py-3.5 [.sr-only+&]:border-t-0 sm:grid-cols-[13rem_minmax(0,1fr)_auto] sm:px-5"
            >
              <span role="cell" className="min-w-0">
                <Link href={`/drug/${drug.id}`} className="font-heading block truncate text-[1.05rem] font-semibold underline-offset-4 hover:underline">
                  {drug.generic}
                </Link>
                <span className="text-muted-foreground block truncate font-mono text-[0.6rem] tracking-[0.12em] uppercase">{drug.cls}</span>
              </span>
              <span role="cell" className="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:row-start-auto">
                <span className="text-muted-foreground mr-2 font-mono text-[0.6rem] tracking-[0.16em] uppercase">Ask for</span>
                <span className="font-semibold">{entry.brand}</span>
                <EntryBadges entry={entry} />
              </span>
              <span role="cell" className="col-start-2 row-start-1 justify-self-end sm:col-start-auto sm:row-start-auto">
                <StatusPill status={entry.status} />
              </span>
              {entry.note && <p className="text-muted-foreground col-span-full text-[0.82rem] leading-relaxed">{entry.note}</p>}
              <SourceLink source={entry.source ?? entry.verified?.url ?? null} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
