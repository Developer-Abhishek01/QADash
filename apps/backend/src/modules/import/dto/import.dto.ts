import { IsString, IsOptional, IsEnum, IsArray, IsObject, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FileTypeDto {
  EXCEL = 'EXCEL',
  CSV = 'CSV',
  JSON = 'JSON',
  YAML = 'YAML',
}

export enum FileImportStatusDto {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

export class CreateImportDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  projectId: string;

  @ApiProperty({ enum: FileTypeDto })
  @IsEnum(FileTypeDto)
  fileType: FileTypeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class FieldMappingDto {
  @ApiProperty()
  @IsString()
  sourceField: string;

  @ApiProperty()
  @IsString()
  targetField: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fieldType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transformer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  validationRule?: string;
}

export class SaveMappingsDto {
  @ApiProperty()
  @IsString()
  importId: string;

  @ApiProperty({ type: [FieldMappingDto] })
  @IsArray()
  mappings: FieldMappingDto[];
}

export class ProcessImportDto {
  @ApiProperty()
  @IsString()
  importId: string;
}

export class ImportFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ enum: FileImportStatusDto })
  @IsOptional()
  @IsEnum(FileImportStatusDto)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  offset?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class ValidateDataDto {
  @ApiProperty()
  @IsString()
  importId: string;

  @ApiProperty()
  @IsArray()
  data: Record<string, unknown>[];
}

export class TemplateDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  projectId: string;

  @ApiProperty()
  @IsString()
  fileType: string;

  @ApiProperty()
  @IsArray()
  fields: { name: string; type: string; required: boolean }[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  sampleData?: unknown;
}