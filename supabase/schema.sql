-- Worktime Scheduler schema
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run: everything is guarded with "if not exists" / "drop policy if exists".

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (length(btrim(name)) > 0),
  color      text not null default '#64748b',
  archived   boolean not null default false,
  created_at timestamptz not null default now()
);

-- One category name per user, case-insensitively.
create unique index if not exists categories_user_name_key
  on public.categories (user_id, lower(name));

create index if not exists categories_user_idx
  on public.categories (user_id);

-- ---------------------------------------------------------------------------
-- time_entries
-- Duration is an integer number of minutes -- no start/end timestamps, so there
-- is no timezone ambiguity. entry_date is a plain date.
-- ---------------------------------------------------------------------------
create table if not exists public.time_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  entry_date  date not null,
  minutes     integer not null check (minutes > 0),
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists time_entries_user_date_idx
  on public.time_entries (user_id, entry_date desc);

create index if not exists time_entries_category_idx
  on public.time_entries (category_id);

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------
create table if not exists public.goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  category_id    uuid not null references public.categories (id) on delete cascade,
  period         text not null check (period in ('daily', 'weekly', 'monthly')),
  target_minutes integer not null check (target_minutes > 0),
  created_at     timestamptz not null default now(),
  unique (user_id, category_id, period)
);

create index if not exists goals_user_idx
  on public.goals (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- The anon key ships to the browser, so THESE POLICIES are what actually keep
-- one user's data away from another's. Do not skip this section.
-- ---------------------------------------------------------------------------
alter table public.categories   enable row level security;
alter table public.time_entries enable row level security;
alter table public.goals        enable row level security;

drop policy if exists "own categories" on public.categories;
create policy "own categories" on public.categories
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own time entries" on public.time_entries;
create policy "own time entries" on public.time_entries
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own goals" on public.goals;
create policy "own goals" on public.goals
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
