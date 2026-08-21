import { test as base, expect } from '@playwright/test'
import { deleteCategoryCascade, installDialogHandler } from './helpers/app.js'

/**
 * The suite's shared fixtures.
 *
 * Teardown lives in a test-scoped fixture rather than afterAll because afterAll
 * cannot use `page`. Fixtures tear down before the fixtures they depend on, so
 * `trash` still has a live, signed-in page to delete through.
 */
export const test = base.extend({
  // Auto so that no test can click a Delete before the handler is attached.
  // Playwright *dismisses* dialogs when nothing is listening, which would turn
  // both window.confirm flows into silent no-ops.
  dialogs: [async ({ page }, use) => {
    await use(installDialogHandler(page))
  }, { auto: true }],

  /**
   * Push a category name here and it is removed after the test, entries first.
   * Teardown deliberately never throws: it runs after failures too, and an
   * exception here would mask the real one.
   */
  trash: async ({ page }, use) => {
    const names = []
    await use(names)

    for (const name of names) {
      try {
        await deleteCategoryCascade(page, name)
      } catch (err) {
        console.warn(
          `e2e: teardown left "${name}" behind -- ${err.message}. ` +
          'The next run\'s global setup will clear it.',
        )
      }
    }
  },
})

export { expect }
