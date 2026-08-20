  Here's everything you'll need to do by hand once the code is in place. None of it requires me — it's all dashboard work plus two commands.

      1. Create the Supabase project

      1. Go to supabase.com → sign in → New project.
      2. Pick an organization, name it (e.g. worktime-scheduler), choose a region near you (e.g. Frankfurt / Stockholm for Finland), and set a database password (save it in your password manager — you won't need it for this app, but you'll want it later).
      3. Wait ~2 minutes for provisioning.
      4. Open Project Settings → API and copy two values:
         - Project URL — looks like https://abcdefghijklm.supabase.co
         - anon / public key — a long string (this one is safe to ship in the browser; the service_role key is not — never put that in this app)

      The random part of the URL (abcdefghijklm) is your project ref. You'll need it in step 2.

      2. Create the Google OAuth client

      1. Go to console.cloud.google.com → create a project (or reuse one).
      2. APIs & Services → OAuth consent screen: choose External, fill in app name + your email, save. You can leave it in "Testing" mode — just add your own Google account under Test users. (In testing mode only listed test users can sign in, which is exactly what you want for a personal app.)
      3. APIs & Services → Credentials → Create credentials → OAuth client ID:
         - Application type: Web application
         - Authorized redirect URI: https://<your-project-ref>.supabase.co/auth/v1/callback
         - Create, then copy the Client ID and Client secret.

      That redirect URI must match exactly — a trailing slash or a typo in the project ref is the single most common cause of redirect_uri_mismatch.

      3. Wire Google into Supabase

      1. Supabase dashboard → Authentication → Sign In / Providers → Google.
      2. Toggle it Enabled, paste the Client ID and Client secret, Save.
      3. Supabase dashboard → Authentication → URL Configuration:
         - Site URL: http://localhost:5173
         - Redirect URLs: add http://localhost:5173/**


      4. Create the tables

      1. Supabase dashboard → SQL Editor → New query.
      2. Open supabase/schema.sql from the project folder, copy the whole file, paste it in, and hit Run.
      3. You should see "Success. No rows returned."
      4. Sanity check: Table Editor should now list categories, time_entries, and goals, each showing an RLS enabled badge. If any table says RLS is disabled, re-run the file — those policies are the only thing keeping your data private, since the anon key is public.

      The script is safe to run more than once (if not exists / drop policy if exists throughout).

      5. Point the app at your project

      Open .env.local in the project root (it already exists, with empty values) and fill in what you copied in step 1:

      VITE_SUPABASE_URL=https://your-project-ref.supabase.co
      VITE_SUPABASE_ANON_KEY=eyJhbGci...your-long-anon-key

      No quotes, no spaces around the =. .env.local is already in .gitignore, so it won't be committed.

      Vite only reads env files at startup — if the dev server is already running, stop and restart it after editing this file.

      6. Run it

      From C:\Users\topi_\OmatJutut\Yliopisto\ClaudeAI\scheduler:

      npm install
      npm run dev

      Then open http://localhost:5173.

      If you see a "Finish the Supabase setup" page instead of the login screen, .env.local is empty or the server wasn't restarted after you filled it in.

      7. Check it actually works

      1. Click Sign in with Google → Google consent → you land back on the dashboard.
      2. Reload the page — you should still be signed in.
      3. Go to Categories, add Teaching and Studying.
      4. On the Dashboard, log an entry: category Teaching, today, type 1h 20min → it should show = 1h 20min under the field before you submit, and appear in the list afterwards. In the Supabase Table Editor, that row's minutes column should read 80.
      5. Go to Goals, set Teaching / weekly / 10h → the dashboard bar should read 1h 20min / 10h.
      6. The privacy check worth doing once: sign out, sign in with a different Google account (add it as a test user first), and confirm it sees a completely empty app. If it sees your data, the RLS policies from step 4 didn't apply — stop and re-run the SQL before putting anything real in.

      Things that will bite you later

      - Deploying beyond localhost: you must add the production URL in both places — Google Cloud's authorized redirect URIs and Supabase's Site URL / Redirect URLs. Forgetting one gives a login that redirects to localhost from production.
      - Publishing the OAuth consent screen: only needed if someone other than your test users will sign in.
      - Free-tier projects pause after a week of inactivity. Un-pausing is one click in the dashboard; nothing is lost.
      - The anon key being in the browser is by design and not a leak — the RLS policies are the security boundary, not the key.

----------------------------------------------


The app is built and verified. npm test passes 73 tests and npm run build and npm run dev both work — I confirmed the dev server serves on http://localhost:5173.

What's there

supabase/schema.sql      3 tables + RLS policies, safe to re-run
src/utils/duration.js    "1h 20min" / "90" / "1,5h" / "1t 20min" → minutes
src/utils/periods.js     Monday-start weeks, month boundaries
src/store/               configureStore + auth/categories/entries/goals slices, selectors
src/pages/               Login, Dashboard, Entries, Goals, Categories, Reports

Time is stored as an integer minute count against a plain date, so there are no timezone surprises. The whole history loads once per signed-in user and every view filters it through memoised createSelector derivations — that's why the dashboard, entries table and reports never disagree.

Three things you have to do yourself (they need your browser and accounts — the app shows a setup notice until they're done):

1. Create the Supabase project, then paste its URL and anon key into .env.local (already created, values empty).
2. Run supabase/schema.sql in the SQL editor. The RLS policies at the bottom are the only thing keeping accounts apart, since the anon key ships to the browser.
3. Create a Google OAuth client, point it at https://<project-ref>.supabase.co/auth/v1/callback, and enable the Google provider in Supabase. Set Site URL to http://localhost:5173.

README.md has the click-by-click version.

Then verify end to end: add Teaching and Studying → log 1h 20min for today → set a weekly goal of 10h → the bar should read 1h 20min / 10h at 13%. The one check worth not skipping is signing in with a second Google account and confirming you see an empty app — that proves the policies are live.

A few judgment calls I made that you may want to revisit: categories archive rather than delete (the Delete button only appears when nothing is logged against them, and the database refuses otherwise); the daily chart hides itself past a 120-day range; and a single entry is capped at 24h while goals allow up to a month's worth.

✻ Cogitated for 19m 37s