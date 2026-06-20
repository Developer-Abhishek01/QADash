import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateTestsDto {
  @ApiProperty({ example: 'Create login tests for email and password fields', description: 'Test description' })
  @IsString()
  description: string;
}
