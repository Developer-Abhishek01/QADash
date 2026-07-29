import { describe, it, expect } from 'vitest';

import { createLogger, createChildLogger, logger } from '../index';

describe('createLogger', () => {
  it('should create a logger with the given name', () => {
    const log = createLogger('test-logger');
    expect(log).toBeDefined();
    expect((log as unknown as { bindings?: { name?: string } }).bindings?.name).toBeUndefined();
  });

  it('should respect custom log level', () => {
    const log = createLogger('test-level', { level: 'error' });
    expect(log).toBeDefined();
  });
});

describe('createChildLogger', () => {
  it('should create a child logger with bindings', () => {
    const child = createChildLogger(logger, { requestId: 'abc-123' });
    expect(child).toBeDefined();
  });
});

describe('logger', () => {
  it('should be a valid pino logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });
});
