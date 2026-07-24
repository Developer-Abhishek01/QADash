import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class ScaleServiceDto {
  @ApiProperty({ example: 3, description: 'Number of replicas' })
  @IsNumber()
  replicas: number;
}
