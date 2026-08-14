import { defineConfig, devices } from '@playwright/test'

const BACKEND_DIR = '../Community-os-backend'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run build && node dist/src/main.js',
      cwd: BACKEND_DIR,
      url: 'http://localhost:3000/api/docs',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { ...process.env, THROTTLE_DISABLED: 'true' },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
