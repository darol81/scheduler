import { expect, test } from './fixtures.js'
import { ACCOUNT_A, gotoSignedIn, signIn, signOut, waitForAppReady } from './helpers/accounts.js'

/**
 * Auth is Supabase's, not ours, so this covers the parts the app itself is
 * responsible for: routing, the deliberately vague failure message, the
 * client-side validation, and that signing out really clears the session.
 *
 * Nothing here submits the sign-up form. Sign-up is the only auth path that
 * touches Supabase's email system, and the two test accounts already exist.
 */
test.describe('authentication', () => {
  test('a deep link taken while signed out comes back after signing in', async ({ page }) => {
    await page.goto('/reports')
    await expect(page).toHaveURL(/\/login$/)

    // ProtectedRoute passes the intended destination as router state, not as a
    // query parameter, so the only way to prove the round-trip is to sign in
    // and see where we land.
    await page.getByLabel('Email', { exact: true }).fill(ACCOUNT_A.email)
    await page.getByLabel('Password', { exact: true }).fill(ACCOUNT_A.password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page).toHaveURL(/\/reports$/)
    await waitForAppReady(page)
  })

  test('a wrong password is reported without confirming the address exists', async ({ page }) => {
    const result = await signIn(page, ACCOUNT_A, 'definitely-not-the-password')

    expect(result.ok).toBe(false)
    // Deliberately vague: the same message covers "no such account", so the
    // form is not an account-existence oracle. src/lib/errors.js guards this
    // and there is a unit test asserting it too -- do not make it specific.
    expect(result.error).toContain('Wrong email or password.')
    await expect(page).toHaveURL(/\/login$/)

    await page.getByRole('alert').getByRole('button', { name: 'Dismiss' }).click()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('the register form will not submit a password under the minimum length', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Email', { exact: true }).fill(ACCOUNT_A.email)
    await page.getByLabel('Password', { exact: true }).fill('short')
    await page.getByLabel('Confirm password', { exact: true }).fill('short')
    // The inline messages are gated on `touched`, so blur the field first.
    await page.getByLabel('Email', { exact: true }).click()

    await expect(page.getByText('Use at least 10 characters.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create account' })).toBeDisabled()
  })

  test('the register form catches mismatched passwords', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Email', { exact: true }).fill(ACCOUNT_A.email)
    await page.getByLabel('Password', { exact: true }).fill('a-long-enough-password')
    await page.getByLabel('Confirm password', { exact: true }).fill('a-different-password')
    await page.getByLabel('Email', { exact: true }).click()

    await expect(page.getByText('Passwords do not match.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create account' })).toBeDisabled()
  })

  test('the register page links back to sign-in', async ({ page }) => {
    await page.goto('/register')
    // The role matters: 'Sign in' is also the submit button's text on /login.
    await page.getByRole('link', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('signing out clears the persisted session, not just the store', async ({ page }) => {
    await gotoSignedIn(page, ACCOUNT_A)
    await signOut(page)

    // A fresh navigation re-reads localStorage, so landing back on /login here
    // is what proves the Supabase token was actually cleared.
    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)
  })
})
