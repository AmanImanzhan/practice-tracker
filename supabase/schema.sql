-- Practice Tracker — Supabase schema (tables + Row Level Security)
-- Run this once in Supabase Dashboard -> SQL Editor.

-- ============================================================
-- profiles
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null,
  practice_goal numeric,
  instrument text,
  theme text not null default 'classical',
  unlocked boolean not null default false,
  push_notifications_enabled boolean not null default true,
  daily_reminder_enabled boolean not null default false,
  daily_reminder_time text not null default '09:00',
  session_timer_alerts_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- sessions
-- ============================================================
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  day_number integer not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

create policy "sessions_select_own"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "sessions_insert_own"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "sessions_update_own"
  on public.sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sessions_delete_own"
  on public.sessions for delete
  using (auth.uid() = user_id);

-- ============================================================
-- session_timings (child of sessions)
-- ============================================================
create table public.session_timings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  duration_minutes integer not null,
  label text
);

alter table public.session_timings enable row level security;

create policy "session_timings_select_own"
  on public.session_timings for select
  using (exists (
    select 1 from public.sessions s
    where s.id = session_timings.session_id and s.user_id = auth.uid()
  ));

create policy "session_timings_insert_own"
  on public.session_timings for insert
  with check (exists (
    select 1 from public.sessions s
    where s.id = session_timings.session_id and s.user_id = auth.uid()
  ));

create policy "session_timings_update_own"
  on public.session_timings for update
  using (exists (
    select 1 from public.sessions s
    where s.id = session_timings.session_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.sessions s
    where s.id = session_timings.session_id and s.user_id = auth.uid()
  ));

create policy "session_timings_delete_own"
  on public.session_timings for delete
  using (exists (
    select 1 from public.sessions s
    where s.id = session_timings.session_id and s.user_id = auth.uid()
  ));

-- ============================================================
-- repertoire (child of sessions)
-- ============================================================
create table public.repertoire (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  title text not null
);

alter table public.repertoire enable row level security;

create policy "repertoire_select_own"
  on public.repertoire for select
  using (exists (
    select 1 from public.sessions s
    where s.id = repertoire.session_id and s.user_id = auth.uid()
  ));

create policy "repertoire_insert_own"
  on public.repertoire for insert
  with check (exists (
    select 1 from public.sessions s
    where s.id = repertoire.session_id and s.user_id = auth.uid()
  ));

create policy "repertoire_update_own"
  on public.repertoire for update
  using (exists (
    select 1 from public.sessions s
    where s.id = repertoire.session_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.sessions s
    where s.id = repertoire.session_id and s.user_id = auth.uid()
  ));

create policy "repertoire_delete_own"
  on public.repertoire for delete
  using (exists (
    select 1 from public.sessions s
    where s.id = repertoire.session_id and s.user_id = auth.uid()
  ));

-- ============================================================
-- In-App Purchase (run only this block — everything above was already
-- applied earlier — once, in the Supabase Dashboard SQL Editor)
-- ============================================================

-- profiles.unlocked must only ever be flipped by the verify-purchase Edge
-- Function (via the service_role key), never directly by the signed-in user —
-- otherwise anyone could call `supabase.from('profiles').update({unlocked:true})`
-- from the client and skip the purchase entirely. RLS is row-level only, so the
-- actual guard here is a column-level privilege revoke.
revoke update (unlocked) on public.profiles from anon, authenticated;

-- ============================================================
-- purchases — one verified row per Apple transaction, used both as an audit
-- trail and to stop the same transaction_id from unlocking a second account.
-- ============================================================
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null,
  transaction_id text not null unique,
  environment text not null,
  purchased_at timestamptz not null default now()
);

alter table public.purchases enable row level security;

create policy "purchases_select_own"
  on public.purchases for select
  using (auth.uid() = user_id);

-- No insert/update/delete policy for anon/authenticated on purpose: only the
-- verify-purchase Edge Function (service_role, which bypasses RLS) may write here.
