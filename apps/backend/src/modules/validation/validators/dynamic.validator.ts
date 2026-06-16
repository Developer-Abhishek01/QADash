import { Injectable } from '@nestjs/common';

export interface DynamicRule {
  id: string;
  name: string;
  field: string;
  operator: string;
  value: unknown;
  logicalOperator?: 'and' | 'or';
  enabled: boolean;
  priority?: number;
}

export interface ValidationCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn' | 'matches' | 'between' | 'exists' | 'notExists';
  value: unknown;
  logicalGroup?: 'and' | 'or';
}

export interface DynamicValidationRule {
  id: string;
  name: string;
  conditions: ValidationCondition[];
  errorMessage: string;
  errorCode: string;
  priority?: number;
  enabled?: boolean;
}

@Injectable()
export class DynamicValidator {
  private rules: Map<string, DynamicValidationRule[]> = new Map();

  registerRule(category: string, rule: DynamicValidationRule) {
    const categoryRules = this.rules.get(category) || [];
    categoryRules.push(rule);
    this.rules.set(category, categoryRules);
  }

  addRule(category: string, rule: DynamicValidationRule) {
    this.registerRule(category, rule);
  }

  updateRule(category: string, ruleId: string, updates: Partial<DynamicValidationRule>) {
    const rules = this.rules.get(category) || [];
    const index = rules.findIndex((r) => r.id === ruleId);
    if (index !== -1) {
      rules[index] = { ...rules[index], ...updates };
      this.rules.set(category, rules);
    }
  }

  removeRule(category: string, ruleId: string) {
    const rules = this.rules.get(category) || [];
    const filtered = rules.filter((r) => r.id !== ruleId);
    this.rules.set(category, filtered);
  }

  validate(data: Record<string, unknown>, category: string): { valid: boolean; errors: { code: string; message: string; ruleId: string }[] } {
    const errors: { code: string; message: string; ruleId: string }[] = [];
    const rules = this.rules.get(category) || [];

    const sortedRules = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const rule of sortedRules) {
      if (rule.enabled === false) continue;

      const result = this.evaluateRule(rule, data);
      if (!result) {
        errors.push({ code: rule.errorCode, message: rule.errorMessage, ruleId: rule.id });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private evaluateRule(rule: DynamicValidationRule, data: Record<string, unknown>): boolean {
    if (rule.conditions.length === 0) return true;

    const results: boolean[] = [];

    for (const condition of rule.conditions) {
      const result = this.evaluateCondition(condition, data);
      results.push(result);
    }

    const groups: boolean[][] = [];
    let currentGroup: boolean[] = [];

    for (let i = 0; i < results.length; i++) {
      const condition = rule.conditions[i];
      currentGroup.push(results[i]);

      if (i === rule.conditions.length - 1 || condition.logicalGroup === 'or') {
        groups.push(currentGroup);
        currentGroup = [];
      }
    }

    return groups.every((group) => group.every((r) => r));
  }

  private evaluateCondition(condition: ValidationCondition, data: Record<string, unknown>): boolean {
    const fieldValue = this.getNestedValue(data, condition.field);

    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;
      case 'ne':
        return fieldValue !== condition.value;
      case 'gt':
        return Number(fieldValue) > Number(condition.value);
      case 'gte':
        return Number(fieldValue) >= Number(condition.value);
      case 'lt':
        return Number(fieldValue) < Number(condition.value);
      case 'lte':
        return Number(fieldValue) <= Number(condition.value);
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'startsWith':
        return String(fieldValue).startsWith(String(condition.value));
      case 'endsWith':
        return String(fieldValue).endsWith(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'notIn':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case 'matches':
        return new RegExp(String(condition.value)).test(String(fieldValue));
      case 'between':
        if (Array.isArray(condition.value) && condition.value.length === 2) {
          const num = Number(fieldValue);
          return num >= Number(condition.value[0]) && num <= Number(condition.value[1]);
        }
        return false;
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'notExists':
        return fieldValue === undefined || fieldValue === null;
      default:
        return true;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[key];
    }

    return current;
  }

  createRuleFromConfig(config: {
    category: string;
    field: string;
    operator: string;
    value: unknown;
    errorMessage: string;
    errorCode: string;
  }): DynamicValidationRule {
    return {
      id: `${config.category}_${Date.now()}`,
      name: `Dynamic Rule for ${config.field}`,
      conditions: [{ field: config.field, operator: config.operator as ValidationCondition['operator'], value: config.value }],
      errorMessage: config.errorMessage,
      errorCode: config.errorCode,
      priority: 0,
      enabled: true,
    };
  }

  getRules(category?: string): Record<string, DynamicValidationRule[]> {
    if (category) {
      return { [category]: this.rules.get(category) || [] };
    }
    return Object.fromEntries(this.rules);
  }

  enableRule(category: string, ruleId: string) {
    this.updateRule(category, ruleId, { enabled: true });
  }

  disableRule(category: string, ruleId: string) {
    this.updateRule(category, ruleId, { enabled: false });
  }

  clearRules(category?: string) {
    if (category) {
      this.rules.delete(category);
    } else {
      this.rules.clear();
    }
  }
}