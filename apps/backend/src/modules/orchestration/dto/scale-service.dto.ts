import { IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScaleServiceDto {
  @ApiProperty({ example: 3, description: 'Number of replicas' })
  @IsNumber()
  replicas: number;
}
