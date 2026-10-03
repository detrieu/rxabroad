import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { COUNTRIES, DRUGS, entryFor, getCountryBySlug, STATUS, type Status } from '@/data';
import { StatusPill } from '@/components/StatusPill';
import { ConfBadge } from '@/components/ConfBadge';
import { SourceLink } from '@/components/DrugEntry';
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

// Most restrictive first, so travelers see the risky ones up top in the summary.
const SUMMARY_ORDER: Status[] = ['BANNED', 'CONTROLLED', 'RX', 'MIXED', 'PHARMACY', 'OTC', 'ASK_GENERIC', 'UNCONFIRMED'];

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
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">All medicines</Link> / {country.name}
      </nav>
      <h1 className="page-title">
        <span className="entry__iso" style={{ fontSize: '1rem', marginRight: '0.5rem' }}>{country.code}</span>
        {country.name}
      </h1>
      <p className="page-sub">
        What {DRUGS.length} common medicines are sold as in <strong>{country.name}</strong>, and whether you can
        buy them over the counter. Controlled and banned items deserve extra care if you&apos;re bringing your own.
      </p>
      <div className="status-summary" aria-label="Status summary">
        {SUMMARY_ORDER.filter((s) => counts[s]).map((s) => (
          <span key={s}>
            <StatusPill status={s} /> × {counts[s]}
            <span className="visually-hidden"> {STATUS[s].label}</span>
          </span>
        ))}
      </div>
      <div className="toolbar">
        <Link className="nav-link" href={`/?c=${country.code}`}>Open in search</Link>
        <SourcesToggle />
        <PrintButton />
      </div>
      <div className="entry entry--static">
        <div className="entry__table" role="table" aria-label={`Medicines in ${country.name}`}>
          <div className="entry__row entry__row--head country-row" role="row">
            <span role="columnheader">Medicine</span>
            <span role="columnheader">Sold as</span>
            <span role="columnheader">Status</span>
          </div>
          {rows.map(({ drug, entry }) => (
            <div key={drug.id} className="entry__row country-row" role="row">
              <span className="entry__country" role="cell">
                <Link href={`/drug/${drug.id}`}>{drug.generic}</Link>
                <span className="entry__atc" style={{ color: 'var(--ink-dim)' }}>{drug.cls}</span>
              </span>
              <span className="entry__brand" role="cell">
                {entry.brand}
                <ConfBadge confidence={entry.confidence} />
              </span>
              <span className="entry__status" role="cell"><StatusPill status={entry.status} /></span>
              {entry.note && <span className="entry__note">{entry.note}</span>}
              <SourceLink source={entry.source} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
