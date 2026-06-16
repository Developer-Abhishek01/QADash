import { Injectable } from '@nestjs/common';

interface ValidationError {
  field: string;
  value: unknown;
  type: string;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  data: Record<string, unknown>;
}

@Injectable()
export class ValidationService {
  async validateBatch(
    data: Record<string, unknown>[],
    mappings: { sourceField: string; targetField: string; isRequired?: boolean; validationRule?: string; fieldType?: string }[],
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const row of data) {
      const errors: ValidationError[] = [];

      for (const mapping of mappings) {
        const value = row[mapping.sourceField];
        const fieldErrors = this.validateField(
          mapping.sourceField,
          value,
          mapping.fieldType || 'string',
          mapping.isRequired || false,
          mapping.validationRule,
        );
        errors.push(...fieldErrors);
      }

      results.push({
        isValid: errors.length === 0,
        errors,
        data: row,
      });
    }

    return results;
  }

  private validateField(
    fieldName: string,
    value: unknown,
    fieldType: string,
    isRequired: boolean,
    validationRule?: string,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (isRequired && (value === null || value === undefined || value === '')) {
      errors.push({
        field: fieldName,
        value,
        type: 'REQUIRED',
        message: `${fieldName} is required`,
      });
      return errors;
    }

    if (value === null || value === undefined || value === '') {
      return errors;
    }

    switch (fieldType) {
      case 'email':
        if (!this.isValidEmail(String(value))) {
          errors.push({
            field: fieldName,
            value,
            type: 'INVALID_EMAIL',
            message: `${fieldName} must be a valid email address`,
          });
        }
        break;

      case 'url':
        if (!this.isValidUrl(String(value))) {
          errors.push({
            field: fieldName,
            value,
            type: 'INVALID_URL',
            message: `${fieldName} must be a valid URL`,
          });
        }
        break;

      case 'phone':
        if (!this.isValidPhone(String(value))) {
          errors.push({
            field: fieldName,
            value,
            type: 'INVALID_PHONE',
            message: `${fieldName} must be a valid phone number`,
          });
        }
        break;

      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          errors.push({
            field: fieldName,
            value,
            type: 'INVALID_NUMBER',
            message: `${fieldName} must be a valid number`,
          });
        }
        break;

      case 'date':
        if (!this.isValidDate(String(value))) {
          errors.push({
            field: fieldName,
            value,
            type: 'INVALID_DATE',
            message: `${fieldName} must be a valid date`,
          });
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean' && !['true', 'false', '0', '1'].includes(String(value).toLowerCase())) {
          errors.push({
            field: fieldName,
            value,
            type: 'INVALID_BOOLEAN',
            message: `${fieldName} must be a boolean value`,
          });
        }
        break;

      case 'string':
        if (typeof value === 'string' && validationRule) {
          const ruleErrors = this.applyValidationRule(fieldName, value, validationRule);
          errors.push(...ruleErrors);
        }
        break;
    }

    return errors;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\d\s\-+()]{7,20}$/;
    return phoneRegex.test(phone);
  }

  private isValidDate(date: string): boolean {
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime());
  }

  private applyValidationRule(fieldName: string, value: string, rule: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const rules = rule.split(',').map((r) => r.trim());

    for (const r of rules) {
      if (r.startsWith('min:')) {
        const min = parseInt(r.substring(4));
        if (value.length < min) {
          errors.push({
            field: fieldName,
            value,
            type: 'MIN_LENGTH',
            message: `${fieldName} must be at least ${min} characters`,
          });
        }
      }

      if (r.startsWith('max:')) {
        const max = parseInt(r.substring(4));
        if (value.length > max) {
          errors.push({
            field: fieldName,
            value,
            type: 'MAX_LENGTH',
            message: `${fieldName} must be at most ${max} characters`,
          });
        }
      }

      if (r.startsWith('pattern:')) {
        const pattern = r.substring(8);
        try {
          const regex = new RegExp(pattern);
          if (!regex.test(value)) {
            errors.push({
              field: fieldName,
              value,
              type: 'PATTERN',
              message: `${fieldName} does not match the required pattern`,
            });
          }
        } catch {}
      }

      if (r === 'alphanumeric') {
        if (!/^[a-zA-Z0-9]+$/.test(value)) {
          errors.push({
            field: fieldName,
            value,
            type: 'ALPHANUMERIC',
            message: `${fieldName} must contain only letters and numbers`,
          });
        }
      }

      if (r === 'numeric') {
        if (!/^\d+$/.test(value)) {
          errors.push({
            field: fieldName,
            value,
            type: 'NUMERIC',
            message: `${fieldName} must contain only numbers`,
          });
        }
      }

      if (r === 'lowercase') {
        if (value !== value.toLowerCase()) {
          errors.push({
            field: fieldName,
            value,
            type: 'LOWERCASE',
            message: `${fieldName} must be lowercase`,
          });
        }
      }

      if (r === 'uppercase') {
        if (value !== value.toUpperCase()) {
          errors.push({
            field: fieldName,
            value,
            type: 'UPPERCASE',
            message: `${fieldName} must be uppercase`,
          });
        }
      }
    }

    return errors;
  }

  validateSingleRecord(record: Record<string, unknown>, schema: Record<string, { type: string; required: boolean }>): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [field, config] of Object.entries(schema)) {
      const value = record[field];
      const fieldErrors = this.validateField(field, value, config.type, config.required);
      errors.push(...fieldErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: record,
    };
  }

  getValidationRules(): string[] {
    return [
      'required',
      'email',
      'url',
      'phone',
      'number',
      'date',
      'boolean',
      'min:N',
      'max:N',
      'pattern:regex',
      'alphanumeric',
      'numeric',
      'lowercase',
      'uppercase',
    ];
  }
}