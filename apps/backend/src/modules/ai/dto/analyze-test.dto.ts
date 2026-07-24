import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AnalyzeTestDto {
  @ApiProperty({ example: 'const result = await page.title();', description: 'Test code to analyze' })
  @IsString()
  testCode: string;
}
