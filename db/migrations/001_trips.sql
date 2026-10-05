-- Saved trips: a traveler's medicines + destinations, owned by a Neon Auth user.
-- Destinations are ordered (trip legs). Ids are validated in the app against src/data.

create table if not exists public.trips (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references neon_auth."user"(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 80),
  destinations text[] not null default '{}' check (cardinality(destinations) <= 14),
  meds         text[] not null default '{}' check (cardinality(meds) <= 50),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists trips_user_id_updated_at_idx on public.trips (user_id, updated_at desc);
