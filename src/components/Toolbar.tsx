'use client';

import { useEffect } from 'react';
import { applySources, SOURCES_KEY } from '@/lib/theme';
import { useHydrated, useStoredString } from '@/lib/storage';

export function SourcesToggle() {
  const hydrated = useHydrated();
  const [raw, setRaw] = useStoredString(SOURCES_KEY);
  const on = raw === '1';

  // Skip the hydration pass, where storage reads as null; the head script already applied it.
  useEffect(() => {
    if (hydrated) applySources(on);
  }, [hydrated, on]);

  return (
    <button
      type="button"
      className="print-btn sources-btn"
      aria-pressed={hydrated ? on : false}
      onClick={() => setRaw(on ? '0' : '1')}
    >
      {hydrated && on ? 'Hide sources' : 'Show sources'}
    </button>
  );
}

/** Opens every <details> entry for printing, then restores what was open. */
export function PrintButton({ label = 'Print / Save as PDF' }: { label?: string }) {
  useEffect(() => {
    let openBefore: boolean[] | null = null;
    const entries = () => Array.from(document.querySelectorAll<HTMLDetailsElement>('details.entry'));
    const before = () => {
      openBefore = entries().map((d) => d.open);
      entries().forEach((d) => (d.open = true));
    };
    const after = () => {
      if (!openBefore) return;
      const saved = openBefore;
      entries().forEach((d, i) => (d.open = saved[i] ?? d.open));
      openBefore = null;
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  return (
    <button type="button" className="print-btn" onClick={() => window.print()}>
      {label}
    </button>
  );
}
