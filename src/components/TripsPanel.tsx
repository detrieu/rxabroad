'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckIcon, CloudIcon, LoaderCircleIcon, LogInIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { SignInButton, useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useActiveTripId } from '@/lib/my-meds';
import { defaultTripName, type Trip } from '@/lib/trips';
import { createTrip, deleteTrip, listTrips, updateTrip } from '@/app/my-meds/actions';
import { cn } from '@/lib/utils';
import type { CountryCode } from '@/data';
import { Flag } from './Flag';

interface TripsPanelProps {
  meds: string[];
  dests: CountryCode[];
  setMeds: (ids: string[]) => void;
  setDests: (codes: CountryCode[]) => void;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Saved trips for signed-in travelers; the open trip autosaves as the card changes. */
export function TripsPanel({ meds, dests, setMeds, setDests }: TripsPanelProps) {
  const { isLoaded, userId: clerkUserId } = useAuth();
  const userId = clerkUserId ?? null;
  const isPending = !isLoaded;
  // Trips are stored with the user they belong to, so switching accounts never shows stale trips.
  const [loaded, setLoaded] = useState<{ userId: string; trips: Trip[] } | null>(null);
  const trips = userId && loaded?.userId === userId ? loaded.trips : null;
  const setTrips = useCallback(
    (update: (list: Trip[]) => Trip[]) => setLoaded((prev) => (prev ? { ...prev, trips: update(prev.trips) } : prev)),
    [],
  );
  const [activeId, setActiveId] = useActiveTripId();
  const active = trips?.find((t) => t.id === activeId) ?? null;

  // The name being edited belongs to one trip; switching trips shows that trip's saved name.
  const [draft, setDraft] = useState<{ id: string; name: string } | null>(null);
  const name = active ? (draft?.id === active.id ? draft.name : active.name) : '';
  const setName = (value: string) => active && setDraft({ id: active.id, name: value });

  const [saveResult, setSaveResult] = useState<'saved' | 'error' | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    listTrips()
      .then((list) => {
        if (cancelled) return;
        setLoaded({ userId, trips: list });
        // Forget an "open" trip that isn't this user's (e.g. after switching accounts or deleting elsewhere).
        if (activeId && !list.some((t) => t.id === activeId)) setActiveId(null);
      })
      .catch(() => !cancelled && setLoaded({ userId, trips: [] }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the user changes
  }, [userId]);

  // Autosave the open trip when the card or its name differs from what's saved (debounced).
  const trimmedName = name.trim() || active?.name || '';
  const dirty =
    !!active && (!same(active.meds, meds) || !same(active.destinations, dests) || trimmedName !== active.name);
  useEffect(() => {
    if (!active || !dirty) return;
    let stale = false;
    const t = setTimeout(async () => {
      try {
        const updated = await updateTrip(active.id, { name: trimmedName, meds, destinations: dests });
        if (stale) return;
        if (!updated) throw new Error('missing');
        setTrips((list) => [updated, ...list.filter((x) => x.id !== updated.id)]);
        setSaveResult('saved');
      } catch {
        if (!stale) setSaveResult('error');
      }
    }, 700);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [active, dirty, meds, dests, trimmedName, setTrips]);

  const saveState: SaveState = dirty ? (saveResult === 'error' ? 'error' : 'saving') : saveResult === 'saved' ? 'saved' : 'idle';

  function open(trip: Trip) {
    setActiveId(trip.id);
    setMeds(trip.meds);
    setDests(trip.destinations);
    setDraft(null);
    setSaveResult(null);
  }

  async function saveAsNew() {
    try {
      const trip = await createTrip({ name: defaultTripName(dests), meds, destinations: dests });
      setTrips((list) => [trip, ...list]);
      setActiveId(trip.id);
      setDraft(null);
      setSaveResult('saved');
      toast.success(`Saved “${trip.name}”`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the trip');
    }
  }

  async function remove(trip: Trip) {
    if (!window.confirm(`Delete “${trip.name}”? This can’t be undone.`)) return;
    try {
      await deleteTrip(trip.id);
      setTrips((list) => list.filter((t) => t.id !== trip.id));
      if (trip.id === activeId) setActiveId(null);
      toast.success('Trip deleted');
    } catch {
      toast.error('Could not delete the trip');
    }
  }

  const heading = (
    <h2 className="font-heading flex items-center gap-2 text-lg font-bold">
      <CloudIcon className="text-primary size-5" /> Saved trips
    </h2>
  );

  if (isPending) {
    return <section className="no-print bg-card h-28 animate-pulse rounded-2xl border p-5 shadow-sm" aria-busy="true" />;
  }

  if (!userId) {
    return (
      <section className="no-print bg-card rounded-2xl border p-5 shadow-sm">
        {heading}
        <p className="text-muted-foreground mt-1.5 text-sm">
          Sign in to save this trip and open it on any device. Without an account, your card stays in this browser only.
        </p>
        <SignInButton mode="redirect" forceRedirectUrl="/my-meds">
          <Button className="mt-3 w-full"><LogInIcon /> Sign in to save trips</Button>
        </SignInButton>
      </section>
    );
  }

  return (
    <section aria-labelledby="trips-heading" className="no-print bg-card rounded-2xl border p-5 shadow-sm">
      <div id="trips-heading">{heading}</div>

      {active ? (
        <div className="mt-3">
          <label htmlFor="trip-name" className="text-muted-foreground mb-1.5 block font-mono text-[0.65rem] tracking-[0.2em] uppercase">
            Editing trip
          </label>
          <Input id="trip-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          <p className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-xs" aria-live="polite">
            {saveState === 'saving' && <><LoaderCircleIcon className="size-3.5 animate-spin" /> Saving…</>}
            {saveState === 'saved' && <><CheckIcon className="text-ink-otc size-3.5" /> Saved to your account</>}
            {saveState === 'error' && <span className="text-destructive">Couldn’t save — check your connection.</span>}
            {saveState === 'idle' && 'Changes save automatically.'}
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => { setActiveId(null); setSaveResult(null); }}>
            <PlusIcon /> Start a new card
          </Button>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-muted-foreground text-sm">
            {meds.length || dests.length ? 'Save your current card to your account.' : 'Build a card below, then save it as a trip.'}
          </p>
          <Button className="mt-3 w-full" onClick={saveAsNew} disabled={!meds.length && !dests.length}>
            <PlusIcon /> Save as trip
          </Button>
        </div>
      )}

      {trips && trips.length > 0 && (
        <div className="mt-5">
          <p className="text-muted-foreground mb-1.5 font-mono text-[0.65rem] tracking-[0.2em] uppercase">Your trips · {trips.length}</p>
          <ul className="grid gap-1.5">
            {trips.map((trip) => (
              <li key={trip.id} className={cn('flex items-center gap-1 rounded-lg border', trip.id === activeId && 'border-primary bg-secondary')}>
                <button
                  type="button"
                  onClick={() => open(trip)}
                  aria-current={trip.id === activeId ? 'true' : undefined}
                  className="hover:bg-muted min-w-0 flex-1 rounded-l-lg px-3 py-2 text-left"
                >
                  <span className="block truncate text-sm font-medium">{trip.name}</span>
                  <span className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1 text-xs">
                    {trip.destinations.map((c) => <Flag key={c} code={c} className="h-2.5" />)}
                    <span className="ml-0.5">{trip.meds.length} med{trip.meds.length === 1 ? '' : 's'}</span>
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive mr-1"
                  aria-label={`Delete trip ${trip.name}`}
                  onClick={() => remove(trip)}
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
