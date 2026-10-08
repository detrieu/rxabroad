import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { CONTAINER } from './Masthead';

/** Navy passport-cover band used at the top of every sub page. */
export function PageHero({
  eyebrow, title, children, aside,
}: { eyebrow?: ReactNode; title: ReactNode; children?: ReactNode; aside?: ReactNode }) {
  return (
    <section className="guilloche text-navy-foreground">
      <div className={`${CONTAINER} pt-6 pb-9 sm:pt-8`}>
        <Link
          href="/"
          className="no-print text-navy-foreground/70 hover:text-gold -my-2 inline-flex items-center py-2 gap-1.5 font-mono text-[0.68rem] tracking-[0.18em] uppercase"
        >
          <ArrowLeftIcon className="size-3.5" /> All medicines
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-gold mb-2 font-mono text-[0.68rem] tracking-[0.25em] uppercase">{eyebrow}</p>
            )}
            <h1 className="font-heading text-4xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl">
              {title}
            </h1>
            {children && <div className="text-navy-foreground/75 mt-3 max-w-2xl text-[0.95rem] leading-relaxed">{children}</div>}
          </div>
          {aside}
        </div>
      </div>
    </section>
  );
}
