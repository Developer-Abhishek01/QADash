import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsObject, IsArray, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PerformanceTestTypeDto {
  LOAD = 'LOAD',
  STRESS = 'STRESS',
  SPIKE = 'SPIKE',
  SOAK = 'SOAK',
  SMOKE = 'SMOKE',
}

export enum PerformanceTestStatusDto {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class CreatePerformanceTestDto {
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

  @ApiPropertyOptional({ enum: PerformanceTestTypeDto })
  @IsOptional()
  @IsEnum(PerformanceTestTypeDto)
  testType?: PerformanceTestTypeDto;

  @ApiProperty()
  @IsString()
  script: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  thresholds?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isScheduled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  schedule?: string;
}

export class UpdatePerformanceTestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  script?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  thresholds?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  schedule?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isScheduled?: boolean;
}

export class TestFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ enum: PerformanceTestStatusDto })
  @IsOptional()
  @IsEnum(PerformanceTestStatusDto)
  status?: string;

  @ApiPropertyOptional({ enum: PerformanceTestTypeDto })
  @IsOptional()
  @IsEnum(PerformanceTestTypeDto)
  testType?: string;

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

export class RunTestDto {
  @ApiProperty()
  @IsString()
  testId: string;
}

export class CreateAlertDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  testId?: string;

  @ApiProperty()
  @IsString()
  projectId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  metricType: string;

  @ApiProperty()
  @IsString()
  condition: string;

  @ApiProperty()
  @IsNumber()
  threshold: number;

  @ApiProperty({ enum: ['INFO', 'WARNING', 'CRITICAL'] })
  @IsEnum(['INFO', 'WARNING', 'CRITICAL'])
  severity: string;
}

export class UpdateAlertDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  threshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  severity?: string;
}

export class MetricsQueryDto {
  @ApiProperty()
  @IsString()
  testId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metricType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  startTime?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  endTime?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  limit?: number;
}

export class K6ConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  vus?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  iterations?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rps?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rampUpDuration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rampDownDuration?: number;
}