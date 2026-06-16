import { IsString, IsOptional, IsEnum, IsArray, IsNumber, IsBoolean, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AccessibilityTestStatusDto {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum WcagLevelDto {
  A = 'A',
  AA = 'AA',
  AAA = 'AAA',
}

export class CreateAccessibilityTestDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  projectId: string;

  @ApiProperty()
  @IsString()
  environmentId: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  urls: string[];

  @ApiPropertyOptional({ enum: WcagLevelDto })
  @IsOptional()
  @IsEnum(WcagLevelDto)
  wcagLevel?: WcagLevelDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isScheduled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  schedule?: string;
}

export class UpdateAccessibilityTestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  urls?: string[];

  @ApiPropertyOptional({ enum: WcagLevelDto })
  @IsOptional()
  @IsEnum(WcagLevelDto)
  wcagLevel?: WcagLevelDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class AccessibilityTestFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ enum: AccessibilityTestStatusDto })
  @IsOptional()
  @IsEnum(AccessibilityTestStatusDto)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class IssueFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  testId?: string;

  @ApiPropertyOptional({ enum: ['CRITICAL', 'SERIOUS', 'MODERATE', 'MINOR'] })
  @IsOptional()
  @IsEnum(['CRITICAL', 'SERIOUS', 'MODERATE', 'MINOR'])
  impact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isResolved?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
}

export class ResolveIssueDto {
  @ApiProperty()
  @IsBoolean()
  isResolved: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolutionNote?: string;
}

export class CreateBaselineDto {
  @ApiProperty()
  @IsString()
  projectId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  testId?: string;

  @ApiProperty()
  @IsString()
  name: string;
}