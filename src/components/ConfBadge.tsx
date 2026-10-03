'use client';

import { CircleHelpIcon, InfoIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Confidence } from '@/data';

const TIPS: Partial<Record<Confidence, { icon: typeof InfoIcon; color: string; title: string; tip: string }>> = {
  medium: {
    icon: InfoIcon,
    color: 'text-ink-mixed',
    title: 'Not brand-verified',
    tip: 'Based on general market knowledge. The brand is likely right, but it hasn’t been confirmed against a local registry.',
  },
  low: {
    icon: CircleHelpIcon,
    color: 'text-ink-banned',
    title: 'Unconfirmed',
    tip: 'We couldn’t confirm this. Verify with a local pharmacist before relying on it.',
  },
};

/** Small icon after a brand name; tap or click to see what it means (works on touch, unlike a tooltip). */
export function ConfBadge({ confidence }: { confidence: Confidence }) {
  const t = TIPS[confidence];
  if (!t) return null;
  const Icon = t.icon;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${t.title}: what does this mean?`}
          className={`ml-1 inline-flex size-5 translate-y-0.5 items-center justify-center rounded-full ${t.color} hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none`}
        >
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
