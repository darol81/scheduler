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
   | `worktime-e2e-a@worktime-e2e.dev` | `playwright-e2e-pw` |
   | `worktime-e2e-b@worktime-e2e.dev` | `playwright-e2e-pw` |

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

