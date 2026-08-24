# Cerebrum

> OpenWolf's learning memory. Updated automatically as the AI learns from interactions.
> Do not edit manually unless correcting an error.
> Last updated: 2026-08-20

## User Preferences

<!-- How the user likes things done. Code style, tools, patterns, communication. -->

- **Never use the user's own email address for test fixtures.** Asked for E2E
  test accounts, they explicitly declined plus-aliases on their personal Gmail
  and asked for a scheme that keeps their identity out of it entirely.
- **Prefer test designs that do not exercise third-party subsystems.** Their
  words: auth "is a third party program and therefore the login is not
  necessarily as functional part". Test the app's own behaviour (routing,
  validation, error messages) and avoid depending on the vendor's mail
  pipeline, quotas or dashboard toggles wherever a design can sidestep them.
- Wants npm scripts kept separate and explicit: `npm test` = Vitest only,
  `npm run e2e` = Playwright only.

## Key Learnings

- **Project:** worktime-scheduler
- **Description:** A personal worktime tracker: register with an email and password, log time

- **Supabase dashboard (2025+ layout):** Project URL and API keys live on TWO
  different pages, not the old single "Project Settings -> API" page.
  URL = Project Settings -> Data API -> Project URL (`https://<project-ref>.supabase.co`,
  the ref is in the dashboard address bar). Keys = Project Settings -> API Keys,
  which has an "API keys" tab (`sb_publishable_...` / `sb_secret_...`) and a
  "Legacy API keys" tab (the `eyJ...` anon public JWT). Either browser-safe key
  works with @supabase/supabase-js ^2.112 for VITE_SUPABASE_ANON_KEY; a secret key
  must never be used because Vite inlines VITE_* into the client bundle.

- **GitHub CLI (2026-08-21):** `gh` is installed at `C:\Program Files\GitHub CLI\gh.exe`
  and IS on the machine PATH, but a shell started before the install has a stale
  environment and reports "gh: command not found". Call it by full path in that
  session (`& "C:\Program Files\GitHub CLI\gh.exe" ...`) instead of concluding it is
  missing. Logged in as `darol81` (scopes: repo, workflow, read:org, gist);
  `gh auth setup-git` has been run, so git uses the CLI token as the credential
  helper for github.com. Remote: `https://github.com/darol81/scheduler.git`.

- **Supabase signUp validates the email domain; signInWithPassword does not.**
  `example.com` and anything under `.test` come back as
  `Email address "..." is invalid`. You therefore cannot probe which domains are
  acceptable by attempting sign-ins -- only signUp runs the validator. signUp is
  also metered against the project's email quota even with confirmations off, so
  a handful of probe attempts trips `email rate limit exceeded` for an hour.
  Accounts created from the dashboard with "Auto Confirm User" skip all of this.

- **Vitest 4's default exclude is only `node_modules` and `.git`** -- not
  `dist`, not any new directory. Its default include is `**/*.{test,spec}.*`
  rooted at the project, so ANY new top-level test directory is collected
  automatically. `vite.config.js` pins `include` to `src/**` for this reason.

- **Vite binds to `localhost` = `::1` first on Windows.** A Playwright
  `webServer` polling `127.0.0.1` will time out against it. Pass
  `--host 127.0.0.1` on the command line; Playwright's `port`/`url` options
  only say what to poll, they configure nothing about the server.

- **Dropping an RLS policy does not simulate a leak.** With RLS still enabled
  and no policy left, the table is deny-all: everyone sees nothing, so an
  isolation test stays green while the app is completely broken. The faithful
  mutations are `disable row level security` or widening a policy to
  `using (true)`.

- **`supabase.auth.signOut()` defaults to `scope: 'global'`.** It revokes every
  refresh token the user holds, on every device -- not just the calling tab.
  In an E2E suite where all workers share two accounts, one test signing out
  silently kills the session of every concurrently running test, which surfaces
  as an unrelated spec timing out on the /login screen. Pass
  `{ scope: 'local' }` unless "sign out everywhere" is genuinely the intent.

- **A parallel-only E2E failure is usually shared server-side state, not a
  timing bug.** When a spec passes alone and fails in a full run, reproduce by
  running just the two suspect spec files together before touching any waits or
  timeouts -- `npx playwright test e2e/a.spec.js e2e/b.spec.js`. Read the
  `error-context.md` page snapshot first; it says what the page actually showed,
  which is faster than reasoning about the assertion that timed out.

- **The `secrets` context is not available in a job-level `if:` in GitHub
  Actions.** To make a job skip (rather than fail) when a secret is missing, a
  `preflight` job must read the secret into a step's `env:`, test it there, and
  publish the answer as a job output the real job gates on via `needs`. This is
  what `.github/workflows/nightly.yml` does so the E2E job skips itself on an
  unconfigured repo.
- **`concurrency: cancel-in-progress: false` is what serialises the E2E suite.**
  The two Supabase test accounts are shared, and `e2e/global-setup.js` empties
  them at the start of every run, so two overlapping runs corrupt each other.
  The default `cancel-in-progress: true` would be actively wrong here: it would
  kill the run already talking to Supabase in favour of the newcomer.

## Do-Not-Repeat

- **[2026-08-21] `Closes #N` must be in the PR *body*, not the commit message.**
  The repo squash-merges with `squash_merge_commit_message=PR_BODY`, so the
  branch's commit messages are discarded. Issue #6 stayed open after PR #7
  merged because the keyword was only in the commit. `CONTRIBUTING.md` already
  says to put it in the PR body -- follow it.

- **[2026-08-24] Editing `package.json` deps without re-running `npm install`.**
  `@vitest/ui` sat in `devDependencies` while `package-lock.json` never learnt
  about it, so `npm ci` refused to install and `ci.yml`, `nightly.yml` and the
  Cloudflare Pages build (`npm clean-install`) were all broken while
  `npm run dev` / `npm run build` stayed green locally -- the lockfile is not
  consulted by a build against a populated `node_modules`. Any dependency edit
  ends with `npm install` and the regenerated lockfile in the same commit.

<!-- Mistakes made and corrected. Each entry prevents the same mistake recurring. -->
<!-- Format: [YYYY-MM-DD] Description of what went wrong and what to do instead. -->

## Decision Log

### Hosting (2026-08-24)

Cloudflare Pages, `*.pages.dev` subdomain, Git integration on `main`. The app is
a pure static bundle, so the only host-specific artefacts are three files:
`public/_redirects` (SPA fallback -- `BrowserRouter` means `/entries` etc. have no
file behind them), `public/_headers` (nosniff / DENY / referrer policy, plus a
year of immutable caching for the content-hashed `/assets/*`), and `.node-version`
(`24`; Vite 8 needs >=20.19 and the Pages default is older). Vite copies `public/`
verbatim into `dist/`, which is where the edge reads the first two.

Deliberately no CSP: Recharts writes inline style attributes, so a real policy
needs `style-src 'unsafe-inline'` and verification against a live deploy. No HSTS
either -- `pages.dev` is already preloaded; it becomes meaningful with a custom
domain.

The two `VITE_*` vars must be set for **Production and Preview both** in Pages.
Their absence does not fail the build -- `supabaseClient.js` falls back to
placeholders and the site serves `<SetupNotice />`, which is the failure mode to
check first on a deploy that "works" but shows the wrong screen.

Supabase's Redirect-URL allowlist does not gate `signInWithPassword`, and nothing
in `src/` passes a `redirectTo` anywhere, so widening it is hygiene for the day
confirmations or password reset get switched on -- not a prerequisite for the
deploy to authenticate. Scope the preview wildcard to
`https://*.<project>.pages.dev/**`; a bare `https://*.pages.dev/**` would
allowlist every site on the platform.

<!-- Significant technical decisions with rationale. Why X was chosen over Y. -->

### Lint stack (2026-08-21)

- **`@stylistic/eslint-plugin`, NOT `@stylistic/eslint-plugin-js`.** The js-only
  package is deprecated upstream; the unified one replaces it. Namespace is
  `@stylistic/*` (no `/js`).
- **Gotcha when migrating:** the unified plugin (v5) defaults `indent`'s
  `SwitchCase` to `1`; the js-only v4 defaulted to `0`. `eslint.config.js` pins
  `{ 'SwitchCase': 0 }` explicitly so the switch statements in `src/lib/errors.js`
  and `src/utils/periods.js` keep their existing (unindented-case) style.
  Do not "clean up" that option — removing it reformats 48 lines for no reason.
- User's standing preference: when a tool is deprecated, swap the tool, do NOT
  let the swap change the enforced code style.
