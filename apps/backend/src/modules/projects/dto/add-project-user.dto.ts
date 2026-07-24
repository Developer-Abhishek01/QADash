import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class AddProjectUserDto {
  @ApiProperty({ example: 'user-uuid-here', description: 'User ID to add' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ example: 'VIEWER', description: 'User role in project' })
  @IsString()
  @IsOptional()
  role?: string;
}
