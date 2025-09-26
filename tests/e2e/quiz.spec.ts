import { test, expect } from '@playwright/test'

test('boots at /quiz/', async ({ page }) => {
  await page.goto('/quiz/')
  await expect(page.getByTestId('title')).toHaveText(/Lux Learning Quiz/i)
})
