import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables before any other imports that might use them
dotenv.config({ path: path.join(__dirname, '../.env') });

import { WorkerOptions } from 'bullmq';
import { logger } from '@qadash/logger';
import { getConfig } from '@qadash/config';
import { TestWorker } from './workers/test.worker';

async function bootstrap() {
  const config = getConfig();

  const workerOptions: WorkerOptions = {
    connection: {
      host: config.REDIS_HOST,
      port: parseInt(config.REDIS_PORT),
      password: config.REDIS_PASSWORD,
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