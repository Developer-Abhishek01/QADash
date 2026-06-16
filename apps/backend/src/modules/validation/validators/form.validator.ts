import { Injectable } from '@nestjs/common';
import { ValidationRule, ValidationResult } from '../validation.service';

export interface FormField {
  name: string;
  type: string;
  label?: string;
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  options?: { value: string; label: string }[];
  customRules?: string[];
}

export interface FormSchema {
  fields: FormField[];
  groups?: { name: string; fields: string[] }[];
}

@Injectable()
export class FormValidator {
  validateForm(data: Record<string, unknown>, schema: FormSchema): ValidationResult {
    const errors: { field: string; message: string; code: string; value: unknown }[] = [];

    for (const field of schema.fields) {
      const value = data[field.name];

      if (field.required && (value === null || value === undefined || value === '')) {
        errors.push({
          field: field.name,
          message: `${field.label || field.name} is required`,
          code: 'REQUIRED',
          value,
        });
        continue;
      }

      if (value === null || value === undefined || value === '') {
        continue;
      }

      switch (field.type) {
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
            errors.push({
              field: field.name,
              message: `${field.label || field.name} must be a valid email`,
              code: 'INVALID_EMAIL',
              value,
            });
          }
          break;

        case 'number':
          if (isNaN(Number(value))) {
            errors.push({
              field: field.name,
              message: `${field.label || field.name} must be a number`,
              code: 'INVALID_NUMBER',
              value,
            });
          } else {
            if (field.min !== undefined && Number(value) < field.min) {
              errors.push({
                field: field.name,
                message: `${field.label || field.name} must be at least ${field.min}`,
                code: 'MIN_VALUE',
                value,
              });
            }
            if (field.max !== undefined && Number(value) > field.max) {
              errors.push({
                field: field.name,
                message: `${field.label || field.name} must be at most ${field.max}`,
                code: 'MAX_VALUE',
                value,
              });
            }
          }
          break;

        case 'string':
          if (field.minLength !== undefined && String(value).length < field.minLength) {
            errors.push({
              field: field.name,
              message: `${field.label || field.name} must be at least ${field.minLength} characters`,
              code: 'MIN_LENGTH',
              value,
            });
          }
          if (field.maxLength !== undefined && String(value).length > field.maxLength) {
            errors.push({
              field: field.name,
              message: `${field.label || field.name} must be at most ${field.maxLength} characters`,
              code: 'MAX_LENGTH',
              value,
            });
          }
          if (field.pattern) {
            const regex = new RegExp(field.pattern);
            if (!regex.test(String(value))) {
              errors.push({
                field: field.name,
                message: `${field.label || field.name} format is invalid`,
                code: 'INVALID_FORMAT',
                value,
              });
            }
          }
          break;

        case 'select':
          if (field.options && !field.options.find((o) => o.value === value)) {
            errors.push({
              field: field.name,
              message: `${field.label || field.name} has an invalid option`,
              code: 'INVALID_OPTION',
              value,
            });
          }
          break;

        case 'checkbox':
          if (typeof value !== 'boolean') {
            errors.push({
              field: field.name,
              message: `${field.label || field.name} must be a boolean`,
              code: 'INVALID_BOOLEAN',
              value,
            });
          }
          break;

        case 'date':
          const date = new Date(String(value));
          if (isNaN(date.getTime())) {
            errors.push({
              field: field.name,
              message: `${field.label || field.name} must be a valid date`,
              code: 'INVALID_DATE',
              value,
            });
          }
          break;

        case 'url':
          try {
            new URL(String(value));
          } catch {
            errors.push({
              field: field.name,
              message: `${field.label || field.name} must be a valid URL`,
              code: 'INVALID_URL',
              value,
            });
          }
          break;

        case 'phone':
          if (!/^[\d\s\-+()]{7,20}$/.test(String(value))) {
            errors.push({
              field: field.name,
              message: `${field.label || field.name} must be a valid phone number`,
              code: 'INVALID_PHONE',
              value,
            });
          }
          break;
      }

      if (field.customRules) {
        for (const rule of field.customRules) {
          const ruleResult = this.applyCustomRule(value, rule);
          if (!ruleResult.valid) {
            errors.push({
              field: field.name,
              message: ruleResult.message,
              code: rule,
              value,
            });
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private applyCustomRule(value: unknown, rule: string): { valid: boolean; message: string } {
    const parts = rule.split(':');
    const ruleName = parts[0];
    const ruleParam = parts[1];

    switch (ruleName) {
      case 'strongPassword':
        const hasUpper = /[A-Z]/.test(String(value));
        const hasLower = /[a-z]/.test(String(value));
        const hasNumber = /[0-9]/.test(String(value));
        const hasSpecial = /[!@#$%^&*]/.test(String(value));
        if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
          return { valid: false, message: 'Password must contain uppercase, lowercase, number, and special character' };
        }
        return { valid: true, message: '' };

      case 'unique':
        return { valid: true, message: 'Unique check requires database lookup' };

      case 'exists':
        return { valid: true, message: 'Exists check requires database lookup' };

      case 'confirmed':
        return { valid: true, message: 'Confirmation check requires comparison' };

      case 'different':
        return { valid: true, message: 'Different check requires comparison field' };

      case 'same':
        return { valid: true, message: 'Same check requires comparison field' };

      case 'regex':
        if (ruleParam) {
          const regex = new RegExp(ruleParam);
          return regex.test(String(value))
            ? { valid: true, message: '' }
            : { valid: false, message: 'Value does not match required pattern' };
        }
        return { valid: true, message: '' };

      case 'startsWith':
        if (ruleParam && !String(value).startsWith(ruleParam)) {
          return { valid: false, message: `Must start with ${ruleParam}` };
        }
        return { valid: true, message: '' };

      case 'endsWith':
        if (ruleParam && !String(value).endsWith(ruleParam)) {
          return { valid: false, message: `Must end with ${ruleParam}` };
        }
        return { valid: true, message: '' };

      case 'contains':
        if (ruleParam && !String(value).includes(ruleParam)) {
          return { valid: false, message: `Must contain ${ruleParam}` };
        }
        return { valid: true, message: '' };

      case 'urlSecure':
        if (String(value).startsWith('http://')) {
          return { valid: false, message: 'URL must use HTTPS' };
        }
        return { valid: true, message: '' };

      case 'file':
        return { valid: true, message: 'File validation requires file handler' };

      case 'image':
        return { valid: true, message: 'Image validation requires file handler' };

      default:
        return { valid: true, message: '' };
    }
  }

  getFieldTypes(): { type: string; label: string; validation: string }[] {
    return [
      { type: 'text', label: 'Text', validation: 'string' },
      { type: 'email', label: 'Email', validation: 'email' },
      { type: 'password', label: 'Password', validation: 'strongPassword' },
      { type: 'number', label: 'Number', validation: 'number' },
      { type: 'tel', label: 'Phone', validation: 'phone' },
      { type: 'url', label: 'URL', validation: 'url' },
      { type: 'date', label: 'Date', validation: 'date' },
      { type: 'datetime', label: 'DateTime', validation: 'date' },
      { type: 'select', label: 'Select', validation: 'options' },
      { type: 'multiselect', label: 'Multi Select', validation: 'array' },
      { type: 'checkbox', label: 'Checkbox', validation: 'boolean' },
      { type: 'radio', label: 'Radio', validation: 'options' },
      { type: 'textarea', label: 'Text Area', validation: 'string' },
      { type: 'file', label: 'File', validation: 'file' },
      { type: 'image', label: 'Image', validation: 'image' },
      { type: 'color', label: 'Color', validation: 'hexColor' },
      { type: 'range', label: 'Range', validation: 'number' },
    ];
  }
}