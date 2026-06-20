import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTestDto {
  @ApiPropertyOptional({ example: 'Login with valid credentials (updated)', description: 'Test case name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description', description: 'Test description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'ACTIVE', description: 'Test status' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Test configuration' })
  @IsOptional()
  config?: object;

  @ApiPropertyOptional({ example: 'const result = await page.title();', description: 'Custom test code' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: 'login.spec.ts', description: 'Playwright spec file' })
  @IsString()
  @IsOptional()
  specFile?: string;

  @ApiPropertyOptional({ example: ['login', 'regression'], description: 'Test tags' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
