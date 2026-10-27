'use server';

import { currentUserId } from '@/lib/auth';
import { sql } from '@/lib/db';
import { getCountry } from '@/data';
import { cleanTripInput, isTripId, MAX_TRIPS_PER_USER, type Trip, type TripInput } from '@/lib/trips';

// Every action re-checks the session and scopes queries to the caller's user id,
// so a trip id alone can never read or change someone else's trip.

type Row = { id: string; name: string; destinations: string[]; meds: string[]; updated_at: Date };
const toTrip = (r: Row): Trip => ({
  id: r.id,
  name: r.name,
  destinations: r.destinations.filter((c) => getCountry(c)) as Trip['destinations'],
  meds: r.meds,
  updatedAt: new Date(r.updated_at).toISOString(),
});

async function requireUser() {
  const userId = await currentUserId();
  if (!userId) throw new Error('Not signed in');
  return userId;
}

export async function listTrips(): Promise<Trip[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const rows = (await sql`
    select id, name, destinations, meds, updated_at from public.trips
    where user_id = ${userId} order by updated_at desc`) as Row[];
  return rows.map(toTrip);
}

export async function createTrip(input: TripInput): Promise<Trip> {
  const userId = await requireUser();
  const t = cleanTripInput(input);
  const rows = (await sql`
    insert into public.trips (user_id, name, destinations, meds)
    select ${userId}, ${t.name}, ${t.destinations}, ${t.meds}
    where (select count(*) from public.trips where user_id = ${userId}) < ${MAX_TRIPS_PER_USER}
    returning id, name, destinations, meds, updated_at`) as Row[];
  if (!rows[0]) throw new Error(`You can save up to ${MAX_TRIPS_PER_USER} trips.`);
  return toTrip(rows[0]);
}

export async function updateTrip(id: string, input: TripInput): Promise<Trip | null> {
  const userId = await requireUser();
  if (!isTripId(id)) return null;
  const t = cleanTripInput(input);
  const rows = (await sql`
    update public.trips
    set name = ${t.name}, destinations = ${t.destinations}, meds = ${t.meds}, updated_at = now()
    where id = ${id} and user_id = ${userId}
    returning id, name, destinations, meds, updated_at`) as Row[];
  return rows[0] ? toTrip(rows[0]) : null;
}

export async function deleteTrip(id: string): Promise<boolean> {
  const userId = await requireUser();
  if (!isTripId(id)) return false;
  const rows = await sql`delete from public.trips where id = ${id} and user_id = ${userId} returning id`;
  return rows.length > 0;
}
