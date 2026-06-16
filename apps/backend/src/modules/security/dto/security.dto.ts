import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsArray, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ScanTypeDto {
  FULL = 'FULL',
  QUICK = 'QUICK',
  AUTHENTICATION = 'AUTHENTICATION',
  API = 'API',
  DEPENDENCY = 'DEPENDENCY',
  CUSTOM = 'CUSTOM',
}

export enum ScanStatusDto {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  TIMEOUT = 'TIMEOUT',
}

export class CreateScanDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  projectId: string;

  @ApiProperty()
  @IsString()
  environmentId: string;

  @ApiPropertyOptional({ enum: ScanTypeDto })
  @IsOptional()
  @IsEnum(ScanTypeDto)
  scanType?: ScanTypeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  schedule?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isScheduled?: boolean;
}

export class UpdateScanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  schedule?: string;
}

export class ScanFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ enum: ScanStatusDto })
  @IsOptional()
  @IsEnum(ScanStatusDto)
  status?: string;

  @ApiPropertyOptional({ enum: ScanTypeDto })
  @IsOptional()
  @IsEnum(ScanTypeDto)
  scanType?: string;

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

export class VulnerabilityFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scanId?: string;

  @ApiPropertyOptional({ enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] })
  @IsOptional()
  @IsEnum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'])
  severity?: string;

  @ApiPropertyOptional({ enum: ['OPEN', 'CONFIRMED', 'FALSE_POSITIVE', 'ACCEPTED', 'REMEDIATED', 'REOPENED'] })
  @IsOptional()
  @IsEnum(['OPEN', 'CONFIRMED', 'FALSE_POSITIVE', 'ACCEPTED', 'REMEDIATED', 'REOPENED'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  owaspCategory?: string;

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

export class UpdateVulnerabilityDto {
  @ApiProperty({ enum: ['OPEN', 'CONFIRMED', 'FALSE_POSITIVE', 'ACCEPTED', 'REMEDIATED', 'REOPENED'] })
  @IsEnum(['OPEN', 'CONFIRMED', 'FALSE_POSITIVE', 'ACCEPTED', 'REMEDIATED', 'REOPENED'])
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RunDependencyScanDto {
  @ApiProperty()
  @IsString()
  projectId: string;

  @ApiProperty({ enum: ['npm', 'yarn', 'pnpm', 'pip', 'maven', 'gradle', 'nuget'] })
  @IsEnum(['npm', 'yarn', 'pnpm', 'pip', 'maven', 'gradle', 'nuget'])
  packageManager: string;
}

export class GenerateReportDto {
  @ApiProperty()
  @IsString()
  scanId: string;

  @ApiProperty({ enum: ['json', 'html', 'pdf'] })
  @IsEnum(['json', 'html', 'pdf'])
  format: 'json' | 'html' | 'pdf';

  @ApiPropertyOptional({ enum: ['executive', 'developer', 'compliance'] })
  @IsOptional()
  @IsEnum(['executive', 'developer', 'compliance'])
  type?: 'executive' | 'developer' | 'compliance';
}