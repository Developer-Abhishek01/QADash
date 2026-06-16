import { chromium } from '@playwright/test';
import { Logger } from '../utils/logger';

const logger = new Logger('GlobalSetup');

export default async function globalSetup() {
  logger.info('Starting global setup...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();

  try {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    logger.info(`Checking if ${baseUrl} is accessible...`);

    const response = await page.goto(baseUrl, { timeout: 10000 }).catch(() => null);

    if (response) {
      logger.info(`Base URL is accessible, status: ${response.status()}`);
    } else {
      logger.warn('Base URL not accessible, will use webServer');
    }
  } catch (error) {
    logger.warn(`Could not reach base URL: ${error}`);
  } finally {
    await context.close();
    await browser.close();
  }

  logger.info('Global setup completed');
}
