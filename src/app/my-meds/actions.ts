'use server';

import { clerkClient } from '@clerk/nextjs/server';
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

// A saved medicine list is health data (GDPR art. 9, Washington's My Health My Data Act), so trips are stored only
// after the traveler explicitly agrees. The record lives in Clerk private metadata, which only the server can read
// or write, and goes away with the account.
const CONSENT_VERSION = '2026-11-24';
type Consent = { at: string; version: string };

async function consentOf(userId: string): Promise<Consent | null> {
  const user = await (await clerkClient()).users.getUser(userId);
  return (user.privateMetadata.healthDataConsent as Consent | undefined) ?? null;
}

export async function listTrips(): Promise<{ trips: Trip[]; consented: boolean }> {
  const userId = await currentUserId();
  if (!userId) return { trips: [], consented: false };
  const [rows, consent] = await Promise.all([
    sql`select id, name, destinations, meds, updated_at from public.trips
      where user_id = ${userId} order by updated_at desc`,
    consentOf(userId),
  ]);
  return { trips: (rows as Row[]).map(toTrip), consented: !!consent };
}

export async function giveHealthDataConsent(): Promise<void> {
  const userId = await requireUser();
  const consent: Consent = { at: new Date().toISOString(), version: CONSENT_VERSION };
  await (await clerkClient()).users.updateUserMetadata(userId, { privateMetadata: { healthDataConsent: consent } });
}

/** Withdrawing consent deletes every saved trip, since they can't be kept without it. */
export async function withdrawHealthDataConsent(): Promise<void> {
  const userId = await requireUser();
  await sql`delete from public.trips where user_id = ${userId}`;
  await (await clerkClient()).users.updateUserMetadata(userId, { privateMetadata: { healthDataConsent: null } });
}

export async function createTrip(input: TripInput): Promise<Trip> {
  const userId = await requireUser();
  if (!(await consentOf(userId))) throw new Error('Agree to saving your medicines first.');
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
