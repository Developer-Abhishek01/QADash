import { HealingStrategy } from './locator-healer';

export class ConfidenceScorer {
  private strategyBaseScores: Record<HealingStrategy, number> = {
    retry_original: 1.0,
    fallback_locator: 0.85,
    similarity_match: 0.75,
    dom_analysis: 0.7,
    ai_generated: 0.65,
    relative_locator: 0.5,
    javascript_evaluation: 0.4,
  };

  private locatorQualityScores: Record<string, number> = {
    'data-testid': 0.95,
    'data-cy': 0.9,
    'data-test': 0.85,
    'id': 0.8,
    'aria-label': 0.75,
    'role': 0.7,
    'text': 0.65,
    'xpath': 0.5,
    'css': 0.6,
  };

  calculate(strategy: HealingStrategy, locator: string, attemptNumber: number): number {
    let score = this.strategyBaseScores[strategy] || 0.5;

    const qualityBonus = this.getLocatorQualityBonus(locator);
    score += qualityBonus;

    const attemptPenalty = Math.min(0.2, attemptNumber * 0.05);
    score -= attemptPenalty;

    score = Math.max(0.1, Math.min(1.0, score));

    return Math.round(score * 100) / 100;
  }

  private getLocatorQualityBonus(locator: string): number {
    for (const [pattern, bonus] of Object.entries(this.locatorQualityScores)) {
      if (locator.includes(pattern)) {
        return bonus - 0.5;
      }
    }
    return 0;
  }

  analyzeFailureConfidence(failure: { locator: string; error: string }): number {
    let confidence = 0.5;

    const errorType = this.classifyError(failure.error);
    const errorConfidences: Record<string, number> = {
      element_not_found: 0.7,
      stale_element: 0.8,
      timeout: 0.6,
      element_disabled: 0.75,
    };

    confidence = errorConfidences[errorType] || 0.5;

    const qualityBonus = this.getLocatorQualityBonus(failure.locator);
    confidence += qualityBonus * 0.3;

    return Math.round(Math.max(0.1, Math.min(1.0, confidence)) * 100) / 100;
  }

  private classifyError(error: string): string {
    const e = error.toLowerCase();
    if (e.includes('not found') || e.includes('not visible')) return 'element_not_found';
    if (e.includes('stale')) return 'stale_element';
    if (e.includes('timeout')) return 'timeout';
    if (e.includes('disabled')) return 'element_disabled';
    return 'unknown';
  }

  compareLocators(locator1: string, locator2: string): number {
    const score1 = this.getLocatorStabilityScore(locator1);
    const score2 = this.getLocatorStabilityScore(locator2);
    return score2 - score1;
  }

  private getLocatorStabilityScore(locator: string): number {
    for (const [pattern, score] of Object.entries(this.locatorQualityScores)) {
      if (locator.includes(pattern)) {
        return score;
      }
    }
    return 0.3;
  }

  getRecommendation(locators: { locator: string; confidence: number }[]): { locator: string; confidence: number; reason: string } {
    const sorted = [...locators].sort((a, b) => b.confidence - a.confidence);
    const best = sorted[0];

    const reason = this.getRecommendationReason(best.locator);

    return { ...best, reason };
  }

  private getRecommendationReason(locator: string): string {
    if (locator.includes('data-testid')) return 'Stable test ID attribute';
    if (locator.includes('data-cy')) return 'Cypress-compatible selector';
    if (locator.includes('id=')) return 'Unique identifier';
    if (locator.includes('text=')) return 'Text-based selection';
    if (locator.includes('xpath')) return 'XPath fallback';
    return 'Generated fallback';
  }
}