import { loadE2EEnv } from './helpers/env.js'

/**
 * Standalone `npm run e2e:reset`: empty both test accounts without running any
 * tests. Useful after a crashed run, or before looking at the app by hand.
 *
 * The imports below are dynamic because helpers/accounts.js reads process.env
 * at module load, and loadE2EEnv() is what puts the values there.
 */
loadE2EEnv()

const { ACCOUNTS } = await import('./helpers/accounts.js')
const { prepareAccount } = await import('./helpers/backend.js')

for (const account of ACCOUNTS) {
  await prepareAccount(account)
  console.log(`e2e: reset ${account.email}`)
}
