import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Standard Test Import', description: 'Template name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'project-uuid-here', description: 'Project ID' })
  @IsString()
  projectId: string;

  @ApiProperty({ example: 'csv', description: 'File type (csv, excel)' })
  @IsString()
  fileType: string;

  @ApiProperty({ example: [{ name: 'Test Case ID', type: 'string' }, { name: 'Steps', type: 'string' }], description: 'Template fields' })
  fields: unknown[];
}
