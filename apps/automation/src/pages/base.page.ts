import { Page, Locator, FrameLocator } from '@playwright/test';
import { WaitHelper } from '../helpers/wait.helper';
import { ActionHelper } from '../helpers/action.helper';
import { AssertHelper } from '../helpers/assert.helper';
import { Logger } from '../utils/logger';

export abstract class BasePage {
  public page: Page;
  protected logger: Logger;

  public wait: WaitHelper;
  public action: ActionHelper;
  public assert: AssertHelper;

  constructor(page: Page) {
    this.page = page;
    this.logger = new Logger(this.constructor.name);
    this.wait = new WaitHelper(page, this.logger);
    this.action = new ActionHelper(page, this.logger);
    this.assert = new AssertHelper(page, this.logger);
  }

  abstract get name(): string;

  async goto(path: string = '/'): Promise<void> {
    this.logger.info(`Navigating to: ${path}`);
    await this.page.goto(path, { waitUntil: 'load' });
    await this.wait.forPageLoad();
  }

  async waitForPageReady(): Promise<void> {
    await this.wait.forPageLoad();
    await this.wait.forElementState(this.page.locator('body'), 'visible');
  }

  getLocator(selector: string): Locator {
    return this.page.locator(selector);
  }

  async frame(frameSelector: string): Promise<FrameLocator> {
    return this.page.frameLocator(frameSelector);
  }

  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: 'load' });
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  async getUrl(): Promise<string> {
    return this.page.url();
  }

  async screenshot(name: string, fullPage = true): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const path = `test-results/screenshots/${name}-${timestamp}.png`;
    await this.page.screenshot({ path, fullPage });
    return path;
  }

  async waitForNavigation(callback: () => Promise<void>): Promise<void> {
    await Promise.all([
      this.page.waitForNavigation(),
      callback(),
    ]);
  }
}