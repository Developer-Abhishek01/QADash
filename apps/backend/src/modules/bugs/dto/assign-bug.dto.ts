import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignBugDto {
  @ApiProperty({ example: 'user-uuid-here', description: 'Assignee user ID' })
  @IsString()
  assigneeId: string;
}
