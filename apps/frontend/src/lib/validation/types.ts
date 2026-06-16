export interface ValidationRule {
  field: string;
  type: string;
  message?: string;
  options?: Record<string, unknown>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface FieldValidation {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url' | 'phone' | 'uuid' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: unknown[];
  custom?: (value: unknown) => boolean | string;
}

export interface SchemaValidation {
  type: string;
  properties: Record<string, FieldValidation>;
  required?: string[];
}

export interface BusinessRule {
  name: string;
  category: string;
  conditions: {
    field: string;
    operator: string;
    value: unknown;
  }[];
  errorMessage: string;
  errorCode: string;
}

export interface DynamicRule {
  id: string;
  field: string;
  operator: string;
  value: unknown;
  enabled: boolean;
}

export interface ValidationContext {
  userId?: string;
  userRole?: string;
  projectId?: string;
  environment?: string;
}

export interface ValidationConfig {
  type: 'form' | 'api' | 'schema' | 'business' | 'dynamic';
  rules: ValidationRule[];
  schema?: SchemaValidation;
  businessRules?: BusinessRule[];
  dynamicRules?: DynamicRule[];
}

export interface ValidationResponse {
  valid: boolean;
  errors: ValidationError[];
  data?: Record<string, unknown>;
}