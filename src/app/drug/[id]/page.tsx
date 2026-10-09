import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { COUNTRIES, DRUGS, getDrug, type Drug } from '@/data';
import { DrugTable } from '@/components/DrugEntry';
import { AddMedButton } from '@/components/AddMedButton';
import { CONTAINER } from '@/components/Masthead';
import { PageHero } from '@/components/PageHero';
import { PrintButton, SourcesToggle } from '@/components/Toolbar';

export const dynamicParams = false;

export function generateStaticParams() {
  return DRUGS.map((d) => ({ id: d.id }));
}

/** A few short, confident brand names for titles and descriptions. */
function headlineBrands(drug: Drug, max = 4) {
  const seen = new Set<string>();
  for (const co of COUNTRIES) {
    const e = drug.countries[co.code];
    if (!e || e.confidence !== 'high' || e.brand.length > 28) continue;
    if (e.status === 'BANNED' || /^(sold generic|not |ask |generic|prescription|unavailable)/i.test(e.brand)) continue;
    const brand = e.brand.split(' / ')[0].replace(/\s*\(.*\)\s*$/, '');
    seen.add(brand);
    if (seen.size >= max) break;
  }
  return [...seen];
}

export async function generateMetadata({ params }: PageProps<'/drug/[id]'>): Promise<Metadata> {
  const drug = getDrug((await params).id);
  if (!drug) return {};
  const brands = headlineBrands(drug);
  return {
    title: `${drug.generic} abroad${brands.length ? `: ${brands.join(', ')}…` : ''}`,
    description:
      `What ${drug.generic}${drug.usAlt ? ` (${drug.usAlt})` : ''} is called and how it's sold in ` +
      `${COUNTRIES.length} countries — local brand names, prescription status, and travel cautions.`,
    alternates: { canonical: `/drug/${drug.id}` },
  };
}

export default async function DrugPage({ params }: PageProps<'/drug/[id]'>) {
  const drug = getDrug((await params).id);
  if (!drug) notFound();
  const brands = headlineBrands(drug, 3);

  return (
    <main>
      <PageHero
        eyebrow={<>{drug.cls} · ATC {drug.atc}</>}
        title={drug.generic}
        aside={<AddMedButton drugId={drug.id} generic={drug.generic} className="bg-card text-card-foreground dark:bg-card" />}
      >
        {drug.usAlt && <p className="text-gold/90 mb-1 font-medium">{drug.usAlt}</p>}
        <p>
          The international (INN) name — pharmacists everywhere recognize it, even when the local brand differs
          {brands.length > 0 && <> (e.g. {brands.join(', ')})</>}.
        </p>
      </PageHero>

      <div className={`${CONTAINER} pt-6`}>
        <div className="no-print mb-3 flex justify-end gap-1">
          <SourcesToggle />
          <PrintButton />
        </div>
        <div className="ticket bg-card text-card-foreground overflow-hidden rounded-2xl border shadow-sm">
          <div className="text-muted-foreground border-b px-5 py-3 font-mono text-[0.65rem] tracking-[0.2em] uppercase">
            {COUNTRIES.length} destinations
          </div>
          <DrugTable drug={drug} countries={COUNTRIES} />
        </div>
      </div>
    </main>
  );
}
