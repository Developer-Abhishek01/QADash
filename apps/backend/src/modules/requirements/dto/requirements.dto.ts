import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsArray, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class ParseDocumentDto {
  @ApiProperty({ description: 'Raw document text to parse' })
  @IsString()
  document: string;

  @ApiPropertyOptional({ description: 'Optional metadata for the document' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'When true, includes enhanced extraction (business_rules, validation_rules, api_endpoints, permissions, workflows)', default: false })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  enhance?: boolean;
}

export class GenerateTestsDto {
  @IsArray()
  requirements: Array<{
    id: string;
    title: string;
    description: string;
    module: string;
    priority: string;
  }>;

  @IsOptional()
  @IsString()
  framework?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Document ID to load enhanced parsed data (business_rules, validation_rules, api_endpoints, permissions, workflows) for context-aware test generation' })
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiPropertyOptional({ description: 'ID of the user persisting generated test cases (set server-side from JWT)' })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class RequirementAnalysisDto {
  @ApiProperty({ description: 'Document ID' })
  documentId: string;

  @ApiProperty({ description: 'Parsed summary data' })
  summary: Record<string, unknown>;

  @ApiProperty({ description: 'Unique roles identified from requirements and permissions' })
  roles: string[];

  @ApiProperty({ description: 'Unique modules identified from requirements' })
  modules: string[];

  @ApiProperty({ description: 'Functional requirements extracted from the document' })
  functional_requirements: Record<string, unknown>[];

  @ApiProperty({ description: 'Business rules extracted from the document' })
  business_rules: Record<string, unknown>[];

  @ApiProperty({ description: 'Validation rules extracted from the document' })
  validation_rules: Record<string, unknown>[];

  @ApiProperty({ description: 'API endpoints extracted from the document' })
  api_endpoints: Record<string, unknown>[];

  @ApiProperty({ description: 'Permissions extracted from the document' })
  permissions: Record<string, unknown>[];

  @ApiProperty({ description: 'Workflows extracted from the document' })
  workflows: Record<string, unknown>[];
}

export class RequirementsListDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  offset?: number;

  @IsOptional()
  limit?: number;
}
