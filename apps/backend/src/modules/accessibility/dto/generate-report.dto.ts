import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum } from 'class-validator';

export enum ReportFormat {
  JSON = 'json',
  HTML = 'html',
  PDF = 'pdf',
}

export class GenerateReportDto {
  @ApiProperty({ example: 'test-uuid-here', description: 'Test ID' })
  @IsString()
  testId: string;

  @ApiProperty({ enum: ReportFormat, example: ReportFormat.HTML, description: 'Report format' })
  @IsEnum(ReportFormat)
  format: ReportFormat;
}
