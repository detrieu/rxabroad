import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { COUNTRIES, KIT_GROUPS, SYMPTOMS, drugsFor, getSymptom } from '@/data';
import { Flag } from '@/components/Flag';
import { CONTAINER } from '@/components/Masthead';
import { PageHero } from '@/components/PageHero';

export const dynamicParams = false;

export function generateStaticParams() {
  return SYMPTOMS.map((s) => ({ slug: s.id }));
}

export async function generateMetadata({ params }: PageProps<'/symptom/[slug]'>): Promise<Metadata> {
  const symptom = getSymptom((await params).slug);
  if (!symptom) return {};
  return {
    title: `${symptom.title} abroad: what pharmacies sell and what to ask for`,
    description:
      `Medicines sold for ${symptom.title.toLowerCase()} in ${COUNTRIES.length} countries: the local name to ask for ` +
      `and whether you need a prescription.`,
    alternates: { canonical: `/symptom/${symptom.id}` },
  };
}

export default async function SymptomPage({ params }: PageProps<'/symptom/[slug]'>) {
  const symptom = getSymptom((await params).slug);
  if (!symptom) notFound();
  const drugs = drugsFor(symptom);
  const group = KIT_GROUPS.find((g) => g.id === symptom.kit);

  return (
    <main>
      <PageHero eyebrow={<>Travel essentials{group && <> · {group.title}</>}</>} title={symptom.title}>
        {drugs.length === 1 ? 'One medicine' : `${drugs.length} medicines`} sold for this, and what each is called in{' '}
        {COUNTRIES.length} countries.
      </PageHero>

      <div className={CONTAINER}>
        <h2 className="font-heading mt-6 mb-3 text-lg font-bold tracking-tight">Pick where you&apos;re going</h2>
        <ul className="no-print flex flex-wrap gap-2">
          {COUNTRIES.map((co) => (
            <li key={co.code}>
              <Link
                href={`/?s=${symptom.id}&c=${co.code}`}
                className="bg-card hover:bg-muted inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[0.8rem]"
              >
                <Flag code={co.code} className="h-3.5" />
                {co.name}
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="font-heading mt-8 mb-3 text-lg font-bold tracking-tight">Medicines sold for it</h2>
        <div role="table" aria-label={`Medicines sold for ${symptom.title.toLowerCase()}`} className="ticket bg-card overflow-hidden rounded-2xl border shadow-sm">
          <div role="row" className="sr-only">
            <span role="columnheader">Medicine</span>
            <span role="columnheader">Also known as</span>
          </div>
          {drugs.map((drug) => (
            <div
              key={drug.id}
              role="row"
              className="grid items-center gap-x-4 gap-y-1 border-t px-4 py-3.5 [.sr-only+&]:border-t-0 sm:grid-cols-[16rem_minmax(0,1fr)] sm:px-5"
            >
              <span role="cell" className="min-w-0">
                <Link href={`/drug/${drug.id}`} className="font-heading block text-[1.05rem] font-semibold underline-offset-4 hover:underline">
                  {drug.generic}
                </Link>
                <span className="text-muted-foreground block truncate font-mono text-[0.6rem] tracking-[0.12em] uppercase">{drug.cls}</span>
              </span>
              <span role="cell" className="text-muted-foreground min-w-0 text-sm">{drug.usAlt}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
