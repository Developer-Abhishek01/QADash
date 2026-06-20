import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReserveDeviceDto {
  @ApiProperty({ example: 'user-uuid-here', description: 'User ID reserving the device' })
  @IsString()
  userId: string;
}
