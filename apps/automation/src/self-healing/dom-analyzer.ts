import { Page } from '@playwright/test';

export class DOMAnalyzer {
  constructor(private page: Page) {}

  async analyzeAndSuggestLocator(failedLocator: string): Promise<string> {
    const locatorType = this.detectLocatorType(failedLocator);
    const suggestions = await this.getSuggestions(locatorType, failedLocator);
    return suggestions[0] || failedLocator;
  }

  private detectLocatorType(locator: string): string {
    if (locator.startsWith('//') || locator.startsWith('/')) return 'xpath';
    if (locator.startsWith('#')) return 'id';
    if (locator.startsWith('[')) return 'css';
    if (locator.includes('text=')) return 'text';
    return 'unknown';
  }

  private async getSuggestions(locatorType: string, locator: string): Promise<string[]> {
    const suggestions: string[] = [];

    if (locatorType === 'xpath') {
      const text = this.extractTextFromXPath(locator);
      if (text) {
        suggestions.push(`text=${text}`);
        suggestions.push(`//button[contains(text(), '${text}')]`);
        suggestions.push(`//*[contains(text(), '${text}')]`);
      }
      const className = this.extractClassFromXPath(locator);
      if (className) {
        suggestions.push(`[class*="${className}"]`);
      }
    }

    if (locatorType === 'css') {
      const id = locator.match(/#([^.\s]+)/)?.[1];
      if (id) {
        suggestions.push(`[data-testid="${id}"]`);
      }
      const classes = locator.match(/\.([^#\s]+)/g);
      if (classes) {
        suggestions.push(classes.map(c => c.replace('.', '')).map(c => `[class*="${c}"]`).join(','));
      }
    }

    return suggestions;
  }

  private extractTextFromXPath(xpath: string): string | null {
    const match = xpath.match(/text\(\s*['"]([^'"]+)['"]\s*\)/);
    return match ? match[1] : null;
  }

  private extractClassFromXPath(xpath: string): string | null {
    const match = xpath.match(/@class\s*=\s*['"]([^'"]+)['"]/);
    return match ? match[1] : null;
  }

  async diagnoseFailure(failure: { locator: string; error: string }): Promise<string> {
    const domState = await this.page.evaluate(() => {
      return {
        hasIframes: document.querySelectorAll('iframe').length > 0,
        hasShadowDOM: !!document.querySelector('*:defined'),
        bodyClasses: document.body.className,
        dynamicElements: Array.from(document.querySelectorAll('[id*="__"]')).length,
      };
    });

    if (failure.error.toLowerCase().includes('not found')) {
      if (domState.dynamicElements > 5) return 'dynamic_id';
      if (domState.hasShadowDOM) return 'shadow_dom';
      return 'element_removed';
    }

    if (failure.error.toLowerCase().includes('stale')) return 'stale_element';

    return 'unknown';
  }

  async getElementAttributes(selector: string): Promise<Record<string, string>> {
    return this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return {};
      const attrs: Record<string, string> = {};
      for (const attr of Array.from(el.attributes)) {
        attrs[attr.name] = attr.value;
      }
      return attrs;
    }, selector);
  }

  async findSimilarElements(selector: string): Promise<string[]> {
    return this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return [];
      const tag = el.tagName.toLowerCase();
      const text = el.textContent?.trim().substring(0, 50);
      const similar = Array.from(document.querySelectorAll(tag))
        .filter(e => e.textContent?.trim().substring(0, 50) === text)
        .map(e => e.getAttribute('data-testid') || e.id || tag);
      return similar.slice(0, 5);
    }, selector);
  }
}