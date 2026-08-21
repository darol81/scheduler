import { ACCOUNTS } from './helpers/accounts.js'
import { prepareAccount } from './helpers/backend.js'

/**
 * One clean slate per run, before any spec starts: both accounts are created
 * if missing, then emptied through the reset entry point in supabase/e2e.sql.
 *
 * Deliberately not done per test. Two suite runs against the same Supabase
 * project would then have the second run's reset delete the first run's live
 * data mid-test. Per-test teardown in fixtures.js is the primary mechanism;
 * this is what recovers from a previous run whose teardown crashed.
 */
export default async function globalSetup() {
  for (const account of ACCOUNTS) {
    await prepareAccount(account)
  }
}
