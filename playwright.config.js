import { defineConfig, devices } from '@playwright/test'
import { loadE2EEnv } from './e2e/helpers/env.js'

const { port, baseURL } = loadE2EEnv()

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.js',
  fullyParallel: true,
  // Both accounts are shared by every worker and each test signs in for
  // itself, so this is really a cap on how hard GoTrue's token endpoint gets
  // hit. Raise it only alongside a storageState setup project.
  workers: 2,
  retries: 0,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    // The app's idea of "today" comes from browser local time (todayKey() and
    // the date input's max), so both of these are pinned rather than inherited
    // from whatever machine happens to run the suite.
    locale: 'en-GB',
    timezoneId: 'Europe/Helsinki',
    viewport: { width: 1280, height: 900 },
    actionTimeout: 15000,
    navigationTimeout: 20000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // vite.config.js has no server block, so all of this has to be forced on
    // the command line -- Playwright's own `port` option only says what to
    // poll, it configures nothing.
    //   --strictPort  without it Vite drifts to the next free port on a clash
    //                 and every test navigates to a dead baseURL.
    //   --host        Vite's default `localhost` resolves to ::1 first on
    //                 Windows, so it would bind IPv6-only while the readiness
    //                 poll below knocks on 127.0.0.1 until it times out.
    command: `npm run dev -- --port ${port} --strictPort --host 127.0.0.1`,
    url: baseURL,
    // import.meta.env is inlined when the server starts, so reusing a server
    // started before the last .env.local edit would quietly test stale config.
    reuseExistingServer: false,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
