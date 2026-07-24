import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ReserveDeviceDto {
  @ApiProperty({ example: 'user-uuid-here', description: 'User ID reserving the device' })
  @IsString()
  userId: string;
}
