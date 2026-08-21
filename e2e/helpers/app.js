import { expect } from '@playwright/test'

/** The Log time form. It lives on the dashboard only, never on /entries. */
export function logTimeForm(page) {
  return page.locator('form').filter({ has: page.getByRole('heading', { name: 'Log time' }) })
}

/** The filter card on /entries, so its Category select is not confused with a row's. */
function filterCard(page) {
  return page.locator('section').filter({ has: page.getByRole('heading', { name: 'Filter' }) })
}

export function categoryRow(page, name) {
  return page.getByRole('listitem').filter({ has: page.getByText(name, { exact: true }) })
}

export function entryRowByNote(page, note) {
  return page.locator('tbody tr').filter({ hasText: note })
}

/**
 * Accept every window.confirm and record what it said.
 *
 * This must be installed before any Delete is clicked. Playwright *dismisses*
 * dialogs when nothing is listening, so without it both delete flows become
 * silent no-ops: teardown leaks rows and the delete tests pass for the wrong
 * reason. Recording the messages means the confirm text can still be asserted
 * without a page.once() handler racing React's re-render.
 */
export function installDialogHandler(page) {
  const messages = []
  page.on('dialog', async (dialog) => {
    messages.push(dialog.message())
    await dialog.accept()
  })
  return messages
}

/** The app's own idea of today, read from the date input rather than from Node. */
export async function todayFromForm(page) {
  return logTimeForm(page).getByLabel('Date', { exact: true }).inputValue()
}

export async function createCategory(page, name) {
  await page.goto('/categories')
  await expect(page.getByRole('heading', { name: 'New category' })).toBeVisible()
  await page.getByLabel('Name', { exact: true }).fill(name)
  await page.getByRole('button', { name: 'Add category' }).click()
  await expect(categoryRow(page, name)).toBeVisible()
}

/**
 * Log one entry from the dashboard. Returns the form so a caller can assert
 * the "Added ..." confirmation as its very next step -- it clears itself after
 * 4 seconds, well inside the default expect timeout.
 */
export async function logTime(page, { category, duration, note, date }) {
  await page.goto('/')
  const form = logTimeForm(page)
  await expect(form).toBeVisible()

  await form.getByLabel('Category', { exact: true }).selectOption({ label: category })
  if (date) await form.getByLabel('Date', { exact: true }).fill(date)
  await form.getByLabel('Duration', { exact: true }).fill(duration)
  if (note) await form.getByLabel('Note (optional)', { exact: true }).fill(note)

  await form.getByRole('button', { name: 'Add entry' }).click()
  return form
}

/**
 * Open /entries with a filter applied. Always pass a category: both accounts
 * are shared by every worker, so an unfiltered list contains other workers'
 * rows and no count or total assertion on it means anything.
 */
export async function openEntries(page, { pill = 'All time', category, from, to } = {}) {
  await page.goto('/entries')
  const filter = filterCard(page)
  await expect(filter).toBeVisible()

  if (pill) await filter.getByRole('button', { name: pill, exact: true }).click()
  if (from) await filter.getByLabel('From', { exact: true }).fill(from)
  if (to) await filter.getByLabel('To', { exact: true }).fill(to)
  if (category) await filter.getByLabel('Category', { exact: true }).selectOption({ label: category })
}

/** Delete every entry filed under one category. Entries must go before the category. */
export async function deleteEntriesForCategory(page, name) {
  await openEntries(page, { pill: 'All time', category: name })

  const rows = page.locator('tbody tr')
  let guard = 100
  while ((await rows.count()) > 0 && guard > 0) {
    guard -= 1
    const before = await rows.count()
    await rows.first().getByRole('button', { name: 'Delete' }).click()
    // Wait for the row to actually go before touching anything else: navigating
    // away mid-request aborts the delete and orphans the row.
    await expect(rows).toHaveCount(before - 1)
  }
}

export async function deleteCategory(page, name) {
  await page.goto('/categories')
  const row = categoryRow(page, name)
  if ((await row.count()) === 0) return
  await row.getByRole('button', { name: 'Delete' }).click()
  await expect(row).toHaveCount(0)
}

/**
 * Full teardown for one category, in the order the schema forces:
 * time_entries.category_id is "on delete restrict", and the category's Delete
 * button only renders once it has zero logged minutes.
 */
export async function deleteCategoryCascade(page, name) {
  await deleteEntriesForCategory(page, name)
  await deleteCategory(page, name)
}
