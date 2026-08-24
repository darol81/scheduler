What changed

Google OAuth is gone; the app now has email + password accounts backed by Supabase Auth.

Passwords — signUp / signInWithPassword hand the password straight to Supabase over TLS, where it's bcrypt-hashed into auth.users. No hashing, storage, or session-minting code lives in this repo — deliberately, since the anon key ships to the browser and there's no backend to hide anything behind. supabase/schema.sql is untouched: every table already keys on auth.users.id and every RLS policy on auth.uid(), so isolation works exactly as before.

Setup went from ~15 steps to one. The Google Cloud Console is out of the picture entirely — no consent screen, OAuth client, redirect URI, or client secret. What's left is a single toggle: Authentication → Sign In / Providers → Email → Confirm email: OFF. The Email provider is already on by default. I kept confirmation off rather than on precisely because leaving it on would have meant configuring SMTP — more manual work, not less.

Two things worth ten extra seconds on that same page, documented as recommended rather than required: raise minimum password length 6 → 10 (this is the only enforced floor — the form's check is convenience, bypassable by anyone calling the endpoint directly), and confirm Google shows as disabled.

Security details that shaped the code:
- Sign-in returns one generic "Wrong email or password." for both a bad password and an unknown address — there's a test asserting that message can't drift into revealing which.
- createAsyncThunk copies its argument onto every action as meta.arg, which would have put the plaintext password in the Redux DevTools log. createAppStore now redacts it.
- autocomplete is username/current-password on sign-in and new-password on register, which is why /login and /register are separate routes rather than one toggling page — password managers key off the URL.
- The post-login redirect target is sanitised against //evil.com-style protocol-relative paths.

Verification: 106 tests pass (was 73), npm run build is clean, and the dev server compiles and serves the new routes.

Two things I could not verify myself, both needing your Supabase project: .env.local is still empty, so the running app shows the setup notice rather than the login screen — and the actual registration round-trip. Once you've flipped that one toggle and filled in the two env values, the checklist in §9 of the plan walks through it. The item not to skip is registering a second account with a you+test@gmail.com alias and confirming it sees an empty app — that's the only real proof the RLS policies are live.

One honest consequence of skipping email confirmation, now recorded in the README: registering an address that already exists says so, so the sign-up form can be used to probe whether an email is registered. Sign-in can't. Turning off new signups once your accounts exist closes it.

---

## Manual steps

### 1. Flip the one Supabase toggle

**Authentication -> Sign In / Providers -> Email** -> **Confirm email: OFF**.
That is the only required step; the Email provider is on by default.

Worth ten more seconds on the same page:
- raise **Minimum password length** from `6` to `10` (keep it in step with
  `MIN_PASSWORD_LENGTH` in `src/lib/password.js`) — this is the only
  enforced floor, since anyone can call the auth endpoint directly;
- confirm **Google** shows as disabled.

Under **Authentication -> URL Configuration**: Site URL `http://localhost:5173`,
Redirect URLs `http://localhost:5173/**`.

### 2. Fill in `.env.local`

`cp .env.example .env.local`, then paste the two values below. The Supabase
dashboard splits them across **two different settings pages** — that is why the
old "Project Settings -> API" instruction no longer matches anything.

| Variable | Where in the dashboard | What it looks like |
|---|---|---|
| `VITE_SUPABASE_URL` | **Project Settings -> Data API -> Project URL** | `https://abcdefghijklmnop.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | **Project Settings -> API Keys** | `eyJhbGciOi...` (very long) or `sb_publishable_...` |

**The URL is not a key.** It is just `https://<project-ref>.supabase.co`, and
`<project-ref>` is the ~20-character id already sitting in your browser's address
bar while you are in the dashboard:
`supabase.com/dashboard/project/`**`abcdefghijklmnop`**. The green **Connect**
button at the top of the dashboard shows the same string. No trailing slash, and
no `/rest/v1` on the end.

**The key** is the long one. The API Keys page has two tabs and either tab's
browser-safe key works with `@supabase/supabase-js` ^2.112:
- **Legacy API keys** tab -> the row labelled `anon` `public` — the `eyJ...` JWT.
  This is what the variable is named after.
- **API keys** tab -> `sb_publishable_...` — the newer name for the same role.

**Never paste a secret key** (`sb_secret_...`, or `service_role` on the legacy
tab). Vite inlines every `VITE_*` variable into the JavaScript bundle it ships to
the browser, and a secret key bypasses row level security entirely. The
anon/publishable key being public is by design — the RLS policies in
`supabase/schema.sql` are what keep one account's data away from another's.

`.env.local` is gitignored, so real values are safe to paste in. Vite reads env
vars only at startup: **restart `npm run dev` after editing the file.**

Optional check that the two values are right, before starting the app — `200`
means both are correct, `401` means the key is wrong, and a connection/DNS error
means the URL is wrong:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "apikey: <your anon key>" \
  "https://<project-ref>.supabase.co/auth/v1/health"
```

### 3. Verify the round-trip

- [ ] `npm run dev` shows the **login screen** instead of the setup notice, and
      the "Supabase is not configured" console warning is gone.
- [ ] Register an account and confirm you land in the app.
- [ ] **Don't skip this one:** register a second account using a
      `you+test@gmail.com` alias and confirm it sees an *empty* app. That is the
      only real proof the RLS policies are live.

---

### 4. Set up the end-to-end tests

Needed once before `npm run e2e` will run. See README section 3.2.

1. **`npx playwright install chromium`** -- about 150 MB, one download.
2. **Create two test accounts by hand**: **Authentication -> Users -> Add
   user**, twice, with **Auto Confirm User** ticked:

   | Email | Password |
   | --- | --- |
   | `worktime-e2e-a@worktime-e2e.dev` | pick one, 10-72 chars |
   | `worktime-e2e-b@worktime-e2e.dev` | **the same one** |

   Both accounts must share a single password -- `e2e/helpers/accounts.js` gives
   A and B the same `E2E_PASSWORD`. Put that value in `.env.e2e.local` and, for
   the nightly workflow, in the `E2E_PASSWORD` repository secret. **Do not write
   it into any tracked file.** It used to have a committed default, which
   published the real password of two live accounts -- anyone reading the repo
   could sign in to the deployed app as them.

   Creating them here rather than letting the suite sign up is deliberate:
   sign-up is the only auth path that touches Supabase's email system. Doing it
   this way means no confirmation mail, no per-project email rate limit, and no
   need to leave **Allow new users to sign up** switched on. Nothing is ever
   mailed to these addresses, so they do not have to be deliverable. Change
   them in `.env.e2e.local` and `supabase/e2e.sql` if you prefer others.
3. **Run [`supabase/e2e.sql`](supabase/e2e.sql)** in the SQL editor. It adds
   `e2e_reset_account()`, which lets the suite empty its own two accounts
   between runs, gated on an allowlist so no ordinary user can call it. It is
   kept out of `schema.sql` on purpose, so a production project never has it.

Then `npm run e2e`. Two accounts are needed because row level security is the
thing under test: an isolation test with one account cannot tell a working
policy from a broken one.


---

### 5. Deploy to Cloudflare Pages

Only needed when you want the app hosted. Nothing in the repo depends on it;
`npm run dev` is unaffected either way. README section "Deploying" is the full
version -- this is the click path.

1. **Create the project.** Cloudflare dashboard -> **Workers & Pages -> Create ->
   Pages -> Connect to Git**, authorise the GitHub app, pick this repository.
   Production branch `main`, framework preset **Vite**, build command
   `npm run build`, output directory `dist`, root directory `/`. Leave the
   install command empty -- Pages finds `package-lock.json` and runs
   `npm clean-install` itself.

2. **Add the two environment variables**, under **Settings -> Environment
   variables**, to **Production and Preview both**. Same values as `.env.local`;
   the sourcing table in step 2 above still applies.

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` or `sb_publishable_...` |

   This is the step whose omission is easiest to miss: the build still succeeds
   without them and the deployed site shows the setup notice rather than an
   error. Never put an `sb_secret_...` / `service_role` key here -- Vite inlines
   every `VITE_*` value into a bundle served to the public internet.

3. **Exclude `.wolf/*`** under **Settings -> Build -> Build watch paths**.
   Optional, but that directory is bookkeeping and every push touching only it
   would otherwise rebuild production for no change.

4. **Widen the Supabase URL configuration.** **Authentication -> URL
   Configuration**: Site URL becomes `https://<project>.pages.dev`, and the
   Redirect URLs list keeps `http://localhost:5173/**` while gaining
   `https://<project>.pages.dev/**` and `https://*.<project>.pages.dev/**`.
   The wildcard is for per-branch preview deployments. Scope it to your own
   project subdomain; a bare `https://*.pages.dev/**` would allowlist every site
   on Cloudflare Pages.

   Hygiene rather than a blocker: the allowlist gates mailed links, not
   `signInWithPassword`, and no code in `src/` passes a `redirectTo`. With
   confirmations off there is nothing to mail today. It matters the day
   confirmation or password reset is switched on.

5. **Check the live URL.** Open `/settings` directly in a fresh tab and
   hard-refresh on `/entries` -- both must render, which is what `public/_redirects`
   is for. Then load `/reports` and confirm in the network panel that its lazy
   chunk returns `text/javascript`, not `text/html`. Then sign in and add an
   entry: that is the only real proof step 2 landed.

Two things to know. Cloudflare does not wait for GitHub Actions, so a preview is
built even when `ci.yml` is red -- branch protection is what keeps a failing pull
request out of production. And preview URLs are public, so if **Allow new users
to sign up** is still on, this is the moment turning it off starts to pay.
