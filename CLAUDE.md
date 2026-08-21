# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## OpenWolf

@.wolf/OPENWOLF.md

This project uses OpenWolf for context management. The imported protocol above applies every session.

## Commands

```bash
npm run dev            # Vite dev server on http://localhost:5173
npm run build          # production build
npm test               # vitest, single run
npm run test:watch
npm run lint           # eslint . (flat config, ESLint 10)
npm run lint:fix
```

Run one test file or one case:

```bash
npx vitest run src/utils/duration.test.js
npx vitest run -t 'parses 1h 20min'
```

Vitest config lives inside `vite.config.js` (`test.environment: 'jsdom'`, `globals: true`,
setup file `src/test/setup.js` which only pulls in `@testing-library/jest-dom/vitest`).

Vite reads `.env.local` only at startup — restart the dev server after editing it.

## Style (enforced by eslint.config.js)

No semicolons, single quotes, 2-space indent, unix linebreaks, `eqeqeq`,
`object-curly-spacing: always`. `.gitattributes` pins `* text=auto eol=lf`, so do not
let `core.autocrlf` reintroduce CRLF. `.wolf/**` is vendored CommonJS tooling and is
lint-ignored; do not restyle it.

## Architecture

React 19 + plain JavaScript (no TypeScript), Vite, Redux Toolkit, Supabase, Tailwind 4,
Recharts. There is no backend of our own — the browser talks to Supabase directly.

**Security model.** The anon key is inlined into the bundle by Vite, so the RLS policies in
`supabase/schema.sql` are the *only* thing isolating one account's data from another's.
Every table keys on `auth.users.id` and every policy compares it to `auth.uid()`. Any new
table needs the same `enable row level security` + own-rows policy, and any new write path
must set `user_id` from `requireUserId()` (`src/lib/supabaseClient.js`). Never introduce a
`sb_secret_...` / `service_role` key into client code or `.env.local`.

**Load-once, filter-client-side.** `App.jsx` fetches categories, entries and goals once per
signed-in `userId` (and dispatches the `*Reset()` actions when it goes null, so switching
accounts cannot merge data). Every view then derives from that single copy through the
memoised selectors in `src/store/selectors.js` — that is what keeps the dashboard, entries
table and reports in agreement with no refetch coordination. Add a selector rather than a
new fetch. `entriesSlice` caps the load at `MAX_ROWS = 5000`.

**Slice shape.** One slice per table plus `authSlice`, each `{ items, status, error }`, each
wrapping its Supabase calls in `createAsyncThunk` and funnelling failures through
`rejectWithValue(friendlyError(...))`. `createAppStore(preloadedState)` in `src/store/index.js`
is a factory so tests can preload state; it also redacts `meta.arg.password` from the DevTools
action log and skips the serialisability scan on Supabase session objects.

**Two error families, deliberately separate** (`src/lib/errors.js`): `friendlyError` maps
Postgres/PostgREST SQLSTATE codes, `friendlyAuthError` maps GoTrue string codes. The
`invalid_credentials` case returns one vague "Wrong email or password." on purpose so the
sign-in form is not an account-existence oracle — there is a test asserting that; do not make
it more specific.

**Auth routing.** `/login` and `/register` are separate routes (not one toggling page) so
password managers key off the URL and `autocomplete` can be `current-password` vs
`new-password`. `MIN_PASSWORD_LENGTH` in `src/components/AuthForm.jsx` is a convenience check
only — the enforced floor is the Supabase dashboard setting; keep the two in step.
`ProtectedRoute` sanitises the post-login redirect against protocol-relative paths.
`ReportsPage` is `lazy()`-loaded because Recharts is the heaviest dependency.

**Durations and dates.** No live timer. `src/utils/duration.js` is the only place that knows
the input notation (`1h 20min`, `90m`, `1,5h`, Finnish `t` for hours) and everything is stored
as an integer number of minutes against a plain `date` column — no timestamps, so no timezone
ambiguity. `src/utils/periods.js` owns period windows; weeks start Monday
(`{ weekStartsOn: 1 }`) and every function takes an injectable `reference` date so tests can
pin "now". Date keys are `yyyy-MM-dd` strings throughout.

**Categories are archived, not deleted.** `time_entries.category_id` is `on delete restrict`,
so the database refuses to drop a category with entries; the UI only offers Delete for empty
ones. Colours come from `suggestColor()` in `src/lib/palette.js`.

## Tests

`src/utils/*.test.js` and `src/store/selectors.test.js` test pure functions directly — the
helpers in `selectors.js` take plain arrays precisely so they can be. Component tests
(`src/test/pages.test.jsx`) render against `createAppStore(preloadedState)` inside a
`MemoryRouter` and never touch the network. `src/test/auth.test.jsx` is the exception: it
`vi.mock`s `../lib/supabaseClient` wholesale and then uses top-level `await import(...)` for
everything downstream, because the mock must be in place before the modules load.

## Supabase setup

`README.md` §1 is the authoritative setup guide. Schema changes go in `supabase/schema.sql`
(written to be re-runnable: `if not exists` / `drop policy if exists`) and are applied by
pasting it into the dashboard SQL editor — there is no migration tooling here.
