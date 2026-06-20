import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBugDto {
  @ApiPropertyOptional({ example: 'Login page crashes on invalid input (updated)', description: 'Bug title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated bug description', description: 'Bug description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'CRITICAL', description: 'Bug severity (CRITICAL, HIGH, MEDIUM, LOW)' })
  @IsString()
  @IsOptional()
  severity?: string;

  @ApiPropertyOptional({ example: 'P1', description: 'Bug priority (P1, P2, P3, P4)' })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ example: 'IN_PROGRESS', description: 'Bug status (OPEN, IN_PROGRESS, RESOLVED, CLOSED, REOPENED)' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: 'user-uuid-here', description: 'Assignee user ID' })
  @IsString()
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional({ example: ['login', 'critical'], description: 'Bug tags' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
