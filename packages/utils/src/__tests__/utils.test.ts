import { describe, it, expect } from 'vitest';

import { generateId, slugify, truncate, formatDuration, formatBytes, isValidEmail, groupBy, delay } from '../index';

describe('generateId', () => {
  it('should generate a 16-character string', () => {
    const id = generateId();
    expect(id).toHaveLength(16);
  });

  it('should accept an optional prefix', () => {
    const id = generateId('usr');
    expect(id).toHaveLength(19);
    expect(id.startsWith('usr_')).toBe(true);
  });

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('slugify', () => {
  it('should convert text to URL-safe slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('  Spaces  at  edges  ')).toBe('spaces-at-edges');
    expect(slugify('Special!@#Characters')).toBe('specialcharacters');
  });

  it('should handle empty string', () => {
    expect(slugify('')).toBe('');
  });
});

describe('truncate', () => {
  it('should truncate long text with ellipsis', () => {
    const result = truncate('This is a very long text', 10);
    expect(result).toBe('This is a ...');
    expect(result).toHaveLength(14);
  });

  it('should return full text if within limit', () => {
    expect(truncate('Short', 10)).toBe('Short');
  });
});

describe('formatDuration', () => {
  it('should format milliseconds', () => {
    expect(formatDuration(3600000)).toBe('1h 0m');
    expect(formatDuration(61000)).toBe('1m 1s');
    expect(formatDuration(5000)).toBe('5s');
    expect(formatDuration(0)).toBe('0s');
  });
});

describe('formatBytes', () => {
  it('should format bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(1048576)).toBe('1.00 MB');
    expect(formatBytes(1073741824)).toBe('1.00 GB');
  });
});

describe('isValidEmail', () => {
  it('should validate email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@empty.com')).toBe(false);
  });
});

describe('groupBy', () => {
  it('should group items by key', () => {
    const items = [
      { type: 'a', name: 'foo' },
      { type: 'b', name: 'bar' },
      { type: 'a', name: 'baz' },
    ];
    const grouped = groupBy(items, 'type');
    expect(grouped.a).toHaveLength(2);
    expect(grouped.b).toHaveLength(1);
  });
});

describe('delay', () => {
  it('should resolve after specified time', async () => {
    const start = Date.now();
    await delay(10);
    expect(Date.now() - start).toBeGreaterThanOrEqual(5);
  });
});
