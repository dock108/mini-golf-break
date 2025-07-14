/**
 * Playwright configuration for UAT testing
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = {
  testDir: './tests/uat',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'coverage/uat-results' }],
    ['junit', { outputFile: 'coverage/uat-results.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...require('@playwright/test').devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'webkit-desktop',
      use: {
        ...require('@playwright/test').devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...require('@playwright/test').devices['Pixel 5'],
      },
    },
    {
      name: 'mobile-safari',
      use: {
        ...require('@playwright/test').devices['iPhone 12'],
      },
    },
    {
      name: 'tablet-ipad',
      use: {
        ...require('@playwright/test').devices['iPad Pro'],
      },
    }
  ],
  webServer: {
    command: 'npm start',
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },
};