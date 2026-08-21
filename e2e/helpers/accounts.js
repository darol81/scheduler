import { expect } from '@playwright/test'

/**
 * The two long-lived test accounts.
 *
 * They are created once by hand in the Supabase dashboard (README section 3.2)
 * -- the suite never signs anyone up, because sign-up is the only auth path
 * that touches Supabase's email system. global-setup.js empties them before
 * each run, so specs can assume they are present and clean.
 */
export const ACCOUNT_A = {
  key: 'a',
  email: process.env.E2E_EMAIL_A,
  password: process.env.E2E_PASSWORD,
}

export const ACCOUNT_B = {
  key: 'b',
  email: process.env.E2E_EMAIL_B,
  password: process.env.E2E_PASSWORD,
}

export const ACCOUNTS = [ACCOUNT_A, ACCOUNT_B]

const SHELL = { name: 'Sign out' }

/**
 * Wait until the protected shell is actually usable. ProtectedRoute shows
 * "Checking your session" while the persisted session is read, and App fetches
 * categories, entries and goals once per signed-in user after that.
 *
 * Note this never asserts a spinner is *visible* -- whether one paints at all
 * is a race with how quickly Supabase answers.
 */
export async function waitForAppReady(page) {
  await expect(page.getByRole('button', SHELL)).toBeVisible()
  await expect(page.getByText('Checking your session')).toHaveCount(0)
  await expect(page.getByText('Loading your data')).toHaveCount(0)
}

/**
 * Wait for a submit to resolve either way: the app shell appears, or
 * ErrorBanner's role="alert" does. Returns the banner text instead of
 * throwing, so callers can assert on which failure it was.
 */
export async function settle(page) {
  const banner = page.getByRole('alert')
  const shell = page.getByRole('button', SHELL)

  await expect(banner.or(shell).first()).toBeVisible()
  if (await shell.isVisible()) return { ok: true, error: null }

  // innerText includes the banner's own Dismiss button; drop it.
  const text = (await banner.first().innerText()).replace(/\s*Dismiss\s*$/, '').trim()
  return { ok: false, error: text }
}

/** Fill and submit /login. */
export async function signIn(page, account, password = account.password) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(account.email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  return settle(page)
}

export async function signOut(page) {
  await page.getByRole('button', SHELL).click()
  await expect(page).toHaveURL(/\/login$/)
}

/** Sign in and land on `path`, ready to use. The workhorse for every spec. */
export async function gotoSignedIn(page, account, path = '/') {
  const result = await signIn(page, account)
  if (!result.ok) {
    throw new Error(
      `e2e: could not sign in as ${account.email}: ${result.error}. ` +
      'global-setup should have provisioned it -- check .env.e2e.local.',
    )
  }
  await page.goto(path)
  await waitForAppReady(page)
}
