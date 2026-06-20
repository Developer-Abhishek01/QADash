import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEnvironmentDto {
  @ApiProperty({ example: 'Staging', description: 'Environment name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'project-uuid-here', description: 'Project ID' })
  @IsString()
  projectId: string;

  @ApiProperty({ example: 'staging', description: 'Environment type (e.g. dev, staging, production)' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'https://staging.example.com', description: 'Base URL' })
  @IsString()
  baseUrl: string;

  @ApiPropertyOptional({ example: { apiKey: 'test-key', adminEmail: 'admin@test.com' }, description: 'Environment variables' })
  @IsOptional()
  variables?: object;
}
