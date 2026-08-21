-- ---------------------------------------------------------------------------
-- End-to-end test support. NOT part of the application schema.
--
-- Run this ONLY in a Supabase project you use for testing. It is deliberately
-- kept out of schema.sql so that a production project never has the function
-- installed at all -- the strongest protection available is simply not
-- shipping the entry point.
--
-- What it adds: e2e_reset_account(), which wipes the CALLING account's own
-- categories, time entries and goals so a Playwright run starts from a known
-- clean slate.
--
-- Why it is safe to expose to the anon-key browser bundle at all:
--
--   1. It only ever deletes rows where user_id = auth.uid(). It cannot reach
--      another account's data by construction, so the worst any caller can do
--      to themselves is exactly what the app's own Delete buttons already let
--      them do.
--   2. It raises unless the caller's email is on the e2e_accounts allowlist
--      below, so an ordinary user who calls it gets an exception, not a wipe.
--   3. e2e_accounts has row level security enabled and NO policies at all, so
--      it can neither be read nor written through PostgREST. It is only
--      reachable from this SQL editor.
--   4. execute is revoked from public and anon; only authenticated may call it.
--
-- Safe to re-run.
-- ---------------------------------------------------------------------------

create table if not exists public.e2e_accounts (
  email text primary key
);

alter table public.e2e_accounts enable row level security;
-- Intentionally no policies. The API must never see this table.

-- These must match E2E_EMAIL_A / E2E_EMAIL_B in .env.e2e.local, and the two
-- accounts you created by hand under Authentication -> Users (with "Auto
-- Confirm User" ticked). Nothing is ever mailed to them, so the addresses do
-- not have to be deliverable.
insert into public.e2e_accounts (email) values
  ('worktime-e2e-a@worktime-e2e.dev'),
  ('worktime-e2e-b@worktime-e2e.dev')
on conflict (email) do nothing;

create or replace function public.e2e_reset_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if caller is null then
    raise exception 'e2e_reset_account: not signed in';
  end if;

  if not exists (
    select 1 from public.e2e_accounts where lower(email) = caller_email
  ) then
    raise exception 'e2e_reset_account: % is not an e2e test account', caller_email;
  end if;

  -- Order matters: time_entries.category_id is "on delete restrict", so the
  -- entries have to go before the categories they point at.
  delete from public.goals        where user_id = caller;
  delete from public.time_entries where user_id = caller;
  delete from public.categories   where user_id = caller;
end;
$$;

revoke all on function public.e2e_reset_account() from public;
revoke all on function public.e2e_reset_account() from anon;
grant execute on function public.e2e_reset_account() to authenticated;
