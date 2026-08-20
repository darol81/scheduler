# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-08-20T12:58:12.938Z
> Files: 57 tracked | Anatomy hits: 0 | Misses: 0

> Project structure index. Auto-maintained by OpenWolf hooks and daemon.
> Run `openwolf scan` to generate, or wait for the first Claude Code session.
> Status: Pending initial scan

## ./

- `.gitignore` — Git ignore rules (~26 tok)
- `CLAUDE.md` — OpenWolf (~143 tok)
- `index.html` — Worktime Scheduler (~82 tok)
- `manual_work_todo.md` (~730 tok)
- `other.md` (~28 tok)
- `package-lock.json` — npm lock file (~32154 tok)
- `package.json` — Node.js package manifest (~229 tok)
- `README.md` — Project documentation (~1696 tok)
- `vite.config.js` — Vite build configuration (~85 tok)

## .claude/

- `settings.json` (~668 tok)

## .claude/commands/

- `designqc.md` (~343 tok)
- `reframe.md` — Mode: migrate [framework] (~551 tok)
- `security-audit.md` — Layer 1 — Dependencies (~510 tok)

## .claude/rules/

- `openwolf.md` (~251 tok)

## src/

- `App.jsx` — ReportsPage — renders chart — uses useEffect (~851 tok)
- `index.css` — Styles: 2 rules, 1 layers (~633 tok)
- `main.jsx` (~128 tok)

## src/components/

- `AuthForm.jsx` — Keep this at or above the "Minimum password length" set in the Supabase (~2825 tok)
- `CategoryDot.jsx` — CategoryDot (~73 tok)
- `CategorySelect.jsx` — Plain <select> over the user's active categories. (~296 tok)
- `DurationInput.jsx` — Free-text duration field. Keeps the raw string locally, parses on every (~606 tok)
- `DurationInput.test.jsx` — setup (~571 tok)
- `EmptyState.jsx` — EmptyState (~125 tok)
- `ErrorBanner.jsx` — ErrorBanner (~142 tok)
- `GoalProgressBar.jsx` — One goal, its target and how far the current period has got. (~454 tok)
- `Layout.jsx` — NAV_ITEMS (~677 tok)
- `LogTimeForm.jsx` — The main way time gets into the app: pick a category and a day, then type how (~1171 tok)
- `ProtectedRoute.jsx` — ProtectedRoute (~248 tok)
- `SetupNotice.jsx` — Shown instead of the app when .env.local has no Supabase credentials, so the (~563 tok)
- `Spinner.jsx` — Spinner (~101 tok)

## src/lib/

- `errors.js` — Turn a PostgREST/Postgres error into something worth showing a human. (~823 tok)
- `errors.test.js` — Declares message (~656 tok)
- `palette.js` — Category colours. Picked to stay distinguishable next to each other in the (~207 tok)
- `supabaseClient.js` — True once .env.local actually has credentials. The UI checks this so a fresh (~380 tok)

## src/pages/

- `CategoriesPage.jsx` — ColorPicker — renders form — uses useState, useMemo (~2462 tok)
- `DashboardPage.jsx` — StatCard — uses useMemo (~2257 tok)
- `EntriesPage.jsx` — PRESETS — renders form, table — uses useState, useMemo (~2769 tok)
- `GoalsPage.jsx` — NewGoalForm — renders form — uses useState, useMemo (~2043 tok)
- `LoginPage.jsx` — LoginPage (~36 tok)
- `RegisterPage.jsx` — RegisterPage (~37 tok)
- `ReportsPage.jsx` — Recharts hands us minutes; humans want "1h 20min". (~3117 tok)

## src/store/

- `authSlice.js` — Register with an email and a password. (~1476 tok)
- `authSlice.test.js` — Mock every export: store/index.js pulls in the data slices, which import (~1546 tok)
- `categoriesSlice.js` — Archiving is the normal way to retire a category: entries keep pointing at it, (~1419 tok)
- `entriesSlice.js` — Redux slice: entries (~1308 tok)
- `goalsSlice.js` — One goal per (category, period): re-saving the same pair updates the target (~944 tok)
- `index.js` — Factory so tests can build a store with preloaded state; the app itself uses (~469 tok)
- `selectors.js` — Entries whose entry_date falls inside an inclusive { from, to } range. (~1600 tok)
- `selectors.test.js` — Declares REFERENCE (~1408 tok)

## src/test/

- `auth.test.jsx` — SIGNED_OUT (~1922 tok)
- `pages.test.jsx` — TEACHING (~1227 tok)
- `setup.js` (~13 tok)

## src/utils/

- `duration.js` — Parsing and formatting of human-typed durations. (~828 tok)
- `duration.test.js` — Declares valid (~592 tok)
- `periods.js` — Weeks run Monday -> Sunday. (~702 tok)
- `periods.test.js` — Declares REFERENCE (~924 tok)

## supabase/

- `schema.sql` — Database schema (~1083 tok)
