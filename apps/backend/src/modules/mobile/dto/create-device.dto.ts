import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MobilePlatform {
  ANDROID = 'android',
  IOS = 'ios',
}

export enum DeviceType {
  EMULATOR = 'emulator',
  REAL = 'real',
}

export class CreateDeviceDto {
  @ApiProperty({ example: 'Pixel 7', description: 'Device name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: MobilePlatform, example: MobilePlatform.ANDROID, description: 'Mobile platform' })
  @IsEnum(MobilePlatform)
  platform: MobilePlatform;

  @ApiProperty({ enum: DeviceType, example: DeviceType.EMULATOR, description: 'Device type' })
  @IsEnum(DeviceType)
  type: DeviceType;

  @ApiProperty({ example: '14.0', description: 'OS version' })
  @IsString()
  osVersion: string;

  @ApiPropertyOptional({ example: 'Google', description: 'Device manufacturer' })
  @IsString()
  @IsOptional()
  manufacturer?: string;

  @ApiPropertyOptional({ example: 'Pixel 7', description: 'Device model' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ example: 'emulator-5554', description: 'Device UDID' })
  @IsString()
  @IsOptional()
  udid?: string;
}
