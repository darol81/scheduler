# Worktime Scheduler

A personal worktime tracker: register with an email and password, log time
against your own categories after the fact, set per-category goals, and see how
the current day / week / month is tracking.

- **React 19 + JavaScript** (no TypeScript), built with Vite
- **Redux Toolkit** (`configureStore`, `createSlice`, `createAsyncThunk`, `createSelector`)
- **Supabase** for Postgres, email/password auth and row level security
- **Tailwind CSS 4** for styling, **Recharts** for the reports

---

## 1. Set up Supabase

### 1.1 Create the project

1. Create a project at [supabase.com](https://supabase.com).
2. Copy two values out of the dashboard -- they live on two different pages:
   - **Project Settings -> Data API -> Project URL**, which is just
     `https://<project-ref>.supabase.co` (`<project-ref>` is the id already in
     the dashboard address bar).
   - **Project Settings -> API Keys**, either the `anon` `public` JWT on the
     **Legacy API keys** tab or the `sb_publishable_...` key on the **API keys**
     tab. Both work; never use a secret / `service_role` key here.

### 1.2 Create the tables

Open **SQL Editor -> New query**, paste the contents of
[`supabase/schema.sql`](supabase/schema.sql) and run it.

That creates `categories`, `time_entries` and `goals`, and — importantly —
enables row level security with a policy per table. The anon key ships to the
browser, so those policies are the only thing keeping one account's data away
from another's. Don't skip that part of the script.

### 1.3 Enable email sign-in

Under **Authentication -> Sign In / Providers -> Email**, turn **Confirm email**
off. That is the only required step -- the Email provider itself is on by
default, and with confirmations off there is no mail to send and no SMTP to
configure.

Worth the extra ten seconds, on that same page:

- **Minimum password length**: raise it from `6` to `10`. This is the *only*
  enforced floor -- the check in the sign-up form is a convenience, and anyone
  can call the auth endpoint directly with the anon key from the page source.
  Keep it in step with `MIN_PASSWORD_LENGTH` in
  [`src/lib/password.js`](src/lib/password.js).
- **Google**: confirm the provider is **disabled**. Nothing points at it any
  more, and an enabled provider is a live sign-in path whether or not the UI
  offers it.

Optional: **Authentication -> Attack Protection -> Prevent use of leaked
passwords** rejects anything found in the HaveIBeenPwned corpus (only a
five-character hash prefix leaves Supabase, never the password). It is the
highest-value switch here but is Pro-plan only; on the free tier a 12-character
minimum is the compensating control. Once your own accounts exist you can also
turn **Allow new users to sign up** off -- the app already renders that as
"New registrations are closed."

Under **Authentication -> URL Configuration**, set:
- **Site URL**: `http://localhost:5173`
- **Redirect URLs**: add `http://localhost:5173/**`

That is the development entry. [Deploying](#deploying) adds the hosted origin
alongside it -- the list holds both, so a deploy does not cost you local sign-in.

## 2. Run the app

```bash
cp .env.example .env.local     # then fill in the two values
npm install
npm run dev
```

`.env.local` needs:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon public key, or sb_publishable_...>
```

Vite only reads environment variables at startup, so restart the dev server
after editing that file. Until it is filled in, the app shows a setup notice
instead of the login screen.

The key goes in the browser either way, which is the whole reason section 1.2's
RLS policies matter. A secret key (`sb_secret_...` / `service_role`) must never
go in this file -- it would ship to every visitor and bypass those policies.

### 2.1 Setting up another machine

`git pull` brings the repository but none of the gitignored files. There are
exactly three, and **only one of them is a secret**:

| File | Holds | Secret? | Where to get it |
| --- | --- | --- | --- |
| `.env.local` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | **No** | Cloudflare Pages -> Settings -> Environment variables |
| `.env.e2e.local` | `E2E_PASSWORD` | **Yes** | Your password manager |
| `.wolf/dashboard-token` | OpenWolf localhost nonce | -- | **Nothing. Skip it.** |

```bash
git clone <this repo> && cd scheduler
npm ci                              # not npm install -- see below
cp .env.example .env.local          # then fill in the two VITE_ values
printf 'E2E_PASSWORD=...
' > .env.e2e.local   # only if you will run E2E here
npx playwright install chromium     # only if you will run E2E here, ~115 MB
npm run dev
```

Four things worth knowing:

- **`.env.local` holds no secret.** Vite inlines every `VITE_*` value into the
  bundle it serves to the public, so both values are already readable from the
  deployed site. Copy them from the Cloudflare settings; there is nothing to
  transport securely. **`E2E_PASSWORD` is the opposite** -- it is the real
  password of two live accounts, so it belongs in a password manager and never
  in a file that is committed, an email, or a chat.
- **`npm ci`, not `npm install`.** `ci` installs exactly what
  `package-lock.json` pins; `install` may quietly rewrite it. A lockfile that had
  drifted from `package.json` once broke the deploy and both CI workflows while
  everything still worked locally.
- **Do not merge the two env files.** Section 3.2 explains why: `loadE2EEnv`
  reads both, but the dev server the E2E suite spawns runs in Vite's
  *development* mode and never loads `.env.e2e.local`.
- **If every E2E spec fails at once**, suspect the missing browser before the
  configuration. The giveaway is
  `browserType.launch: Executable doesn't exist` on the first error line.

`npm run lint`, `npm test` and `npm run build` all work on a bare clone with no
env files at all -- the unit tests never touch the network and the build simply
inlines empty values. Only `npm run dev` and `npm run e2e` need them.

## 3. Tests

### 3.1 Unit tests

```bash
npm test              # single run
npm run test:watch
npm run test:coverage # same run, plus a coverage report
```

These never touch the network. They cover the parts with real logic: duration
parsing, period boundaries (Monday-start weeks, month ends), and goal-progress
aggregation.

`test:coverage` prints a per-file summary and writes a browsable report to
`coverage/index.html`, plus `coverage/lcov.info` for anything that wants to read
it mechanically. The directory is gitignored. Plain `npm test` is left
uninstrumented, so it stays as quick as it was.

Read the numbers with the split in mind: the pure functions and the forms are
well covered, while the slices' thunks and the table-heavy pages are mostly
exercised through the Playwright suite instead, which this report cannot see. A
low number there means "covered elsewhere", not "untested" — but `App.jsx` and
`ProtectedRoute.jsx` at zero are the real gaps.

### 3.2 End-to-end tests

```bash
npm run e2e        # headless Chromium against a real Supabase project
npm run e2e:ui     # the Playwright UI, for debugging
npm run e2e:report # open the report from the last run
npm run e2e:reset  # empty both test accounts without running anything
```

The unit tests mock Supabase away, which means the thing most worth checking --
that the RLS policies in [`supabase/schema.sql`](supabase/schema.sql) really do
keep one account's data away from another's -- cannot be tested there at all.
The end-to-end suite in [`e2e/`](e2e) drives a real browser against a real
project and asserts exactly that, along with the auth round-trip, the duration
notation and the lazily-loaded reports page.

Three one-time setup steps:

1. **Install the browser.** `npx playwright install chromium` (about 150 MB).
2. **Create the two test accounts by hand**, under **Authentication -> Users ->
   Add user**, with **Auto Confirm User** ticked. Use the addresses and
   password from `.env.e2e.local` (defaults below). Creating them here rather
   than letting the suite sign up is deliberate: sign-up is the only auth path
   that touches Supabase's email system, so avoiding it means no confirmation
   mail, no per-project email rate limit, and no need to leave **Allow new
   users to sign up** switched on. Nothing is ever mailed to these addresses,
   so they need not be deliverable or belong to anyone.
3. **Run [`supabase/e2e.sql`](supabase/e2e.sql)** in the SQL editor, with those
   same two addresses in the allowlist at the top. It installs
   `e2e_reset_account()`, which lets the suite empty its own accounts between
   runs. It is deliberately *not* part of `schema.sql`, so a production project
   never has it at all.

`.env.e2e.local` is **required**, because `E2E_PASSWORD` has no default:

```
E2E_PASSWORD=<the password you gave both accounts>
```

Everything else defaults, so those lines are optional and only needed if you
chose different values:

```
E2E_EMAIL_A=worktime-e2e-a@worktime-e2e.dev
E2E_EMAIL_B=worktime-e2e-b@worktime-e2e.dev
E2E_PORT=5175
```

It is gitignored by the existing `*.local` pattern.

**You need `.env.local` as well, and the two are not redundant** -- they feed
two different processes:

| File | Read by | Holds |
| --- | --- | --- |
| `.env.local` | the `npm run dev` server the suite spawns | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| `.env.e2e.local` | `loadE2EEnv` in `playwright.config.js` | `E2E_PASSWORD` |

The error message names only `.env.local`, which misleads: `loadE2EEnv` calls
`loadEnv('e2e', ...)` and so reads **both** files. Putting the Supabase values in
`.env.e2e.local` therefore clears the error and then fails all 17 specs -- the
`webServer` runs `npm run dev`, which is Vite in *development* mode and never
loads `.env.e2e.local`, so the app boots unconfigured and serves `SetupNotice`
with no login form for the tests to drive. Keep the app's credentials in
`.env.local` and only the test password in `.env.e2e.local`.

Do not skip `npx playwright install chromium` either. Without the browser every
spec fails at once, which looks like a configuration fault; the giveaway is
`browserType.launch: Executable doesn't exist` on the first error line.

**The password is deliberately not written down anywhere in this repository.**
It used to have a committed default, which meant the real password of two live
accounts was published here -- anyone reading the repo could sign in to the
deployed app as them. RLS confined them to those two accounts, but it was still
unauthorised access to a live project. The addresses may stay in the open: they
are identifiers, and they have to match the allowlist in `supabase/e2e.sql`.
Both accounts share the one `E2E_PASSWORD` value (see `e2e/helpers/accounts.js`),
so give them the same password. `npm run e2e` fails with an explanatory error
until it is set.

The suite only ever calls `signInWithPassword`, which sends no mail and is not
metered, so none of this depends on your Supabase mail settings.

`npm test` and `npm run e2e` are entirely separate: `vite.config.js` pins the
Vitest `include` to `src/`, so the Playwright specs are never collected by the
unit runner.

#### Proving the RLS test actually tests something

An isolation test that quietly asserts nothing is worse than no test. To check
this one, simulate a leak in the SQL editor:

```sql
alter table public.categories   disable row level security;
alter table public.time_entries disable row level security;
-- npm run e2e -- rls-isolation     EXPECT: FAIL
alter table public.categories   enable row level security;
alter table public.time_entries enable row level security;
-- npm run e2e -- rls-isolation     EXPECT: PASS
```

Do **not** use `drop policy` for this. With RLS still enabled and no policy
left the table becomes deny-all: both accounts see nothing, the test stays
green, and you have proved nothing while the app is broken.

## 4. Development workflow

`main` is protected: it takes pull requests only, and a pull request cannot be
merged until the `checks` job is green. (Admin bypass is left on, so the owner's
own direct push still works -- the rule is a guardrail, not a wall.) Work happens
on a branch named after its issue.

```bash
git switch main && git pull
git switch -c feat/12-weekly-goals
# ...commits...
git push -u origin feat/12-weekly-goals
gh pr create --fill          # put "Closes #12" in the body
gh pr merge --squash         # once CI is green
```

Two workflows back that up:

| Workflow | Trigger | Runs |
|---|---|---|
| **CI** | every pull request and push to `main` | `npm run lint`, `npm test`, `npm run build` |
| **Nightly** | 02:00 UTC, or on demand | the same, plus the 13 end-to-end specs against the real Supabase project |

CI is hermetic -- it needs no Supabase project, no secrets and no accounts, so it
cannot flake and it works on pull requests from forks. The end-to-end suite is
kept out of it because it drives a real project and empties two shared accounts,
which is not something a pull request should be allowed to do.

The nightly end-to-end job skips itself until three secrets exist:

```bash
gh secret set VITE_SUPABASE_URL
gh secret set VITE_SUPABASE_ANON_KEY
gh secret set E2E_PASSWORD
```

[`CONTRIBUTING.md`](CONTRIBUTING.md) has the rest: branch naming, commit style,
and what to run before opening a pull request.

---

## How it works

### Durations

There is no live timer. Time is recorded afterwards by typing a duration, and
[`src/utils/duration.js`](src/utils/duration.js) is the only place that knows the
notation:

| You type | Stored |
| --- | --- |
| `1h 20min`, `1h20m`, `1 h 20`, `1t 20min` | 80 minutes |
| `90min`, `90m`, `90` | 90 minutes |
| `2h`, `2t`, `1.5h`, `1,5h` | 120 / 90 minutes |

Everything is stored as an integer number of minutes against a plain `date`, so
there are no timezone surprises.

### State

`src/store/` holds one slice per table plus `authSlice`, wired together in
`src/store/index.js` with `configureStore`. Each slice keeps
`{ items, status, error }` and wraps its Supabase calls in `createAsyncThunk`.

The whole history is loaded once per signed-in user; every view then filters it
client-side through the memoised selectors in `src/store/selectors.js`. That is
what keeps the dashboard, the entries table and the reports in agreement without
any refetch coordination.

### Layout

```
src/
  lib/          supabaseClient.js, errors.js, palette.js
  utils/        duration.js, periods.js
  store/        index.js, authSlice, categoriesSlice, entriesSlice, goalsSlice, selectors
  components/   Layout, ProtectedRoute, DurationInput, LogTimeForm, GoalProgressBar, ...
  pages/        Login, Dashboard, Entries, Goals, Categories, Reports
e2e/
  helpers/      accounts.js, app.js, backend.js, env.js, naming.js
  *.spec.js     auth, entries, rls-isolation, reports
supabase/
  schema.sql    tables + RLS policies
  e2e.sql       test-only reset entry point, never run in production
```

### Accounts and passwords

Supabase Auth owns the credential. `signUp` / `signInWithPassword` in
[`src/store/authSlice.js`](src/store/authSlice.js) hand the password straight to
Supabase over TLS; it is bcrypt-hashed into `auth.users` and **this app never
hashes, stores or logs it**. There is no `users` table here -- every row keys on
`auth.users.id`, and the RLS policies in `supabase/schema.sql` compare it against
`auth.uid()` from the signed JWT. That, not the anon key, is what keeps one
account's hours away from another's.

The password lives in React state for the life of the form and nowhere else: not
in Redux (the store keeps only the session), not in `localStorage`, and not in
the DevTools action log -- `createAppStore` redacts `meta.arg.password`, which
`createAsyncThunk` would otherwise expose in plaintext.

One honest consequence of skipping email confirmation: registering an address
that already has an account says so, which means the sign-up form can be used to
probe whether a given email is registered. Signing in cannot -- a wrong password
and an unknown address return the same message on purpose. Turning off new
signups (§1.3) closes the gap.

There is no password-reset flow yet. A forgotten password is reset from
**Authentication -> Users** in the Supabase dashboard.

### Categories

Categories are archived rather than deleted, so old entries keep their label.
The database enforces this: `time_entries.category_id` is `on delete restrict`,
so a category with entries cannot be deleted at all. The Delete button only
appears for categories with nothing logged against them.

## Deploying

There is no server to run. `npm run build` produces a directory of static files
in `dist/`, and any static host will serve it; the browser talks to Supabase
directly from there. These instructions are for **Cloudflare Pages**, which
builds from the repository and redeploys on every merge to `main`.

### Cloudflare Pages project

**Workers & Pages -> Create -> Pages -> Connect to Git**, pick this repository,
then:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |

Pages sees `package-lock.json` and runs `npm clean-install` itself, so there is
no install command to set.

### Environment variables

Under **Settings -> Environment variables**, add the same two values that are in
your `.env.local` -- to **Production and Preview both**:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the `anon` / `sb_publishable_...` key |

Leaving them out does not fail the build. Vite substitutes them at build time
and `src/lib/supabaseClient.js` falls back to placeholders when they are absent,
so the deploy succeeds and the site quietly shows the setup notice instead of
the login screen -- which is the failure to look for first. (`.github/workflows/ci.yml`
builds with no `VITE_*` vars on purpose, to keep that path proven.)

The same rule as section 2 applies with more force here: never put an
`sb_secret_...` / `service_role` key in these settings. It would be inlined into
a bundle served to the public internet and would bypass every RLS policy.

### Files in this repo that Pages reads

Vite copies `public/` verbatim to the root of `dist/`, which is where the edge
looks for the first two:

- **`public/_redirects`** -- `/* /index.html 200`. `src/main.jsx` mounts a
  `BrowserRouter`, so `/entries`, `/reports` and the rest are client-side paths
  with no file behind them; without this rule a bookmark or a hard refresh
  returns 404 from the edge. Pages matches a real asset first, so the hashed
  files under `/assets/` still serve normally.
- **`public/_headers`** -- `nosniff`, `X-Frame-Options: DENY`, a referrer policy,
  and a year of immutable caching for the content-hashed `/assets/*`.
  `index.html` is deliberately left revalidating. The file explains why there is
  no CSP and no HSTS yet.
- **`.node-version`** -- `24`, the same version both GitHub workflows pin. Vite 8
  needs Node `^20.19 || >=22.12` and the Pages default is older, so without this
  the build fails outright. If a build log still shows an old Node, set
  `NODE_VERSION=24` as an environment variable as well.

Worth setting **Settings -> Build -> Build watch paths -> Exclude** to `.wolf/*`:
that directory is bookkeeping, and a push touching only it would otherwise
trigger a full production rebuild of an unchanged bundle.

### Supabase URL configuration

Back in Supabase, **Authentication -> URL Configuration**:

- **Site URL**: `https://<project>.pages.dev`
- **Redirect URLs**: keep `http://localhost:5173/**`, and add
  `https://<project>.pages.dev/**` and `https://*.<project>.pages.dev/**`

The wildcard entry covers preview deployments, which Pages builds per branch at
`<branch>.<project>.pages.dev`. Scope it to your own project subdomain -- a bare
`https://*.pages.dev/**` would allowlist every site on Cloudflare Pages.

Note that this is hygiene rather than a blocker: the allowlist gates links
Supabase mails out and the fragment `detectSessionInUrl` reads, not
`signInWithPassword`, and no code in `src/` passes a `redirectTo` anywhere. With
email confirmation off (section 1.3) nothing currently sends such a link. It
matters the day confirmation or a password-reset flow is turned on, and getting
it right now costs nothing.

There is no external identity provider to reconfigure, which is the main
practical reason this app uses passwords rather than OAuth.

### After the first deploy

Worth two minutes on the live URL: open `/settings` directly in a fresh tab and
hard-refresh on `/entries` (proves `_redirects`); load `/reports` and confirm in
the network panel that its lazy chunk comes back as `text/javascript` rather
than `text/html` (proves the wildcard is not swallowing assets); then sign in
and add an entry, which is the only real proof the environment variables and
Supabase are wired together.

One thing to be aware of: Cloudflare does not wait for GitHub Actions. A preview
deployment is built even when `ci.yml` is red -- branch protection on `main`, not
Cloudflare, is what keeps a failing pull request out of production. Preview URLs
are also public, so if **Allow new users to sign up** is still on in Supabase,
turning it off is worth more once anything is hosted.

Adding a custom domain later needs no code change: attach it under **Custom
domains**, then make it the Supabase **Site URL** and leave the `pages.dev`
entries in the redirect list. That is also the point at which adding
`Strict-Transport-Security` to `public/_headers` starts to mean something.
