import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'My E-Commerce App', description: 'Project name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'End-to-end testing for e-commerce platform', description: 'Project description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: { timezone: 'UTC', defaultBrowser: 'chromium' }, description: 'Project settings' })
  @IsOptional()
  settings?: object;
}
