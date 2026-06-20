import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LogoutDto {
  @ApiPropertyOptional({ example: 'eyJhbGciOiJIUzI1NiIs...', description: 'Refresh token to invalidate' })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
