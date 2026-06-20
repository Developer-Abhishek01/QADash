import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateScheduleDto {
  @ApiPropertyOptional({ example: 'Nightly Regression v2', description: 'Schedule name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: '0 4 * * *', description: 'Cron schedule expression' })
  @IsString()
  @IsOptional()
  schedule?: string;

  @ApiPropertyOptional({ description: 'Schedule configuration' })
  @IsOptional()
  config?: object;

  @ApiPropertyOptional({ example: 'ACTIVE', description: 'Schedule status' })
  @IsString()
  @IsOptional()
  status?: string;
}
