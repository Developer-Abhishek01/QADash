import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateBugStatusDto {
  @ApiProperty({ example: 'IN_PROGRESS', description: 'Bug status (OPEN, IN_PROGRESS, RESOLVED, CLOSED, REOPENED)' })
  @IsString()
  status: string;
}
