import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class ScaleWorkersDto {
  @ApiProperty({ example: 5, description: 'Number of workers' })
  @IsNumber()
  workers: number;
}
