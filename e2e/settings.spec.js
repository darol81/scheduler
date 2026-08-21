import { expect, test } from './fixtures.js'
import { ACCOUNT_A, gotoSignedIn } from './helpers/accounts.js'

/**
 * Nothing here ever changes a password, and that is deliberate on two counts.
 *
 * Both accounts share one password from E2E_PASSWORD, and global-setup cannot
 * repair a changed one -- a crash between the change and the change-back would
 * brick every later run, the nightly included, until someone fixed it by hand
 * in the Supabase dashboard.
 *
 * The sharper reason is parallelism: the suite runs fullyParallel with two
 * workers, both signing in as ACCOUNT_A. A real change fires
 * signOut({ scope: 'others' }), which would revoke the other worker's refresh
 * token mid-test. No amount of changing it back fixes that.
 *
 * So this covers the paths that never reach updateUser. The happy path is
 * asserted in src/store/authSlice.test.js against a mocked client, including
 * that the scope really is 'others'.
 *
 * Note also that helpers/accounts.js's settle() is useless on this page: it
 * treats a visible "Sign out" button as success, and on a protected page that
 * is always true. Assert on the banner directly.
 */
test.describe('settings', () => {
  test('the signed-in email in the header leads to the settings page', async ({ page }) => {
    await gotoSignedIn(page, ACCOUNT_A)

    await page.getByRole('link', { name: /signed in as/i }).click()

    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.getByText(ACCOUNT_A.email)).toBeVisible()
  })

  test('a wrong current password is refused and does not sign you out', async ({ page }) => {
    await gotoSignedIn(page, ACCOUNT_A, '/settings')

    await page.getByLabel('Current password', { exact: true }).fill('definitely-not-the-password')
    await page.getByLabel('New password', { exact: true }).fill('a-long-enough-new-password')
    await page.getByLabel('Confirm new password', { exact: true }).fill('a-long-enough-new-password')
    await page.getByRole('button', { name: 'Change password' }).click()

    // Specific on purpose, unlike /login's deliberately vague version: we are
    // already signed in as this account, so there is nothing left to leak.
    await expect(page.getByRole('alert')).toContainText('That is not your current password.')

    // The failed re-authentication must leave the session alone.
    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
  })

  test('a too-short new password never reaches the server', async ({ page }) => {
    await gotoSignedIn(page, ACCOUNT_A, '/settings')

    await page.getByLabel('Current password', { exact: true }).fill(ACCOUNT_A.password)
    const next = page.getByLabel('New password', { exact: true })
    await next.fill('short')
    await next.blur()

    await expect(page.getByText('Use at least 10 characters.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Change password' })).toBeDisabled()
  })

  test('a mistyped confirmation never reaches the server', async ({ page }) => {
    await gotoSignedIn(page, ACCOUNT_A, '/settings')

    await page.getByLabel('Current password', { exact: true }).fill(ACCOUNT_A.password)
    await page.getByLabel('New password', { exact: true }).fill('a-long-enough-new-password')
    const confirm = page.getByLabel('Confirm new password', { exact: true })
    await confirm.fill('a-long-enough-new-passworb')
    await confirm.blur()

    await expect(page.getByText('Passwords do not match.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Change password' })).toBeDisabled()
  })
})
