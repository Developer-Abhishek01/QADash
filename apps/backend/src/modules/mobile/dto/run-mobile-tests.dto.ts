import { IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RunMobileTestsDto {
  @ApiProperty({ example: 'project-uuid-here', description: 'Project ID' })
  @IsString()
  projectId: string;

  @ApiProperty({ example: 'suite-uuid-here', description: 'Test suite ID' })
  @IsString()
  testSuiteId: string;

  @ApiProperty({ example: ['device-uuid-1', 'device-uuid-2'], description: 'Device IDs' })
  @IsArray()
  @IsString({ each: true })
  deviceIds: string[];

  @ApiProperty({ example: 'android', description: 'Platform' })
  @IsString()
  platform: string;

  @ApiPropertyOptional({ example: '/path/to/app.apk', description: 'App file path' })
  @IsString()
  @IsOptional()
  appPath?: string;

  @ApiPropertyOptional({ example: 'com.example.app', description: 'Android app package' })
  @IsString()
  @IsOptional()
  appPackage?: string;

  @ApiPropertyOptional({ example: '.MainActivity', description: 'Android app activity' })
  @IsString()
  @IsOptional()
  appActivity?: string;

  @ApiPropertyOptional({ example: 'com.example.app', description: 'iOS bundle ID' })
  @IsString()
  @IsOptional()
  bundleId?: string;

  @ApiPropertyOptional({ example: { locale: 'en_US' }, description: 'Additional capabilities' })
  @IsOptional()
  capabilities?: Record<string, any>;
}
