import Link from 'next/link';
import { CONTAINER } from './Masthead';
import { StatusPill } from './StatusPill';
import { STATUS_DESCRIPTION } from '@/data/status';
import { BadgeCheckIcon, CircleHelpIcon, TriangleAlertIcon, UserRoundCheckIcon } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-border mt-16 border-t">
      <div className={`${CONTAINER} grid gap-10 py-10 md:grid-cols-[1.4fr_1fr]`}>
        <section aria-labelledby="legend-heading">
          <h2 id="legend-heading" className="text-muted-foreground mb-4 font-mono text-[0.68rem] tracking-[0.2em] uppercase">
            Reading the stamps
          </h2>
          {/* Stamp column sizes to the widest stamp, so explanations never sit underneath one.
              On phones each stamp stacks above its explanation. */}
          <dl className="grid grid-cols-1 gap-y-4 sm:grid-cols-[max-content_minmax(0,1fr)] sm:items-center sm:gap-x-5 sm:gap-y-3">
            {STATUS_DESCRIPTION.map(({ status, text }) => (
              <div key={status} className="contents">
                <dt>
                  <StatusPill status={status} size="sm" />
                </dt>
                <dd className="text-muted-foreground -mt-2.5 text-sm leading-snug sm:mt-0">{text}</dd>
              </div>
            ))}
            <div className="contents">
              <dt className="text-primary flex items-center gap-1.5 text-sm font-medium">
                <UserRoundCheckIcon className="size-4" /> Pharmacist-reviewed
              </dt>
              <dd className="text-muted-foreground -mt-2.5 text-sm leading-snug sm:mt-0">No registry record confirms it, so a pharmacist reviewed it.</dd>
            </div>
            <div className="contents">
              <dt className="text-ink-banned flex items-center gap-1.5 text-sm font-medium">
                <CircleHelpIcon className="size-4" /> Unconfirmed
              </dt>
              <dd className="text-muted-foreground -mt-2.5 text-sm leading-snug sm:mt-0">Verify locally before relying on it.</dd>
            </div>
            <div className="contents">
              <dt className="text-ink-otc flex items-center gap-1.5 text-sm font-medium">
                <BadgeCheckIcon className="size-4" /> Registry-verified
              </dt>
              <dd className="text-muted-foreground -mt-2.5 text-sm leading-snug sm:mt-0">
                Registered with that country&apos;s official medicines registry. Stock still varies by pharmacy.
              </dd>
            </div>
          </dl>
        </section>
        <aside className="bg-card self-start rounded-xl border p-5 text-sm">
          <p className="font-heading mb-2 flex items-center gap-2 font-semibold">
            <TriangleAlertIcon className="text-ink-controlled size-4" />
            Confirm locally before relying on it
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Entries are checked against official drug registries and reviewed by a pharmacist. Brand names, stock and
            prescription rules still change and vary by pharmacy, so confirm with a local pharmacist or doctor.
          </p>
          <Link href="/how-we-check" className="text-primary mt-2 inline-block underline underline-offset-4">How we check</Link>
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            This product uses publicly available data from the U.S. National Library of Medicine (NLM), National
            Institutes of Health, Department of Health and Human Services; NLM is not responsible for the product and
            does not endorse or recommend this or any other product.
          </p>
        </aside>
      </div>
      <div className="guilloche text-navy-foreground/70 py-4 text-center font-mono text-[0.65rem] tracking-[0.25em] uppercase">
        Rx Abroad · Know what to ask for, wherever you land ·{' '}
        <Link href="/about" className="hover:text-gold underline-offset-4 hover:underline">About</Link> ·{' '}
        <Link href="/how-we-check" className="hover:text-gold underline-offset-4 hover:underline">How we check</Link>
      </div>
    </footer>
  );
}
