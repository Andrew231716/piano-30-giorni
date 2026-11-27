import { test, expect } from '@playwright/test'
import { completeOnboarding, readStorage } from './helpers'

test('A. Onboarding: profilo → dashboard', async ({ page }) => {
  await completeOnboarding(page)

  await expect(page.getByRole('heading', { name: /Giorno|Ancora|Ciclo/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Focus di oggi' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Registra peso' })).toBeVisible()

  const stored = await readStorage(page)
  expect(stored).toBeTruthy()
  expect((stored?.profile as { onboarded?: boolean })?.onboarded).toBe(true)
  expect((stored?.profile as { age?: number })?.age).toBe(28)
})
