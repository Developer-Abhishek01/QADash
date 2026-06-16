export class FallbackLocatorGenerator {
  private locatorPatterns = [
    { pattern: /id="([^"]+)"/, generators: [(m: RegExpMatchArray) => `[data-testid="${m[1]}"]`, (m: RegExpMatchArray) => `[data-cy="${m[1]}"]`, (m: RegExpMatchArray) => `//*[@id="${m[1]}"]`] },
    { pattern: /text="([^"]+)"/, generators: [(m: RegExpMatchArray) => `text=${m[1]}`, (m: RegExpMatchArray) => `//*[contains(text(), "${m[1]}")]`, (m: RegExpMatchArray) => `//button[contains(text(), "${m[1]}")]`] },
    { pattern: /class="([^"]+)"/, generators: [(m: RegExpMatchArray) => `.${m[1].split(' ')[0]}`, (m: RegExpMatchArray) => `[class*="${m[1].split(' ')[0]}"]`] },
  ];

  async generateFallback(failedLocator: string): Promise<string> {
    for (const { pattern, generators } of this.locatorPatterns) {
      const match = failedLocator.match(pattern);
      if (match) {
        for (const generator of generators) {
          try {
            const result = generator(match);
            if (result !== failedLocator) return result;
          } catch { continue; }
        }
      }
    }
    return failedLocator;
  }

  async findSimilarLocator(original: string): Promise<string> {
    const base = this.extractBase(original);
    if (!base) return original;

    const variants = [
      `[data-testid="${base}"]`,
      `[data-cy="${base}"]`,
      `[data-test="${base}"]`,
      `#${base}`,
      `text=${base}`,
      `//*[contains(@*, "${base}")]`,
    ];

    return variants[0];
  }

  private extractBase(locator: string): string | null {
    const patterns = [/id="([^"]+)"/, /text="([^"]+)"/, /data-testid="([^"]+)"/, /data-cy="([^"]+)"/];
    for (const pattern of patterns) {
      const match = locator.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  async generateRelativeLocator(original: string): Promise<string> {
    const parts = original.split('/').filter(Boolean);
    if (parts.length > 2) {
      const lastPart = parts[parts.length - 1];
      if (lastPart.includes('@')) {
        const attr = lastPart.match(/@(\w+)/)?.[1];
        if (attr) {
          return `//${parts[parts.length - 2]}//*[@${attr}]`;
        }
      }
      return `//*[contains(@class, "${lastPart.slice(0, 10)}")]`;
    }
    return `//*[contains(text(), "${original.slice(0, 20)}")]`;
  }

  async generateJSLocator(original: string): Promise<string> {
    const base = this.extractBase(original);
    if (base) {
      return `document.querySelector('[data-testid="${base}"]') || document.querySelector('[data-cy="${base}"]') || document.querySelector('button')`;
    }
    return original;
  }

  generateAllFallbacks(locator: string): string[] {
    const fallbacks: string[] = [];
    const base = this.extractBase(locator);

    if (base) {
      fallbacks.push(`[data-testid="${base}"]`);
      fallbacks.push(`[data-cy="${base}"]`);
      fallbacks.push(`[data-test="${base}"]`);
      fallbacks.push(`#${base}`);
      fallbacks.push(`text=${base}`);
      fallbacks.push(`//*[contains(@data-testid, "${base}")]`);
      fallbacks.push(`//*[contains(@*, "${base}")]`);
    }

    return fallbacks;
  }
}