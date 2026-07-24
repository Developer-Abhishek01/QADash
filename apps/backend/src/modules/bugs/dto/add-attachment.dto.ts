import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AddAttachmentDto {
  @ApiProperty({ example: 'screenshot', description: 'Attachment type (screenshot, video, log)' })
  @IsString()
  type: string;

  @ApiProperty({ example: '/uploads/screenshots/fail-123.png', description: 'File URL' })
  @IsString()
  url: string;
}
