import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomMetricDto {
  @ApiProperty({ example: 'response_time', description: 'Metric name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 250, description: 'Metric value' })
  @IsNumber()
  value: number;

  @ApiPropertyOptional({ example: { endpoint: '/api/login', method: 'POST' }, description: 'Metric labels' })
  @IsOptional()
  labels?: Record<string, string>;
}
