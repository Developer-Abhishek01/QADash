import { Page, Locator, Response, Request } from '@playwright/test';
import { Logger } from '../utils/logger';

export class WaitHelper {
  private page: Page;
  private defaultTimeout = parseInt(process.env.ACTION_TIMEOUT || '10000');

  constructor(page: Page, _logger: Logger) {
    this.page = page;
  }

  async forElement(selector: string, timeout = this.defaultTimeout): Promise<void> {
    await this.page.waitForSelector(selector, { timeout, state: 'visible' });
  }

  async forElementHidden(selector: string, timeout = this.defaultTimeout): Promise<void> {
    await this.page.waitForSelector(selector, { timeout, state: 'hidden' });
  }

  async forElementState(selector: string | Locator, state: 'visible' | 'hidden' | 'attached' | 'detached', timeout = this.defaultTimeout): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.waitFor({ state, timeout });
  }

  async forContainsText(selector: string, text: string, timeout = this.defaultTimeout): Promise<void> {
    await this.page.waitForSelector(`${selector} >> text="${text}"`, { timeout });
  }

  async forPageLoad(timeout = parseInt(process.env.NAVIGATION_TIMEOUT || '30000')): Promise<void> {
    await this.page.waitForLoadState('load', { timeout });
  }

  async forDOMStable(timeout = 1000): Promise<void> {
    await this.page.waitForFunction(() => document.readyState === 'complete');
    await this.page.waitForTimeout(timeout);
  }

  async forResponse(predicate: (response: Response) => boolean | Promise<boolean>, timeout = this.defaultTimeout): Promise<Response> {
    return this.page.waitForResponse(predicate, { timeout });
  }

  async forRequest(urlPattern: string | RegExp | ((request: Request) => boolean | Promise<boolean>), timeout = this.defaultTimeout): Promise<Request> {
    return this.page.waitForRequest(urlPattern, { timeout });
  }

  async forNetworkIdle(timeout = this.defaultTimeout): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  async forFunction<T>(func: string | (() => T | Promise<T>), arg?: any, timeout = this.defaultTimeout): Promise<any> {
    return this.page.waitForFunction(func, arg, { timeout });
  }

  async forValue(selector: string, value: string, timeout = this.defaultTimeout): Promise<void> {
    await this.page.waitForFunction(
      ([sel, val]) => (document.querySelector(sel as string) as HTMLInputElement)?.value === val,
      [selector, value],
      { timeout }
    );
  }

  async forCount(selector: string, count: number, timeout = this.defaultTimeout): Promise<void> {
    await this.page.waitForFunction(
      ([sel, cnt]) => document.querySelectorAll(sel as string).length === cnt,
      [selector, count],
      { timeout }
    );
  }

  async forURL(urlPattern: string | RegExp, timeout = this.defaultTimeout): Promise<void> {
    await this.page.waitForURL(urlPattern, { timeout });
  }

  async forCondition(condition: () => Promise<boolean>, timeout = this.defaultTimeout, interval = 500): Promise<void> {
    const startTime = Date.now();
    while (!(await condition())) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Condition timeout after ${timeout}ms`);
      }
      await this.page.waitForTimeout(interval);
    }
  }

  dynamic(timeout: number): Promise<void> {
    return this.page.waitForTimeout(timeout);
  }
}