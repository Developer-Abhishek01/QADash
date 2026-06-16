import { Logger } from '../utils/logger';

export interface ComparisonResult {
  equal: boolean;
  differences: Difference[];
  summary: ComparisonSummary;
}

export interface Difference {
  path: string;
  type: 'added' | 'removed' | 'modified' | 'type_mismatch';
  expected?: unknown;
  actual?: unknown;
}

export interface ComparisonSummary {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
}

export class DataComparator {
  constructor(_logger?: Logger) {
  }

  compare(expected: unknown, actual: unknown, path = ''): ComparisonResult {
    const differences: Difference[] = [];

    const typeMismatch = this.checkTypeMismatch(expected, actual);
    if (typeMismatch) {
      differences.push({
        path,
        type: 'type_mismatch',
        expected: this.getType(expected),
        actual: this.getType(actual),
      });
      return this.createResult(false, differences);
    }

    if (expected === null && actual === null) {
      return this.createResult(true, differences);
    }

    if (Array.isArray(expected) && Array.isArray(actual)) {
      this.compareArrays(expected, actual, path, differences);
    } else if (typeof expected === 'object' && typeof actual === 'object') {
      this.compareObjects(expected as Record<string, unknown>, actual as Record<string, unknown>, path, differences);
    } else {
      if (expected !== actual) {
        differences.push({
          path,
          type: 'modified',
          expected,
          actual,
        });
      }
    }

    const equal = differences.length === 0;
    return this.createResult(equal, differences);
  }

  private compareArrays(expected: unknown[], actual: unknown[], path: string, differences: Difference[]): void {
    const maxLength = Math.max(expected.length, actual.length);
    
    for (let i = 0; i < maxLength; i++) {
      const currentPath = `${path}[${i}]`;

      if (i >= expected.length) {
        differences.push({
          path: currentPath,
          type: 'added',
          actual: actual[i],
        });
      } else if (i >= actual.length) {
        differences.push({
          path: currentPath,
          type: 'removed',
          expected: expected[i],
        });
      } else {
        const result = this.compare(expected[i], actual[i], currentPath);
        differences.push(...result.differences);
      }
    }
  }

  private compareObjects(expected: Record<string, unknown>, actual: Record<string, unknown>, path: string, differences: Difference[]): void {
    const allKeys = new Set([...Object.keys(expected), ...Object.keys(actual)]);

    allKeys.forEach(key => {
      const currentPath = path ? `${path}.${key}` : key;

      if (!(key in expected)) {
        differences.push({
          path: currentPath,
          type: 'added',
          actual: actual[key],
        });
      } else if (!(key in actual)) {
        differences.push({
          path: currentPath,
          type: 'removed',
          expected: expected[key],
        });
      } else {
        const result = this.compare(expected[key], actual[key], currentPath);
        differences.push(...result.differences);
      }
    });
  }

  private checkTypeMismatch(expected: unknown, actual: unknown): boolean {
    if (expected === null || actual === null) return false;
    if (Array.isArray(expected) !== Array.isArray(actual)) return true;
    if (typeof expected !== typeof actual) return true;
    return false;
  }

  private getType(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  private createResult(equal: boolean, differences: Difference[]): ComparisonResult {
    const summary: ComparisonSummary = {
      added: differences.filter(d => d.type === 'added').length,
      removed: differences.filter(d => d.type === 'removed').length,
      modified: differences.filter(d => d.type === 'modified' || d.type === 'type_mismatch').length,
      unchanged: 0,
    };

    return { equal, differences, summary };
  }

  assertEqual(expected: unknown, actual: unknown, message?: string): void {
    const result = this.compare(expected, actual);
    
    if (!result.equal) {
      const diffSummary = result.differences.slice(0, 5).map(d => `${d.path}: ${d.type}`).join('; ');
      throw new Error(message || `Data mismatch: ${diffSummary}`);
    }
  }

  assertPropertiesEqual(actual: Record<string, unknown>, expectedProps: Record<string, unknown>): void {
    for (const [key, expectedValue] of Object.entries(expectedProps)) {
      if (!(key in actual)) {
        throw new Error(`Missing property: ${key}`);
      }
      if (actual[key] !== expectedValue) {
        throw new Error(`Property ${key}: expected ${expectedValue}, got ${actual[key]}`);
      }
    }
  }

  assertArrayContains(actual: unknown[], expected: unknown[]): void {
    const missing = expected.filter(exp => 
      !actual.some(act => JSON.stringify(act) === JSON.stringify(exp))
    );
    
    if (missing.length > 0) {
      throw new Error(`Array missing elements: ${JSON.stringify(missing)}`);
    }
  }

  assertArrayNotContains(actual: unknown[], unexpected: unknown[]): void {
    const found = unexpected.filter(unexp => 
      actual.some(act => JSON.stringify(act) === JSON.stringify(unexp))
    );
    
    if (found.length > 0) {
      throw new Error(`Array contains unexpected elements: ${JSON.stringify(found)}`);
    }
  }

  assertRowCount(count: number, expected: number, message?: string): void {
    if (count !== expected) {
      throw new Error(message || `Row count: expected ${expected}, got ${count}`);
    }
  }

  assertColumnExists(columns: string[], expectedColumn: string, message?: string): void {
    if (!columns.includes(expectedColumn)) {
      throw new Error(message || `Column ${expectedColumn} not found in ${columns.join(', ')}`);
    }
  }
}

export class DataValidator {
  constructor(_logger?: Logger) {
  }

  validateSchema(data: Record<string, unknown>, schema: Record<string, { type: string; required?: boolean }>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      if (rules.required && (value === undefined || value === null)) {
        errors.push(`Required field missing: ${field}`);
        continue;
      }

      if (value !== undefined && value !== null) {
        const actualType = this.getType(value);
        if (actualType !== rules.type) {
          errors.push(`Field ${field}: expected ${rules.type}, got ${actualType}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private getType(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'float';
    return typeof value;
  }

  validateForeignKey(childValue: unknown, parentValues: unknown[], _fieldName: string): boolean {
    return parentValues.includes(childValue);
  }

  validateUnique(values: unknown[]): { valid: boolean; duplicates: unknown[] } {
    const seen = new Set();
    const duplicates: unknown[] = [];

    for (const value of values) {
      if (seen.has(value)) {
        duplicates.push(value);
      }
      seen.add(value);
    }

    return { valid: duplicates.length === 0, duplicates };
  }

  validateRange(value: number, min?: number, max?: number): boolean {
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  }

  validatePattern(value: string, pattern: string): boolean {
    return new RegExp(pattern).test(value);
  }
}