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
  [`src/components/AuthForm.jsx`](src/components/AuthForm.jsx).
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

## 3. Tests

```bash
npm test           # single run
npm run test:watch
```

The tests cover the parts with real logic: duration parsing, period boundaries
(Monday-start weeks, month ends), and goal-progress aggregation.

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
supabase/
  schema.sql
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

When you host this somewhere other than localhost, add the new origin under
Supabase **Authentication -> URL Configuration** (Site URL and Redirect URLs).

That is the whole list. There is no external identity provider to reconfigure,
which is the main practical reason this app uses passwords rather than OAuth.
