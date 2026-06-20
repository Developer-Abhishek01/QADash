import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckDuplicateDto {
  @ApiProperty({ example: 'Login page crashes on invalid input', description: 'Bug title to check duplicates against' })
  @IsString()
  title: string;
}
