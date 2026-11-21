import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BanIcon, ShieldAlertIcon } from 'lucide-react';
import {
  COUNTRIES, DRUGS, IN_PROGRESS_NOTE, entryFor, getCountryBySlug, getDrug, hasName, isInProgress, statusMeta,
  type Country, type CountryEntry, type Drug,
} from '@/data';
import { STATUS_DESCRIPTION } from '@/data/status';
import { CAUTION_TEXT, carryRuleFor } from '@/data/carry-rules';
import { TIPS, whatWasChecked } from '@/lib/evidence';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { cn } from '@/lib/utils';
import { AddMedButton } from '@/components/AddMedButton';
import { BRINGING_ANCHOR, hasBringingGuide } from '@/components/BringingGuide';
import { EntryBadges } from '@/components/ConfBadge';
import { LocalName, SourceLink } from '@/components/DrugEntry';
import { Flag } from '@/components/Flag';
import { InProgressBanner } from '@/components/InProgressBanner';
import { CONTAINER } from '@/components/Masthead';
import { PageHero } from '@/components/PageHero';
import { ReportProblem } from '@/components/ReportProblem';
import { StatusPill } from '@/components/StatusPill';

export const dynamicParams = false;

export function generateStaticParams() {
  return DRUGS.flatMap((d) => COUNTRIES.map((c) => ({ id: d.id, slug: c.slug })));
}

async function load(params: PageProps<'/drug/[id]/[slug]'>['params']) {
  const { id, slug } = await params;
  const drug = getDrug(id);
  const country = getCountryBySlug(slug);
  return drug && country ? { drug, country, entry: entryFor(drug, country.code) } : null;
}

/** The one name to put in a title: the first brand, or the local generic name. */
function askName(entry: CountryEntry) {
  if (!hasName(entry)) return null;
  const generic = entry.brand.match(/^Sold generic as "([^"]+)"/);
  return generic ? generic[1] : entry.brand.split(' / ')[0].replace(/\s*\(.*\)\s*$/, '');
}

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });

export async function generateMetadata({ params }: PageProps<'/drug/[id]/[slug]'>): Promise<Metadata> {
  const page = await load(params);
  if (!page) return {};
  const { drug, country, entry } = page;
  const name = askName(entry);
  const ask = !name ? entry.brand.toLowerCase()
    : entry.brand.startsWith('Sold generic as') ? `ask for "${name}", sold as a generic`
    : `ask for ${entry.brand}`;
  return {
    title: `${drug.generic} in ${country.name}${name ? `: ${name}` : ''}`,
    description:
      `${drug.generic}${drug.usAlt ? ` (${drug.usAlt})` : ''} in ${country.name}: ` +
      `${ask}. Status: ${statusMeta(entry.status).label}.` +
      (entry.verified ? ` Checked against ${entry.verified.registry} on ${formatDate(entry.verified.checked)}.` : ''),
    alternates: { canonical: `/drug/${drug.id}/${country.slug}` },
  };
}

function jsonLd(drug: Drug, country: Country, entry: CountryEntry) {
  const url = `${SITE_URL}/drug/${drug.id}/${country.slug}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'MedicalWebPage',
        name: `${drug.generic} in ${country.name}`,
        url,
        inLanguage: 'en',
        about: { '@type': 'Drug', name: drug.generic, nonProprietaryName: drug.generic },
        ...(entry.verified ? { lastReviewed: entry.verified.checked } : {}),
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'All medicines', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: country.name, item: `${SITE_URL}/country/${country.slug}` },
          { '@type': 'ListItem', position: 3, name: drug.generic, item: url },
        ],
      },
    ],
  };
}

const SECTION = 'bg-card text-card-foreground rounded-2xl border p-5 shadow-sm';
const SECTION_LABEL = 'text-muted-foreground mb-3 font-mono text-[0.65rem] tracking-[0.2em] uppercase';
const CAUTION_STYLE = {
  BANNED: { icon: BanIcon, ink: 'text-ink-banned bg-ink-banned/8 border-ink-banned/30' },
  CONTROLLED: { icon: ShieldAlertIcon, ink: 'text-ink-controlled bg-ink-controlled/8 border-ink-controlled/30' },
};

export default async function DrugInCountryPage({ params }: PageProps<'/drug/[id]/[slug]'>) {
  const page = await load(params);
  if (!page) notFound();
  const { drug, country, entry } = page;
  const meaning = STATUS_DESCRIPTION.find((s) => s.status === entry.status)?.text;
  const { rule, caution } = carryRuleFor(drug, country.code, entry);
  const tip = TIPS[entry.confidence];
  const others = COUNTRIES.filter((c) => c.code !== country.code);

  return (
    <main>
      <script
        type="application/ld+json"
        // JSON in a script tag: escape "<" so no value can close the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(drug, country, entry)).replace(/</g, '\\u003c') }}
      />
      <PageHero
        eyebrow={
          <>
            <Link href={`/country/${country.slug}`} className="underline-offset-4 hover:underline">{country.name}</Link>
            {' · '}
            <Link href={`/drug/${drug.id}`} className="underline-offset-4 hover:underline">{drug.cls}</Link>
          </>
        }
        title={
          <span className="flex flex-wrap items-center gap-x-4">
            {drug.generic} <span className="text-navy-foreground/70 flex items-center gap-3 font-bold">in <Flag code={country.code} className="h-[0.7em]" /> {country.name}</span>
          </span>
        }
        aside={<AddMedButton drugId={drug.id} generic={drug.generic} className="bg-card text-card-foreground dark:bg-card" />}
      >
        {drug.usAlt && <p className="text-gold/90 font-medium">{drug.usAlt}</p>}
      </PageHero>

      <div className={`${CONTAINER} grid gap-5 pt-6`}>
        {isInProgress(country.code) && (
          <div className="bg-card rounded-xl shadow-sm"><InProgressBanner>{IN_PROGRESS_NOTE}</InProgressBanner></div>
        )}

        <section aria-label="What to ask for" className="ticket bg-card text-card-foreground overflow-hidden rounded-2xl border shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 p-5">
            <div className="min-w-0 flex-1 basis-64">
              <p className="text-muted-foreground font-mono text-[0.6rem] tracking-[0.16em] uppercase">Ask for</p>
              <p className={cn('font-heading mt-1 text-2xl leading-snug', hasName(entry) ? 'font-bold' : 'text-muted-foreground font-semibold')}>
                {entry.brand}
                <EntryBadges entry={entry} />
              </p>
              <LocalName entry={entry} />
            </div>
            <div className="max-w-64 shrink-0 sm:text-right">
              <StatusPill status={entry.status} />
              {meaning && <p className="text-muted-foreground mt-2 text-[0.8rem] leading-snug">{meaning}</p>}
            </div>
          </div>
          {entry.note && <p className="border-t px-5 py-4 text-[0.92rem] leading-relaxed">{entry.note}</p>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-5 py-3">
            <SourceLink source={entry.source ?? entry.verified?.url ?? null} />
            <ReportProblem drug={drug} country={country} />
          </div>
        </section>

        {caution && (
          <section aria-labelledby="bringing-heading" className={SECTION}>
            <h2 id="bringing-heading" className={SECTION_LABEL}>Bringing your own</h2>
            {(() => {
              const style = CAUTION_STYLE[caution];
              return (
                <p className={cn('flex gap-2 rounded-lg border px-3 py-2.5 text-[0.88rem] leading-snug', style.ink)}>
                  <style.icon className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {rule?.text ?? CAUTION_TEXT[caution]}
                    {rule?.source && (
                      <>
                        {' '}
                        <a href={rule.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Official rule</a>
                      </>
                    )}
                  </span>
                </p>
              );
            })()}
            {hasBringingGuide(country.code) && (
              <Link href={`/country/${country.slug}#${BRINGING_ANCHOR}`} className="text-primary mt-3 inline-block text-sm underline underline-offset-4">
                How to bring medicines into {country.name}
              </Link>
            )}
          </section>
        )}

        <section aria-labelledby="checked-heading" className={SECTION}>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="checked-heading" className={cn(SECTION_LABEL, 'mb-0')}>How this was checked</h2>
            <Link href="/how-we-check" className="text-primary text-sm underline underline-offset-4">How we check</Link>
          </div>
          {entry.verified ? (
            <p className="text-[0.9rem] leading-relaxed">
              Checked against {entry.verified.registry} on {formatDate(entry.verified.checked)}. {whatWasChecked(entry.verified)}{' '}
              <a href={entry.verified.url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">
                {entry.verified.checks.includes('absent') ? 'Search the registry' : 'Registry record'} ↗
              </a>
            </p>
          ) : (
            <p className="text-[0.9rem] leading-relaxed">
              {tip ? <><span className={cn('font-semibold', tip.color)}>{tip.title}.</span> {tip.tip}</> : 'Not checked against a registry.'}
              {entry.source && <> <SourceLink source={entry.source} /></>}
            </p>
          )}
        </section>

        <section aria-labelledby="elsewhere-heading" className={SECTION}>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="elsewhere-heading" className={cn(SECTION_LABEL, 'mb-0')}>{drug.generic} in other countries</h2>
            <Link href={`/drug/${drug.id}`} className="text-primary text-sm underline underline-offset-4">All {COUNTRIES.length} countries</Link>
          </div>
          <ul className="grid gap-x-6 sm:grid-cols-2">
            {others.map((c) => {
              const e = entryFor(drug, c.code);
              return (
                <li key={c.code} className="border-t first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
                  <Link href={`/drug/${drug.id}/${c.slug}`} className="hover:bg-muted -mx-2 flex items-center gap-3 rounded-md px-2 py-2.5">
                    <Flag code={c.code} className="h-3.5 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{c.name}</span>
                      <span className={cn('block truncate text-xs', hasName(e) ? 'text-foreground' : 'text-muted-foreground')}>{e.brand}</span>
                    </span>
                    <StatusPill status={e.status} size="sm" className="shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}
