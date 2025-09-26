import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:9000',
    testIdAttribute: 'data-test'
  },
  webServer: {
    command: 'pnpm dev',
    port: 9000,
    reuseExistingServer: true,
    timeout: 120_000
  }
})
