export const devConfig = {
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:3001/api/v1',
  environment: 'development',
  browser: {
    headless: false,
    slowMo: 100,
    devtools: true,
  },
  timeouts: {
    action: 10000,
    navigation: 30000,
    expect: 5000,
    test: 60000,
  },
  retries: {
    attempts: 2,
    delay: 1000,
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
    logRequests: true,
    logResponses: true,
  },
};