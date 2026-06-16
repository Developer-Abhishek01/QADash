export interface StackTraceAnalysis {
  isValid: boolean;
  errorType: string;
  errorMessage: string;
  frames: StackFrame[];
  likelySource: 'application' | 'framework' | 'test' | 'unknown';
  category: 'product_bug' | 'automation_bug' | 'environment_issue';
  confidence: number;
  suggestedFix?: string;
}

export interface StackFrame {
  file: string;
  line: number;
  column: number;
  function: string;
  isMinified: boolean;
}

export class StackTraceAnalyzer {
  private errorPatterns: Map<string, { category: string; source: string }> = new Map([
    ['ReferenceError', { category: 'product_bug', source: 'application' }],
    ['TypeError', { category: 'product_bug', source: 'application' }],
    ['SyntaxError', { category: 'product_bug', source: 'application' }],
    ['Error', { category: 'product_bug', source: 'unknown' }],
    ['AssertionError', { category: 'automation_bug', source: 'test' }],
    ['TimeoutError', { category: 'environment_issue', source: 'framework' }],
  ]);

  analyze(stackTrace: string): StackTraceAnalysis {
    const lines = stackTrace.split('\n').filter(l => l.trim());
    
    if (lines.length === 0) {
      return { isValid: false, errorType: 'Unknown', errorMessage: '', frames: [], likelySource: 'unknown', category: 'product_bug', confidence: 0 };
    }

    const firstLine = lines[0];
    const { errorType, errorMessage } = this.parseErrorLine(firstLine);
    const frames = this.parseFrames(lines.slice(1));
    const patternInfo = this.errorPatterns.get(errorType) || { category: 'product_bug', source: 'unknown' };
    const confidence = this.calculateConfidence(frames, patternInfo);
    const suggestedFix = this.generateFix(errorType, frames);

    return {
      isValid: true,
      errorType,
      errorMessage,
      frames,
      likelySource: patternInfo.source as 'application' | 'framework' | 'test' | 'unknown',
      category: patternInfo.category as 'product_bug' | 'automation_bug' | 'environment_issue',
      confidence,
      suggestedFix,
    };
  }

  private parseErrorLine(line: string): { errorType: string; errorMessage: string } {
    const match = line.match(/^(\w+Error):?\s*(.*)$/);
    if (match) {
      return { errorType: match[1], errorMessage: match[2].trim() };
    }
    return { errorType: 'Error', errorMessage: line };
  }

  private parseFrames(lines: string[]): StackFrame[] {
    return lines.slice(0, 10).map(line => {
      const match = line.trim().match(/at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)/) || line.trim().match(/at\s+(.*?):(\d+):(\d+)/);
      if (match) {
        const isMinified = (match[2] || '').includes('.min.') || (match[1] || '').length < 20;
        return {
          file: match[2] || match[1] || 'unknown',
          line: parseInt(match[3] || '0'),
          column: parseInt(match[4] || '0'),
          function: match[1] || 'anonymous',
          isMinified,
        };
      }
      return { file: 'unknown', line: 0, column: 0, function: 'unknown', isMinified: false };
    });
  }

  private calculateConfidence(frames: StackFrame[], _info: { category: string; source: string }): number {
    let confidence = 0.7;
    const appFrames = frames.filter(f => !this.isTestFile(f.file) && !this.isFrameworkFile(f.file));
    confidence += appFrames.length > 0 ? 0.2 : -0.1;
    confidence -= frames.filter(f => f.isMinified).length * 0.05;
    return Math.max(0.3, Math.min(0.95, confidence));
  }

  private isTestFile(file: string): boolean {
    return /test|spec|__tests__|jest|playwright|cypress/i.test(file);
  }

  private isFrameworkFile(file: string): boolean {
    return /node_modules|framework|library/i.test(file);
  }

  private generateFix(errorType: string, _frames: StackFrame[]): string {
    const fixes: Record<string, string> = {
      ReferenceError: 'Check if variable is defined before use',
      TypeError: 'Verify object exists and has expected properties',
      SyntaxError: 'Check code syntax and brackets',
      AssertionError: 'Update test assertion or fix expected value',
      TimeoutError: 'Increase timeout or optimize async operation',
    };
    return fixes[errorType] || 'Review stack trace for root cause';
  }

  extractKeyFrames(stackTrace: string): StackFrame[] {
    const analysis = this.analyze(stackTrace);
    return analysis.frames.slice(0, 5);
  }

  isProductBug(stackTrace: string): boolean {
    const analysis = this.analyze(stackTrace);
    return analysis.category === 'product_bug' && analysis.likelySource === 'application';
  }
}