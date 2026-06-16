import { client } from '../api/client';
import type { ValidationRule, ValidationResult, ValidationConfig, ValidationResponse, SchemaValidation } from './types';

export const validationApi = {
  validate(data: Record<string, unknown>, config: ValidationConfig): Promise<ValidationResponse> {
    return client.post('/validation/validate', { data, config });
  },

  validateForm(data: Record<string, unknown>, schema: SchemaValidation): Promise<ValidationResponse> {
    return client.post('/validation/form', { data, schema });
  },

  validateApiRequest(data: Record<string, unknown>, rules: ValidationRule[]): Promise<ValidationResponse> {
    return client.post('/validation/api', { data, rules });
  },

  validateSchema(data: unknown, schema: Record<string, unknown>): Promise<ValidationResult> {
    return client.post('/validation/schema', { data, schema });
  },

  validateBusinessRules(data: Record<string, unknown>, category?: string): Promise<ValidationResponse> {
    return client.post('/validation/business', { data, category });
  },

  validateDynamicRules(data: Record<string, unknown>, rules: { id: string; field: string; operator: string; value: unknown }[], category: string): Promise<ValidationResponse> {
    return client.post('/validation/dynamic', { data, rules, category });
  },

  getAvailableValidators(): Promise<string[]> {
    return client.get('/validation/validators');
  },

  getBusinessRules(category?: string): Promise<{ name: string; category: string; description: string }[]> {
    return client.get('/validation/business-rules', { params: { category } });
  },

  getDynamicRules(category: string): Promise<Record<string, unknown>[]> {
    return client.get(`/validation/dynamic-rules/${category}`);
  },
};