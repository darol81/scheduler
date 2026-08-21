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

**Issue #2 closed (this session)**
- Re-verified before closing: `npm run e2e` 13/13 in 26.7s, `npm test` 106/106,
  `eslint .` clean. Wrote the close-out comment on GitHub issue #2 (what was
  built, the decisions that diverged from the proposal, the signOut bug) and
  closed it as completed.
- Two criteria were closed with an explicit note rather than silently: the CI
  workflow is deliberately not done (one shared Supabase project, concurrent
  runs would race on the two fixed accounts), and the manual RLS negative
  control has still not been run -- see below.


**CI and branching policy (this session)** -- GitHub issue #3, PR #4
- `.github/workflows/ci.yml`: job `checks` runs `lint` + `test` + `build` on
  every PR and every push to `main`. Hermetic -- no Supabase, no secrets -- so
  it cannot flake and it works on fork PRs. Green in 22s on its own PR.
- `.github/workflows/nightly.yml`: `17 2 * * *` + `workflow_dispatch`. Same
  checks plus the Playwright specs (13 at the time, 17 now). Verified by dispatch: with no secrets
  set, `preflight` succeeds and `e2e` is **skipped**, with a `::notice::`
  saying why.
- The issue #2 objection is answered by `concurrency: { group: supabase-e2e,
  cancel-in-progress: false }` on the e2e job -- a manual dispatch fired
  mid-nightly queues behind it instead of letting global-setup's reset delete
  the running suite's data. `cancel-in-progress` must stay false.
- `main` protected: PR required (0 approvals), `checks` must pass (pinned to
  app_id 15368 so no other app can satisfy it), linear history, no force push,
  no deletion, `enforce_admins: false`. Repo is squash-only with
  `delete_branch_on_merge` and auto-merge on.
- `playwright.config.js` is CI-aware: `forbidOnly`, `retries: 1` on CI, `github`
  reporter. `workers` stays 2 everywhere.
- `CONTRIBUTING.md` + `.github/pull_request_template.md` + README §4 +
  a `## Git workflow` section in `CLAUDE.md`.

**Settings page + change password (this session)** -- GitHub issue #6
- New `/settings` route: an Account card, `ChangePasswordForm`, and a
  marked-out Preferences card for the date-format setting later.
- Header: the avatar+email became a `Link` to `/settings` with an explicit
  `aria-label` -- the email span is hidden below `sm:` and the avatar is
  `aria-hidden`, so without it the link would be unnamed on a phone. Sign out
  is untouched.
- `changePassword` thunk: verify the current password via `signInWithPassword`
  (GoTrue's `updateUser` never asks for it, so an unlocked browser would
  otherwise be a two-click takeover) -> `updateUser` -> `signOut({ scope:
  'others' })`. `'others'` is verified to keep this tab's session and fire no
  SIGNED_OUT; `'global'` would bounce the user to /login on success.
- Anything failing after `updateUser` rejects with "your password was changed,
  but..." rather than a plain failure -- the password really did change.
- `MIN/MAX_PASSWORD_LENGTH` moved to `src/lib/password.js` (was private to
  `AuthForm.jsx`); CLAUDE.md, README.md and manual_work_todo.md repointed.
- The DevTools action sanitizer in `store/index.js` now matches any key name
  containing "password", not the literal key `password` -- otherwise
  `currentPassword` sat in the action log in clear text.
- 128 unit tests (was 106), 17 E2E (was 13), lint clean.

---

## 🚀 Next phase

**Goal:** Loose ends, none of them large.

### Loose end 1: turn the nightly on (2 min, needs the user)
The e2e job skips itself until these exist:
```bash
gh secret set VITE_SUPABASE_URL
gh secret set VITE_SUPABASE_ANON_KEY
gh secret set E2E_PASSWORD
```
Then `gh workflow run nightly.yml && gh run watch` and confirm 17/17 on a
runner. E2E_EMAIL_A/B are deliberately NOT secrets -- the defaults in
`e2e/helpers/env.js` already match the allowlist in `supabase/e2e.sql`.

Watch for: the runner's egress IP is shared Azure space, so GoTrue's per-IP
token limit is likelier to bite there than locally (~15 sign-ins per run). If
the nightly shows rate-limit failures, the first lever is `workers: 1` on CI in
`playwright.config.js`, not longer timeouts.

### Loose end 2: prove the RLS spec is not vacuous (manual, ~2 min)
Still not done. In the Supabase SQL editor:
```sql
alter table public.categories disable row level security;   -- expect FAIL
```
`npm run e2e -- e2e/rls-isolation.spec.js` must now **fail**. Then re-enable and
it must pass again. Do NOT use `drop policy` -- with RLS on and no policy the
table is deny-all, so the spec stays green while the app is broken.

### Loose end 3: turn "Allow new users to sign up" off?
The E2E suite no longer depends on it. Nothing blocks the decision.

### Also worth a look, unrelated
`.wolf/dashboard-token` is a tracked 64-hex-character file in a **public**
repo. If it is a real credential it should be rotated, gitignored, and purged
from history; if it is only a localhost nonce it should still not be committed.

### Not verified: the change-password happy path against real Supabase
The failure paths are covered end-to-end (`e2e/settings.spec.js`, 4 specs), and
the happy path including `scope: 'others'` is covered against a mocked client in
`authSlice.test.js`. A real end-to-end password change was deliberately NOT run:
it would change the shared E2E account's password, and the suite is
`fullyParallel` with both workers signed in as ACCOUNT_A, so the
`signOut({ scope: 'others' })` would revoke the other worker's token mid-run.
To check it by hand, use a personal account, and confirm the other-device
revocation with a second browser profile.

### Watch item
One intermediate full run once failed 4 auth specs and took 1.2m instead of
~21s; the error text was overwritten before it was read, and every run since
has passed 13/13. Suspected per-IP rate limiting on the token endpoint.
### Closed decisions
- Accounts are created by hand, never by the suite. Sign-up is the only auth
  path that touches Supabase's email system; avoiding it removes the
  confirmation-mail, email-rate-limit and allow-signups dependencies at once.
- No `service_role` key anywhere in the suite. The reset RPC is safe because it
  can only ever touch the caller's own rows.
- Chromium only. ~~No CI workflow for now (one shared Supabase project means
  concurrent runs would race).~~ **Superseded by issue #3:** the objection only
  ever applied to the E2E suite, so the hermetic gates (lint, 106 unit tests,
  build) run on every PR in `ci.yml`, and the Playwright suite runs nightly in
  `nightly.yml` behind `concurrency: { group: supabase-e2e,
  cancel-in-progress: false }`, which makes two overlapping runs impossible.
- Per-test UI sign-in rather than a shared `storageState`: the session key is
  `sb-<project-ref>-auth-token`, so a saved state file silently couples to one
  project, and `autoRefreshToken` makes two workers race on one refresh token.
- Sign-out is local-scope, not global (see the bug above).
- Issue #2's third acceptance criterion ("fails if an own-rows policy is
  removed") was NOT amended in the issue text -- the correction was recorded in
  the close-out comment and in README instead, since the issue is now closed.
- Hermetic gates go in `ci.yml`; anything touching Supabase goes in
  `nightly.yml`. Never add credentials to `ci.yml` -- keeping it secret-free is
  what makes it safe on fork PRs and unable to flake.
- `enforce_admins: false` on `main`: the owner's direct push still works. That
  is the escape hatch for `.wolf/` bookkeeping churn, and it means the
  protection is a guardrail, not a wall.
