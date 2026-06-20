import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe', description: 'Full name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png', description: 'Avatar URL' })
  @IsString()
  @IsOptional()
  avatar?: string;
}
