import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AiProcessor } from './processors/ai.processor';
import { ExecutionProcessor } from './processors/execution.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { ReportProcessor } from './processors/report.processor';
import { QueueHealthService } from './queue-health.service';
import { QUEUES } from './queue.constants';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { PrismaService } from '../../common/prisma.service';
import { ExecutionsModule } from '../executions/executions.module';

@Module({
  imports: [
    ConfigModule,
    ExecutionsModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD', ''),
          db: configService.get('REDIS_QUEUE_DB', 1),
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          enableOfflineQueue: true,
        },
        defaultJobOptions: {
          removeOnComplete: { count: 1000, age: 86400 },
          removeOnFail: { count: 500, age: 604800 },
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUES.EXECUTION, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } } },
      { name: QUEUES.REPORT, defaultJobOptions: { attempts: 2, backoff: { type: 'fixed', delay: 5000 } } },
      { name: QUEUES.AI, defaultJobOptions: { attempts: 2, backoff: { type: 'exponential', delay: 5000 } } },
      { name: QUEUES.NOTIFICATION, defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 1000 } } },
      { name: QUEUES.RETRY, defaultJobOptions: { attempts: 1 } },
      { name: QUEUES.DEAD_LETTER, defaultJobOptions: { attempts: 1, removeOnComplete: false } }
    ),
  ],
  controllers: [QueueController],
  providers: [
    QueueService,
    QueueHealthService,
    PrismaService,
    ReportProcessor,
    AiProcessor,
    NotificationProcessor,
    ExecutionProcessor,
  ],
  exports: [QueueService, QueueHealthService],
})
export class QueueModule {}