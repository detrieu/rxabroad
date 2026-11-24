import type { ReactNode } from 'react';
import { CONTAINER } from './Masthead';
import { PageHero } from './PageHero';

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });

/** Shared frame for the privacy policy and terms: a hero with the effective date, then numbered sections. */
export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro: ReactNode; children: ReactNode }) {
  return (
    <main>
      <PageHero eyebrow={`Last updated ${formatDate(updated)}`} title={title}>
        {intro}
      </PageHero>
      <div className={`${CONTAINER} pt-6`}>
        <div className="bg-card text-card-foreground max-w-3xl space-y-7 rounded-2xl border p-5 text-[0.95rem] leading-relaxed shadow-sm sm:p-7">
          {children}
        </div>
      </div>
    </main>
  );
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="font-heading text-lg font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export const LIST = 'list-disc space-y-1.5 pl-5';
