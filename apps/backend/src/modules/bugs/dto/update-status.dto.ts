import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBugStatusDto {
  @ApiProperty({ example: 'IN_PROGRESS', description: 'Bug status (OPEN, IN_PROGRESS, RESOLVED, CLOSED, REOPENED)' })
  @IsString()
  status: string;
}
