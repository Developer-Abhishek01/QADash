import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, UseFormProps, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { validationApi } from './api';
import type { ValidationRule, ValidationResponse, FieldValidation, ValidationError, SchemaValidation } from './types';

export const validationKeys = {
  validators: {
    all: ['validation', 'validators'] as const,
    list: () => [...validationKeys.validators.all, 'list'] as const,
  },
  businessRules: {
    all: ['validation', 'business-rules'] as const,
    list: (category?: string) => [...validationKeys.businessRules.all, 'list', category] as const,
  },
  dynamicRules: {
    all: ['validation', 'dynamic-rules'] as const,
    list: (category: string) => [...validationKeys.dynamicRules.all, 'list', category] as const,
  },
};

export function useAvailableValidators() {
  return useQuery({
    queryKey: validationKeys.validators.list(),
    queryFn: () => validationApi.getAvailableValidators(),
  });
}

export function useBusinessRules(category?: string) {
  return useQuery({
    queryKey: validationKeys.businessRules.list(category),
    queryFn: () => validationApi.getBusinessRules(category),
  });
}

export function useDynamicRules(category: string) {
  return useQuery({
    queryKey: validationKeys.dynamicRules.list(category),
    queryFn: () => validationApi.getDynamicRules(category),
    enabled: !!category,
  });
}

export function useValidateForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, schema }: { data: Record<string, unknown>; schema: SchemaValidation }) =>
      validationApi.validateForm(data, schema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: validationKeys.validators.all });
    },
  });
}

export function useValidateSchema() {
  return useMutation({
    mutationFn: ({ data, schema }: { data: unknown; schema: Record<string, unknown> }) =>
      validationApi.validateSchema(data, schema),
  });
}

export function useValidateBusinessRules() {
  return useMutation({
    mutationFn: ({ data, category }: { data: Record<string, unknown>; category?: string }) =>
      validationApi.validateBusinessRules(data, category),
  });
}

export function useValidateDynamicRules() {
  return useMutation({
    mutationFn: ({
      data,
      rules,
      category,
    }: {
      data: Record<string, unknown>;
      rules: { id: string; field: string; operator: string; value: unknown }[];
      category: string;
    }) => validationApi.validateDynamicRules(data, rules, category),
  });
}

function fieldValidationToZod(field: FieldValidation): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case 'string':
      schema = z.string();
      break;
    case 'number':
      schema = z.number();
      break;
    case 'boolean':
      schema = z.boolean();
      break;
    case 'date':
      schema = z.string().datetime();
      break;
    case 'email':
      schema = z.string().email();
      break;
    case 'url':
      schema = z.string().url();
      break;
    case 'phone':
      schema = z.string().regex(/^[\d\s\-+()]{7,20}$/);
      break;
    case 'uuid':
      schema = z.string().uuid();
      break;
    case 'array':
      schema = z.array(z.unknown());
      break;
    case 'object':
      schema = z.record(z.unknown());
      break;
    default:
      schema = z.unknown();
  }

  if (field.required) {
    if (field.type === 'string') {
      schema = (schema as z.ZodString).min(1);
    } else if (field.type === 'number') {
      schema = schema;
    }
  }

  if (field.minLength !== undefined && field.type === 'string') {
    schema = (schema as z.ZodString).min(field.minLength);
  }
  if (field.maxLength !== undefined && field.type === 'string') {
    schema = (schema as z.ZodString).max(field.maxLength);
  }
  if (field.min !== undefined && field.type === 'number') {
    schema = (schema as z.ZodNumber).min(field.min);
  }
  if (field.max !== undefined && field.type === 'number') {
    schema = (schema as z.ZodNumber).max(field.max);
  }
  if (field.pattern) {
    schema = (schema as z.ZodString).regex(new RegExp(field.pattern));
  }
  if (field.enum && field.type === 'string') {
    schema = z.enum(field.enum as [string, ...string[]]);
  }

  return schema.optional();
}

export function createSchemaFromFields(fields: FieldValidation[]): z.ZodType<Record<string, unknown>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    shape[field.name] = fieldValidationToZod(field);
  }

  return z.object(shape);
}

export interface UseFormValidatorOptions<T extends z.ZodType> {
  schema: T;
  defaultValues?: UseFormProps<z.infer<T>>['defaultValues'];
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'all';
}

export function useFormValidator<T extends z.ZodType>(
  options: UseFormValidatorOptions<T>
): UseFormReturn<z.infer<T>> {
  const { schema, defaultValues, mode = 'onSubmit' } = options;

  return useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues,
    mode,
  });
}

export function transformZodErrors(error: z.ZodError): ValidationError[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
}

export function useClientSideValidation(rules: ValidationRule[]) {
  const validateField = (name: string, value: unknown): string | null => {
    const fieldRules = rules.filter((r) => r.field === name);

    for (const rule of fieldRules) {
      const result = applyValidation(value, rule);
      if (!result.valid) {
        return result.message;
      }
    }

    return null;
  };

  const validateAll = (data: Record<string, unknown>): ValidationResponse => {
    const errors: ValidationError[] = [];

    for (const rule of rules) {
      const value = data[rule.field];
      const result = applyValidation(value, rule);

      if (!result.valid) {
        errors.push({
          field: rule.field,
          message: result.message,
          code: rule.type,
          value,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  return { validateField, validateAll };
}

function applyValidation(value: unknown, rule: ValidationRule): { valid: boolean; message: string } {
  switch (rule.type) {
    case 'required':
      if (value === null || value === undefined || value === '') {
        return { valid: false, message: rule.message || 'This field is required' };
      }
      break;
    case 'email':
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
        return { valid: false, message: rule.message || 'Invalid email format' };
      }
      break;
    case 'min':
      if (typeof value === 'number' && value < Number(rule.options?.min)) {
        return { valid: false, message: rule.message || `Minimum value is ${rule.options?.min}` };
      }
      if (typeof value === 'string' && value.length < Number(rule.options?.min)) {
        return { valid: false, message: rule.message || `Minimum length is ${rule.options?.min}` };
      }
      break;
    case 'max':
      if (typeof value === 'number' && value > Number(rule.options?.max)) {
        return { valid: false, message: rule.message || `Maximum value is ${rule.options?.max}` };
      }
      if (typeof value === 'string' && value.length > Number(rule.options?.max)) {
        return { valid: false, message: rule.message || `Maximum length is ${rule.options?.max}` };
      }
      break;
    case 'pattern':
      if (value && !new RegExp(String(rule.options?.pattern)).test(String(value))) {
        return { valid: false, message: rule.message || 'Pattern mismatch' };
      }
      break;
    case 'url':
      if (value) {
        try {
          new URL(String(value));
        } catch {
          return { valid: false, message: rule.message || 'Invalid URL format' };
        }
      }
      break;
    case 'uuid':
      if (value && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value))) {
        return { valid: false, message: rule.message || 'Invalid UUID format' };
      }
      break;
    case 'enum':
      if (value && rule.options?.values && !String(rule.options.values).split(',').includes(String(value))) {
        return { valid: false, message: rule.message || `Must be one of: ${rule.options.values}` };
      }
      break;
  }

  return { valid: true, message: '' };
}