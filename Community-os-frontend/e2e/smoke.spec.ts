import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  cleanupAccountByEmail,
  cleanupRegisteredUser,
  getAnchorCommunityId,
  getRegistrationMode,
  resetRegistrationMode,
  seedRegistrationOtp,
  seedTenantMember,
  setRegistrationMode,
  withDb,
} from './db'

const ADMIN_EMAIL = 'admin@communityos.com'
const ADMIN_PASSWORD = 'Admin123!'

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}@test.com`
}

async function loginAs(page: Page, email: string, password: string, url: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(url)
}

test('login as a tenant member lands on the dashboard', async ({ page }) => {
  const email = uniqueEmail('smoke-member')
  const communityId = await withDb((db) => getAnchorCommunityId(db))
  await withDb((db) => seedTenantMember(db, communityId, email))

  try {
    await loginAs(page, email, ADMIN_PASSWORD, '**/app/dashboard')

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Smoke')
    await expect(page.getByText('Available facilities', { exact: true })).toBeVisible()
  } finally {
    await withDb((db) => cleanupAccountByEmail(db, email))
  }
})

test('register page renders the signup wizard', async ({ page }) => {
  await page.goto('/register')

  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
  await expect(page.getByText('Details', { exact: true })).toBeVisible()
  await expect(page.getByText('Verify', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible()
})

test('registration gate: CLOSED returns 403, OPEN submits for approval', async ({ request }) => {
  const email = uniqueEmail('smoke-register')
  const block = `S${String(Date.now()).slice(-6)}`
  const lot = '1'

  const communityId = await withDb((db) => getAnchorCommunityId(db))

  const body = {
    email,
    password: 'SmokePass!23',
    firstName: 'Smoke',
    lastName: 'Test',
    phoneNumber: '09170000000',
    communityId,
    otpCode: '123456',
    block,
    lot,
    address: '1 Smoke St.',
  }

  let previousMode: string | null = null

  try {
    await withDb(async (db) => {
      await seedRegistrationOtp(db, email, '123456')
      previousMode = await getRegistrationMode(db, communityId)
      await setRegistrationMode(db, communityId, 'CLOSED')
    })

    const closed = await request.post('/api/auth/register', { data: body })
    expect(closed.status()).toBe(403)
    expect(await closed.text()).toContain('Registration is closed')

    await withDb(async (db) => {
      await seedRegistrationOtp(db, email, '123456')
      await setRegistrationMode(db, communityId, 'OPEN')
    })

    const open = await request.post('/api/auth/register', { data: body })
    expect(open.ok()).toBeTruthy()
    const payload = await open.json()
    expect(payload.message).toContain('Registration submitted for approval')
  } finally {
    await withDb(async (db) => {
      await cleanupRegisteredUser(db, email, block, lot, communityId)
      await resetRegistrationMode(db, communityId, previousMode)
    })
  }
})

test('platform admin can open the settings page', async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD, '**/admin/overview')
  await page.goto('/admin/settings')

  await expect(page.getByRole('heading', { name: 'Platform settings' })).toBeVisible()
  await expect(page.locator('#setting-platformName')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save settings' })).toBeVisible()
})
