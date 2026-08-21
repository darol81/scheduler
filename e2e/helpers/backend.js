import { createClient } from '@supabase/supabase-js'

/**
 * Node-side account preparation, run once per suite from global-setup.js.
 *
 * This suite never calls signUp. Sign-up is the only auth path that touches
 * Supabase's email system -- it is what triggers confirmation mail and the
 * per-project email rate limit -- and creating accounts is not what these
 * tests are for. The two accounts are created once by hand in the dashboard
 * (see README section 3.2); from then on the suite only ever signs in, which
 * sends no mail and is not metered.
 *
 * It uses the same anon key the browser gets. There is no service_role key
 * anywhere in this suite.
 */

const SETUP_HINT =
  'Run supabase/e2e.sql in the Supabase SQL editor once. It creates the ' +
  'e2e_reset_account() function and the e2e_accounts allowlist.'

function client() {
  // persistSession false: nothing is written to disk, and preparing account A
  // cannot clobber account B's token.
  return createClient(process.env.E2E_SUPABASE_URL, process.env.E2E_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

function missingAccountError(account, message) {
  if (/email not confirmed/i.test(message)) {
    return `e2e: ${account.email} exists but is unconfirmed. Delete it and create it ` +
      'again with "Auto Confirm User" ticked -- a test cannot confirm an address, and ' +
      'turning confirmations on would mean wiring up SMTP.'
  }
  return `e2e: could not sign in as ${account.email} (${message}).\n` +
    'Create the two test accounts once, by hand: Supabase dashboard -> Authentication ' +
    '-> Users -> Add user, with "Auto Confirm User" ticked, using the addresses and ' +
    'password from .env.e2e.local. No email is sent and the address does not have to ' +
    'be deliverable.'
}

/**
 * Sign in and wipe the account's categories, entries and goals so the run
 * starts from a known clean slate.
 */
export async function prepareAccount(account) {
  const supabase = client()

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  })
  if (signInError) throw new Error(missingAccountError(account, signInError.message))

  const { error } = await supabase.rpc('e2e_reset_account')
  // Local scope only: a global sign-out here would revoke the refresh tokens of
  // any signed-in browser context, so running `npm run e2e:reset` while a suite
  // was in flight would knock every running test back to the login screen.
  await supabase.auth.signOut({ scope: 'local' })

  if (error) {
    const missing = error.code === '42883' || /could not find the function/i.test(error.message)
    throw new Error(
      `e2e: e2e_reset_account() failed for ${account.email}: ${error.message}\n` +
      (missing ? SETUP_HINT : `${SETUP_HINT} Make sure ${account.email} is in e2e_accounts.`),
    )
  }
}
