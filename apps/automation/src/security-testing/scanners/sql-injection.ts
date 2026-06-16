import { Page } from '@playwright/test';
import { Vulnerability } from '../types';

export class SqlInjectionScanner {
  private page: Page;
  private payloads = ["'", "1' OR '1'='1", "1; DROP TABLE users", "1' UNION SELECT NULL--", "1' AND '1'='1", "1' ORDER BY 1--", "admin'--", "1' WAITFOR DELAY '00:00:05'--"];

  constructor(page: Page) { this.page = page; }

  async scan(urls: string[]): Promise<Vulnerability[]> {
    const vulns: Vulnerability[] = [];
    for (const url of urls.slice(0, 20)) {
      for (const payload of this.payloads) {
        const vuln = await this.testPayload(url, payload);
        if (vuln) vulns.push(vuln);
      }
    }
    return vulns;
  }

  private async testPayload(url: string, payload: string): Promise<Vulnerability | null> {
    try {
      const testUrl = url.includes('?') ? `${url}&id=${encodeURIComponent(payload)}` : url;
      const response = await this.page.goto(testUrl, { timeout: 5000 }).catch(() => null);
      if (!response) return null;
      const content = await this.page.content();
      const errorPatterns = [/sql.*error|mysql.*error|ORA-\d+|postgresql|syntax.*error.*sql/i, /unterminated.*string|quoted.*string.*not.*closed/i, /you have an error.*mysql/i, /warning.*mysqli/i];
      if (errorPatterns.some(p => p.test(content))) {
        return { id: `sqli_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, name: 'SQL Injection', description: `SQL injection vulnerability detected with payload: ${payload}`, category: 'sql_injection', severity: 'critical', confidence: 'high', url: testUrl, parameter: 'id', evidence: this.extractEvidence(content), solution: 'Use parameterized queries or prepared statements', cwe: 'CWE-89', foundAt: Date.now() };
      }
    } catch { }
    return null;
  }

  private extractEvidence(content: string): string {
    const match = content.match(/sql.*error.*/i);
    return match ? match[0].substring(0, 200) : 'SQL error detected in response';
  }
}