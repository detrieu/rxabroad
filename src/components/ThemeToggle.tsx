'use client';

import { useEffect } from 'react';
import { applyTheme, THEME_KEY, type ThemePref } from '@/lib/theme';
import { useHydrated, useStoredString } from '@/lib/storage';

const NEXT: Record<ThemePref, ThemePref> = { system: 'light', light: 'dark', dark: 'system' };
const LABEL: Record<ThemePref, string> = { system: 'Theme: auto', light: 'Theme: light', dark: 'Theme: dark' };

export function ThemeToggle() {
  const hydrated = useHydrated();
  const [raw, setRaw] = useStoredString(THEME_KEY);
  const pref: ThemePref = raw === 'light' || raw === 'dark' ? raw : 'system';

  // Skip the hydration pass, where storage reads as null; the head script already applied it.
  useEffect(() => {
    if (hydrated) applyTheme(pref);
  }, [hydrated, pref]);

  return (
    <button
      type="button"
      className="print-btn theme-btn"
      onClick={() => setRaw(NEXT[pref] === 'system' ? null : NEXT[pref])}
      title="Cycle between automatic, light, and dark theme"
    >
      {hydrated ? LABEL[pref] : 'Theme'}
    </button>
  );
}
