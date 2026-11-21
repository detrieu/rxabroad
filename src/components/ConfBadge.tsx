'use client';

import { BadgeCheckIcon, UserRoundCheckIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Confidence, CountryEntry, Verification } from '@/data';
import { REVIEWED, TIPS, whatWasChecked } from '@/lib/evidence';

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });

const TRIGGER =
  'relative ml-1 inline-flex size-5 translate-y-0.5 after:absolute after:-inset-1.5 after:content-[""] items-center justify-center rounded-full hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none';

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

/** Check mark for an entry that scripts/verify confirmed against the country's official registry. */
export function VerifiedBadge({ verified }: { verified: Verification }) {
  const date = formatDate(verified.checked);
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
        {!verified.checks.includes('absent') && (
          <p className="text-muted-foreground mt-1.5">Registered doesn’t mean every pharmacy stocks it.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Mark for an entry a pharmacist reviewed because no registry record confirms it. */
export function ReviewedBadge({ reviewed }: { reviewed: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`${REVIEWED.title}: what does this mean?`} className={`${TRIGGER} text-primary`}>
          <UserRoundCheckIcon className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-sm" align="start">
        <p className="font-heading text-primary font-semibold">{REVIEWED.title}</p>
        <p className="text-muted-foreground mt-1">{REVIEWED.tip} Reviewed {formatDate(reviewed)}.</p>
      </PopoverContent>
    </Popover>
  );
}

/** The marker after an entry's "Ask for" name: the registry check mark, else the pharmacist review, else the confidence hint. */
export function EntryBadges({ entry }: { entry: CountryEntry }) {
  if (entry.verified) return <VerifiedBadge verified={entry.verified} />;
  if (entry.reviewed) return <ReviewedBadge reviewed={entry.reviewed} />;
  return <ConfBadge confidence={entry.confidence} />;
}
