import { Injectable, Logger } from '@nestjs/common';

export interface ValidationRule {
  field: string;
  rules: ValidationRuleConfig[];
}

export interface ValidationRuleConfig {
  type: string;
  value?: unknown;
  message?: string;
  options?: Record<string, unknown>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  data?: Record<string, unknown>;
}

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);
  private validators: Map<string, (value: unknown, options?: Record<string, unknown>) => boolean>;

  constructor() {
    this.validators = new Map();
    this.registerBuiltInValidators();
  }

  private registerBuiltInValidators() {
    this.validators.set('required', (value) => value !== null && value !== undefined && value !== '');
    this.validators.set('email', (value) => {
      if (!value) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
    });
    this.validators.set('url', (value) => {
      if (!value) return true;
      try {
        new URL(String(value));
        return true;
      } catch {
        return false;
      }
    });
    this.validators.set('phone', (value) => {
      if (!value) return true;
      return /^[\d\s\-+()]{7,20}$/.test(String(value));
    });
    this.validators.set('number', (value) => {
      if (!value) return true;
      return !isNaN(Number(value));
    });
    this.validators.set('integer', (value) => {
      if (!value) return true;
      return Number.isInteger(Number(value));
    });
    this.validators.set('boolean', (value) => {
      if (!value) return true;
      return typeof value === 'boolean' || ['true', 'false', '0', '1'].includes(String(value).toLowerCase());
    });
    this.validators.set('date', (value) => {
      if (!value) return true;
      const date = new Date(String(value));
      return !isNaN(date.getTime());
    });
    this.validators.set('min', (value, options) => {
      if (value === null || value === undefined) return true;
      const min = Number(options?.min);
      if (typeof value === 'number') return value >= min;
      if (typeof value === 'string') return value.length >= min;
      if (Array.isArray(value)) return value.length >= min;
      return true;
    });
    this.validators.set('max', (value, options) => {
      if (value === null || value === undefined) return true;
      const max = Number(options?.max);
      if (typeof value === 'number') return value <= max;
      if (typeof value === 'string') return value.length <= max;
      if (Array.isArray(value)) return value.length <= max;
      return true;
    });
    this.validators.set('minLength', (value, options) => {
      if (!value) return true;
      return String(value).length >= Number(options?.minLength || 0);
    });
    this.validators.set('maxLength', (value, options) => {
      if (!value) return true;
      return String(value).length <= Number(options?.maxLength || Infinity);
    });
    this.validators.set('pattern', (value, options) => {
      if (!value) return true;
      const regex = new RegExp(String(options?.pattern));
      return regex.test(String(value));
    });
    this.validators.set('alphanumeric', (value) => {
      if (!value) return true;
      return /^[a-zA-Z0-9]+$/.test(String(value));
    });
    this.validators.set('alpha', (value) => {
      if (!value) return true;
      return /^[a-zA-Z]+$/.test(String(value));
    });
    this.validators.set('numeric', (value) => {
      if (!value) return true;
      return /^\d+$/.test(String(value));
    });
    this.validators.set('lowercase', (value) => {
      if (!value) return true;
      return String(value) === String(value).toLowerCase();
    });
    this.validators.set('uppercase', (value) => {
      if (!value) return true;
      return String(value) === String(value).toUpperCase();
    });
    this.validators.set('json', (value) => {
      if (!value) return true;
      try {
        JSON.parse(String(value));
        return true;
      } catch {
        return false;
      }
    });
    this.validators.set('uuid', (value) => {
      if (!value) return true;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value));
    });
    this.validators.set('ip', (value) => {
      if (!value) return true;
      const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      return ipPattern.test(String(value));
    });
    this.validators.set('creditCard', (value) => {
      if (!value) return true;
      return /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/.test(String(value));
    });
    this.validators.set('hexColor', (value) => {
      if (!value) return true;
      return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(String(value));
    });
  }

  registerValidator(name: string, fn: (value: unknown, options?: Record<string, unknown>) => boolean) {
    this.validators.set(name, fn);
  }

  validate(data: Record<string, unknown>, rules: ValidationRule[]): ValidationResult {
    const errors: ValidationError[] = [];

    for (const rule of rules) {
      const value = data[rule.field];

      for (const ruleConfig of rule.rules) {
        const validator = this.validators.get(ruleConfig.type);

        if (!validator) {
          this.logger.warn(`Unknown validator type: ${ruleConfig.type}`);
          continue;
        }

        const isValid = validator(value, ruleConfig.options);

        if (!isValid) {
          errors.push({
            field: rule.field,
            message: ruleConfig.message || `Validation failed for ${rule.field}`,
            code: ruleConfig.type,
            value,
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  validateField(value: unknown, type: string, options?: Record<string, unknown>): boolean {
    const validator = this.validators.get(type);
    if (!validator) return true;
    return validator(value, options);
  }

  getAvailableValidators(): string[] {
    return Array.from(this.validators.keys());
  }
}