import { expect, test } from './fixtures.js'
import { ACCOUNT_A, gotoSignedIn } from './helpers/accounts.js'
import { createCategory, logTime } from './helpers/app.js'
import { categoryName, noteTag } from './helpers/naming.js'

test.describe('reports', () => {
  test('the lazy Recharts bundle loads and draws the charts', async ({ page, trash }, testInfo) => {
    // A failed dynamic import does not throw anywhere visible -- it just
    // leaves a blank region behind. Collecting page errors is what actually
    // catches it.
    const errors = []
    page.on('pageerror', (error) => errors.push(error))

    await gotoSignedIn(page, ACCOUNT_A)

    const category = categoryName('reports', testInfo)
    trash.push(category)
    await createCategory(page, category)

    const form = await logTime(page, {
      category,
      duration: '2h',
      note: noteTag('reports', testInfo),
    })
    await expect(form.getByText('Added 2h.')).toBeVisible()

    // Navigate by link, so this exercises the client-side lazy import rather
    // than a cold page load that would fetch the chunk up front anyway.
    await page.getByRole('link', { name: 'Reports' }).click()

    await expect(page.getByRole('heading', { name: 'Time per category' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Day by day' })).toBeVisible()
    // Recharts sets no test ids, so its own class names are the only handle.
    await expect(page.locator('.recharts-surface').first()).toBeVisible()
    await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible()

    await page.getByRole('button', { name: 'Last 90 days', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Time per category' })).toBeVisible()
    await expect(page.locator('.recharts-surface').first()).toBeVisible()

    expect(errors).toEqual([])
  })
})
