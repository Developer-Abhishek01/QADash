import { chromium } from '@playwright/test';
import { Logger } from '../utils/logger';

const logger = new Logger('GlobalTeardown');

export default async function globalTeardown() {
  logger.info('Starting global teardown...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  try {
    const sessionDir = process.env.SESSION_DIR;
    if (sessionDir) {
      logger.info(`Cleaning up session dir: ${sessionDir}`);
    }
  } catch (error) {
    logger.error(`Teardown error: ${error}`);
  } finally {
    await context.close();
    await browser.close();
  }

  logger.info('Global teardown completed');
}
