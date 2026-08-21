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

---

## 🚀 Next phase

**Goal:** Get the app actually running against a real Supabase project and prove RLS isolation.

### Acceptance criteria
1. `.env.local` filled in → `npm run dev` shows the login screen, not `SetupNotice`.
2. An account registers and lands in the app.
3. A second account (`you+test@gmail.com` alias) sees an empty app — the RLS proof.

### Files to create / edit
| Type | File | Content |
|---|---|---|
| edit | `.env.local` | the two values — user-supplied, gitignored |

### Closed decisions
- Email confirmation stays OFF (turning it on would require SMTP setup).
- Either the legacy `anon public` JWT or `sb_publishable_...` is fine for
  `VITE_SUPABASE_ANON_KEY`; never a secret key (Vite inlines `VITE_*` into the bundle).

### Open decisions
- Whether to turn "Allow new users to sign up" off once the user's accounts exist —
  it closes the sign-up-form email-enumeration hole documented in the README.

---

## 📁 Active architecture

- **Stack:** React 19 + Vite 8 (plain JS), Redux Toolkit, react-router 7,
  Tailwind 4, Recharts, `@supabase/supabase-js` ^2.112. Vitest + Testing Library.
- **Key tables:** `categories`, `time_entries`, `goals` (see `supabase/schema.sql`) —
  all key on `auth.users.id`, every RLS policy on `auth.uid()`.
- **Patterns:** no backend — the anon key ships to the browser, so RLS is the only
  isolation. Durations parsed in `src/utils/duration.js`, stored as integer minutes
  against a plain `date` (no timezones). `src/lib/supabaseClient.js` exports
  `isSupabaseConfigured` so a fresh clone shows setup instructions, not a network error.

---

## ⚠️ External blockers (don't block coding)

- **`.env.local` is still empty** → app renders `SetupNotice`. Needs
  `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`; step-by-step in
  `manual_work_todo.md` § Manual steps.
- Supabase toggle not yet confirmed: Authentication → Sign In / Providers → Email →
  **Confirm email: OFF**.

---

## 🔧 Useful commands

```bash
npm run dev            # vite dev server on :5173 (restart after editing .env.local)
npm test               # vitest run — 106 tests
npm run build          # production build
# sanity-check the env values without starting the app (200 = both correct):
curl -s -o /dev/null -w "%{http_code}\n" -H "apikey: <anon key>" \
  "https://<project-ref>.supabase.co/auth/v1/health"
```

---

## 📚 References (read IF needed)

- `.wolf/cerebrum.md` — User Preferences + Do-Not-Repeat + Decision Log
- `.wolf/anatomy.md` — token-efficient file index
- `.wolf/buglog.json` — known bugs + fixes
