# Working on this project

Small project, one author, but `main` is treated as if it were shared: it is the
branch that is always supposed to build. Everything below exists to keep that
true without adding ceremony.

## The loop

```
issue  ->  branch  ->  commits  ->  push  ->  pull request  ->  CI green  ->  squash merge
```

1. **Open an issue** first, even for your own work. It is what the branch and the
   PR are named after, and it is where the *why* lives once the diff has stopped
   being self-explanatory.
2. **Branch off an up-to-date `main`.** `main` is protected against direct
   pushes -- with one caveat worth being honest about: the protection is set to
   `enforce_admins: false`, so as the repository owner your own `git push
   origin main` still goes through. That escape hatch is deliberate (the
   `.wolf/` bookkeeping files churn on every session), but it means the rule is
   a guardrail you keep, not a wall that keeps you. Flip `enforce_admins` to
   `true` if you would rather it were a wall; you can still merge your own PRs.
   ```bash
   git switch main && git pull
   git switch -c chore/3-ci-and-branching
   ```
3. **Push and open a PR**, with `Closes #3` in the body so the issue closes
   itself on merge.
   ```bash
   git push -u origin chore/3-ci-and-branching
   gh pr create --fill
   ```
4. **Wait for `checks`.** It cannot be merged red.
5. **Squash merge.** The branch is deleted automatically and the PR title becomes
   the commit subject on `main`, so write the title as the commit message you
   want to read in `git log` a year from now.
   ```bash
   gh pr merge --squash
   ```

## Branch names

`<type>/<issue number>-<short slug>`, where type is one of `feat`, `fix`,
`chore`, `docs`:

```
feat/12-weekly-goals
fix/18-duration-comma-parsing
chore/3-ci-and-branching
docs/7-supabase-setup
```

## Commit messages

Keep the existing style: short, plain, lower case, under 50 characters, saying
what changed. `eslint updated`, `script for setting up e2e tests`. No
`feat:` / `fix:` prefixes -- the branch name and the PR already carry that.

Commits on a branch are working notes; only the squashed PR title survives on
`main`, so it is the title that deserves the care.

## What runs when

| Workflow | Trigger | Runs |
|---|---|---|
| **CI** (`.github/workflows/ci.yml`) | every PR into `main`, every push to `main`, manual | `npm run lint`, `npm test` (106 unit tests), `npm run build` |
| **Nightly** (`.github/workflows/nightly.yml`) | 02:00 UTC daily, manual | all of the above plus `npm run e2e` -- the 13 Playwright specs against the real Supabase project |

Both can be started by hand from the **Actions** tab, or:

```bash
gh workflow run nightly.yml
gh run watch
```

The split is deliberate. CI is hermetic -- no Supabase project, no secrets, no
accounts -- so it is fast, cannot flake, and works on pull requests from forks.
The end-to-end suite is none of those things: it drives a real Supabase project
and empties two shared accounts on the way, which is not something a pull
request should be allowed to do.

## Before opening a PR

```bash
npm run lint && npm test
```

Run `npm run e2e` as well if the change touches auth, entries, RLS or reports.
It is not required -- the nightly will catch it -- but it is a lot cheaper to
find out now.

## Enabling the nightly end-to-end run

The end-to-end job **skips itself** until three secrets exist, so an unconfigured
repository gets a skipped job rather than a red one. To turn it on:

```bash
gh secret set VITE_SUPABASE_URL
gh secret set VITE_SUPABASE_ANON_KEY
gh secret set E2E_PASSWORD
```

`E2E_EMAIL_A` and `E2E_EMAIL_B` are not needed -- the defaults in
`e2e/helpers/env.js` already match the allowlist in `supabase/e2e.sql`, and
setting them here would only give the two a way to drift apart.

The Supabase URL and anon key are not really secrets; Vite inlines both into the
public bundle. They live in Actions secrets to keep the project reference out of
a public repository, not because exposure would breach anything. A
`sb_secret_` / `service_role` key must never be added -- see the security model
in `CLAUDE.md`.

The other three prerequisites are one-time manual steps that CI cannot do for
itself, all covered in [README](README.md) section 3.2: the Supabase project,
the two hand-created confirmed accounts, and `supabase/e2e.sql` applied once.

## Things that will bite eventually

- **GitHub disables scheduled workflows after 60 days without repository
  activity.** You get an email first; re-enabling is `gh workflow enable
  nightly.yml`, or one click in the Actions tab.
- **The nightly is a live-data job.** It signs in as the two test accounts and
  empties them. Do not go looking at those accounts while it runs.
- **Do not run `npm run e2e` locally while the nightly is running.** The
  concurrency group only serialises runs inside GitHub Actions; it cannot see
  your laptop. `e2e/global-setup.js` empties both accounts at the start of a
  run, so a local run started at the wrong moment deletes the nightly's live
  data mid-suite and both go red. The window is 02:17 UTC onwards, for a few
  minutes.
- **A free Supabase project pauses after about a week of inactivity.** The
  nightly then fails with connection errors rather than test failures. The
  nightly itself counts as activity, so it keeps itself alive once running --
  but after a long break the project has to be resumed by hand in the dashboard
  before the next run can pass. That is the first thing to check when the
  nightly is red but nothing changed.
