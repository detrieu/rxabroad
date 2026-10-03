'use client';

import { useEffect } from 'react';
import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { applyTheme, THEME_KEY, type ThemePref } from '@/lib/theme';
import { useHydrated, useStoredString } from '@/lib/storage';

export function ThemeToggle({ className }: { className?: string }) {
  const hydrated = useHydrated();
  const [raw, setRaw] = useStoredString(THEME_KEY);
  const pref: ThemePref = raw === 'light' || raw === 'dark' ? raw : 'system';

  // Skip the hydration pass, where storage reads as null; the head script already applied it.
  useEffect(() => {
    if (!hydrated) return;
    applyTheme(pref);
    if (pref !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [hydrated, pref]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={className} aria-label="Change theme">
          <SunIcon className="dark:hidden" />
          <MoonIcon className="hidden dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuRadioGroup
          value={hydrated ? pref : 'system'}
          onValueChange={(v) => setRaw(v === 'system' ? null : v)}
        >
          <DropdownMenuRadioItem value="light"><SunIcon /> Light</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><MoonIcon /> Dark</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system"><MonitorIcon /> System</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
