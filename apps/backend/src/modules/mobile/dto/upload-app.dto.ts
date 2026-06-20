import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadAppDto {
  @ApiProperty({ example: 'project-uuid-here', description: 'Project ID' })
  @IsString()
  projectId: string;

  @ApiProperty({ example: 'app-release.apk', description: 'File name' })
  @IsString()
  fileName: string;
}
