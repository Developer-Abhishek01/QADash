import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString } from 'class-validator';

export class ExecuteOptionsDto {
  @ApiPropertyOptional({ example: true, description: 'Run tests' })
  @IsBoolean()
  @IsOptional()
  tests?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Run security scan' })
  @IsBoolean()
  @IsOptional()
  security?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Run performance tests' })
  @IsBoolean()
  @IsOptional()
  performance?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Run accessibility tests' })
  @IsBoolean()
  @IsOptional()
  accessibility?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Run AI analysis' })
  @IsBoolean()
  @IsOptional()
  aiAnalysis?: boolean;

  @ApiPropertyOptional({ example: 'high', description: 'Priority (critical, high, medium, low)' })
  @IsString()
  @IsOptional()
  priority?: string;
}
