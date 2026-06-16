import { Page } from '@playwright/test';
import { Logger } from '../utils/logger';

export class ActionHelper {
  private page: Page;
  private logger: Logger;
  private defaultTimeout = parseInt(process.env.ACTION_TIMEOUT || '10000');

  constructor(page: Page, logger: Logger) {
    this.page = page;
    this.logger = logger;
  }

  async click(selector: string, options?: { force?: boolean; timeout?: number; button?: 'left' | 'right' | 'middle'; modifiers?: ('Alt' | 'Control' | 'Meta' | 'Shift')[]; position?: { x: number; y: number } }): Promise<void> {
    this.logger.info(`Clicking: ${selector}`);
    await this.page.click(selector, { timeout: options?.timeout || this.defaultTimeout, ...options });
  }

  async doubleClick(selector: string, options?: { force?: boolean; timeout?: number }): Promise<void> {
    this.logger.info(`Double clicking: ${selector}`);
    await this.page.dblclick(selector, { timeout: options?.timeout || this.defaultTimeout, ...options });
  }

  async rightClick(selector: string, options?: { force?: boolean; timeout?: number }): Promise<void> {
    this.logger.info(`Right clicking: ${selector}`);
    await this.page.click(selector, { button: 'right', timeout: options?.timeout || this.defaultTimeout, ...options });
  }

  async hover(selector: string, options?: { force?: boolean; timeout?: number; position?: { x: number; y: number } }): Promise<void> {
    this.logger.info(`Hovering: ${selector}`);
    await this.page.hover(selector, { timeout: options?.timeout || this.defaultTimeout, ...options });
  }

  async fill(selector: string, value: string, options?: { force?: boolean; timeout?: number; noWaitAfter?: boolean }): Promise<void> {
    this.logger.info(`Filling: ${selector} with "${value}"`);
    await this.page.fill(selector, value, { timeout: options?.timeout || this.defaultTimeout, ...options });
  }

  async type(selector: string, text: string, options?: { delay?: number; timeout?: number }): Promise<void> {
    this.logger.info(`Typing: ${selector} - "${text}"`);
    await this.page.type(selector, text, { timeout: options?.timeout || this.defaultTimeout, ...options });
  }

  async press(selector: string, key: string, options?: { delay?: number }): Promise<void> {
    this.logger.info(`Pressing ${key} on: ${selector}`);
    await this.page.locator(selector).press(key, options);
  }

  async clear(selector: string): Promise<void> {
    this.logger.info(`Clearing: ${selector}`);
    await this.page.locator(selector).clear();
  }

  async selectOption(selector: string, value: string | string[], options?: { force?: boolean }): Promise<void> {
    this.logger.info(`Selecting option: ${value} in ${selector}`);
    await this.page.selectOption(selector, value, options);
  }

  async check(selector: string, options?: { force?: boolean }): Promise<void> {
    this.logger.info(`Checking: ${selector}`);
    await this.page.check(selector, options);
  }

  async uncheck(selector: string, options?: { force?: boolean }): Promise<void> {
    this.logger.info(`Unchecking: ${selector}`);
    await this.page.uncheck(selector, options);
  }

  async scrollToElement(selector: string): Promise<void> {
    this.logger.info(`Scrolling to: ${selector}`);
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  async dragAndDrop(from: string, to: string): Promise<void> {
    this.logger.info(`Dragging from ${from} to ${to}`);
    await this.page.dragAndDrop(from, to);
  }

  async uploadFile(selector: string, filePath: string): Promise<void> {
    this.logger.info(`Uploading file: ${filePath} to ${selector}`);
    await this.page.setInputFiles(selector, filePath);
  }

  async focus(selector: string): Promise<void> {
    this.logger.info(`Focusing: ${selector}`);
    await this.page.focus(selector);
  }

  async blur(selector: string): Promise<void> {
    this.logger.info(`Blurring: ${selector}`);
    await this.page.locator(selector).blur();
  }

  async getAttribute(selector: string, attribute: string): Promise<string | null> {
    return this.page.locator(selector).getAttribute(attribute);
  }

  async getText(selector: string): Promise<string> {
    return this.page.locator(selector).textContent() as Promise<string>;
  }

  async getValue(selector: string): Promise<string> {
    return this.page.locator(selector).inputValue();
  }

  async getInnerHTML(selector: string): Promise<string> {
    return this.page.locator(selector).innerHTML();
  }

  async isVisible(selector: string): Promise<boolean> {
    return this.page.locator(selector).isVisible();
  }

  async isHidden(selector: string): Promise<boolean> {
    return this.page.locator(selector).isHidden();
  }

  async isEnabled(selector: string): Promise<boolean> {
    return this.page.locator(selector).isEnabled();
  }

  async isDisabled(selector: string): Promise<boolean> {
    return this.page.locator(selector).isDisabled();
  }

  async isChecked(selector: string): Promise<boolean> {
    return this.page.locator(selector).isChecked();
  }

  async getCount(selector: string): Promise<number> {
    return this.page.locator(selector).count();
  }
}