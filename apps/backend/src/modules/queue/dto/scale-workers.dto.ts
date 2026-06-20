import { IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScaleWorkersDto {
  @ApiProperty({ example: 5, description: 'Number of workers' })
  @IsNumber()
  workers: number;
}
