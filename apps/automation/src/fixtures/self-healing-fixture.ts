import { test as base, Page } from '@playwright/test';
import { LocatorHealer, type HealingResult } from '../self-healing';

interface SelfHealingOptions {
  enabled: boolean;
  maxRetries: number;
  autoHeal: boolean;
}

export const createSelfHealingTest = base.extend<{ healLocator: (locator: string) => Promise<HealingResult> }>({
  healLocator: async ({ page }: { page: Page }, use: (fn: (locator: string) => Promise<HealingResult>) => void) => {
    const healer = new LocatorHealer(page);
    await use(async (locator: string) => {
      return healer.heal(locator);
    });
  },
});

export async function withSelfHealing<T>(
  page: Page,
  action: (page: Page) => Promise<T>,
  options: SelfHealingOptions = { enabled: true, maxRetries: 3, autoHeal: true }
): Promise<{ result: T | null; healing: HealingResult | null; error: Error | null }> {
  const healer = new LocatorHealer(page);

  try {
    const result = await action(page);
    return { result, healing: null, error: null };
  } catch (error) {
    if (!options.enabled || !(error instanceof Error)) {
      return { result: null, healing: null, error: error as Error };
    }

    const locatorMatch = error.message.match(/locator.*:.*(["']([^"']+)["'])/);
    if (!locatorMatch) {
      return { result: null, healing: null, error: error as Error };
    }

    const failedLocator = locatorMatch[2] || locatorMatch[1];
    const healing = await healer.heal(failedLocator);

    if (healing.success && options.autoHeal) {
      try {
        const retryResult = await action(page);
        return { result: retryResult, healing, error: null };
      } catch (retryError) {
        return { result: null, healing, error: retryError as Error };
      }
    }

    return { result: null, healing, error: error as Error };
  }
}

export class SelfHealingPage {
  private healer: LocatorHealer;

  constructor(page: Page) {
    this.healer = new LocatorHealer(page);
  }

  async click(selector: string, options?: { retry?: boolean }): Promise<void> {
    try {
      await this.healer.page.click(selector);
    } catch (error) {
      if (options?.retry) {
        const healing = await this.healer.heal(selector);
        if (healing.success && healing.healedLocator) {
          await this.healer.page.click(healing.healedLocator);
          return;
        }
      }
      throw error;
    }
  }

  async fill(selector: string, value: string): Promise<void> {
    try {
      await this.healer.page.fill(selector, value);
    } catch (error) {
      const healing = await this.healer.heal(selector);
      if (healing.success && healing.healedLocator) {
        await this.healer.page.fill(healing.healedLocator, value);
        return;
      }
      throw error;
    }
  }

  async getByText(text: string, options?: { exact?: boolean }) {
    return this.healer.page.getByText(text, options);
  }

  async getByRole(role: any, options?: { name?: string | RegExp; exact?: boolean }) {
    return this.healer.page.getByRole(role, options);
  }
}