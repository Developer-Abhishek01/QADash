import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBugDto {
  @ApiProperty({ example: 'Login page crashes on invalid input', description: 'Bug title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'When entering special characters in email field, the page crashes with 500 error', description: 'Bug description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'project-uuid-here', description: 'Project ID' })
  @IsString()
  projectId: string;

  @ApiPropertyOptional({ example: 'test-run-uuid-here', description: 'Test run ID' })
  @IsString()
  @IsOptional()
  testRunId?: string;

  @ApiPropertyOptional({ example: 'HIGH', description: 'Bug severity (CRITICAL, HIGH, MEDIUM, LOW)' })
  @IsString()
  @IsOptional()
  severity?: string;

  @ApiPropertyOptional({ example: 'P1', description: 'Bug priority (P1, P2, P3, P4)' })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ example: 'OPEN', description: 'Bug status (OPEN, IN_PROGRESS, RESOLVED, CLOSED, REOPENED)' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: 'user-uuid-here', description: 'Assignee user ID' })
  @IsString()
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional({ example: ['login', 'regression'], description: 'Bug tags' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
