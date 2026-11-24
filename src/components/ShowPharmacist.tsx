'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PlaneIcon, StoreIcon, XIcon } from 'lucide-react';
import { entryFor, hasName, type Country, type Drug } from '@/data';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Flag } from './Flag';
import { StatusPill } from './StatusPill';

// The pharmacist reads the local script, so the romanized reading in brackets is left off.
const withoutReading = (name: string) => name.replace(/\s*\([a-z\s-]+\)$/i, '');

const LABEL = 'text-muted-foreground font-mono text-[0.65rem] tracking-[0.2em] uppercase';

/** Keeps the screen on while the pharmacist screen is open, where the browser allows it. */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let released = false;
    navigator.wakeLock
      .request('screen')
      .then((l) => {
        if (released) l.release().catch(() => {});
        else lock = l;
      })
      .catch(() => {});
    return () => {
      released = true;
      lock?.release().catch(() => {});
    };
  }, [active]);
}

/** Full-screen, one medicine at a time, in large print: to hold up at a pharmacy counter. */
export function ShowPharmacist({ country, drugs }: { country: Country; drugs: Drug[] }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  useWakeLock(open);

  const go = useCallback((i: number) => {
    const track = trackRef.current;
    if (track) track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      const track = trackRef.current;
      if (!track) return;
      const i = Math.round(track.scrollLeft / track.clientWidth);
      if (e.key === 'ArrowRight') go(Math.min(i + 1, drugs.length - 1));
      if (e.key === 'ArrowLeft') go(Math.max(i - 1, 0));
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, go, drugs.length]);

  return (
    <>
      <Button className="no-print" onClick={() => { setIndex(0); setOpen(true); }}>
        <StoreIcon /> Show the pharmacist
      </Button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`What to ask for in ${country.name}`}
          className="bg-background fixed inset-0 z-50 flex h-dvh flex-col"
        >
          <header className="guilloche text-navy-foreground flex items-center gap-3 px-4 py-3 sm:px-6">
            <span className="text-gold font-heading flex items-center gap-2 text-sm font-bold tracking-[0.2em] uppercase">
              <PlaneIcon className="size-4 -rotate-45" /> Rx Abroad
            </span>
            <span className="flex min-w-0 flex-1 items-center justify-end gap-2 font-mono text-[0.7rem] tracking-[0.2em] uppercase">
              <Flag code={country.code} className="h-3.5 shrink-0" />
              <span className="truncate">{country.name}</span>
            </span>
            <Button
              ref={closeRef}
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-navy-foreground hover:text-gold -mr-2 hover:bg-white/10"
            >
              <XIcon />
            </Button>
          </header>

          <div
            ref={trackRef}
            onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
            className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]"
          >
            {drugs.map((drug, i) => {
              const entry = entryFor(drug, country.code);
              const named = hasName(entry);
              const [first, ...more] = named ? entry.brand.split(' / ') : [entry.brand];
              return (
                <section
                  key={drug.id}
                  aria-label={`${i + 1} of ${drugs.length}: ${drug.generic}`}
                  className="flex w-full shrink-0 snap-center overflow-y-auto px-4 py-6 sm:px-6"
                >
                  <div className="ticket bg-card m-auto w-full max-w-xl rounded-2xl border p-6 shadow-md sm:p-8">
                    <p className={LABEL}>{named ? 'Do you have' : 'Ask for'}</p>
                    <p className={cn('font-heading mt-2 text-4xl leading-tight font-extrabold break-words sm:text-5xl', !named && 'text-muted-foreground')}>
                      {first}
                    </p>
                    {more.map((b) => (
                      <p key={b} className="font-heading mt-2 text-2xl leading-snug font-bold break-words">
                        <span className="text-muted-foreground mr-2 text-base font-medium">or</span>{b}
                      </p>
                    ))}

                    <div className="perforation-h my-6" />

                    {entry.localName && (
                      <>
                        <p className={LABEL}>Generic name</p>
                        <p className="mt-2 text-3xl leading-snug font-bold sm:text-4xl">{withoutReading(entry.localName)}</p>
                      </>
                    )}
                    <p className={cn(entry.localName ? 'text-muted-foreground mt-1 text-xl' : 'text-3xl font-bold')}>{drug.generic}</p>

                    <StatusPill status={entry.status} className="mt-6" />
                  </div>
                </section>
              );
            })}
          </div>

          {drugs.length > 1 && (
            <nav aria-label="Medicines" className="flex items-center justify-between gap-3 border-t px-4 py-3 sm:px-6">
              <Button variant="outline" size="icon" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous medicine">
                <ChevronLeftIcon />
              </Button>
              <div className="flex items-center gap-2">
                {drugs.map((d, i) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`${d.generic}, ${i + 1} of ${drugs.length}`}
                    aria-current={i === index}
                    className={cn('h-2 rounded-full transition-all', i === index ? 'bg-primary w-6' : 'bg-border w-2')}
                  />
                ))}
              </div>
              <Button variant="outline" size="icon" onClick={() => go(index + 1)} disabled={index === drugs.length - 1} aria-label="Next medicine">
                <ChevronRightIcon />
              </Button>
            </nav>
          )}
        </div>
      )}
    </>
  );
}
