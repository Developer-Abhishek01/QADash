import { Injectable, Logger } from '@nestjs/common';
import { VulnerabilityResult, TargetResult } from './scanner.service';

const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "' OR '1'='1' --",
  "' OR '1'='1' /*",
  "'; DROP TABLE users; --",
  "' UNION SELECT NULL--",
  "1' AND '1'='1",
  "1' AND '1'='2",
  "' OR 'a'='a",
  "admin'--",
  "1' ORDER BY 1--",
  "1' ORDER BY 10--",
  "1' UNION SELECT NULL,NULL--",
  "1' AND SLEEP(5)--",
  "') OR ('1'='1",
  "1; SELECT * FROM users",
];

const SQL_INJECTION_PATTERNS = [
  /sql syntax|mysql syntax|ORA-\d+|postgresql|sqlite3|microsoft sql/gi,
  /unterminated quoted string|quoted string not properly terminated/gi,
  /syntax error near|unexpected token|Invalid SQL/gi,
];

@Injectable()
export class SqlInjectionScanner {
  private readonly logger = new Logger(SqlInjectionScanner.name);
  private visitedUrls: Set<string> = new Set();

  async scan(
    _scanId: string,
    baseUrl: string,
    config: Record<string, unknown>,
  ): Promise<{ vulnerabilities: VulnerabilityResult[]; targets: TargetResult[] }> {
    const vulnerabilities: VulnerabilityResult[] = [];
    const targets: TargetResult[] = [];
    const maxDepth = (config['maxDepth'] as number) || 2; // Reduced default depth
    const maxPages = (config['maxPages'] as number) || 50; // Added limit to pages

    this.visitedUrls = new Set();
    await this.crawlAndTest(baseUrl, maxDepth, vulnerabilities, targets, 0, maxPages);

    return { vulnerabilities, targets };
  }

  private async crawlAndTest(
    url: string,
    maxDepth: number,
    vulnerabilities: VulnerabilityResult[],
    targets: TargetResult[],
    depth: number,
    maxPages: number,
  ): Promise<void> {
    if (depth >= maxDepth || this.visitedUrls.size >= maxPages || this.visitedUrls.has(url)) return;
    this.visitedUrls.add(url);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'QADash-SecurityScanner/1.0' },
        signal: AbortSignal.timeout(10000),
      });

      targets.push({
        url,
        method: 'GET',
        status: response.status,
        responseTime: 0,
        isSecure: true,
        headers: Object.fromEntries(response.headers.entries()),
      });

      const forms = await this.extractForms(url);
      for (const form of forms) {
        for (const payload of SQL_INJECTION_PAYLOADS) {
          const result = await this.testSqlInjection(form.action, form.method, form.fields, payload);
          if (result.vulnerable) {
            vulnerabilities.push({
              title: 'SQL Injection',
              description: `Potential SQL injection vulnerability detected in form at ${form.action}`,
              severity: 'HIGH',
              status: 'OPEN',
              cweId: 'CWE-89',
              owaspCategory: 'A03_INJECTION',
              affectedUrl: form.action,
              affectedParam: form.fields.join(', '),
              evidence: {
                payload,
                error: result.error,
                statusCode: result.status,
              },
              remediation: 'Use parameterized queries or prepared statements. Implement input validation and output encoding.',
              remediationUrl: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html',
            });
          }
        }
      }

      const links = await this.extractLinks(url);
      for (const link of links.slice(0, 10)) {
        await this.crawlAndTest(link, maxDepth, vulnerabilities, targets, depth + 1, maxPages);
      }
    } catch (error) {
      this.logger.warn(`Crawl error for ${url}: ${error}`);
    }
  }

  private async testSqlInjection(
    url: string,
    method: string,
    fields: string[],
    payload: string,
  ): Promise<{ vulnerable: boolean; error?: string; status?: number }> {
    try {
      const formData = new URLSearchParams();
      for (const field of fields) {
        formData.append(field, payload);
      }

      const response = await fetch(url, {
        method: method.toUpperCase(),
        body: method.toUpperCase() === 'GET' ? undefined : formData.toString(),
        headers: {
          'User-Agent': 'QADash-SecurityScanner/1.0',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(5000),
      });

      const body = await response.text();

      for (const pattern of SQL_INJECTION_PATTERNS) {
        if (pattern.test(body)) {
          return { vulnerable: true, error: body.substring(0, 500), status: response.status };
        }
      }

      if (response.status >= 500) {
        return { vulnerable: true, status: response.status };
      }

      return { vulnerable: false };
    } catch {
      return { vulnerable: false };
    }
  }

  private async extractForms(url: string): Promise<{ action: string; method: string; fields: string[] }[]> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'QADash-SecurityScanner/1.0' },
        signal: AbortSignal.timeout(5000),
      });
      const html = await response.text();
      const forms: { action: string; method: string; fields: string[] }[] = [];

      const formRegex = /<form[^>]*action="([^"]*)"[^>]*method="([^"]*)"[^>]*>([\s\S]*?)<\/form>/gi;
      let match;

      while ((match = formRegex.exec(html)) !== null) {
        const action = match[1] || url;
        const method = match[2] || 'get';
        const formContent = match[3];

        const fields: string[] = [];
        const inputRegex = /<input[^>]*name="([^"]*)"[^>]*>/gi;
        let inputMatch;

        while ((inputMatch = inputRegex.exec(formContent)) !== null) {
          fields.push(inputMatch[1]);
        }

        if (fields.length > 0) {
          forms.push({ action: new URL(action, url).href, method, fields });
        }
      }

      return forms;
    } catch {
      return [];
    }
  }

  private async extractLinks(url: string): Promise<string[]> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'QADash-SecurityScanner/1.0' },
        signal: AbortSignal.timeout(5000),
      });
      const html = await response.text();
      const links: string[] = [];

      const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>/gi;
      let match;

      while ((match = linkRegex.exec(html)) !== null) {
        try {
          const href = match[1];
          if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
            links.push(new URL(href, url).href);
          }
        } catch {
          continue;
        }
      }

      return [...new Set(links)].slice(0, 20);
    } catch {
      return [];
    }
  }
}