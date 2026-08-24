# STATUS — worktime-scheduler

> Single source of truth for resuming work. Read this FIRST when starting a session.
> Update this file at the end of every work phase so the next `/clear` resumes in 1 read.
> Last updated: 2026-08-24

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

**Cloudflare Pages deploy prep (2026-08-24)**
- Branch `chore/cloudflare-pages` **pushed 2026-08-24** and tracking
  `origin/chore/cloudflare-pages`. Pushed under the un-numbered name: no issue
  existed yet and `gh` is installed but NOT authenticated, so the issue and PR
  still have to be opened by hand. Prepared PR body sits in the scratchpad as
  `PR_BODY.md`.
- Pushing first needed a TLS fix: Git for Windows' bundled OpenSSL CA bundle
  could not build the chain (something re-signs HTTPS on this machine).
  `git config --global http.sslBackend schannel` set, which uses the Windows
  certificate store. See buglog 2026-08-24.
- New `public/_redirects` (`/* /index.html 200`) -- `src/main.jsx` mounts a
  `BrowserRouter`, so without it a bookmark or hard refresh on `/entries`,
  `/reports`, `/settings` 404s at the edge. Pages matches real assets first, so
  the hashed `/assets/*` files (including the lazy Recharts chunk) are unaffected.
- New `public/_headers`: nosniff, `X-Frame-Options: DENY`, referrer policy,
  `Permissions-Policy`, `COOP`, plus `max-age=31536000, immutable` on
  `/assets/*` only -- `index.html` stays revalidating or a deploy reaches nobody.
- New `.node-version` = `24`, matching both workflows. Vite 8 needs Node
  `^20.19 || >=22.12`; the Pages default is older and the build would fail.
- `README.md` `## Deploying` rewritten from three sentences to the full
  Cloudflare click-path; `manual_work_todo.md` gained a step 5 with the same.
- **`package-lock.json` regenerated.** `@vitest/ui` was in `package.json` but
  never in the lock, so `npm ci` refused to install -- meaning `ci.yml`,
  `nightly.yml` and Pages' `npm clean-install` were all broken while local
  `build`/`dev` stayed green. See buglog 2026-08-24.
- Verified locally: `npm ci` succeeds from the synced lock, `npm run build`
  clean and both `_redirects` / `_headers` land at `dist/` root, lint clean,
  128/128 unit tests. Nothing else in `src/`, `vite.config.js` or the workflows
  was touched.

---

## 🚀 Next phase

**Goal:** Lock the live deploy down to a single user, then the pre-existing
loose ends.

### DONE 2026-08-24: the deploy shipped
- Issue **#11** and PR **#10** both closed; `main` is `eef10ec`. Local `main`
  synced, `chore/cloudflare-pages` deleted local and remote.
- The site is **live on Cloudflare Pages**, project `scheduler`.
- Cost the user two false starts, both worth remembering:
  1. `Create application` drops you in a **Workers** wizard ("Create a Worker"),
     which makes Deploy command and an API token mandatory and then fails,
     because `npx wrangler deploy` wants a `wrangler.jsonc` this repo lacks.
     Pages is `Create application -> **Pages** tab -> Connect to Git`, has NO
     deploy command and needs no API token. Pages is not deprecated.
  2. The user deleted `node_modules` + `package-lock.json` trying to "resync"
     with Cloudflare. Neither is visible to the remote build. See Do-Not-Repeat.
- Also fixed en route: `git push` failed with an OpenSSL CA error; set
  `http.sslBackend=schannel` globally. See buglog 2026-08-24.

### The live deployment, as measured 2026-08-24

**Hostnames** -- Pages appended a suffix because `scheduler` was taken:
- production: **`https://scheduler-7u8.pages.dev`**
- a deployment URL looks like `https://<hash>.scheduler-7u8.pages.dev`

**Layer 1 (Supabase signups): DONE and verified at the API level.**
`POST /auth/v1/signup` returns
`422 {"error_code":"signup_disabled","msg":"Signups not allowed for this instance"}`.
That is the proof that counts -- the browser saying "New registrations are
closed." only shows the UI renders `friendlyAuthError`'s mapping. No source
change was needed or made.

Reusable technique: `scratchpad/probe-live.sh` derives the Supabase URL and anon
key **from the deployed bundle itself** (both are public by design -- Vite
inlines every `VITE_*`), then probes `/auth/v1/health` before `/auth/v1/signup`
so a wrong key cannot masquerade as a successful lockdown. No secrets needed
from the user, and it doubles as a check that the Pages env vars are live.

**Layer 2 (Cloudflare Access): on for everything except one hostname.**
The Pages *Preview access* policy is enabled. Measured with `curl -L`, watching
for a 302 to `*.cloudflareaccess.com/cdn-cgi/access/login/`:

| Hostname | |
| --- | --- |
| `scheduler-7u8.pages.dev` (project alias) | **OPEN** |
| `a67d7a4f.scheduler-7u8.pages.dev` (production deployment hash) | GATED |
| `946884e4.scheduler-7u8.pages.dev` (older production hash) | GATED |
| `69689ba9.scheduler-7u8.pages.dev` (preview deployment hash) | GATED |
| `main.scheduler-7u8.pages.dev` (branch alias) | GATED |
| `docs-12-record-deployment-state.scheduler-7u8.pages.dev` | GATED |

So the policy is **broader than Cloudflare's own wording suggests**. The UI says
"This protects preview deployment URLs only. Production pages.dev and custom
domains are managed separately in Zero Trust", which reads as though production
deployments are untouched. In fact every *deployment-specific* and *branch-alias*
hostname is gated, including production deployments' own hash URLs. What is
"managed separately" is precisely one thing: the bare project alias. Do not
infer the split from the prose -- measure it.

Net public surface: **one hostname**, `scheduler-7u8.pages.dev`.

A Zero Trust organization therefore already exists --
`scheduler-7u8-pages.cloudflareaccess.com` -- provisioned by enabling Preview
access. That also explains the Access PIN email the user received and did not
expect. (The assistant never touched the Cloudflare account; it has no access.)

### SETTLED 2026-08-24: production Access declined. Do not reopen.
The org existing did **not** make the application free. **Zero Trust -> Access
controls -> Applications** forces a plan chooser first, and picking **Free**
still demands card details before the Self-hosted form is ever reached. The user
declines to enter payment details, in any case. **This is a final decision, not
a blocked task** -- a future session should not re-propose Cloudflare Access.

That costs little. Access protects the site origin; the browser calls
`<project-ref>.supabase.co` directly, a hostname Access never sees, so it could
never have closed the signup endpoint. Supabase did. Layer 2 would have reduced
attack surface, not fixed a known hole.

**Residual risk, accepted knowingly:** the one open hostname serves the login
page and the bundle, anon key included. Both are public by design -- Vite inlines
every `VITE_*`. RLS is the isolation boundary and holds regardless of who holds
the key; with signups closed there is no way to obtain a session at all. **The
one thing that would break this** is a future table added without
`enable row level security` plus an own-rows policy, which `CLAUDE.md` already
flags. With no Access in front, that is now the single point of failure -- re-read
it before the next schema change.

Alternatives recorded so they are not rediscovered:
- `functions/_middleware.js` doing HTTP Basic Auth would hide the site with no
  Zero Trust and no card. Needs a source file and a second password; the user
  asked for no source changes. Revisit only if the login page draws real traffic.
- A **custom domain** would make zone-level WAF custom rules available (an
  IP-allowlist route needing no Zero Trust seat), and would be the moment to add
  `Strict-Transport-Security` to `public/_headers` and move the Supabase Site URL.

### Deployment hygiene: do NOT delete accumulated deployments
Each Pages deployment keeps its own immutable URL, so they pile up. Leave them:
1. They are snapshots of one commit each, not duplicate links; the alias always
   serves the newest production one.
2. They are already private -- every hash and branch-alias host is behind Access
   per the table above, so deleting them closes no public exposure.
3. **Old production deployments are the rollback targets.** Pages rollback
   reverts to a previous *production* deployment; deleting them throws away
   instant revert. Preview deployments are explicitly not valid rollback targets,
   so those are the only safe ones to tidy.
4. They cost nothing -- no documented retention limit or storage charge, and
   unlimited preview deployments are allowed. The Free-plan quota that bites is
   **500 builds/month**, which counts builds run, not deployments kept.

Never delete the deployment the alias currently points at.

The real fix is upstream: **exclude `.wolf/*` under Settings -> Build -> Build
watch paths.** PR #13 touched only `.wolf/**` and still triggered a build,
burning a build and creating a deployment nobody wanted.

### Step 1: record the lockdown in README (own issue/branch/PR)
README 1.3 and Deploying say to *close* signups; nothing says the deployment IS
closed, gives the real hostname, or records the no-card decision and the
residual risk above. Worth writing down now that it is measured rather than
intended -- but as its own PR, not a rider on #13.

### Still open from before
#### Loose end 1: turn the nightly on -- SECRETS SET 2026-08-24
All three repository secrets now exist (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `E2E_PASSWORD`), so the e2e job no longer skips itself.
Remaining: `gh workflow run nightly.yml && gh run watch` and confirm 17/17 on a
runner. E2E_EMAIL_A/B are deliberately NOT secrets -- the defaults in
`e2e/helpers/env.js` already match the allowlist in `supabase/e2e.sql`. Note that
`E2E_PASSWORD` no longer has a default there (#17), so a runner without the
secret now fails loudly instead of silently using a published password.

Watch for: the runner's egress IP is shared Azure space, so GoTrue's per-IP
token limit is likelier to bite there than locally (~15 sign-ins per run). If
the nightly shows rate-limit failures, the first lever is `workers: 1` on CI in
`playwright.config.js`, not longer timeouts.

#### Loose end 2: prove the RLS spec is not vacuous (manual, ~2 min)
Still not done. In the Supabase SQL editor:
```sql
alter table public.categories disable row level security;   -- expect FAIL
```
`npm run e2e -- e2e/rls-isolation.spec.js` must now **fail**. Then re-enable and
it must pass again. Do NOT use `drop policy` -- with RLS on and no policy the
table is deny-all, so the spec stays green while the app is broken.

#### Loose end 3: turn "Allow new users to sign up" off -- DONE 2026-08-24
Off, and verified at the API rather than in the UI: `POST /auth/v1/signup`
returns `422 {"error_code":"signup_disabled"}`. `/register` still renders
normally and reports "New registrations are closed." -- no code changed, because
`friendlyAuthError` already mapped the code.

#### RESOLVED 2026-08-24: `.wolf/dashboard-token`
Was a tracked 64-hex file in a **public** repo, committed in the first commit
(`ab5989f`) and read by **nothing** -- no consumer in the repo or the `.wolf/`
tooling. The owner has never used the OpenWolf dashboard, so it was a localhost
nonce, not a live credential. Untracked with `git rm --cached` and gitignored;
the local file is kept so nothing breaks. **Deliberately no history rewrite** --
it sits in the first commit, so purging means rewriting every commit on a
protected branch, which is disproportionate here. Do not reopen this.

#### Local E2E setup: the two env files are NOT redundant
Cost real time to diagnose, so: `.env.local` holds `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` and feeds the `npm run dev` server the suite spawns;
`.env.e2e.local` holds `E2E_PASSWORD` and feeds `loadE2EEnv`. `loadEnv('e2e', ...)`
reads both, but the dev server runs in Vite's *development* mode and never sees
`.env.e2e.local` -- so putting the Supabase values there clears the error message
and then fails all 17 specs against a `SetupNotice` with no login form. Also:
`npx playwright install chromium` is genuinely required, and its absence presents
as all 17 specs failing, which reads like a config fault. Check the first error
line for `Executable doesn't exist`. Both files are gitignored.

#### Not verified: the change-password happy path against real Supabase
The failure paths are covered end-to-end (`e2e/settings.spec.js`, 4 specs), and
the happy path including `scope: 'others'` is covered against a mocked client in
`authSlice.test.js`. A real end-to-end password change was deliberately NOT run:
it would change the shared E2E account's password, and the suite is
`fullyParallel` with both workers signed in as ACCOUNT_A, so the
`signOut({ scope: 'others' })` would revoke the other worker's token mid-run.
To check it by hand, use a personal account, and confirm the other-device
revocation with a second browser profile.

#### Watch item
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
- Cloudflare Pages over the alternatives: the app is a static bundle with no
  server of its own, and Pages' Git integration deploys on merge without a
  deploy workflow or a `CLOUDFLARE_API_TOKEN` secret in the repo. Note Pages
  does not wait for GitHub Actions -- previews build on red CI, and branch
  protection is what keeps a failing PR out of production.
- No CSP in `public/_headers`: Recharts writes inline style attributes, so a
  useful policy needs `style-src 'unsafe-inline'` and verification against a
  live deploy. No HSTS either -- `pages.dev` is already preloaded; it starts to
  mean something with a custom domain.
- `enforce_admins: false` on `main`: the owner's direct push still works. That
  is the escape hatch for `.wolf/` bookkeeping churn, and it means the
  protection is a guardrail, not a wall.
