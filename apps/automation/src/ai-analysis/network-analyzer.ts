export interface NetworkAnalysis {
  totalRequests: number;
  failedRequests: number;
  slowRequests: number;
  issues: NetworkIssue[];
  apiHealth: 'healthy' | 'degraded' | 'unhealthy';
  recommendations: string[];
}

export interface NetworkIssue {
  type: 'timeout' | 'error_4xx' | 'error_5xx' | 'slow' | 'missing';
  url: string;
  method: string;
  status?: number;
  duration?: number;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export interface NetworkLog {
  url: string;
  method: string;
  status: number;
  duration: number;
  request?: { headers?: Record<string, string>; body?: string };
  response?: { headers?: Record<string, string>; body?: string };
}

export class NetworkAnalyzer {
  private slowThreshold: number = 5000;
  private error4xxThreshold: number = 3;

  analyze(logs: NetworkLog[]): NetworkAnalysis {
    const totalRequests = logs.length;
    const failedRequests = logs.filter(l => l.status >= 400).length;
    const slowRequests = logs.filter(l => l.duration > this.slowThreshold).length;
    const issues = this.detectIssues(logs);
    const apiHealth = this.calculateHealth(failedRequests, slowRequests, totalRequests);
    const recommendations = this.generateRecommendations(issues, apiHealth);

    return { totalRequests, failedRequests, slowRequests, issues, apiHealth, recommendations };
  }

  private detectIssues(logs: NetworkLog[]): NetworkIssue[] {
    const issues: NetworkIssue[] = [];
    const statusCounts: Record<number, number> = {};

    for (const log of logs) {
      statusCounts[log.status] = (statusCounts[log.status] || 0) + 1;

      if (log.duration > this.slowThreshold) {
        issues.push({ type: 'slow', url: log.url, method: log.method, status: log.status, duration: log.duration, severity: 'medium', description: `Slow request (${log.duration}ms)` });
      }

      if (log.status >= 500) {
        issues.push({ type: 'error_5xx', url: log.url, method: log.method, status: log.status, severity: 'high', description: `Server error: ${log.status}` });
      }

      if (log.status === 404) {
        issues.push({ type: 'missing', url: log.url, method: log.method, status: log.status, severity: 'high', description: 'Resource not found (404)' });
      }

      if (log.status === 401 || log.status === 403) {
        issues.push({ type: 'error_4xx', url: log.url, method: log.method, status: log.status, severity: 'high', description: 'Authentication/Authorization failed' });
      }
    }

    for (const [status, count] of Object.entries(statusCounts)) {
      if (parseInt(status) >= 400 && parseInt(status) < 500 && count > this.error4xxThreshold) {
        issues.push({ type: 'error_4xx', url: 'multiple', method: 'GET', status: parseInt(status), severity: 'medium', description: `${count} requests failed with ${status}` });
      }
    }

    return issues;
  }

  private calculateHealth(failed: number, slow: number, total: number): 'healthy' | 'degraded' | 'unhealthy' {
    const failureRate = failed / total;
    const slowRate = slow / total;

    if (failureRate > 0.3 || slowRate > 0.5) return 'unhealthy';
    if (failureRate > 0.1 || slowRate > 0.2) return 'degraded';
    return 'healthy';
  }

  private generateRecommendations(issues: NetworkIssue[], health: string): string[] {
    const recs: string[] = [];

    if (issues.some(i => i.type === 'error_5xx')) recs.push('Investigate server-side errors - check API logs');
    if (issues.some(i => i.type === 'timeout')) recs.push('Increase API timeout or optimize backend query');
    if (issues.some(i => i.type === 'missing')) recs.push('Fix broken API endpoints or update test URLs');
    if (issues.some(i => i.type === 'error_4xx')) recs.push('Fix authentication or resource access issues');
    if (health === 'unhealthy') recs.push('Consider implementing retry logic and circuit breaker');

    if (recs.length === 0) recs.push('Network requests appear healthy');

    return recs;
  }

  detectFlakyApi(logs: NetworkLog[]): { url: string; failureRate: number }[] {
    const urlStats: Record<string, { total: number; failed: number }> = {};

    for (const log of logs) {
      if (!urlStats[log.url]) urlStats[log.url] = { total: 0, failed: 0 };
      urlStats[log.url].total++;
      if (log.status >= 400) urlStats[log.url].failed++;
    }

    return Object.entries(urlStats)
      .filter(([, stats]) => stats.total > 2)
      .map(([url, stats]) => ({ url, failureRate: stats.failed / stats.total }))
      .filter(r => r.failureRate > 0.2)
      .sort((a, b) => b.failureRate - a.failureRate);
  }

  extractCriticalApiCalls(logs: NetworkLog[]): NetworkLog[] {
    return logs.filter(l => l.status >= 500 || l.duration > 10000).slice(0, 10);
  }
}