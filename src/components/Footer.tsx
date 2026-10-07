import { CONTAINER } from './Masthead';
import { StatusPill } from './StatusPill';
import { BadgeCheckIcon, CircleHelpIcon, InfoIcon, TriangleAlertIcon } from 'lucide-react';

const LEGEND: { status: string; text: string }[] = [
  { status: 'OTC', text: 'Over the counter — take it off the shelf.' },
  { status: 'RX', text: 'Needs a local doctor’s prescription.' },
  { status: 'MIXED', text: 'OTC or Rx depending on dose or form (e.g. nasal spray vs. inhaler).' },
  { status: 'PHARMACY', text: 'No prescription, but a pharmacist has to hand it over.' },
  { status: 'CONTROLLED', text: 'A prescription works, but expect scrutiny, paperwork, and harder refills.' },
  { status: 'BANNED', text: 'No legal personal-use pathway. Do not bring it in.' },
  { status: 'UNAVAILABLE', text: 'Not sold in this country. Bring it from home.' },
  { status: 'ASK_GENERIC', text: 'Local brand unknown — ask by the generic name.' },
  { status: 'UNCONFIRMED', text: 'We couldn’t find reliable information on how it is sold here.' },
];

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
            {LEGEND.map(({ status, text }) => (
              <div key={status} className="contents">
                <dt>
                  <StatusPill status={status} size="sm" />
                </dt>
                <dd className="text-muted-foreground -mt-2.5 text-sm leading-snug sm:mt-0">{text}</dd>
              </div>
            ))}
            <div className="contents">
              <dt className="text-ink-mixed flex items-center gap-1.5 text-sm font-medium">
                <InfoIcon className="size-4" /> Not verified
              </dt>
              <dd className="text-muted-foreground -mt-2.5 text-sm leading-snug sm:mt-0">General market knowledge, not registry-checked.</dd>
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
            Seed data for a prototype
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Compiled from general pharmacology knowledge, not a live regulatory feed. Brand names, availability, and
            prescription status change and vary by region and even by pharmacy. Confirm with a local pharmacist or
            physician before relying on this while traveling.
          </p>
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            This product uses publicly available data from the U.S. National Library of Medicine (NLM), National
            Institutes of Health, Department of Health and Human Services; NLM is not responsible for the product and
            does not endorse or recommend this or any other product.
          </p>
        </aside>
      </div>
      <div className="guilloche text-navy-foreground/70 py-4 text-center font-mono text-[0.65rem] tracking-[0.25em] uppercase">
        Rx Abroad · Know what to ask for, wherever you land
      </div>
    </footer>
  );
}
