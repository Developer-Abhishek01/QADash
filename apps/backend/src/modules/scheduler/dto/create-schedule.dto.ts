import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScheduleDto {
  @ApiProperty({ example: 'Nightly Regression', description: 'Schedule name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'project-uuid-here', description: 'Project ID' })
  @IsString()
  projectId: string;

  @ApiProperty({ example: 'execution', description: 'Schedule type' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ example: '0 2 * * *', description: 'Cron schedule expression' })
  @IsString()
  @IsOptional()
  schedule?: string;

  @ApiPropertyOptional({ example: { testIds: ['test-uuid-1'], environmentId: 'env-uuid' }, description: 'Schedule configuration' })
  @IsOptional()
  config?: object;
}
