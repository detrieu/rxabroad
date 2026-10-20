-- What people look for that the formulary doesn't cover, and what they report as wrong. Both anonymous:
-- no user id, IP or session is stored.

-- One row per search text, counted. Only searches that matched nothing are recorded.
create table if not exists public.search_misses (
  query      text primary key check (char_length(query) between 3 and 60),
  count      integer not null default 1,
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now()
);

create index if not exists search_misses_count_idx on public.search_misses (count desc);

-- A problem reported on one medicine in one country. Ids are validated in the app against src/data.
create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  drug_id    text not null,
  country    text not null check (country ~ '^[A-Z]{2}$'),
  message    text not null check (char_length(message) between 3 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_at_idx on public.feedback (created_at desc);
