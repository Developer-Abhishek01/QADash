import { describe, it, expect } from 'vitest';

import { appConfig, getConfig, initConfig } from '../index';

describe('appConfig', () => {
  it('should have valid structure', () => {
    expect(appConfig.cors).toBeDefined();
    expect(appConfig.cors.origin).toBe('*');
    expect(appConfig.cors.credentials).toBe(true);

    expect(appConfig.rateLimit.windowMs).toBe(900000);
    expect(appConfig.rateLimit.max).toBe(100);

    expect(appConfig.pagination.defaultLimit).toBe(20);
    expect(appConfig.pagination.maxLimit).toBe(100);

    expect(appConfig.test.defaultTimeout).toBe(30000);
    expect(appConfig.test.maxRetries).toBe(3);
  });

  it('should have positive numeric values', () => {
    expect(appConfig.rateLimit.windowMs).toBeGreaterThan(0);
    expect(appConfig.rateLimit.max).toBeGreaterThan(0);
    expect(appConfig.pagination.defaultLimit).toBeGreaterThan(0);
    expect(appConfig.test.defaultTimeout).toBeGreaterThan(0);
    expect(appConfig.test.maxRetries).toBeGreaterThanOrEqual(0);
  });
});

describe('getConfig', () => {
  it('should return env config without throwing', () => {
    const config = getConfig();
    expect(config).toBeDefined();
    expect(config).toHaveProperty('NODE_ENV');
    expect(config).toHaveProperty('PORT');
  });
});

describe('initConfig', () => {
  it('should return cached config on subsequent calls', () => {
    const first = initConfig();
    const second = initConfig();
    expect(first).toBe(second);
  });
});
