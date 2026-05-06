import { expect, test } from '@playwright/test'

async function fillWhenStable(locator, value) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await locator.fill(value)

    if ((await locator.inputValue()) === value) {
      return
    }

    await locator.page().waitForTimeout(500)
  }

  throw new Error(`Input did not retain value: ${value}`)
}

test('signs in and creates a lead from the CRM board', async ({ page, context }) => {
  const stamp = Date.now()
  const email = `playwright-${stamp}@example.com`
  const password = 'Passw0rd!12345'
  const organizationName = `Playwright Org ${stamp}`
  const leadName = `Playwright Lead ${stamp}`

  await page.goto('/signup')
  await page.waitForTimeout(1500)
  const createWorkspaceButton = page.getByRole('button', { name: 'Create workspace' })

  if (await createWorkspaceButton.isDisabled()) {
    test.skip(true, 'Requires Better Auth to be enabled in the running app.')
  }

  await fillWhenStable(page.getByLabel('Full name'), 'Playwright User')
  await fillWhenStable(page.getByLabel('Organization name'), organizationName)
  await fillWhenStable(page.getByLabel('Email'), email)
  await fillWhenStable(page.getByLabel('Password'), password)
  await createWorkspaceButton.click()

  await expect(page).toHaveURL(/\/dashboard/)

  await context.clearCookies()
  await page.goto('/signin')
  await page.evaluate(() => window.localStorage.clear())
  await page.waitForTimeout(1500)
  await fillWhenStable(page.getByLabel('Email'), email)
  await fillWhenStable(page.getByLabel('Password'), password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

  await page.goto('/crm')
  await page.getByRole('button', { name: 'New Lead' }).click()
  await page.getByPlaceholder('Lead name').fill(leadName)
  await page.getByPlaceholder('Company').fill('Northwind Advisory')
  await page.getByPlaceholder('$50k').fill('250k')
  await page.getByPlaceholder('Source').fill('Referral')
  await page.getByPlaceholder('Email').fill('lead@example.com')
  await page.getByPlaceholder('Phone').fill('555-0115')
  await page.getByPlaceholder('Notes').fill('Created by Playwright')
  await page.getByRole('button', { name: 'Create lead' }).click()

  await expect(page.getByText(leadName)).toBeVisible()
  await expect(page.getByText('Northwind Advisory')).toBeVisible()
})