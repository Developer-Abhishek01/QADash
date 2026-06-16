export type FailureCategory = 
  | 'product_bug'
  | 'automation_bug'
  | 'network_issue'
  | 'environment_issue'
  | 'data_issue'
  | 'unknown';

export type FailureSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface FailureAnalysisResult {
  id: string;
  category: FailureCategory;
  subCategory: string;
  severity: FailureSeverity;
  confidence: number;
  rootCause: string;
  description: string;
  recommendations: Recommendation[];
  evidence: Evidence[];
  timestamp: number;
}

export interface Recommendation {
  type: 'fix' | 'investigation' | 'monitor' | 'skip';
  priority: 'p1' | 'p2' | 'p3';
  action: string;
  effort: 'low' | 'medium' | 'high';
  description: string;
}

export interface Evidence {
  type: 'screenshot' | 'stack_trace' | 'network_log' | 'console_log' | 'environment';
  content: string;
  relevance: number;
}

export interface FailureInput {
  error?: string;
  message?: string;
  stackTrace?: string;
  screenshots?: string[];
  networkLogs?: NetworkLog[];
  consoleLogs?: ConsoleLog[];
  environment?: EnvironmentInfo;
  testName?: string;
  testCode?: string;
}

export interface NetworkLog {
  url: string;
  method: string;
  status: number;
  duration: number;
  response?: string;
  request?: string;
}

export interface ConsoleLog {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: number;
  stack?: string;
}

export interface EnvironmentInfo {
  browser: string;
  browserVersion: string;
  os: string;
  viewport: { width: number; height: number };
  url: string;
  timestamp: string;
  memory?: number;
  cpu?: number;
}

export class AIFailureAnalyzer {
  private categoryPatterns: Map<FailureCategory, PatternMatch[]> = new Map();

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    this.categoryPatterns.set('product_bug', [
      { pattern: /null.*pointer|undefined.*property|cannot.*property/i, weight: 0.9, reason: 'JavaScript error indicates UI bug' },
      { pattern: /cannot read.*undefined|cannot read.*null/i, weight: 0.85, reason: 'Null reference error in application code' },
      { pattern: /application.*error|server.*error|500/i, weight: 0.8, reason: 'Server-side error' },
    ]);

    this.categoryPatterns.set('automation_bug', [
      { pattern: /element.*not.*found|unable.*locate/i, weight: 0.9, reason: 'Locator issue in test' },
      { pattern: /stale.*element|element.*attached/i, weight: 0.85, reason: 'DOM state changed during test' },
      { pattern: /timeout.*waiting|wait.*timeout/i, weight: 0.7, reason: 'Timing issue in test' },
      { pattern: /assertion.*failed|expected.*actual/i, weight: 0.8, reason: 'Assertion logic error' },
    ]);

    this.categoryPatterns.set('network_issue', [
      { pattern: /network.*error|fetch.*failed|request.*failed/i, weight: 0.95, reason: 'Network connectivity issue' },
      { pattern: /timeout.*request|connection.*timeout/i, weight: 0.9, reason: 'Request timeout' },
      { pattern: /certificate|ssl|tls/i, weight: 0.85, reason: 'SSL/TLS certificate issue' },
      { pattern: /dns|resolve.*host/i, weight: 0.9, reason: 'DNS resolution failure' },
    ]);

    this.categoryPatterns.set('environment_issue', [
      { pattern: /memory.*limit|heap.*size|out.*memory/i, weight: 0.95, reason: 'Memory limit exceeded' },
      { pattern: /permission.*denied|access.*denied/i, weight: 0.8, reason: 'Permission issue' },
      { pattern: /file.*not.*found|path.*not.*exist/i, weight: 0.75, reason: 'Missing file or resource' },
      { pattern: /database.*connection|sql.*error/i, weight: 0.85, reason: 'Database connectivity issue' },
    ]);

    this.categoryPatterns.set('data_issue', [
      { pattern: /invalid.*json|parse.*error|unexpected.*token/i, weight: 0.9, reason: 'Data parsing error' },
      { pattern: /empty.*response|null.*response|no.*data/i, weight: 0.8, reason: 'Empty or missing data' },
      { pattern: /validation.*failed|invalid.*input|required.*field/i, weight: 0.85, reason: 'Data validation failure' },
      { pattern: /type.*error|expected.*string|expected.*number/i, weight: 0.8, reason: 'Data type mismatch' },
    ]);
  }

  async analyze(failure: FailureInput): Promise<FailureAnalysisResult> {
    const id = this.generateId();
    const timestamp = Date.now();

    const categoryResult = this.classifyCategory(failure);
    const severityResult = this.assessSeverity(failure, categoryResult.category);
    const rootCause = this.determineRootCause(failure, categoryResult);
    const recommendations = this.generateRecommendations(failure, categoryResult, rootCause);
    const evidence = this.collectEvidence(failure);

    return {
      id,
      category: categoryResult.category,
      subCategory: categoryResult.subCategory,
      severity: severityResult.severity,
      confidence: categoryResult.confidence * severityResult.confidence,
      rootCause,
      description: this.generateDescription(failure, categoryResult, rootCause),
      recommendations,
      evidence,
      timestamp,
    };
  }

  private classifyCategory(failure: FailureInput): { category: FailureCategory; subCategory: string; confidence: number; reason: string } {
    const errorText = (failure.error || failure.message || '').toLowerCase();
    const stackText = (failure.stackTrace || '').toLowerCase();
    const combinedText = `${errorText} ${stackText}`;

    let bestMatch: { category: FailureCategory; confidence: number; reason: string; subCategory: string } = {
      category: 'unknown',
      confidence: 0.3,
      reason: 'No clear pattern matched',
      subCategory: 'unclassified',
    };

    for (const [category, patterns] of this.categoryPatterns.entries()) {
      for (const pattern of patterns) {
        if (pattern.pattern.test(combinedText)) {
          if (pattern.weight > bestMatch.confidence) {
            bestMatch = {
              category,
              confidence: pattern.weight,
              reason: pattern.reason,
              subCategory: this.extractSubCategory(combinedText),
            };
          }
        }
      }
    }

    if (failure.networkLogs && failure.networkLogs.length > 0) {
      const networkIssue = this.detectNetworkIssues(failure.networkLogs);
      if (networkIssue && networkIssue.confidence > bestMatch.confidence) {
        bestMatch = { ...networkIssue, category: 'network_issue' as FailureCategory };
      }
    }

    if (failure.consoleLogs && failure.consoleLogs.length > 0) {
      const consoleIssue = this.detectConsoleIssues(failure.consoleLogs);
      if (consoleIssue && consoleIssue.confidence > bestMatch.confidence) {
        bestMatch = { ...consoleIssue, category: 'environment_issue' as FailureCategory };
      }
    }

    return bestMatch;
  }

  private detectNetworkIssues(logs: NetworkLog[]): { confidence: number; reason: string; subCategory: string } | null {
    const failedRequests = logs.filter(l => l.status >= 400);
    const timeouts = logs.filter(l => l.duration > 30000);

    if (failedRequests.length > 0) {
      const status = failedRequests[0].status;
      if (status === 401 || status === 403) {
        return { confidence: 0.9, reason: 'Authentication/Authorization failure', subCategory: 'auth_failure' };
      }
      if (status === 404) {
        return { confidence: 0.85, reason: 'Resource not found', subCategory: 'not_found' };
      }
      if (status >= 500) {
        return { confidence: 0.9, reason: 'Server error', subCategory: 'server_error' };
      }
      return { confidence: 0.8, reason: 'HTTP error response', subCategory: 'http_error' };
    }

    if (timeouts.length > 0) {
      return { confidence: 0.85, reason: 'Request timeout', subCategory: 'request_timeout' };
    }

    return null;
  }

  private detectConsoleIssues(logs: ConsoleLog[]): { confidence: number; reason: string; subCategory: string } | null {
    const errors = logs.filter(l => l.level === 'error');
    
    if (errors.length > 0) {
      const firstError = errors[0].message.toLowerCase();
      
      if (firstError.includes('memory') || firstError.includes('heap')) {
        return { confidence: 0.95, reason: 'Memory consumption issue', subCategory: 'memory_error' };
      }
      
      if (firstError.includes('chunk') || firstError.includes('loading')) {
        return { confidence: 0.8, reason: 'Resource loading failure', subCategory: 'loading_error' };
      }
      
      return { confidence: 0.7, reason: 'Console error detected', subCategory: 'console_error' };
    }

    return null;
  }

  private extractSubCategory(text: string): string {
    if (/null|undefined/.test(text)) return 'null_reference';
    if (/timeout/.test(text)) return 'timeout';
    if (/network|fetch|request/.test(text)) return 'network_error';
    if (/assert|expected|actual/.test(text)) return 'assertion_failure';
    if (/element|locator|find/.test(text)) return 'element_not_found';
    if (/permission|auth|login/.test(text)) return 'auth_error';
    return 'general_error';
  }

  private assessSeverity(failure: FailureInput, category: FailureCategory): { severity: FailureSeverity; confidence: number } {
    const errorText = (failure.error || failure.message || '').toLowerCase();
    let severity: FailureSeverity = 'medium';
    let confidence = 0.7;

    if (category === 'network_issue') {
      if (errorText.includes('timeout') || errorText.includes('connection')) {
        severity = 'high';
        confidence = 0.85;
      }
    }

    if (category === 'product_bug') {
      if (errorText.includes('crash') || errorText.includes('fatal')) {
        severity = 'critical';
        confidence = 0.95;
      } else if (errorText.includes('error')) {
        severity = 'high';
        confidence = 0.8;
      }
    }

    if (category === 'automation_bug') {
      severity = 'medium';
      confidence = 0.75;
    }

    if (failure.environment) {
      if (failure.environment.memory && failure.environment.memory > 90) {
        severity = severity === 'critical' ? 'critical' : 'high';
        confidence = Math.max(confidence, 0.9);
      }
    }

    return { severity, confidence };
  }

  private determineRootCause(_failure: FailureInput, categoryResult: { category: FailureCategory; reason: string }): string {
    const reasons: Record<FailureCategory, string[]> = {
      product_bug: [
        'Application code threw unhandled exception',
        'UI component failed to render correctly',
        'State management issue in application',
        'API returned unexpected error',
      ],
      automation_bug: [
        'Element locator is unstable or has changed',
        'Test timing assumptions are incorrect',
        'Test data is no longer valid',
        'Assertion expects incorrect value',
      ],
      network_issue: [
        'Network connectivity is unstable',
        'API server is not responding',
        'Request payload is malformed',
        'SSL/TLS handshake failed',
      ],
      environment_issue: [
        'Test environment configuration is incorrect',
        'Required resources are not available',
        'Browser or runtime issue',
        'Insufficient system resources',
      ],
      data_issue: [
        'Test data is missing or invalid',
        'API response format has changed',
        'Data validation failed',
        'Database connection issue',
      ],
      unknown: [
        'Unable to determine root cause',
        'Additional investigation required',
      ],
    };

    const categoryReasons = reasons[categoryResult.category] || reasons.unknown;
    return categoryReasons[Math.floor(Math.random() * categoryReasons.length)];
  }

  private generateRecommendations(_failure: FailureInput, categoryResult: { category: FailureCategory }, _rootCause: string): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const category = categoryResult.category;

    if (category === 'product_bug') {
      recommendations.push({
        type: 'investigation',
        priority: 'p1',
        action: 'Report to development team',
        effort: 'medium',
        description: 'Create bug ticket with stack trace and screenshots',
      });
    }

    if (category === 'automation_bug') {
      recommendations.push({
        type: 'fix',
        priority: 'p1',
        action: 'Fix test locator',
        effort: 'low',
        description: 'Update element selector to use stable attribute like data-testid',
      });
      recommendations.push({
        type: 'fix',
        priority: 'p2',
        action: 'Add explicit wait',
        effort: 'low',
        description: 'Add wait for element to be visible before interaction',
      });
    }

    if (category === 'network_issue') {
      recommendations.push({
        type: 'investigation',
        priority: 'p1',
        action: 'Check API status',
        effort: 'low',
        description: 'Verify API endpoints are responding correctly',
      });
      recommendations.push({
        type: 'monitor',
        priority: 'p2',
        action: 'Add network monitoring',
        effort: 'medium',
        description: 'Implement network request logging in tests',
      });
    }

    if (category === 'environment_issue') {
      recommendations.push({
        type: 'investigation',
        priority: 'p1',
        action: 'Verify environment setup',
        effort: 'high',
        description: 'Check environment configuration and dependencies',
      });
    }

    if (category === 'data_issue') {
      recommendations.push({
        type: 'fix',
        priority: 'p1',
        action: 'Update test data',
        effort: 'medium',
        description: 'Refresh or regenerate test data',
      });
    }

    recommendations.push({
      type: 'monitor',
      priority: 'p3',
      action: 'Track failure pattern',
      effort: 'low',
      description: 'Monitor for recurrence and gather more data',
    });

    return recommendations;
  }

  private collectEvidence(failure: FailureInput): Evidence[] {
    const evidence: Evidence[] = [];

    if (failure.screenshots && failure.screenshots.length > 0) {
      evidence.push({
        type: 'screenshot',
        content: failure.screenshots[0],
        relevance: 0.9,
      });
    }

    if (failure.stackTrace) {
      evidence.push({
        type: 'stack_trace',
        content: failure.stackTrace,
        relevance: 0.85,
      });
    }

    if (failure.networkLogs && failure.networkLogs.length > 0) {
      evidence.push({
        type: 'network_log',
        content: JSON.stringify(failure.networkLogs.slice(0, 5)),
        relevance: 0.8,
      });
    }

    if (failure.consoleLogs && failure.consoleLogs.length > 0) {
      evidence.push({
        type: 'console_log',
        content: failure.consoleLogs.slice(0, 10).map(l => `[${l.level}] ${l.message}`).join('\n'),
        relevance: 0.75,
      });
    }

    if (failure.environment) {
      evidence.push({
        type: 'environment',
        content: JSON.stringify(failure.environment),
        relevance: 0.7,
      });
    }

    return evidence;
  }

  private generateDescription(failure: FailureInput, categoryResult: { category: FailureCategory; reason: string }, rootCause: string): string {
    const errorPreview = (failure.error || failure.message || 'Unknown error').substring(0, 100);
    return `${categoryResult.category.replace('_', ' ')}: ${rootCause}. Error: "${errorPreview}..."`;
  }

  private generateId(): string {
    return `fail_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

interface PatternMatch {
  pattern: RegExp;
  weight: number;
  reason: string;
}