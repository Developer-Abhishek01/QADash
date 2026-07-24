import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SuggestFixesDto {
  @ApiProperty({ example: 'Error: Cannot read property of undefined\n    at LoginPage.login', description: 'Error stack trace' })
  @IsString()
  errorStack: string;
}
