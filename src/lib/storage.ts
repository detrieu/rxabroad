'use client';

import { useCallback, useSyncExternalStore } from 'react';

// Tiny localStorage-backed store shared across components and tabs.
// Every access is wrapped in try/catch: storage can throw in private windows
// or when site data is blocked, and the app must still work without it.

// Storage keys keep the original 'pt-' prefix (from the app's first name) so saved cards survive the rename.
const EVENT = 'pt-storage';

function read(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch { /* storage unavailable — keep working in memory for this render */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** Raw string value in localStorage; `null` on the server and when unset. */
export function useStoredString(key: string): [string | null, (v: string | null) => void] {
  const value = useSyncExternalStore(subscribe, () => read(key), () => null);
  const set = useCallback((v: string | null) => write(key, v), [key]);
  return [value, set];
}

/** Hydration flag: false during SSR and the first client render, true afterwards. */
export function useHydrated() {
  return useSyncExternalStore(() => () => {}, () => true, () => false);
}
