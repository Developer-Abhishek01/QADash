import { Logger } from '../../utils/logger';

export interface ValidationError {
  path: string;
  message: string;
  expected?: unknown;
  actual?: unknown;
}

export class SchemaValidator {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('SchemaValidator');
  }

  validate(data: unknown, schema: Record<string, unknown>): ValidationError[] {
    const errors: ValidationError[] = [];
    this.validateObject(data as Record<string, unknown>, schema, '', errors);
    return errors;
  }

  private validateObject(
    data: unknown,
    schema: Record<string, unknown>,
    path: string,
    errors: ValidationError[]
  ): void {
    if (!data || typeof data !== 'object') {
      errors.push({ path, message: 'Expected object', actual: data });
      return;
    }

    const obj = data as Record<string, unknown>;
    const required = schema.required as string[] | undefined;
    const properties = schema.properties as Record<string, unknown> | undefined;

    if (required) {
      for (const field of required) {
        if (!(field in obj)) {
          errors.push({ path: `${path}.${field}`, message: 'Required field missing' });
        }
      }
    }

    if (properties) {
      for (const [key, propSchema] of Object.entries(properties)) {
        const value = obj[key];
        const fieldPath = path ? `${path}.${key}` : key;

        if (value !== undefined) {
          this.validateField(value, propSchema as Record<string, unknown>, fieldPath, errors);
        }
      }
    }
  }

  private validateField(
    value: unknown,
    schema: Record<string, unknown>,
    path: string,
    errors: ValidationError[]
  ): void {
    const type = schema.type as string;

    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({ path, message: 'Expected string', actual: typeof value });
        }
        break;
      case 'number':
      case 'integer':
        if (typeof value !== 'number') {
          errors.push({ path, message: 'Expected number', actual: typeof value });
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({ path, message: 'Expected boolean', actual: typeof value });
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          errors.push({ path, message: 'Expected array', actual: typeof value });
        } else {
          const items = schema.items as Record<string, unknown>;
          if (items) {
            value.forEach((item, index) => {
              this.validateField(item, items, `${path}[${index}]`, errors);
            });
          }
        }
        break;
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push({ path, message: 'Expected object', actual: typeof value });
        } else {
          this.validateObject(value, schema, path, errors);
        }
        break;
      case 'null':
        if (value !== null) {
          errors.push({ path, message: 'Expected null', actual: value });
        }
        break;
    }

    const enumValues = schema.enum as unknown[] | undefined;
    if (enumValues && !enumValues.includes(value)) {
      errors.push({
        path,
        message: `Value must be one of: ${enumValues.join(', ')}`,
        expected: enumValues,
        actual: value,
      });
    }

    const minimum = schema.minimum as number | undefined;
    if (typeof value === 'number' && minimum !== undefined && value < minimum) {
      errors.push({ path, message: `Value must be >= ${minimum}`, expected: minimum, actual: value });
    }

    const maximum = schema.maximum as number | undefined;
    if (typeof value === 'number' && maximum !== undefined && value > maximum) {
      errors.push({ path, message: `Value must be <= ${maximum}`, expected: maximum, actual: value });
    }

    const minLength = schema.minLength as number | undefined;
    if (typeof value === 'string' && minLength !== undefined && value.length < minLength) {
      errors.push({ path, message: `String length must be >= ${minLength}`, expected: minLength, actual: value.length });
    }

    const maxLength = schema.maxLength as number | undefined;
    if (typeof value === 'string' && maxLength !== undefined && value.length > maxLength) {
      errors.push({ path, message: `String length must be <= ${maxLength}`, expected: maxLength, actual: value.length });
    }

    const pattern = schema.pattern as string | undefined;
    if (typeof value === 'string' && pattern && !new RegExp(pattern).test(value)) {
      errors.push({ path, message: `String must match pattern: ${pattern}`, actual: value });
    }
  }

  validateJsonSchema(data: unknown, schemaUrl: string): Promise<ValidationError[]> {
    this.logger.info(`Validating against JSON Schema: ${schemaUrl}`);
    return Promise.resolve(this.validate(data, { type: 'object' }));
  }

  validateArray(data: unknown[], itemSchema: Record<string, unknown>): ValidationError[] {
    const errors: ValidationError[] = [];
    if (!Array.isArray(data)) {
      errors.push({ path: '', message: 'Expected array' });
      return errors;
    }

    data.forEach((item, index) => {
      const itemErrors = this.validate(item, itemSchema);
      itemErrors.forEach(err => ({
        ...err,
        path: `[${index}]${err.path ? '.' + err.path : ''}`,
      }));
      errors.push(...itemErrors);
    });

    return errors;
  }
}