import { HealingStrategy, LocatorAttempt } from './locator-healer';

interface LearningRecord {
  original: string;
  healed: string;
  strategy: HealingStrategy;
  success: boolean;
  timestamp: number;
  pageUrl?: string;
}

export class LocatorLearner {
  private learningHistory: LearningRecord[] = [];
  private maxHistorySize: number = 1000;

  async recordSuccess(original: string, healed: string, strategy: HealingStrategy): Promise<void> {
    this.learningHistory.push({
      original, healed, strategy, success: true, timestamp: Date.now(),
    });
    this.pruneHistory();
  }

  async recordFailure(original: string, attempts: LocatorAttempt[]): Promise<void> {
    for (const attempt of attempts) {
      this.learningHistory.push({
        original, healed: attempt.locator, strategy: attempt.strategy, success: attempt.success, timestamp: Date.now(),
      });
    }
    this.pruneHistory();
  }

  private pruneHistory(): void {
    if (this.learningHistory.length > this.maxHistorySize) {
      this.learningHistory = this.learningHistory.slice(-this.maxHistorySize);
    }
  }

  async getAILearnedLocator(original: string): Promise<string> {
    const relevant = this.learningHistory.filter(r => r.original === original && r.success);
    if (relevant.length > 0) {
      return relevant[0].healed || original;
    }
    const similar = this.learningHistory.filter(r => this.calculateSimilarity(r.original, original) > 0.5 && r.success);
    return similar[0]?.healed || original;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\W+/));
    const words2 = new Set(str2.toLowerCase().split(/\W+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size || 0;
  }

  getSuccessRate(original: string): { total: number; successRate: number } {
    const records = this.learningHistory.filter(r => r.original === original);
    const successful = records.filter(r => r.success).length;
    return { total: records.length, successRate: records.length > 0 ? Math.round((successful / records.length) * 100) : 0 };
  }
}