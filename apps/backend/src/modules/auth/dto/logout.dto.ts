import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional({ example: 'eyJhbGciOiJIUzI1NiIs...', description: 'Refresh token to invalidate' })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
