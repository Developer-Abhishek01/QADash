import { ApiResponse } from '../api-client';
import { Logger } from '../../utils/logger';
import { SchemaValidator } from '../validators/schema.validator';

export class ApiAssertions {
  private logger: Logger;
  private schemaValidator: SchemaValidator;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('ApiAssertions');
    this.schemaValidator = new SchemaValidator(logger);
  }

  statusEquals(response: ApiResponse, expected: number, message?: string): void {
    const actual = response.status;
    if (actual !== expected) {
      throw new Error(message || `Expected status ${expected}, got ${actual}`);
    }
    this.logger.debug(`Status check: ${actual} === ${expected}`);
  }

  statusSuccess(response: ApiResponse, message?: string): void {
    if (response.status < 200 || response.status >= 300) {
      throw new Error(message || `Expected success status (2xx), got ${response.status}`);
    }
    this.logger.debug(`Success status check: ${response.status}`);
  }

  statusRedirect(response: ApiResponse, message?: string): void {
    if (response.status < 300 || response.status >= 400) {
      throw new Error(message || `Expected redirect status (3xx), got ${response.status}`);
    }
    this.logger.debug(`Redirect status check: ${response.status}`);
  }

  statusClientError(response: ApiResponse, message?: string): void {
    if (response.status < 400 || response.status >= 500) {
      throw new Error(message || `Expected client error (4xx), got ${response.status}`);
    }
    this.logger.debug(`Client error check: ${response.status}`);
  }

  statusServerError(response: ApiResponse, message?: string): void {
    if (response.status < 500) {
      throw new Error(message || `Expected server error (5xx), got ${response.status}`);
    }
    this.logger.debug(`Server error check: ${response.status}`);
  }

  bodyEquals<T>(response: ApiResponse<T>, expected: T, message?: string): void {
    const actual = JSON.stringify(response.body);
    const expectedStr = JSON.stringify(expected);
    if (actual !== expectedStr) {
      throw new Error(message || `Body mismatch\nexpected: ${expectedStr}\nactual: ${actual}`);
    }
    this.logger.debug('Body equals check passed');
  }

  bodyContains(response: ApiResponse, expectedPart: string, message?: string): void {
    const bodyStr = JSON.stringify(response.body);
    if (!bodyStr.includes(expectedPart)) {
      throw new Error(message || `Body does not contain: ${expectedPart}`);
    }
    this.logger.debug(`Body contains check: ${expectedPart}`);
  }

  hasProperty(response: ApiResponse, propertyPath: string, message?: string): void {
    const value = this.getNestedProperty(response.body, propertyPath);
    if (value === undefined) {
      throw new Error(message || `Property not found: ${propertyPath}`);
    }
    this.logger.debug(`Property exists: ${propertyPath}`);
  }

  propertyEquals(response: ApiResponse, propertyPath: string, expected: unknown, message?: string): void {
    const actual = this.getNestedProperty(response.body, propertyPath);
    if (actual !== expected) {
      throw new Error(message || `Property ${propertyPath}: expected ${expected}, got ${actual}`);
    }
    this.logger.debug(`Property equals: ${propertyPath} === ${expected}`);
  }

  propertyContains(response: ApiResponse, propertyPath: string, expected: string, message?: string): void {
    const actual = this.getNestedProperty(response.body, propertyPath);
    if (typeof actual !== 'string' || !actual.includes(expected)) {
      throw new Error(message || `Property ${propertyPath} does not contain: ${expected}`);
    }
    this.logger.debug(`Property contains: ${propertyPath} includes ${expected}`);
  }

  arrayLength(response: ApiResponse, propertyPath: string, expectedLength: number, message?: string): void {
    const array = this.getNestedProperty(response.body, propertyPath);
    if (!Array.isArray(array)) {
      throw new Error(message || `Property ${propertyPath} is not an array`);
    }
    if (array.length !== expectedLength) {
      throw new Error(message || `Array length: expected ${expectedLength}, got ${array.length}`);
    }
    this.logger.debug(`Array length: ${propertyPath} has ${expectedLength} items`);
  }

  arrayContains(response: ApiResponse, propertyPath: string, item: unknown, message?: string): void {
    const array = this.getNestedProperty(response.body, propertyPath);
    if (!Array.isArray(array)) {
      throw new Error(message || `Property ${propertyPath} is not an array`);
    }
    const found = array.some((arrItem: unknown) => JSON.stringify(arrItem) === JSON.stringify(item));
    if (!found) {
      throw new Error(message || `Array does not contain item`);
    }
    this.logger.debug(`Array contains check passed`);
  }

  schemaValid(response: ApiResponse, schema: Record<string, unknown>, message?: string): void {
    const errors = this.schemaValidator.validate(response.body, schema);
    if (errors.length > 0) {
      const errorMsg = errors.map(e => `${e.path}: ${e.message}`).join('; ');
      throw new Error(message || `Schema validation failed: ${errorMsg}`);
    }
    this.logger.debug('Schema validation passed');
  }

  headerExists(response: ApiResponse, headerName: string, message?: string): void {
    if (!(headerName.toLowerCase() in response.headers)) {
      throw new Error(message || `Header not found: ${headerName}`);
    }
    this.logger.debug(`Header exists: ${headerName}`);
  }

  headerEquals(response: ApiResponse, headerName: string, expected: string, message?: string): void {
    const actual = response.headers[headerName.toLowerCase()];
    if (actual !== expected) {
      throw new Error(message || `Header ${headerName}: expected ${expected}, got ${actual}`);
    }
    this.logger.debug(`Header equals: ${headerName} === ${expected}`);
  }

  responseTimeLessThan(response: ApiResponse, maxMs: number, message?: string): void {
    if (response.responseTime > maxMs) {
      throw new Error(message || `Response time ${response.responseTime}ms exceeds ${maxMs}ms`);
    }
    this.logger.debug(`Response time: ${response.responseTime}ms < ${maxMs}ms`);
  }

  private getNestedProperty(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current: unknown, key) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }
}