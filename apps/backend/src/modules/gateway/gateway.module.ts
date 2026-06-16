import { Module, forwardRef } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { OrchestrationModule } from '../orchestration/orchestration.module';

@Module({
  imports: [forwardRef(() => OrchestrationModule)],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class GatewayModule {}