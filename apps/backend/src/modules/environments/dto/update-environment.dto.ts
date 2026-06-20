import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEnvironmentDto {
  @ApiPropertyOptional({ example: 'Production', description: 'Environment name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'production', description: 'Environment type' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ example: 'https://prod.example.com', description: 'Base URL' })
  @IsString()
  @IsOptional()
  baseUrl?: string;

  @ApiPropertyOptional({ description: 'Environment variables' })
  @IsOptional()
  variables?: object;

  @ApiPropertyOptional({ example: true, description: 'Set as active environment' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
