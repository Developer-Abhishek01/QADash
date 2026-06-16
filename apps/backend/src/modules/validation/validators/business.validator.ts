import { Injectable } from '@nestjs/common';

export interface BusinessRule {
  name: string;
  description: string;
  condition: (data: Record<string, unknown>) => boolean;
  errorMessage: string;
  errorCode: string;
}

export interface ValidationContext {
  userId?: string;
  userRole?: string;
  projectId?: string;
  environment?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class BusinessValidator {
  private rules: Map<string, BusinessRule[]> = new Map();

  registerRule(category: string, rule: BusinessRule) {
    const categoryRules = this.rules.get(category) || [];
    categoryRules.push(rule);
    this.rules.set(category, categoryRules);
  }

  registerRules(category: string, rules: BusinessRule[]) {
    this.rules.set(category, rules);
  }

  validate(data: Record<string, unknown>, context: ValidationContext, categories?: string[]): { valid: boolean; errors: { code: string; message: string }[] } {
    const errors: { code: string; message: string }[] = [];

    const categoriesToCheck = categories || Array.from(this.rules.keys());

    for (const category of categoriesToCheck) {
      const rules = this.rules.get(category) || [];

      for (const rule of rules) {
        try {
          if (!rule.condition(data)) {
            errors.push({
              code: rule.errorCode,
              message: rule.errorMessage,
            });
          }
        } catch (error) {
          errors.push({
            code: 'RULE_ERROR',
            message: `Rule "${rule.name}" failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  validateSingle(data: Record<string, unknown>, context: ValidationContext, ruleName: string): { valid: boolean; error?: { code: string; message: string } } {
    for (const rules of this.rules.values()) {
      const rule = rules.find((r) => r.name === ruleName);
      if (rule) {
        try {
          const result = rule.condition(data);
          return {
            valid: result,
            error: result ? undefined : { code: rule.errorCode, message: rule.errorMessage },
          };
        } catch (error) {
          return {
            valid: false,
            error: { code: 'RULE_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
          };
        }
      }
    }
    return { valid: true };
  }

  getRules(category?: string): { name: string; description: string; category: string }[] {
    const result: { name: string; description: string; category: string }[] = [];

    const entries = category ? [[category, this.rules.get(category) || []]] as const : this.rules.entries();

    for (const [cat, rules] of entries) {
      for (const rule of rules) {
        result.push({ name: rule.name, description: rule.description, category: cat });
      }
    }

    return result;
  }

  createCommonRules() {
    this.registerRules('test', [
      {
        name: 'uniqueTestName',
        description: 'Test name must be unique within the project',
        condition: (data) => {
          return Boolean(data.name && data.projectId);
        },
        errorMessage: 'Test name must be unique within the project',
        errorCode: 'UNIQUE_TEST_NAME',
      },
    ]);

    this.registerRules('execution', [
      {
        name: 'environmentRequired',
        description: 'Execution must have a valid environment',
        condition: (data) => {
          return Boolean(data.environmentId);
        },
        errorMessage: 'A valid environment is required for execution',
        errorCode: 'ENVIRONMENT_REQUIRED',
      },
      {
        name: 'testSelectionRequired',
        description: 'At least one test must be selected for execution',
        condition: (data) => {
          const testIds = data.testIds;
          return Array.isArray(testIds) && testIds.length > 0;
        },
        errorMessage: 'At least one test must be selected',
        errorCode: 'TEST_SELECTION_REQUIRED',
      },
    ]);

    this.registerRules('project', [
      {
        name: 'projectNameRequired',
        description: 'Project name is required',
        condition: (row) => {
          const rowData = row as any;
          return Boolean(rowData.name && String(rowData.name).trim().length > 0);
        },
        errorMessage: 'Project name is required',
        errorCode: 'PROJECT_NAME_REQUIRED',
      },
      {
        name: 'projectNameLength',
        description: 'Project name must be between 3 and 100 characters',
        condition: (data) => {
          const name = data.name as string;
          return name && name.length >= 3 && name.length <= 100;
        },
        errorMessage: 'Project name must be between 3 and 100 characters',
        errorCode: 'PROJECT_NAME_LENGTH',
      },
    ]);

    this.registerRules('environment', [
      {
        name: 'validBaseUrl',
        description: 'Environment must have a valid base URL',
        condition: (data) => {
          try {
            const url = data.baseUrl as string;
            return url && (url.startsWith('http://') || url.startsWith('https://'));
          } catch {
            return false;
          }
        },
        errorMessage: 'Base URL must be a valid HTTP/HTTPS URL',
        errorCode: 'INVALID_BASE_URL',
      },
    ]);

    this.registerRules('user', [
      {
        name: 'validEmail',
        description: 'User must have a valid email address',
        condition: (data) => {
          const email = data.email as string;
          return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        errorMessage: 'A valid email address is required',
        errorCode: 'INVALID_EMAIL',
      },
      {
        name: 'passwordStrength',
        description: 'Password must meet security requirements',
        condition: (data) => {
          const password = data.password as string;
          if (!password) return true;
          const hasUpper = /[A-Z]/.test(password);
          const hasLower = /[a-z]/.test(password);
          const hasNumber = /[0-9]/.test(password);
          const hasSpecial = /[!@#$%^&*]/.test(password);
          return password.length >= 8 && hasUpper && hasLower && hasNumber && hasSpecial;
        },
        errorMessage: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        errorCode: 'WEAK_PASSWORD',
      },
    ]);
  }
}