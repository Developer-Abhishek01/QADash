import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiProperty({ example: 'project-uuid-here', description: 'Project ID' })
  @IsString()
  projectId: string;

  @ApiProperty({ example: 'TEST_SUMMARY', description: 'Report type' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'Login Tests - June 2026', description: 'Report name' })
  @IsString()
  name: string;

  @ApiProperty({ example: { totalTests: 10, passed: 8, failed: 2 }, description: 'Report summary' })
  @IsOptional()
  summary: object;

  @ApiPropertyOptional({ description: 'Report data payload' })
  @IsOptional()
  data?: object;
}
