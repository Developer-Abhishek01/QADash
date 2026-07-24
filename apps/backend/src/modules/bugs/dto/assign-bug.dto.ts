import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AssignBugDto {
  @ApiProperty({ example: 'user-uuid-here', description: 'Assignee user ID' })
  @IsString()
  assigneeId: string;
}
