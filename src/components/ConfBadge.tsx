'use client';

import { BadgeCheckIcon, CircleHelpIcon, InfoIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Confidence, CountryEntry, Verification } from '@/data';

const TIPS: Partial<Record<Confidence, { icon: typeof InfoIcon; color: string; title: string; tip: string }>> = {
  medium: {
    icon: InfoIcon,
    color: 'text-ink-mixed',
    title: 'Not registry-checked',
    tip: 'Based on general market knowledge. It is likely right, but it hasn’t been confirmed against a local registry.',
  },
  low: {
    icon: CircleHelpIcon,
    color: 'text-ink-banned',
    title: 'Unconfirmed',
    tip: 'We couldn’t confirm this. Verify with a local pharmacist before relying on it.',
  },
};

const TRIGGER =
  'ml-1 inline-flex size-5 translate-y-0.5 items-center justify-center rounded-full hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none';

/** Small icon after a brand name; tap or click to see what it means (works on touch, unlike a tooltip). */
export function ConfBadge({ confidence }: { confidence: Confidence }) {
  const t = TIPS[confidence];
  if (!t) return null;
  const Icon = t.icon;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`${t.title}: what does this mean?`} className={`${TRIGGER} ${t.color}`}>
          <Icon className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 text-sm" align="start">
        <p className={`font-heading font-semibold ${t.color}`}>{t.title}</p>
        <p className="text-muted-foreground mt-1">{t.tip}</p>
      </PopoverContent>
    </Popover>
  );
}

function whatWasChecked({ checks }: Verification) {
  const subject = checks.includes('brand')
    ? 'This name is registered there with this ingredient'
    : 'Medicines with this ingredient are registered there';
  return checks.includes('status') ? `${subject}, and the legal status shown matches.` : `${subject}.`;
}

/** Check mark for an entry that scripts/verify confirmed against the country's official registry. */
export function VerifiedBadge({ verified }: { verified: Verification }) {
  const date = new Date(`${verified.checked}T00:00:00`).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Registry-verified: what does this mean?" className={`${TRIGGER} text-ink-otc`}>
          <BadgeCheckIcon className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-sm" align="start">
        <p className="font-heading text-ink-otc font-semibold">Registry-verified</p>
        <p className="text-muted-foreground mt-1">
          Checked against {verified.registry} on {date}. {whatWasChecked(verified)}
        </p>
        <p className="text-muted-foreground mt-1.5">Registered doesn’t mean every pharmacy stocks it.</p>
      </PopoverContent>
    </Popover>
  );
}

/** The marker(s) after an entry's "Ask for" name. A registry-confirmed brand replaces the "not registry-checked" hint. */
export function EntryBadges({ entry }: { entry: CountryEntry }) {
  const brandVerified = entry.verified?.checks.includes('brand');
  return (
    <>
      {!(brandVerified && entry.confidence === 'medium') && <ConfBadge confidence={entry.confidence} />}
      {entry.verified && <VerifiedBadge verified={entry.verified} />}
    </>
  );
}
