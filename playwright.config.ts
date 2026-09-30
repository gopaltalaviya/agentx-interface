import {defineConfig, devices} from '@playwright/test';

/**
 * Smoke test: every page, in a real browser, against the production build and
 * a mocked API. It catches what unit tests cannot — a page that throws on
 * render, a route that 500s, and a Content-Security-Policy that blocks the
 * page's own requests (which shows up only as a console error).
 *
 * Needs `pnpm build` with NEXT_PUBLIC_API_URL=http://127.0.0.1:8787 first
 * (`pnpm test:e2e` does both).
 */
const PORT = 3100;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',
  use: {baseURL: `http://127.0.0.1:${PORT}`, trace: 'retain-on-failure'},
  projects: [{name: 'chromium', use: {...devices['Desktop Chrome']}}],
  webServer: [
    {command: 'node e2e/mock-api.mjs', url: 'http://127.0.0.1:8787/v1/network', reuseExistingServer: false},
    {
      command: `pnpm exec next start -p ${PORT} -H 127.0.0.1`,
      url: `http://127.0.0.1:${PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
