'use client';

import { useEffect } from 'react';
import { Link2Icon, PrinterIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { applySources, SOURCES_KEY } from '@/lib/theme';
import { useHydrated, useStoredString } from '@/lib/storage';
import { cn } from '@/lib/utils';

export function SourcesToggle({ className }: { className?: string }) {
  const hydrated = useHydrated();
  const [raw, setRaw] = useStoredString(SOURCES_KEY);
  const on = hydrated && raw === '1';

  // Skip the hydration pass, where storage reads as null; the head script already applied it.
  useEffect(() => {
    if (hydrated) applySources(on);
  }, [hydrated, on]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-pressed={on}
      className={cn('aria-pressed:bg-secondary aria-pressed:text-foreground text-muted-foreground', className)}
      onClick={() => setRaw(on ? '0' : '1')}
    >
      <Link2Icon />
      {on ? 'Hide sources' : 'Show sources'}
    </Button>
  );
}

/** Opens every <details> entry for printing, then restores what was open. */
export function PrintButton({ label = 'Print', className }: { label?: string; className?: string }) {
  useEffect(() => {
    let openBefore: boolean[] | null = null;
    const entries = () => Array.from(document.querySelectorAll<HTMLDetailsElement>('details.ticket'));
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
    <Button type="button" variant="ghost" size="sm" className={cn('text-muted-foreground', className)} onClick={() => window.print()}>
      <PrinterIcon />
      {label}
    </Button>
  );
}
