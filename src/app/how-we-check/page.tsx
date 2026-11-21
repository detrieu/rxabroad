import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheckIcon, CircleHelpIcon, InfoIcon } from 'lucide-react';
import { COUNTRIES, DRUGS, entryFor, type Country, type CountryEntry, type VerificationCheck } from '@/data';
import { TIPS } from '@/lib/evidence';
import { SITE_NAME } from '@/lib/site';
import { Flag } from '@/components/Flag';
import { CONTAINER } from '@/components/Masthead';
import { PageHero } from '@/components/PageHero';

export const metadata: Metadata = {
  title: 'How we check',
  description:
    `How ${SITE_NAME} checks each medicine against ${COUNTRIES.length} government drug registries, what a check confirms, ` +
    'and how to report a problem.',
  alternates: { canonical: '/how-we-check' },
};

// Every figure on this page is counted from the data at build time, so it stays true after each verify run.
const ENTRIES: { country: Country; entry: CountryEntry }[] = DRUGS.flatMap((d) =>
  COUNTRIES.map((country) => ({ country, entry: entryFor(d, country.code) })),
);
const verified = ENTRIES.filter((e) => e.entry.verified);
const count = (check: VerificationCheck) => verified.filter((e) => e.entry.verified!.checks.includes(check)).length;
const lastChecked = verified.map((e) => e.entry.verified!.checked).sort().at(-1);

const REGISTRIES = COUNTRIES.map((country) => {
  const mine = verified.filter((e) => e.country.code === country.code);
  const names = new Map<string, number>();
  for (const e of mine) names.set(e.entry.verified!.registry, (names.get(e.entry.verified!.registry) ?? 0) + 1);
  const registry = [...names].sort((a, b) => b[1] - a[1])[0]?.[0];
  return { country, registry, checked: mine.length };
});

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });

const SECTION = 'bg-card text-card-foreground rounded-2xl border p-5 shadow-sm sm:p-6';
const H2 = 'font-heading mb-3 text-lg font-bold tracking-tight';
const BODY = 'text-[0.95rem] leading-relaxed';

export default function HowWeCheckPage() {
  return (
    <main>
      <PageHero eyebrow={`About ${SITE_NAME}`} title="How we check">
        {verified.length.toLocaleString('en')} of {ENTRIES.length.toLocaleString('en')} entries are checked against a
        government drug registry. The rest are marked on the page so you can tell the difference.
      </PageHero>

      <div className={`${CONTAINER} grid max-w-3xl gap-5 pt-6`}>
        <section aria-labelledby="registries" className={SECTION}>
          <h2 id="registries" className={H2}>The registries</h2>
          <p className={BODY}>
            Each country has an official list of the medicines approved for sale there. A script searches that list for
            every medicine on {SITE_NAME} and records what it finds, with a link to the record and the date it looked.
          </p>
          <ul className="mt-4">
            {REGISTRIES.map(({ country, registry, checked }) => (
              <li key={country.code} className="flex items-center gap-3 border-t py-2.5 first:border-t-0">
                <Flag code={country.code} className="h-3.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <Link href={`/country/${country.slug}`} className="block text-sm font-medium underline-offset-4 hover:underline">{country.name}</Link>
                  <span className="text-muted-foreground block text-xs">{registry ?? 'No registry search available'}</span>
                </span>
                <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                  {checked}/{DRUGS.length}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="confirms" className={SECTION}>
          <h2 id="confirms" className={H2}>What a check confirms</h2>
          <p className={BODY}>
            Entries that pass show a <BadgeCheckIcon aria-label="check mark" className="text-ink-otc inline size-4 -translate-y-px" />{' '}
            mark. Tap it to see what the registry confirmed:
          </p>
          <ul className={`${BODY} mt-3 list-disc space-y-1.5 pl-5`}>
            <li><strong>The name.</strong> The brand or local name we show is registered there with this ingredient ({count('brand').toLocaleString('en')} entries).</li>
            <li><strong>The ingredient.</strong> Medicines with this ingredient are registered there ({count('ingredient').toLocaleString('en')} entries).</li>
            <li><strong>The status.</strong> The registry&apos;s prescription or over-the-counter status matches ours ({count('status').toLocaleString('en')} entries).</li>
            <li><strong>Not sold.</strong> The registry lists no medicine with this ingredient at all ({count('absent').toLocaleString('en')} entries). We only use this check where the registry is complete enough to prove a medicine is missing.</li>
          </ul>
        </section>

        <section aria-labelledby="limits" className={SECTION}>
          <h2 id="limits" className={H2}>What a check doesn&apos;t tell you</h2>
          <ul className={`${BODY} list-disc space-y-1.5 pl-5`}>
            <li>Registered doesn&apos;t mean every pharmacy stocks it. Small towns and some chains may not carry it.</li>
            <li>Prescription rules can depend on the strength or pack size, and registries change.</li>
          </ul>
        </section>

        <section aria-labelledby="unchecked" className={SECTION}>
          <h2 id="unchecked" className={H2}>Entries without a registry record</h2>
          <p className={BODY}>
            When a registry can&apos;t settle an entry, it is reviewed by a pharmacist and marked with one of these:
          </p>
          <ul className={`${BODY} mt-3 space-y-2`}>
            {([['medium', InfoIcon], ['low', CircleHelpIcon]] as const).map(([level, Icon]) => {
              const tip = TIPS[level]!;
              return (
                <li key={level} className="flex gap-2">
                  <Icon className={`mt-1 size-4 shrink-0 ${tip.color}`} />
                  <span><strong className={tip.color}>{tip.title}.</strong> {tip.tip}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="current" className={SECTION}>
          <h2 id="current" className={H2}>Keeping it current</h2>
          <p className={BODY}>
            The registry checks run every month, and every checked entry shows the date it was last confirmed
            {lastChecked && <> (most recently {formatDate(lastChecked)})</>}. Entries without a registry record are reviewed
            by hand and updated as new information comes in.
          </p>
        </section>

        <section aria-labelledby="corrections" className={SECTION}>
          <h2 id="corrections" className={H2}>Corrections</h2>
          <p className={BODY}>
            Every entry has a <strong>Report a problem</strong> link. A pharmacist reviews each report and updates the entry
            when it&apos;s confirmed.
          </p>
        </section>
      </div>
    </main>
  );
}
