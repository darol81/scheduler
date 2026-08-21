# STATUS — worktime-scheduler

> Single source of truth for resuming work. Read this FIRST when starting a session.
> Update this file at the end of every work phase so the next `/clear` resumes in 1 read.
> Last updated: 2026-08-21

---

## ✅ Done

**Auth**
- Google OAuth removed; email + password via Supabase Auth (`signUp` /
  `signInWithPassword`). Separate `/login` and `/register` routes so password
  managers key off the URL. Generic "Wrong email or password." for both failure
  modes, plaintext password redacted from Redux `meta.arg`, post-login redirect
  sanitised against protocol-relative paths. 106 tests pass, build clean.

**Docs (this session)**
- Rewrote the Supabase env-var setup instructions: the dashboard now splits
  Project URL (Settings → Data API) from keys (Settings → API Keys, with
  "API keys" and "Legacy API keys" tabs), which the old docs did not match.
  Touched `manual_work_todo.md` (new `## Manual steps` checklist),
  `.env.example` (header comment), `README.md` §1.1 + §2.

**Linting (this session)**
- ESLint 10 flat config added (`eslint.config.js`) from the now-deleted
  `lintfile.js` spec: `@stylistic/js` indent 2 / unix linebreaks / single quotes /
  no semicolons, plus `eqeqeq`, `no-trailing-spaces`, `object-curly-spacing`,
  `arrow-spacing`, `no-console` off. Environment adapted to this project
  (ESM + browser globals + JSX; node globals only for `vite.config.js` /
  `eslint.config.js`); `.wolf/**`, `dist/**`, `build/**` ignored.
  Scripts: `npm run lint`, `npm run lint:fix`. Whole `src/` auto-fixed
  (1810 problems -> 0) and `.gitattributes` (`* text=auto eol=lf`) added so
  `core.autocrlf=true` cannot reintroduce CRLF. 106 tests pass, build clean.

**E2E tests (this session)** -- GitHub issue #2
- Playwright suite added under `e2e/`: auth (routing + failure paths),
  entries (duration notation, form contract, table + delete), RLS isolation
  (two accounts, two browser contexts, both directions, positive control
  before every negative assertion), reports (lazy Recharts chunk + pageerror
  collection). Chromium only.
- `npm test` stays Vitest-only -- `vite.config.js` now pins
  `include: ['src/**/*.{test,spec}.{js,jsx}']`, because Vitest 4's default glob
  would otherwise collect `e2e/*.spec.js` and run it in jsdom.
  New scripts: `e2e`, `e2e:ui`, `e2e:reset`, `e2e:report`.
- `supabase/e2e.sql`: `e2e_reset_account()`, a test-only reset entry point kept
  OUT of `schema.sql` so production never has it. Only ever deletes
  `user_id = auth.uid()` rows, gated on an `e2e_accounts` allowlist that has RLS
  on and zero policies, execute revoked from anon.
- The suite never calls `signUp` -- that is the only auth path touching
  Supabase's email system. Accounts are made by hand once; the suite signs in.
- 106 unit tests still pass, lint clean.

**E2E suite is green (this session)**
- The two accounts and `supabase/e2e.sql` were installed by hand; `npm run e2e`
  now passes **13/13**, and two back-to-back runs both pass -- teardown and the
  run-unique naming survive the `(user_id, lower(name))` unique index.
- Fixed the one real bug the suite found: `supabase.auth.signOut()` defaults to
  `scope: 'global'`, revoking every refresh token the user holds on every
  device. `auth.spec.js:72` signing out as ACCOUNT_A therefore killed the
  session of whatever test was running concurrently on the other worker, which
  showed up as `entries.spec.js:26` timing out on the /login screen. Now
  `signOut({ scope: 'local' })` in `src/store/authSlice.js`, and the same in
  `e2e/helpers/backend.js` so `npm run e2e:reset` cannot do it mid-run either.
  A button labelled just "Sign out" should not end the session on your phone.

---

## 🚀 Next phase

**Goal:** Close out issue #2 -- one acceptance criterion left, and it is manual.

### Remaining: prove the RLS spec is not vacuous
In the Supabase SQL editor:

```sql
alter table public.categories disable row level security;   -- expect FAIL
```
`npm run e2e -- e2e/rls-isolation.spec.js` must now **fail**. Then:
```sql
alter table public.categories enable row level security;    -- expect PASS
```
and it must pass again. Do NOT use `drop policy` for this -- with RLS on and no
policy the table is deny-all, so the spec stays green while the app is broken.

### Watch item
One intermediate full run failed 4 auth specs and took 1.2m instead of ~21s;
the error text was overwritten before it was read, and five full runs since
have passed 13/13. If it recurs, capture the failure output -- the suite makes
~15 sign-in calls per run and Supabase rate-limits the token endpoint per IP,
which is the first thing to check.

### Closed decisions
- Accounts are created by hand, never by the suite. Sign-up is the only auth
  path that touches Supabase's email system; avoiding it removes the
  confirmation-mail, email-rate-limit and allow-signups dependencies at once.
- No `service_role` key anywhere in the suite. The reset RPC is safe because it
  can only ever touch the caller's own rows.
- Chromium only; no CI workflow for now (one shared Supabase project means
  concurrent runs would race).
- Per-test UI sign-in rather than a shared `storageState`: the session key is
  `sb-<project-ref>-auth-token`, so a saved state file silently couples to one
  project, and `autoRefreshToken` makes two workers race on one refresh token.
- Sign-out is local-scope, not global (see the bug above).

### Open decisions
- Whether to amend GitHub issue #2's acceptance criterion, which as written
  ("the RLS spec fails if an own-rows policy is removed") describes a check
  that would pass while proving nothing.
- Whether to turn "Allow new users to sign up" off. The E2E suite no longer
  depends on it, so nothing blocks this now.
