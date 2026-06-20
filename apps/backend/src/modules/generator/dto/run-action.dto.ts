import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RunActionDto {
  @ApiProperty({ example: 'deploy', description: 'Action to perform' })
  @IsString()
  action: string;

  @ApiProperty({ example: { env: 'staging', branch: 'main' }, description: 'Action data payload' })
  data: any;
}
