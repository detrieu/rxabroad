'use client';

import { useState } from 'react';
import type { Confidence } from '@/data';

const TIPS: Partial<Record<Confidence, { cls: string; symbol: string; tip: string }>> = {
  medium: { cls: 'conf conf-med', symbol: '†', tip: 'General market knowledge, not brand-verified.' },
  low: { cls: 'conf conf-low', symbol: '?', tip: 'Unconfirmed — verify locally before relying on it.' },
};

/** † / ? marker after a brand name; tap to reveal what it means. */
export function ConfBadge({ confidence }: { confidence: Confidence }) {
  const [open, setOpen] = useState(false);
  const t = TIPS[confidence];
  if (!t) return null;
  return (
    <>
      <button
        type="button"
        className={t.cls}
        aria-expanded={open}
        aria-label={t.tip}
        title={t.tip}
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
      >
        {t.symbol}
      </button>
      {open && <span className="conf-note">{t.tip}</span>}
    </>
  );
}
