export interface ConsoleAnalysis {
  totalLogs: number;
  errorCount: number;
  warnCount: number;
  issues: ConsoleIssue[];
  category: 'product_bug' | 'automation_bug' | 'environment_issue' | 'network_issue' | 'clean';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'none';
  recommendations: string[];
}

export interface ConsoleIssue {
  level: 'error' | 'warn' | 'info';
  message: string;
  type: 'javascript_error' | 'network_error' | 'resource_error' | 'deprecation' | 'performance' | 'other';
  severity: 'high' | 'medium' | 'low';
  description: string;
  stack?: string;
}

export interface ConsoleLog {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: number;
  stack?: string;
}

export class ConsoleAnalyzer {
  private errorPatterns: Map<RegExp, { type: string; severity: string }> = new Map([
    [/null.*undefined|cannot.*property/i, { type: 'javascript_error', severity: 'high' }],
    [/failed.*fetch|network.*error/i, { type: 'network_error', severity: 'high' }],
    [/loading.*failed|failed.*load/i, { type: 'resource_error', severity: 'medium' }],
    [/deprecated/i, { type: 'deprecation', severity: 'low' }],
    [/performance|slow/i, { type: 'performance', severity: 'medium' }],
  ]);

  analyze(logs: ConsoleLog[]): ConsoleAnalysis {
    const totalLogs = logs.length;
    const errorCount = logs.filter(l => l.level === 'error').length;
    const warnCount = logs.filter(l => l.level === 'warn').length;
    const issues = this.detectIssues(logs);
    const category = this.categorize(issues);
    const severity = this.calculateSeverity(issues);
    const recommendations = this.generateRecommendations(issues, category);

    return { totalLogs, errorCount, warnCount, issues, category, severity, recommendations };
  }

  private detectIssues(logs: ConsoleLog[]): ConsoleIssue[] {
    const issues: ConsoleIssue[] = [];

    for (const log of logs) {
      if (log.level === 'error' || log.level === 'warn') {
        const pattern = this.findMatchingPattern(log.message);
        issues.push({
          level: log.level,
          message: log.message.substring(0, 200),
          type: (pattern?.type || 'other') as 'javascript_error' | 'network_error' | 'resource_error' | 'deprecation' | 'performance' | 'other',
          severity: (log.level === 'error' ? 'high' : 'medium') as 'high' | 'medium' | 'low',
          description: this.describeIssue(log.message, pattern?.type),
          stack: log.stack,
        });
      }
    }

    return issues;
  }

  private findMatchingPattern(message: string): { type: string; severity: string } | null {
    for (const [pattern, info] of this.errorPatterns.entries()) {
      if (pattern.test(message)) return info;
    }
    return null;
  }

  private describeIssue(_message: string, type?: string): string {
    const descriptions: Record<string, string> = {
      javascript_error: 'JavaScript runtime error detected',
      network_error: 'Network request failed',
      resource_error: 'Resource failed to load',
      deprecation: 'Using deprecated API',
      performance: 'Performance warning',
    };
    return descriptions[type || 'other'] || 'Console issue detected';
  }

  private categorize(issues: ConsoleIssue[]): 'product_bug' | 'automation_bug' | 'environment_issue' | 'network_issue' | 'clean' {
    if (issues.length === 0) return 'clean';

    const jsErrors = issues.filter(i => i.type === 'javascript_error').length;
    const netErrors = issues.filter(i => i.type === 'network_error').length;

    if (jsErrors > 0) return 'product_bug';
    if (netErrors > 0) return 'network_issue';
    if (issues.some(i => i.severity === 'high')) return 'environment_issue';

    return 'automation_bug';
  }

  private calculateSeverity(issues: ConsoleIssue[]): 'critical' | 'high' | 'medium' | 'low' | 'none' {
    if (issues.length === 0) return 'none';

    const highSev = issues.filter(i => i.severity === 'high').length;
    if (highSev >= 3) return 'critical';
    if (highSev >= 1) return 'high';

    const medSev = issues.filter(i => i.severity === 'medium').length;
    if (medSev >= 3) return 'high';
    if (medSev >= 1) return 'medium';

    return 'low';
  }

  private generateRecommendations(issues: ConsoleIssue[], category: string): string[] {
    const recs: string[] = [];

    if (category === 'product_bug') recs.push('Report JavaScript errors to development team');
    if (category === 'environment_issue') recs.push('Check environment configuration and resources');
    if (issues.some(i => i.type === 'deprecation')) recs.push('Update code to use modern APIs');
    if (issues.some(i => i.type === 'performance')) recs.push('Optimize performance bottlenecks');

    if (recs.length === 0) recs.push('Console logs appear normal');

    return recs;
  }

  extractCriticalErrors(logs: ConsoleLog[]): ConsoleLog[] {
    return logs.filter(l => l.level === 'error').slice(0, 10);
  }

  detectMemoryLeaks(logs: ConsoleLog[]): boolean {
    const memoryPatterns = [/memory|heap|gc/i, /out.*of.*memory/i];
    return logs.some(l => memoryPatterns.some(p => p.test(l.message)));
  }
}