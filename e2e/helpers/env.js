import { loadEnv } from 'vite'

/**
 * Load the suite's configuration and publish it on process.env.
 *
 * Shared by playwright.config.js and the standalone reset script so the two
 * cannot drift. Playwright re-evaluates the config in every worker process, so
 * the values set here are present wherever a spec runs.
 */
export function loadE2EEnv() {
  // One call covers .env, .env.local, .env.e2e and .env.e2e.local, so the
  // app's Supabase credentials and the test-account credentials arrive
  // together. The prefixes are explicit on purpose: an empty prefix would
  // merge the whole of process.env and let a stale shell variable shadow
  // .env.local.
  const env = loadEnv('e2e', process.cwd(), ['VITE_', 'E2E_'])

  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    throw new Error(
      'e2e: .env.local must define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.\n' +
      'Without them the app renders SetupNotice instead of the router, and every ' +
      'spec fails on a missing login form rather than on anything meaningful.',
    )
  }

  // Computed once in the main process and inherited by every worker; computing
  // it per module would give each worker its own id and break the run-unique
  // naming scheme.
  process.env.E2E_RUN_ID = process.env.E2E_RUN_ID
    || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

  process.env.E2E_SUPABASE_URL = env.VITE_SUPABASE_URL
  process.env.E2E_SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY
  // The addresses only have to match the two accounts you created by hand in
  // the dashboard and the allowlist in supabase/e2e.sql. Nothing is ever
  // mailed to them, so they need not be deliverable or belong to anyone.
  // They are identifiers, not credentials, so defaulting them is fine.
  process.env.E2E_EMAIL_A = env.E2E_EMAIL_A || 'worktime-e2e-a@worktime-e2e.dev'
  process.env.E2E_EMAIL_B = env.E2E_EMAIL_B || 'worktime-e2e-b@worktime-e2e.dev'

  // The password deliberately has NO default. It used to fall back to a literal
  // committed here, which meant the real password of two live accounts sat in a
  // public repo -- anyone could sign in to the deployed app as them. Both
  // accounts share this one value (see helpers/accounts.js), so set it once in
  // .env.e2e.local locally and as the E2E_PASSWORD secret for nightly.yml.
  // Failing loudly is the point: a default is what let the leak happen.
  if (!env.E2E_PASSWORD) {
    throw new Error(
      'e2e: E2E_PASSWORD is not set, and there is no default on purpose.\n' +
      'Put it in .env.e2e.local (gitignored by the *.local pattern):\n' +
      '  E2E_PASSWORD=<the password of both test accounts>\n' +
      'For CI, set it as a repository secret -- nightly.yml already reads it.\n' +
      'Never commit the value: it is the real password of two live accounts.',
    )
  }
  process.env.E2E_PASSWORD = env.E2E_PASSWORD

  const port = Number(env.E2E_PORT || 5175)
  return { port, baseURL: `http://127.0.0.1:${port}` }
}
