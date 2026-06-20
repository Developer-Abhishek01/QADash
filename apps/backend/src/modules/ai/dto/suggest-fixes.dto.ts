import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SuggestFixesDto {
  @ApiProperty({ example: 'Error: Cannot read property of undefined\n    at LoginPage.login', description: 'Error stack trace' })
  @IsString()
  errorStack: string;
}
