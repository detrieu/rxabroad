-- Auth moved from Neon Auth to Clerk. Clerk user ids are text ("user_2abc..."), and users live in Clerk,
-- so trips.user_id becomes plain text with no foreign key. (No trips existed when this ran.)
-- Note: deleting a user in Clerk does NOT cascade here; add a Clerk webhook if that's ever needed.

alter table public.trips drop constraint if exists trips_user_id_fkey;
alter table public.trips alter column user_id type text using user_id::text;
alter table public.trips add constraint trips_user_id_format check (user_id ~ '^user_[A-Za-z0-9]+$');
