import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { COUNTRIES, DRUGS, getDrug, type Drug } from '@/data';
import { DrugTable } from '@/components/DrugEntry';
import { AddMedButton } from '@/components/AddMedButton';
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
    if (e.status === 'BANNED' || e.status === 'ASK_GENERIC' || /^(sold generic|not )/i.test(e.brand)) continue;
    const brand = e.brand.replace(/\s*\(.*\)\s*$/, '').split(' / ')[0];
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

  return (
    <main>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">All medicines</Link> / {drug.generic}
      </nav>
      <h1 className="page-title page-title--italic">{drug.generic}</h1>
      <div className="page-meta">
        {drug.usAlt && <span className="entry__usalt">{drug.usAlt}</span>}
        <span className="entry__class">{drug.cls}</span>
        <span className="entry__atc">ATC {drug.atc}</span>
      </div>
      <p className="page-sub">
        What to ask for at the pharmacy counter in each destination. <strong>{drug.generic}</strong> is the
        international (INN) name — pharmacists everywhere recognize it even when the local brand differs.
      </p>
      <div className="toolbar">
        <AddMedButton drugId={drug.id} generic={drug.generic} />
        <SourcesToggle />
        <PrintButton />
      </div>
      <div className="entry entry--static">
        <DrugTable drug={drug} countries={COUNTRIES} />
      </div>
    </main>
  );
}
