export const stagingConfig = {
  baseUrl: 'https://staging.qadash.io',
  apiUrl: 'https://staging-api.qadash.io/api/v1',
  environment: 'staging',
  browser: {
    headless: true,
    slowMo: 0,
    devtools: false,
  },
  timeouts: {
    action: 15000,
    navigation: 60000,
    expect: 10000,
    test: 120000,
  },
  retries: {
    attempts: 3,
    delay: 2000,
  },
  screenshots: {
    onFailure: true,
    onSuccess: false,
  },
  videos: {
    onFailure: true,
    onSuccess: false,
  },
  trace: {
    onRetry: true,
    onFailure: true,
  },
  debug: {
    logRequests: false,
    logResponses: false,
  },
};