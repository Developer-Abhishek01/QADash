import { Page, Locator, expect } from '@playwright/test';
import { Logger } from '../utils/logger';
import { LoginPageLocators } from '../locators/common.locators';

export class AssertHelper {
  private page: Page;
  private logger: Logger;
  private defaultTimeout = parseInt(process.env.EXPECT_TIMEOUT || '5000');

  constructor(page: Page, logger: Logger) {
    this.page = page;
    this.logger = logger;
  }

  async equals(actual: string, expected: string, message?: string): Promise<void> {
    this.logger.info(`Assert equals: "${actual}" === "${expected}"`);
    expect(actual, message).toBe(expected);
  }

  async notEquals(actual: string, expected: string, message?: string): Promise<void> {
    expect(actual, message).not.toBe(expected);
  }

  async contains(actual: string, expected: string, message?: string): Promise<void> {
    this.logger.info(`Assert contains: "${actual}" includes "${expected}"`);
    expect(actual, message).toContain(expected);
  }

  async notContains(actual: string, expected: string, message?: string): Promise<void> {
    expect(actual, message).not.toContain(expected);
  }

  async true(condition: boolean, message?: string): Promise<void> {
    this.logger.info(`Assert true: ${condition}`);
    expect(condition, message).toBe(true);
  }

  async false(condition: boolean, message?: string): Promise<void> {
    expect(condition, message).toBe(false);
  }

  async defined(value: unknown, message?: string): Promise<void> {
    expect(value, message).toBeDefined();
  }

  async notDefined(value: unknown, message?: string): Promise<void> {
    expect(value, message).toBeUndefined();
  }

  async null(value: unknown, message?: string): Promise<void> {
    expect(value, message).toBeNull();
  }

  async notNull(value: unknown, message?: string): Promise<void> {
    expect(value, message).not.toBeNull();
  }

  async greaterThan(actual: number, expected: number, message?: string): Promise<void> {
    expect(actual, message).toBeGreaterThan(expected);
  }

  async lessThan(actual: number, expected: number, message?: string): Promise<void> {
    expect(actual, message).toBeLessThan(expected);
  }

  async greaterOrEqual(actual: number, expected: number, message?: string): Promise<void> {
    expect(actual, message).toBeGreaterThanOrEqual(expected);
  }

  async lessOrEqual(actual: number, expected: number, message?: string): Promise<void> {
    expect(actual, message).toBeLessThanOrEqual(expected);
  }

  async between(value: number, min: number, max: number, message?: string): Promise<void> {
    expect(value, message).toBeGreaterThanOrEqual(min);
    expect(value, message).toBeLessThanOrEqual(max);
  }

  async arrayLength(array: unknown[], length: number, message?: string): Promise<void> {
    expect(array, message).toHaveLength(length);
  }

  async arrayContains(array: unknown[], item: unknown, message?: string): Promise<void> {
    expect(array, message).toContain(item);
  }

  async objectContains(obj: Record<string, unknown>, key: string, message?: string): Promise<void> {
    expect(obj, message).toHaveProperty(key);
  }

  async urlContains(text: string, message?: string): Promise<void> {
    const url = this.page.url();
    this.logger.info(`Assert URL contains: "${text}"`);
    expect(url, message).toContain(text);
  }

  async urlEquals(expected: string, message?: string): Promise<void> {
    const url = this.page.url();
    this.logger.info(`Assert URL equals: "${url}" === "${expected}"`);
    expect(url, message).toBe(expected);
  }

  async titleEquals(expected: string, message?: string): Promise<void> {
    const title = await this.page.title();
    this.logger.info(`Assert title: "${title}" === "${expected}"`);
    expect(title, message).toBe(expected);
  }

  async titleContains(expected: string, message?: string): Promise<void> {
    const title = await this.page.title();
    this.logger.info(`Assert title contains: "${title}" includes "${expected}"`);
    expect(title, message).toContain(expected);
  }

  async visible(locator: string | Locator, timeout = this.defaultTimeout): Promise<void> {
    const loc = typeof locator === 'string' ? this.page.locator(locator) : locator;
    this.logger.info(`Assert visible: ${typeof locator === 'string' ? locator : 'locator'}`);
    await expect(loc).toBeVisible({ timeout });
  }

  async hidden(locator: string | Locator, timeout = this.defaultTimeout): Promise<void> {
    const loc = typeof locator === 'string' ? this.page.locator(locator) : locator;
    this.logger.info(`Assert hidden: ${typeof locator === 'string' ? locator : 'locator'}`);
    await expect(loc).toBeHidden({ timeout });
  }

  async enabled(selector: string, timeout = this.defaultTimeout): Promise<void> {
    this.logger.info(`Assert enabled: ${selector}`);
    await expect(this.page.locator(selector)).toBeEnabled({ timeout });
  }

  async disabled(selector: string, timeout = this.defaultTimeout): Promise<void> {
    this.logger.info(`Assert disabled: ${selector}`);
    await expect(this.page.locator(selector)).toBeDisabled({ timeout });
  }

  async checked(selector: string, timeout = this.defaultTimeout): Promise<void> {
    this.logger.info(`Assert checked: ${selector}`);
    await expect(this.page.locator(selector)).toBeChecked({ timeout });
  }

  async unchecked(selector: string, timeout = this.defaultTimeout): Promise<void> {
    this.logger.info(`Assert unchecked: ${selector}`);
    await expect(this.page.locator(selector)).not.toBeChecked({ timeout });
  }

  async textEquals(selector: string, expected: string, timeout = this.defaultTimeout): Promise<void> {
    this.logger.info(`Assert text equals: ${selector} === "${expected}"`);
    await expect(this.page.locator(selector)).toHaveText(expected, { timeout });
  }

  async textContains(selector: string, expected: string, timeout = this.defaultTimeout): Promise<void> {
    this.logger.info(`Assert text contains: ${selector} includes "${expected}"`);
    await expect(this.page.locator(selector)).toContainText(expected, { timeout });
  }

  async valueEquals(selector: string, expected: string, timeout = this.defaultTimeout): Promise<void> {
    this.logger.info(`Assert value equals: ${selector} === "${expected}"`);
    await expect(this.page.locator(selector)).toHaveValue(expected, { timeout });
  }

  async countEquals(selector: string, expected: number, timeout = this.defaultTimeout): Promise<void> {
    this.logger.info(`Assert count: ${selector} === ${expected}`);
    await expect(this.page.locator(selector)).toHaveCount(expected, { timeout });
  }

  async attribute(selector: string, attribute: string, expected: string | RegExp, timeout = this.defaultTimeout): Promise<void> {
    this.logger.info(`Assert attribute: ${selector}[${attribute}] = "${expected}"`);
    await expect(this.page.locator(selector)).toHaveAttribute(attribute, expected, { timeout });
  }

  async classContains(selector: string, className: string, timeout = this.defaultTimeout): Promise<void> {
    this.logger.info(`Assert class contains: ${selector} has "${className}"`);
    await expect(this.page.locator(selector)).toHaveClass(new RegExp(className), { timeout });
  }

  async errorVisible(timeout = this.defaultTimeout): Promise<void> {
    this.logger.info('Assert login error visible');
    await expect(this.page.locator(LoginPageLocators.errorMessage)).toBeVisible({ timeout });
  }

  async formErrorVisible(timeout = this.defaultTimeout): Promise<void> {
    this.logger.info('Assert form validation error visible');
    await expect(this.page.locator(LoginPageLocators.formError)).toBeVisible({ timeout });
  }
}
