# Worktime Scheduler

A personal worktime tracker: sign in with Google, log time against your own
categories after the fact, set per-category goals, and see how the current
day / week / month is tracking.

- **React 19 + JavaScript** (no TypeScript), built with Vite
- **Redux Toolkit** (`configureStore`, `createSlice`, `createAsyncThunk`, `createSelector`)
- **Supabase** for Postgres, Google sign-in and row level security
- **Tailwind CSS 4** for styling, **Recharts** for the reports

---

## 1. Set up Supabase

### 1.1 Create the project

1. Create a project at [supabase.com](https://supabase.com).
2. Open **Project Settings -> API** and copy the **Project URL** and the
   **anon public** key.

### 1.2 Create the tables

Open **SQL Editor -> New query**, paste the contents of
[`supabase/schema.sql`](supabase/schema.sql) and run it.

That creates `categories`, `time_entries` and `goals`, and — importantly —
enables row level security with a policy per table. The anon key ships to the
browser, so those policies are the only thing keeping one account's data away
from another's. Don't skip that part of the script.

### 1.3 Enable Google sign-in

1. In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an **OAuth 2.0 Client ID** of type *Web application*.
2. Under **Authorized redirect URIs**, add:

   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```

   (Supabase shows this exact URL on the Google provider page.)
3. Copy the **Client ID** and **Client secret** into Supabase under
   **Authentication -> Providers -> Google**, and enable the provider.
4. Under **Authentication -> URL Configuration**, set:
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
VITE_SUPABASE_ANON_KEY=<your anon public key>
```

Vite only reads environment variables at startup, so restart the dev server
after editing that file. Until it is filled in, the app shows a setup notice
instead of the login screen.

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

### Categories

Categories are archived rather than deleted, so old entries keep their label.
The database enforces this: `time_entries.category_id` is `on delete restrict`,
so a category with entries cannot be deleted at all. The Delete button only
appears for categories with nothing logged against them.

## Deploying

When you host this somewhere other than localhost, add the new origin to both:

- the Google OAuth client's **Authorized redirect URIs** (via the Supabase
  callback URL, which does not change), and
- Supabase **Authentication -> URL Configuration** (Site URL and Redirect URLs).
