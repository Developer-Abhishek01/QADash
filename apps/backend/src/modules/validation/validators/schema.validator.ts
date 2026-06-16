import { Injectable } from '@nestjs/common';

export type SchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | 'email' | 'url' | 'phone' | 'uuid';

export interface SchemaProperty {
  type: SchemaType;
  required?: boolean;
  nullable?: boolean;
  default?: unknown;
  enum?: unknown[];
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  $ref?: string;
  custom?: (value: unknown) => boolean | string;
}

export interface SchemaDefinition {
  type: string;
  properties: Record<string, SchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
  definitions?: Record<string, SchemaProperty>;
}

export interface SchemaValidationError {
  path: string;
  message: string;
  type: string;
}

@Injectable()
export class SchemaValidator {
  validate(data: unknown, schema: SchemaDefinition, basePath = ''): { valid: boolean; errors: SchemaValidationError[] } {
    const errors: SchemaValidationError[] = [];

    if (schema.type !== 'object') {
      errors.push({ path: basePath, message: 'Root schema must be an object', type: 'INVALID_TYPE' });
      return { valid: false, errors };
    }

    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      errors.push({ path: basePath, message: 'Data must be an object', type: 'INVALID_TYPE' });
      return { valid: false, errors };
    }

    const dataObj = data as Record<string, unknown>;

    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in dataObj) || dataObj[field] === undefined) {
          errors.push({ path: `${basePath}.${field}`, message: 'Field is required', type: 'REQUIRED' });
        }
      }
    }

    if (!schema.additionalProperties && schema.properties) {
      const allowedFields = Object.keys(schema.properties);
      const extraFields = Object.keys(dataObj).filter((f) => !allowedFields.includes(f));
      for (const field of extraFields) {
        errors.push({ path: `${basePath}.${field}`, message: 'Additional properties not allowed', type: 'ADDITIONAL_PROPERTY' });
      }
    }

    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        if (key in dataObj) {
          const fieldErrors = this.validateProperty(dataObj[key], prop, `${basePath ? basePath + '.' : ''}${key}`);
          errors.push(...fieldErrors);
        } else if (prop.required) {
          errors.push({ path: `${basePath}.${key}`, message: 'Field is required', type: 'REQUIRED' });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private validateProperty(value: unknown, schema: SchemaProperty, path: string): SchemaValidationError[] {
    const errors: SchemaValidationError[] = [];

    if (value === null || value === undefined) {
      if (schema.required) {
        errors.push({ path, message: 'Value cannot be null or undefined', type: 'REQUIRED' });
      }
      return errors;
    }

    if (!schema.nullable && value === null) {
      errors.push({ path, message: 'Value cannot be null', type: 'NOT_NULLABLE' });
      return errors;
    }

    const actualType = Array.isArray(value) ? 'array' : typeof value;
    const schemaType = schema.type as any;
    const isSpecializedType = ['date', 'email', 'url', 'phone', 'uuid'].includes(schemaType);

    if (actualType !== schemaType && 
        !(schemaType === 'number' && !isNaN(Number(value))) &&
        !(isSpecializedType && actualType === 'string')) {
      errors.push({ path, message: `Expected ${schemaType}, got ${actualType}`, type: 'INVALID_TYPE' });
      return errors;
    }

    switch (schemaType) {
      case 'string':
        this.validateString(value as string, schema, path, errors);
        break;
      case 'number':
        this.validateNumber(value as number, schema, path, errors);
        break;
      case 'array':
        this.validateArray(value as unknown[], schema, path, errors);
        break;
      case 'object':
        if (typeof value !== 'object') {
          errors.push({ path, message: 'Expected object', type: 'INVALID_TYPE' });
        }
        break;
      case 'date':
        const date = new Date(String(value));
        if (isNaN(date.getTime())) {
          errors.push({ path, message: 'Invalid date format', type: 'INVALID_DATE' });
        }
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
          errors.push({ path, message: 'Invalid email format', type: 'INVALID_EMAIL' });
        }
        break;
      case 'url':
        try {
          new URL(String(value));
        } catch {
          errors.push({ path, message: 'Invalid URL format', type: 'INVALID_URL' });
        }
        break;
      case 'phone':
        if (!/^\+?[1-9]\d{1,14}$/.test(String(value))) {
          errors.push({ path, message: 'Invalid phone format', type: 'INVALID_PHONE' });
        }
        break;
      case 'uuid':
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value))) {
          errors.push({ path, message: 'Invalid UUID format', type: 'INVALID_UUID' });
        }
        break;
    }

    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({ path, message: `Value must be one of: ${schema.enum.join(', ')}`, type: 'INVALID_ENUM' });
    }

    if (schema.custom) {
      const customResult = schema.custom(value);
      if (typeof customResult === 'string') {
        errors.push({ path, message: customResult, type: 'CUSTOM' });
      } else if (!customResult) {
        errors.push({ path, message: 'Custom validation failed', type: 'CUSTOM' });
      }
    }

    return errors;
  }

  private validateString(value: string, schema: SchemaProperty, path: string, errors: SchemaValidationError[]) {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({ path, message: `Minimum length is ${schema.minLength}`, type: 'MIN_LENGTH' });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({ path, message: `Maximum length is ${schema.maxLength}`, type: 'MAX_LENGTH' });
    }
    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        errors.push({ path, message: 'Pattern mismatch', type: 'PATTERN_MISMATCH' });
      }
    }
    if (schema.format) {
      this.validateFormat(value, schema.format, path, errors);
    }
  }

  private validateFormat(value: string, format: string, path: string, errors: SchemaValidationError[]) {
    switch (format) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push({ path, message: 'Invalid email format', type: 'FORMAT' });
        }
        break;
      case 'uri':
      case 'url':
        try {
          new URL(value);
        } catch {
          errors.push({ path, message: 'Invalid URL format', type: 'FORMAT' });
        }
        break;
      case 'date':
        if (isNaN(Date.parse(value))) {
          errors.push({ path, message: 'Invalid date format', type: 'FORMAT' });
        }
        break;
      case 'date-time':
        if (isNaN(Date.parse(value))) {
          errors.push({ path, message: 'Invalid datetime format', type: 'FORMAT' });
        }
        break;
      case 'time':
        if (!/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/.test(value)) {
          errors.push({ path, message: 'Invalid time format', type: 'FORMAT' });
        }
        break;
      case 'ipv4':
        if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
          errors.push({ path, message: 'Invalid IPv4 format', type: 'FORMAT' });
        }
        break;
      case 'ipv6':
        if (!/^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(value)) {
          errors.push({ path, message: 'Invalid IPv6 format', type: 'FORMAT' });
        }
        break;
      case 'hostname':
        if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(value)) {
          errors.push({ path, message: 'Invalid hostname format', type: 'FORMAT' });
        }
        break;
    }
  }

  private validateNumber(value: number, schema: SchemaProperty, path: string, errors: SchemaValidationError[]) {
    if (schema.min !== undefined && value < schema.min) {
      errors.push({ path, message: `Minimum value is ${schema.min}`, type: 'MIN_VALUE' });
    }
    if (schema.max !== undefined && value > schema.max) {
      errors.push({ path, message: `Maximum value is ${schema.max}`, type: 'MAX_VALUE' });
    }
  }

  private validateArray(value: unknown[], schema: SchemaProperty, path: string, errors: SchemaValidationError[]) {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({ path, message: `Minimum ${schema.minLength} items required`, type: 'MIN_ITEMS' });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({ path, message: `Maximum ${schema.maxLength} items allowed`, type: 'MAX_ITEMS' });
    }
    if (schema.items) {
      value.forEach((item, index) => {
        const itemErrors = this.validateProperty(item, schema.items!, `${path}[${index}]`);
        errors.push(...itemErrors);
      });
    }
  }

  createSchemaFromFields(fields: { name: string; type: string; required?: boolean }[]): SchemaDefinition {
    const properties: Record<string, SchemaProperty> = {};
    const required: string[] = [];

    for (const field of fields) {
      const type = this.mapFieldType(field.type);
      properties[field.name] = { type, required: field.required };
      if (field.required) required.push(field.name);
    }

    return { type: 'object', properties, required: required.length > 0 ? required : undefined };
  }

  private mapFieldType(fieldType: string): SchemaType {
    const mapping: Record<string, SchemaType> = {
      text: 'string',
      textarea: 'string',
      email: 'email',
      password: 'string',
      url: 'url',
      phone: 'phone',
      number: 'number',
      integer: 'number',
      float: 'number',
      boolean: 'boolean',
      checkbox: 'boolean',
      date: 'date',
      datetime: 'date',
      select: 'string',
      object: 'object',
      array: 'array',
      json: 'string',
    };
    return mapping[fieldType] || 'string';
  }
}