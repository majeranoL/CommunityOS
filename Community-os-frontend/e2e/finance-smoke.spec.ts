import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const ADMIN_EMAIL = 'admin@communityos.com'
const ADMIN_PASSWORD = 'Admin123!'
const MEMBER_EMAIL = 'smoke.member@test.com'
const MEMBER_PASSWORD = 'SmokePass123!'

async function loginAs(page: Page, email: string, password: string, url: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(url)
}

test('manager: households standing filter + details ledger + finance generate dues', async ({
  page,
}) => {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD, '**/admin/overview')

  // --- Households page: standing badges + filter ---
  await page.goto('/app/households')
  await expect(page.getByRole('heading', { name: 'Households' })).toBeVisible()

  const badRow = page.locator('tr', { hasText: '99, 2' })
  const goodRow = page.locator('tr', { hasText: '99, 1' })
  await expect(badRow).toBeVisible()
  await expect(badRow.getByText('BAD')).toBeVisible()
  await expect(badRow.getByText(/4,000\.00/)).toBeVisible()
  await expect(goodRow.getByText('GOOD')).toBeVisible()

  // Filter by Bad standing -> only 99, 2 remains
  await page.locator('[role="combobox"]').filter({ hasText: 'All standing' }).click()
  await page.getByRole('option', { name: 'Bad standing' }).click()
  await expect(page.locator('tr', { hasText: '16, 3' })).toBeHidden()
  await expect(goodRow).toBeHidden()
  await expect(badRow).toBeVisible()

  // --- Details dialog: running-balance ledger ---
  await badRow.getByRole('button').first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Balance ₱4,000.00', { exact: true })).toBeVisible()
  await expect(dialog.getByText('3 months behind', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('columnheader', { name: 'Balance' })).toBeVisible()
  await expect(dialog.getByRole('columnheader', { name: 'Credit' })).toBeVisible()
  await expect(dialog.getByRole('columnheader', { name: 'Debit' })).toBeVisible()
  await expect(dialog.getByText('Monthly dues 2026-05')).toBeVisible()
  await expect(dialog.getByText('OVERDUE').first()).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Export CSV' })).toBeEnabled()

  // --- Finance page: manager sees Generate dues, no balance card ---
  await page.goto('/app/finance')
  await expect(page.getByRole('heading', { name: 'Finance' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generate dues' })).toBeVisible()
  await expect(page.getByText('My household balance')).toBeHidden()
})

test('member: finance page shows self-service balance card (BAD standing)', async ({
  page,
}) => {
  await loginAs(page, MEMBER_EMAIL, MEMBER_PASSWORD, '**/app/dashboard')

  await page.goto('/app/finance')
  await expect(page.getByText('My household balance')).toBeVisible()
  await expect(page.getByText('BAD')).toBeVisible()
  await expect(page.getByText(/4,000\.00/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generate dues' })).toBeHidden()
})
