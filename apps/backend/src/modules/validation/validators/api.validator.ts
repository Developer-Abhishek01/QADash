import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';

export interface ApiValidationRule {
  param: string;
  type: 'param' | 'query' | 'body' | 'header';
  validators: string[];
  options?: Record<string, unknown>;
  required?: boolean;
}

export interface RequestParams {
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

@Injectable()
export class ApiValidator {
  validateRequest(request: RequestParams, rules: ApiValidationRule[]): { errors: string[]; valid: boolean } {
    const errors: string[] = [];

    for (const rule of rules) {
      let value: unknown;

      switch (rule.type) {
        case 'param':
          value = request.params?.[rule.param];
          break;
        case 'query':
          value = request.query?.[rule.param];
          break;
        case 'body':
          value = request.body?.[rule.param];
          break;
        case 'header':
          value = request.headers?.[rule.param.toLowerCase()];
          break;
      }

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rule.param} is required`);
        continue;
      }

      if (value === undefined || value === null || value === '') {
        continue;
      }

      for (const validator of rule.validators) {
        const result = this.applyValidator(value, validator, rule.options);
        if (!result.valid) {
          errors.push(`${rule.param}: ${result.message}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private applyValidator(value: unknown, validator: string, options?: Record<string, unknown>): { valid: boolean; message: string } {
    const parts = validator.split(':');
    const type = parts[0];
    const param = parts[1];

    switch (type) {
      case 'uuid':
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value))) {
          return { valid: false, message: 'must be a valid UUID' };
        }
        break;

      case 'string':
        if (typeof value !== 'string') {
          return { valid: false, message: 'must be a string' };
        }
        if (param === 'min' && String(value).length < Number(options?.minLength || 1)) {
          return { valid: false, message: `must be at least ${options?.minLength} characters` };
        }
        if (param === 'max' && String(value).length > Number(options?.maxLength || 1000)) {
          return { valid: false, message: `must be at most ${options?.maxLength} characters` };
        }
        break;

      case 'number':
        if (isNaN(Number(value))) {
          return { valid: false, message: 'must be a number' };
        }
        if (param === 'min' && Number(value) < Number(options?.min || 0)) {
          return { valid: false, message: `must be at least ${options?.min}` };
        }
        if (param === 'max' && Number(value) > Number(options?.max || 999999999)) {
          return { valid: false, message: `must be at most ${options?.max}` };
        }
        if (param === 'integer' && !Number.isInteger(Number(value))) {
          return { valid: false, message: 'must be an integer' };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean' && !['true', 'false', '0', '1'].includes(String(value).toLowerCase())) {
          return { valid: false, message: 'must be a boolean' };
        }
        break;

      case 'date':
        const date = new Date(String(value));
        if (isNaN(date.getTime())) {
          return { valid: false, message: 'must be a valid date' };
        }
        break;

      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
          return { valid: false, message: 'must be a valid email' };
        }
        break;

      case 'url':
        try {
          new URL(String(value));
        } catch {
          return { valid: false, message: 'must be a valid URL' };
        }
        break;

      case 'enum':
        if (param && !param.split(',').includes(String(value))) {
          return { valid: false, message: `must be one of: ${param}` };
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return { valid: false, message: 'must be an array' };
        }
        const valArray = value as any[];
        if (param === 'min' && valArray.length < Number(options?.minItems || 1)) {
          return { valid: false, message: `must have at least ${options?.minItems} items` };
        }
        if (param === 'max' && valArray.length > Number(options?.maxItems || 100)) {
          return { valid: false, message: `must have at most ${options?.maxItems} items` };
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          return { valid: false, message: 'must be an object' };
        }
        break;

      case 'alphanum':
        if (!/^[a-zA-Z0-9]+$/.test(String(value))) {
          return { valid: false, message: 'must be alphanumeric' };
        }
        break;

      case 'ip':
        const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipPattern.test(String(value))) {
          return { valid: false, message: 'must be a valid IP address' };
        }
        break;

      case 'json':
        try {
          JSON.parse(String(value));
        } catch {
          return { valid: false, message: 'must be valid JSON' };
        }
        break;
    }

    return { valid: true, message: '' };
  }

  throwOnError(errors: string[]): void {
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors,
      });
    }
  }

  createValidationException(errors: string[]): BadRequestException {
    return new BadRequestException({
      statusCode: 400,
      message: 'Validation failed',
      errors: errors.map((e) => ({ message: e })),
    });
  }

  createNotFoundException(resource: string, id: string): NotFoundException {
    return new NotFoundException({
      statusCode: 404,
      message: `${resource} not found`,
      error: 'Not Found',
    });
  }

  createUnauthorizedException(message = 'Unauthorized'): UnauthorizedException {
    return new UnauthorizedException({
      statusCode: 401,
      message,
      error: 'Unauthorized',
    });
  }

  createForbiddenException(message = 'Forbidden'): ForbiddenException {
    return new ForbiddenException({
      statusCode: 403,
      message,
      error: 'Forbidden',
    });
  }

  getCommonRules(): ApiValidationRule[] {
    return [
      { param: 'id', type: 'param', validators: ['uuid'], required: true },
      { param: 'page', type: 'query', validators: ['number:min'], options: { min: 1 } },
      { param: 'limit', type: 'query', validators: ['number:min'], options: { min: 1, max: 100 } },
      { param: 'sortBy', type: 'query', validators: ['string'] },
      { param: 'order', type: 'query', validators: ['enum'], options: { values: 'asc,desc' } },
      { param: 'search', type: 'query', validators: ['string:min'], options: { minLength: 1 } },
    ];
  }
}