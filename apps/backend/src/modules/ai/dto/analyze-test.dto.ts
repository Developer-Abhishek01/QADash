import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeTestDto {
  @ApiProperty({ example: 'const result = await page.title();', description: 'Test code to analyze' })
  @IsString()
  testCode: string;
}
