import { expect, test } from './fixtures.js'
import { ACCOUNT_A, ACCOUNT_B, gotoSignedIn } from './helpers/accounts.js'
import {
  createCategory,
  deleteCategoryCascade,
  installDialogHandler,
  logTime,
  openEntries,
} from './helpers/app.js'
import { categoryName, noteTag } from './helpers/naming.js'

/**
 * The reason this suite exists.
 *
 * The anon key is inlined into the bundle by Vite, so the RLS policies in
 * supabase/schema.sql are the only thing keeping one account's data away from
 * another's. This is the test that says so out loud.
 *
 * ---------------------------------------------------------------------------
 * Proving this spec is not vacuous. In the Supabase SQL editor:
 *
 *   alter table public.categories   disable row level security;
 *   alter table public.time_entries disable row level security;
 *   -- npm run e2e -- rls-isolation      EXPECT: FAIL
 *   alter table public.categories   enable row level security;
 *   alter table public.time_entries enable row level security;
 *   -- npm run e2e -- rls-isolation      EXPECT: PASS
 *
 * Do NOT "verify" it with `drop policy "own categories" on public.categories`.
 * With RLS still enabled and no policy left, the table becomes deny-all: the
 * owner sees nothing, the other account still sees nothing, this spec stays
 * green, and you have proved precisely nothing while the app is broken. The
 * only faithful leak simulations are disabling RLS, as above, or widening a
 * policy to `using (true)`.
 * ---------------------------------------------------------------------------
 */

/**
 * Assert one account sees its own data and none of the other's.
 *
 * The positive control has to come first. Without it the negative assertion
 * passes trivially while "Loading categories" is still on screen, which is the
 * classic way an RLS test ends up asserting nothing at all.
 */
async function assertIsolated(page, { own, ownNote, foreign, foreignNote }) {
  await page.goto('/categories')
  await expect(page.getByText(own, { exact: true })).toBeVisible()
  await expect(page.getByText(foreign, { exact: true })).toHaveCount(0)

  // No category filter here on purpose: this asks what the account can see at
  // all. Absence of a run-unique name is leftover-proof, unlike a row count.
  await openEntries(page, { pill: 'All time' })
  await expect(page.getByText(ownNote, { exact: true })).toBeVisible()
  await expect(page.getByText(foreignNote, { exact: true })).toHaveCount(0)
  await expect(page.getByText(foreign, { exact: true })).toHaveCount(0)
}

async function teardown(page, name) {
  try {
    await deleteCategoryCascade(page, name)
  } catch (err) {
    console.warn(`e2e: rls teardown left "${name}" behind -- ${err.message}`)
  }
}

test.describe('row level security', () => {
  test('neither account can see the other one\'s categories or entries', async ({ browser }, testInfo) => {
    // Separate contexts so the two sessions get separate localStorage, and
    // therefore separate sb-<project-ref>-auth-token entries.
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()
    installDialogHandler(pageA)
    installDialogHandler(pageB)

    const nameA = categoryName('secret-a', testInfo)
    const nameB = categoryName('secret-b', testInfo)
    const noteA = noteTag('secret-a', testInfo)
    const noteB = noteTag('secret-b', testInfo)

    try {
      await gotoSignedIn(pageA, ACCOUNT_A)
      await createCategory(pageA, nameA)
      await logTime(pageA, { category: nameA, duration: '1h 20min', note: noteA })
      await expect(logTimeConfirmation(pageA, '1h 20min')).toBeVisible()

      await gotoSignedIn(pageB, ACCOUNT_B)
      await createCategory(pageB, nameB)
      await logTime(pageB, { category: nameB, duration: '45min', note: noteB })
      await expect(logTimeConfirmation(pageB, '45min')).toBeVisible()

      // Both directions: a one-sided policy mistake has to fail too.
      await assertIsolated(pageB, { own: nameB, ownNote: noteB, foreign: nameA, foreignNote: noteA })
      await assertIsolated(pageA, { own: nameA, ownNote: noteA, foreign: nameB, foreignNote: noteB })
    } finally {
      await teardown(pageA, nameA)
      await teardown(pageB, nameB)
      await contextA.close()
      await contextB.close()
    }
  })
})

function logTimeConfirmation(page, shown) {
  return page.getByText(`Added ${shown}.`)
}
