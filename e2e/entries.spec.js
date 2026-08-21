import { expect, test } from './fixtures.js'
import { ACCOUNT_A, gotoSignedIn, waitForAppReady } from './helpers/accounts.js'
import {
  createCategory,
  entryRowByNote,
  logTime,
  logTimeForm,
  openEntries,
  todayFromForm,
} from './helpers/app.js'
import { categoryName, noteTag } from './helpers/naming.js'

/**
 * Note that Log time lives on the dashboard, not on /entries -- entries are
 * created at `/` and only listed at `/entries`.
 *
 * Both test accounts are shared by every worker, so every count or total
 * assertion here filters by this test's own category first. An unfiltered
 * list contains other workers' rows and means nothing.
 */
test.describe('logging time', () => {
  test.beforeEach(async ({ page }) => {
    await gotoSignedIn(page, ACCOUNT_A)
  })

  test('every duration notation lands on the right number of minutes', async ({ page, trash }, testInfo) => {
    const category = categoryName('notation', testInfo)
    trash.push(category)
    await createCategory(page, category)

    const cases = [
      { typed: '1h 20min', shown: '1h 20min' },
      { typed: '90', shown: '1h 30min' },
      { typed: '1,5h', shown: '1h 30min' },
      { typed: '1,5t', shown: '1h 30min' },
      { typed: '45min', shown: '45min' },
    ]

    for (const { typed, shown } of cases) {
      const form = await logTime(page, {
        category,
        duration: typed,
        note: noteTag(typed.replace(/[^a-z0-9]/gi, ''), testInfo),
      })
      // Assert immediately: the confirmation clears itself after 4 seconds.
      await expect(form.getByText(`Added ${shown}.`)).toBeVisible()
    }

    await openEntries(page, { pill: 'All time', category })
    await expect(page.getByRole('heading', { name: `${cases.length} entries` })).toBeVisible()
  })

  test('the duration field previews and rejects as you type', async ({ page, trash }, testInfo) => {
    const category = categoryName('hint', testInfo)
    trash.push(category)
    // The dashboard shows "Add your first category" until one exists, so the
    // form is not on screen without this.
    await createCategory(page, category)
    await page.goto('/')

    const form = logTimeForm(page)
    const duration = form.getByLabel('Duration', { exact: true })

    await duration.fill('1,5h')
    await expect(form.getByText('= 1h 30min')).toBeVisible()

    await duration.fill('abc')
    await expect(form.getByText('"abc" is not a duration. Try 1h 20min, 90min or 1,5h.')).toBeVisible()

    await duration.fill('1h 70min')
    await expect(form.getByText('Minutes must be under 60 when hours are given.')).toBeVisible()

    await expect(form.getByRole('button', { name: 'Add entry' })).toBeDisabled()
  })

  test('a successful save keeps the category and date but clears the rest', async ({ page, trash }, testInfo) => {
    const category = categoryName('sticky', testInfo)
    trash.push(category)
    await createCategory(page, category)

    const form = await logTime(page, {
      category,
      duration: '2h',
      note: noteTag('sticky', testInfo),
    })
    await expect(form.getByText('Added 2h.')).toBeVisible()

    // Logging several sessions for one day is the common case, so category and
    // date survive the submit while duration and note reset.
    await expect(form.getByLabel('Duration', { exact: true })).toHaveValue('')
    await expect(form.getByLabel('Note (optional)', { exact: true })).toHaveValue('')

    const selected = await form.getByLabel('Category', { exact: true }).inputValue()
    expect(selected).not.toBe('')

    await page.reload()
    await waitForAppReady(page)
    // The last category id is cached in localStorage, so a reload preselects it.
    await expect(logTimeForm(page).getByLabel('Category', { exact: true })).toHaveValue(selected)
  })

  test('an entry reaches the table and can be deleted again', async ({ page, trash, dialogs }, testInfo) => {
    const category = categoryName('table', testInfo)
    trash.push(category)
    await createCategory(page, category)
    await page.goto('/')

    // Read today from the app rather than computing it in Node: the date input
    // is browser-local and the two disagree either side of local midnight.
    const today = await todayFromForm(page)
    const note = noteTag('table', testInfo)

    const form = await logTime(page, { category, duration: '1h 20min', note, date: today })
    await expect(form.getByText('Added 1h 20min.')).toBeVisible()

    await openEntries(page, { pill: 'All time', category })
    const row = entryRowByNote(page, note)
    await expect(row).toBeVisible()
    await expect(row).toContainText('1h 20min')
    await expect(row).toContainText(category)
    await expect(page.locator('p').filter({ hasText: /^Total/ })).toContainText('1h 20min')

    await row.getByRole('button', { name: 'Delete' }).click()
    // Wait for the row to actually go before asserting anything else -- moving
    // on too early aborts the in-flight delete and orphans the row.
    await expect(row).toHaveCount(0)

    // The delete goes through window.confirm; the fixture accepted it and kept
    // the text, which is the only way to assert it without racing the re-render.
    expect(dialogs.at(-1)).toMatch(/^Delete this entry \(1h 20min on \d{1,2} \w{3} \d{4}\)\?$/)
  })

  test('a date window with nothing in it shows the empty state', async ({ page }) => {
    await openEntries(page, { pill: null, from: '2000-01-01', to: '2000-01-31' })
    await expect(page.getByText('Nothing in this range')).toBeVisible()
  })
})
