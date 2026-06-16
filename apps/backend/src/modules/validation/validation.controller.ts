import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ValidationService, ValidationRule, ValidationResult } from './validation.service';
import { FormValidator, FormSchema } from './validators/form.validator';
import { ApiValidator, ApiValidationRule } from './validators/api.validator';
import { SchemaValidator, SchemaDefinition } from './validators/schema.validator';
import { BusinessValidator, ValidationContext } from './validators/business.validator';
import { DynamicValidator } from './validators/dynamic.validator';

interface ValidateDto {
  data: Record<string, unknown>;
  rules: ValidationRule[];
}

interface ValidateFormDto {
  data: Record<string, unknown>;
  schema: FormSchema;
}

interface ValidateApiDto {
  data: Record<string, unknown>;
  rules: ApiValidationRule[];
}

interface ValidateSchemaDto {
  data: unknown;
  schema: SchemaDefinition;
}

interface ValidateBusinessDto {
  data: Record<string, unknown>;
  category?: string;
}

interface ValidateDynamicDto {
  data: Record<string, unknown>;
  rules: { id: string; field: string; operator: string; value: unknown }[];
  category: string;
}

@Controller('validation')
export class ValidationController {
  constructor(
    private readonly validationService: ValidationService,
    private readonly formValidator: FormValidator,
    private readonly apiValidator: ApiValidator,
    private readonly schemaValidator: SchemaValidator,
    private readonly businessValidator: BusinessValidator,
    private readonly dynamicValidator: DynamicValidator,
  ) {
    this.businessValidator.createCommonRules();
  }

  @Post('validate')
  validate(@Body() dto: ValidateDto): ValidationResult {
    return this.validationService.validate(dto.data, dto.rules);
  }

  @Post('form')
  validateForm(@Body() dto: ValidateFormDto) {
    return this.formValidator.validateForm(dto.data, dto.schema);
  }

  @Post('api')
  validateApi(@Body() dto: ValidateApiDto) {
    const { params, query, body, headers } = dto.data as {
      params?: Record<string, string>;
      query?: Record<string, unknown>;
      body?: Record<string, unknown>;
      headers?: Record<string, string>;
    };
    return this.apiValidator.validateRequest({ params, query, body, headers }, dto.rules);
  }

  @Post('schema')
  validateSchema(@Body() dto: ValidateSchemaDto) {
    return this.schemaValidator.validate(dto.data, dto.schema);
  }

  @Post('business')
  validateBusiness(@Body() dto: ValidateBusinessDto) {
    const context: ValidationContext = {
      timestamp: new Date(),
    };
    return this.businessValidator.validate(dto.data, context, dto.category ? [dto.category] : undefined);
  }

  @Post('dynamic')
  validateDynamic(@Body() dto: ValidateDynamicDto) {
    const rules = dto.rules.map((r) => ({
      id: r.id,
      name: `Rule ${r.id}`,
      field: r.field,
      operator: r.operator,
      value: r.value,
      enabled: true,
    }));
    return this.dynamicValidator.validate(dto.data, dto.category);
  }

  @Get('validators')
  getValidators() {
    return this.validationService.getAvailableValidators();
  }

  @Get('business-rules')
  getBusinessRules(@Query('category') category?: string) {
    return this.businessValidator.getRules(category);
  }

  @Get('dynamic-rules/:category')
  getDynamicRules(@Param('category') category: string) {
    return this.dynamicValidator.getRules(category);
  }
}