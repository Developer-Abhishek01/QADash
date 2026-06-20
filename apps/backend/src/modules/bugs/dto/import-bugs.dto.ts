import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImportBugsExcelDto {
  @ApiProperty({ example: 'base64-encoded-excel-content', description: 'Base64 encoded Excel buffer' })
  @IsString()
  buffer: string;

  @ApiProperty({ example: 'project-uuid-here', description: 'Project ID' })
  @IsString()
  projectId: string;
}

export class ImportBugsCsvDto {
  @ApiProperty({ example: 'title,description,severity\nBug 1,desc1,HIGH', description: 'CSV content' })
  @IsString()
  content: string;

  @ApiProperty({ example: 'project-uuid-here', description: 'Project ID' })
  @IsString()
  projectId: string;
}
