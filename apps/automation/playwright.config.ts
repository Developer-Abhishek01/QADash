import { defineConfig, devices, ReporterDescription } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: process.env.ENV_FILE || '.env' });

const reporters: ReporterDescription[] = [
  ['html', { outputFile: 'test-results/html/report.html' }],
  ['json', { outputFile: 'test-results/json/report.json' }],
  ['junit', { outputFile: 'test-results/junit/results.xml' }],
];

if (process.env.CI) {
  reporters.push(['list']);
} else {
  reporters.push(['./src/utils/custom-reporter.ts']);
  // Note: custom-reporter.ts is a TypeScript file loaded directly by Playwright's config loader;
}

export default defineConfig({
  testDir: './src/tests',
  fullyParallel: !process.env.CI,
  forbidOnly: !!process.env.CI,
  retries: parseInt(process.env.RETRY_COUNT || '2'),
  workers: parseInt(process.env.MAX_WORKERS || '4'),
  reporter: reporters,

  expect: {
    timeout: 5000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.1,
      animations: 'disabled',
    },
    toHaveText: {
      timeout: 5000,
    },
  },

  timeout: parseInt(process.env.TEST_TIMEOUT || '30000'),
  expectTimeout: 5000,

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on',
    video: 'on',
    screenshot: 'on',
    screenshotOptions: {
      mode: 'fullpage',
      fullPage: true,
    },
    videoOptions: {
      size: { width: 1920, height: 1080 },
    },
    actionTimeout: parseInt(process.env.ACTION_TIMEOUT || '10000'),
    navigationTimeout: parseInt(process.env.NAVIGATION_TIMEOUT || '30000'),
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    hasTouch: false,
    ignoreHTTPSErrors: true,
    acceptDownloads: true,
    contextOptions: {
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: ['geolocation', 'notifications'],
    },
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
      grep: process.env.TEST_TAGS || undefined,
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          prefs: { 'media.navigator.streams.fake': true },
        },
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
      },
    },
    {
      name: 'Tablet iPad',
      use: {
        ...devices['iPad Pro 11'],
      },
    },
  ],

  outputDir: `test-results/${process.env.CI_JOB_ID || process.env.BUILD_NUMBER || new Date().toISOString().split('T')[0]}`,

  preserveOutput: 'always',

  globalSetup: './src/fixtures/global-setup.ts',
  globalTeardown: './src/fixtures/global-teardown.ts',
  grepInvert: process.env.SKIP_TAGS ? process.env.SKIP_TAGS : undefined,

  webServer: [
    {
      command: 'npm run -w @qadash/frontend dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],

  shard: process.env.SHARD ? {
    current: parseInt(process.env.SHARD.split('/')[0]),
    total: parseInt(process.env.SHARD.split('/')[1]),
  } : undefined,
});