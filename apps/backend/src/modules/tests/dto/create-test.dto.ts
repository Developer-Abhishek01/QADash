import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTestDto {
  @ApiProperty({ example: 'Login with valid credentials', description: 'Test case name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Verify user can login with valid email and password', description: 'Test description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'project-uuid-here', description: 'Project ID' })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ example: { url: 'https://example.com/login', steps: [{ type: 'navigate', url: 'https://example.com' }] }, description: 'Test configuration (URL, steps, etc.)' })
  @IsOptional()
  config?: object;

  @ApiPropertyOptional({ example: 'const result = await page.title();', description: 'Custom test code' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: 'login.spec.ts', description: 'Playwright spec file name' })
  @IsString()
  @IsOptional()
  specFile?: string;

  @ApiPropertyOptional({ example: ['login', 'smoke'], description: 'Test tags' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ example: 'ACTIVE', description: 'Test status' })
  @IsString()
  @IsOptional()
  status?: string;
}
