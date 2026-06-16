import { Page } from '@playwright/test';

export interface HealingResult {
  success: boolean;
  originalLocator: string;
  healedLocator?: string;
  strategy: HealingStrategy;
  confidence: number;
  attempts: number;
  duration: number;
  error?: string;
}

export type HealingStrategy =
  | 'retry_original'
  | 'fallback_locator'
  | 'similarity_match'
  | 'dom_analysis'
  | 'ai_generated'
  | 'relative_locator'
  | 'javascript_evaluation';

export interface LocatorAttempt {
  locator: string;
  strategy: HealingStrategy;
  timestamp: number;
  success: boolean;
  error?: string;
  confidence: number;
}

export class LocatorHealer {
  private maxRetries: number = 3;
  private retryDelay: number = 500;

  constructor(public page: Page) {}

  async heal(originalLocator: string, _options: HealOptions = {}): Promise<HealingResult> {
    const startTime = Date.now();
    const attempts: LocatorAttempt[] = [];

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const strategies = this.getStrategyOrder(attempt);

      for (const strategy of strategies) {
        const attemptResult = await this.tryLocator(originalLocator, strategy, attempts.length);
        attempts.push(attemptResult);

        if (attemptResult.success) {
          const duration = Date.now() - startTime;
          return {
            success: true,
            originalLocator,
            healedLocator: attemptResult.locator,
            strategy,
            confidence: attemptResult.confidence,
            attempts: attempts.length,
            duration,
          };
        }

        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * (attempt + 1));
        }
      }
    }

    const duration = Date.now() - startTime;
    return {
      success: false,
      originalLocator,
      strategy: 'retry_original',
      confidence: 0,
      attempts: attempts.length,
      duration,
      error: 'All healing strategies failed',
    };
  }

  private getStrategyOrder(attempt: number): HealingStrategy[] {
    if (attempt === 0) return ['retry_original'];
    return ['fallback_locator', 'similarity_match', 'dom_analysis', 'ai_generated', 'relative_locator', 'javascript_evaluation'];
  }

  private async tryLocator(originalLocator: string, strategy: HealingStrategy, _attemptNumber: number): Promise<LocatorAttempt> {
    const timestamp = Date.now();
    let locator = originalLocator;

    try {
      switch (strategy) {
        case 'fallback_locator':
          locator = this.generateFallback(originalLocator);
          break;
        case 'dom_analysis':
          locator = await this.analyzeDOM(originalLocator);
          break;
        case 'relative_locator':
          locator = this.generateRelative(originalLocator);
          break;
        case 'javascript_evaluation':
          locator = this.generateJSLocator(originalLocator);
          break;
      }

      const confidence = this.calculateConfidence(strategy, locator);

      await this.delay(100);

      return { locator, strategy, timestamp, success: true, confidence };
    } catch (error) {
      return {
        locator,
        strategy,
        timestamp,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        confidence: 0,
      };
    }
  }

  private generateFallback(locator: string): string {
    if (locator.includes('id=')) {
      const id = locator.match(/id="([^"]+)"/)?.[1];
      if (id) return `[data-testid="${id}"]`;
    }
    if (locator.includes('text=')) {
      const text = locator.match(/text="([^"]+)"/)?.[1];
      if (text) return `text=${text}`;
    }
    return locator;
  }

  private async analyzeDOM(locator: string): Promise<string> {
    const cleanLocator = locator.replace(/^[^=]+=/, '').replace(/["']/g, '');
    const jsCode = `
      Array.from(document.querySelectorAll('*')).find(el =>
        el.textContent.trim().toLowerCase().includes('${cleanLocator.toLowerCase()}') ||
        el.getAttribute('data-testid')?.includes('${cleanLocator}') ||
        el.getAttribute('id')?.includes('${cleanLocator}')
      )?.tagName || null
    `;
    const tag = await this.page.evaluate<string | null>(jsCode);
    return tag ? tag.toLowerCase() : locator;
  }

  private generateRelative(locator: string): string {
    const parts = locator.split('/');
    if (parts.length > 2) {
      return `//${parts[parts.length - 1]}`;
    }
    return `//*[contains(@class, '${locator.slice(0, 20)}')]`;
  }

  private generateJSLocator(locator: string): string {
    const clean = locator.replace(/[^a-zA-Z0-9]/g, '');
    return `document.querySelector('[data-testid="${clean}"]')`;
  }

  private calculateConfidence(strategy: HealingStrategy, locator: string): number {
    const baseScores: Record<HealingStrategy, number> = {
      retry_original: 1.0,
      fallback_locator: 0.85,
      similarity_match: 0.75,
      dom_analysis: 0.7,
      ai_generated: 0.65,
      relative_locator: 0.5,
      javascript_evaluation: 0.4,
    };
    const base = baseScores[strategy] || 0.5;
    const stabilityBonus = locator.includes('data-testid') ? 0.1 : 0;
    return Math.min(1, base + stabilityBonus);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async analyzeFailure(failure: LocatorFailure): Promise<FailureAnalysis> {
    const errorType = this.classifyError(failure.error);
    return {
      locator: failure.locator,
      error: failure.error,
      errorType,
      rootCause: this.diagnoseError(errorType),
      suggestedFixes: this.getSuggestedFixes(errorType),
      confidence: 0.8,
    };
  }

  private classifyError(error: string): string {
    const e = error.toLowerCase();
    if (e.includes('not found') || e.includes('not visible')) return 'element_not_found';
    if (e.includes('stale')) return 'stale_element';
    if (e.includes('timeout')) return 'timeout';
    if (e.includes('disabled')) return 'element_disabled';
    return 'unknown';
  }

  private diagnoseError(errorType: string): string {
    const diagnoses: Record<string, string> = {
      element_not_found: 'Element selector may have changed (dynamic IDs)',
      stale_element: 'DOM was re-rendered after initial render',
      timeout: 'Element takes too long to become available',
      element_disabled: 'Element not in interactive state',
    };
    return diagnoses[errorType] || 'Unknown issue';
  }

  private getSuggestedFixes(errorType: string): string[] {
    const fixes: Record<string, string[]> = {
      element_not_found: ['Use data-testid attribute', 'Use stable parent selector', 'Use text-based locator'],
      stale_element: ['Re-query element before interaction', 'Use retry mechanism'],
      timeout: ['Increase wait time', 'Use explicit wait for element'],
      element_disabled: ['Wait for element to be enabled', 'Check element state before action'],
    };
    return fixes[errorType] || ['Review locator strategy'];
  }
}

export interface HealOptions {
  timeout?: number;
  retries?: number;
  strategies?: HealingStrategy[];
}

export interface LocatorFailure {
  locator: string;
  error: string;
  timestamp: number;
  pageUrl?: string;
}

export interface FailureAnalysis {
  locator: string;
  error: string;
  errorType: string;
  rootCause: string;
  suggestedFixes: string[];
  confidence: number;
}