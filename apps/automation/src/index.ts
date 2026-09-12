import path from 'path';

import { getConfig } from '@qadash/config';
import { logger } from '@qadash/logger';
import { WorkerOptions } from 'bullmq';
import * as dotenv from 'dotenv';

// Load environment variables before starting the application
dotenv.config({ path: path.join(__dirname, '../.env') });

import { TestWorker } from './workers/test.worker';

async function bootstrap() {
  const config = getConfig();

  const workerOptions: WorkerOptions = {
    connection: {
      host: config.REDIS_HOST,
      port: parseInt(config.REDIS_PORT),
      password: config.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_QUEUE_DB || process.env.REDIS_DB || '1'),
    },
  };

  const testWorker = new TestWorker(workerOptions);

  testWorker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed`);
  });

  testWorker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed: ${err.message}`);
  });

  logger.info('Automation engine started');
}

bootstrap().catch((err) => {
  logger.error('Failed to start automation engine', err);
  process.exit(1);
});