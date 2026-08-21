/**
 * Run-unique names for anything the suite creates.
 *
 * categories has a unique index on (user_id, lower(name)), and both test
 * accounts are shared by every worker and every run, so a name has to be
 * unique along three axes at once: across parallel workers (workerIndex),
 * across tests inside one worker (a counter), and across repeated runs
 * (RUN_ID) -- including runs whose teardown crashed and left rows behind.
 */

// Set once by playwright.config.js in the main process and inherited here.
export const RUN_ID = process.env.E2E_RUN_ID || 'local'

export const E2E_PREFIX = 'e2e'

let seq = 0

/** e.g. "e2e k3f9x2 0.1 teaching" */
export function categoryName(base, testInfo) {
  seq += 1
  return `${E2E_PREFIX} ${RUN_ID} ${testInfo.workerIndex}.${seq} ${base}`
}

/**
 * Entries have no name of their own, so the note is their identity. Always
 * locate an entry row by its note: entries sort by entry_date desc then
 * created_at desc, which ties at millisecond resolution for two entries
 * added on the same date in the same test.
 */
export function noteTag(base, testInfo) {
  seq += 1
  return `${E2E_PREFIX}-${RUN_ID}-${testInfo.workerIndex}-${seq}-${base}`
}

/** True for anything this suite created, in any run. */
export function isE2EName(name) {
  return typeof name === 'string' && name.startsWith(`${E2E_PREFIX} `)
}
