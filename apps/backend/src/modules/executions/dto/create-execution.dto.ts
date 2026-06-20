import { IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExecutionDto {
  @ApiProperty({ example: 'Regression Suite - June 2026', description: 'Execution name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'project-uuid-here', description: 'Project ID' })
  @IsString()
  projectId: string;

  @ApiProperty({ example: ['test-uuid-1', 'test-uuid-2'], description: 'Array of test case IDs to execute' })
  @IsArray()
  @IsString({ each: true })
  testIds: string[];
}
