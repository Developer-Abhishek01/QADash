import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'newuser@example.com', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123', description: 'User password (min 8 chars)' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Jane Smith', description: 'Full name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'QA_ENGINEER', description: 'User role' })
  @IsString()
  @IsOptional()
  role?: string;
}
