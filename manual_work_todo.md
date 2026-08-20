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

