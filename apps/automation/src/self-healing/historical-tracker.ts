import { LocatorAttempt } from './locator-healer';

interface HistoricalRecord {
  originalLocator: string;
  attempts: LocatorAttempt[];
  lastUpdated: number;
}

export class HistoricalLocatorTracker {
  private history: Map<string, HistoricalRecord> = new Map();
  private maxRecords: number = 500;
  private retentionPeriod: number = 7 * 24 * 60 * 60 * 1000;

  async recordAttempt(originalLocator: string, attempt: LocatorAttempt): Promise<void> {
    const existing = this.history.get(originalLocator);
    
    if (existing) {
      existing.attempts.push(attempt);
      existing.lastUpdated = Date.now();
    } else {
      this.history.set(originalLocator, {
        originalLocator,
        attempts: [attempt],
        lastUpdated: Date.now(),
      });
    }

    this.cleanup();
  }

  async getHistoricalLocators(originalLocator: string): Promise<string[]> {
    const record = this.history.get(originalLocator);
    if (!record) return [];

    const successfulAttempts = record.attempts
      .filter(a => a.success)
      .sort((a, b) => b.confidence - a.confidence);

    return successfulAttempts.map(a => a.locator);
  }

  async getAttemptHistory(originalLocator: string): Promise<LocatorAttempt[]> {
    return this.history.get(originalLocator)?.attempts || [];
  }

  async getSuccessRate(originalLocator: string): Promise<number> {
    const attempts = await this.getAttemptHistory(originalLocator);
    if (attempts.length === 0) return 0;
    const successful = attempts.filter(a => a.success).length;
    return Math.round((successful / attempts.length) * 100);
  }

  async getBestLocator(originalLocator: string): Promise<string | null> {
    const attempts = await this.getAttemptHistory(originalLocator);
    if (attempts.length === 0) return null;
    
    const successful = attempts.filter(a => a.success);
    if (successful.length === 0) return null;

    return successful.sort((a, b) => b.confidence - a.confidence)[0].locator;
  }

  async getAllLocators(): Promise<{ original: string; attempts: number; successRate: number }[]> {
    return Array.from(this.history.entries()).map(([original, record]) => ({
      original,
      attempts: record.attempts.length,
      successRate: Math.round((record.attempts.filter(a => a.success).length / record.attempts.length) * 100) || 0,
    }));
  }

  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, record] of this.history.entries()) {
      if (now - record.lastUpdated > this.retentionPeriod) {
        this.history.delete(key);
      }
    }

    if (this.history.size > this.maxRecords) {
      const sorted = Array.from(this.history.entries())
        .sort((a, b) => b[1].lastUpdated - a[1].lastUpdated);
      
      this.history = new Map(sorted.slice(0, this.maxRecords));
    }
  }

  async clear(): Promise<void> {
    this.history.clear();
  }
}