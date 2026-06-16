export const prodConfig = {
  baseUrl: 'https://qadash.io',
  apiUrl: 'https://api.qadash.io/api/v1',
  environment: 'production',
  browser: {
    headless: true,
    slowMo: 0,
    devtools: false,
  },
  timeouts: {
    action: 20000,
    navigation: 90000,
    expect: 15000,
    test: 180000,
  },
  retries: {
    attempts: 4,
    delay: 3000,
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