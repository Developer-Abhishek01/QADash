import { Injectable, Logger } from '@nestjs/common';
import { VulnerabilityResult, TargetResult } from './scanner.service';

const DEFAULT_CREDENTIALS = [
  { user: 'admin', pass: 'admin' },
  { user: 'admin', pass: 'password' },
  { user: 'admin', pass: '123456' },
  { user: 'root', pass: 'root' },
  { user: 'root', pass: 'password' },
  { user: 'test', pass: 'test' },
  { user: 'guest', pass: 'guest' },
  { user: 'admin', pass: 'admin123' },
  { user: 'administrator', pass: 'administrator' },
  { user: 'user', pass: 'user' },
];

@Injectable()
export class AuthScanner {
  private readonly logger = new Logger(AuthScanner.name);

  async scan(
    _scanId: string,
    baseUrl: string,
    config: Record<string, unknown>,
  ): Promise<{ vulnerabilities: VulnerabilityResult[]; targets: TargetResult[] }> {
    const vulnerabilities: VulnerabilityResult[] = [];
    const targets: TargetResult[] = [];

    const loginEndpoints = await this.findLoginEndpoints(baseUrl);
    for (const endpoint of loginEndpoints) {
      const defaultCredVulns = await this.testDefaultCredentials(endpoint.url, endpoint.method);
      vulnerabilities.push(...defaultCredVulns);

      targets.push({
        url: endpoint.url,
        method: endpoint.method,
        isSecure: defaultCredVulns.length === 0,
        errors: defaultCredVulns.length > 0 ? ['Default credentials found'] : undefined,
      });
    }

    const sessionVulns = await this.testSessionManagement(baseUrl);
    vulnerabilities.push(...sessionVulns);

    const authBypassVulns = await this.testAuthBypass(baseUrl);
    vulnerabilities.push(...authBypassVulns);

    const bruteForceVulns = await this.testBruteForceProtection(baseUrl);
    if (bruteForceVulns.length === 0) {
      vulnerabilities.push({
        title: 'Missing Brute Force Protection',
        description: 'No rate limiting or account lockout mechanism detected',
        severity: 'MEDIUM',
        status: 'OPEN',
        cweId: 'CWE-307',
        owaspCategory: 'A07_AUTHENTICATION_FAILURES',
        remediation: 'Implement account lockout, CAPTCHA, or rate limiting after failed login attempts.',
        remediationUrl: 'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#account-lockout',
      });
    }

    return { vulnerabilities, targets };
  }

  private async findLoginEndpoints(baseUrl: string): Promise<{ url: string; method: string }[]> {
    const commonPaths = [
      '/login',
      '/signin',
      '/auth/login',
      '/auth/signin',
      '/admin/login',
      '/wp-login.php',
      '/api/auth/login',
      '/api/v1/auth/login',
      '/auth',
      '/account/login',
    ];

    const endpoints: { url: string; method: string }[] = [];

    for (const path of commonPaths) {
      try {
        const url = new URL(path, baseUrl).href;
        const response = await fetch(url, {
          method: 'HEAD',
          headers: { 'User-Agent': 'QADash-SecurityScanner/1.0' },
          signal: AbortSignal.timeout(3000),
          redirect: 'manual',
        });

        if (response.status >= 200 && response.status < 400) {
          endpoints.push({ url, method: 'POST' });
        }
      } catch {
        continue;
      }
    }

    return endpoints;
  }

  private async testDefaultCredentials(
    url: string,
    method: string,
  ): Promise<VulnerabilityResult[]> {
    const vulnerabilities: VulnerabilityResult[] = [];

    for (const cred of DEFAULT_CREDENTIALS) {
      try {
        const formData = new URLSearchParams();
        formData.append('username', cred.user);
        formData.append('password', cred.pass);
        formData.append('email', cred.user);
        formData.append('login', 'Login');

        const response = await fetch(url, {
          method,
          body: formData.toString(),
          headers: {
            'User-Agent': 'QADash-SecurityScanner/1.0',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          redirect: 'manual',
          credentials: 'include',
          signal: AbortSignal.timeout(5000),
        });

        const setCookie = response.headers.get('set-cookie');
        const location = response.headers.get('location');

        if (
          response.status === 302 ||
          response.status === 303 ||
          (setCookie && setCookie.includes('session')) ||
          (location && !location.includes('login') && !location.includes('error'))
        ) {
          vulnerabilities.push({
            title: 'Default Credentials',
            description: `Authentication successful with default credentials: ${cred.user}:${cred.pass}`,
            severity: 'CRITICAL',
            status: 'OPEN',
            cweId: 'CWE-798',
            owaspCategory: 'A07_AUTHENTICATION_FAILURES',
            affectedUrl: url,
            evidence: { username: cred.user, password: cred.pass, status: response.status },
            remediation: 'Change default credentials immediately. Enforce strong password policy.',
          });
          break;
        }
      } catch {
        continue;
      }
    }

    return vulnerabilities;
  }

  private async testSessionManagement(baseUrl: string): Promise<VulnerabilityResult[]> {
    const vulnerabilities: VulnerabilityResult[] = [];

    try {
      const response1 = await fetch(baseUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'QADash-SecurityScanner/1.0' },
        credentials: 'include',
        signal: AbortSignal.timeout(5000),
      });

      const cookies1 = response1.headers.get('set-cookie') || '';
      const sessionId1 = this.extractSessionId(cookies1);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response2 = await fetch(baseUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'QADash-SecurityScanner/1.0' },
        credentials: 'include',
        signal: AbortSignal.timeout(5000),
      });

      const cookies2 = response2.headers.get('set-cookie') || '';
      const sessionId2 = this.extractSessionId(cookies2);

      if (sessionId1 && sessionId2 && sessionId1 === sessionId2) {
        vulnerabilities.push({
          title: 'Predictable Session ID',
          description: 'Session ID does not change between requests, potential for session fixation',
          severity: 'MEDIUM',
          status: 'OPEN',
          cweId: 'CWE-384',
          owaspCategory: 'A07_AUTHENTICATION_FAILURES',
          remediation: 'Regenerate session ID after login. Implement secure session management.',
        });
      }

      if (!cookies1.includes('Secure') || !cookies1.includes('HttpOnly')) {
        vulnerabilities.push({
          title: 'Insecure Cookie Flags',
          description: 'Session cookie missing Secure or HttpOnly flags',
          severity: 'MEDIUM',
          status: 'OPEN',
          cweId: 'CWE-614',
          owaspCategory: 'A05_SECURITY_MISCONFIGURATION',
          affectedUrl: baseUrl,
          evidence: { cookies: cookies1 },
          remediation: 'Set Secure and HttpOnly flags on session cookies.',
        });
      }
    } catch {
      // Ignore errors
    }

    return vulnerabilities;
  }

  private extractSessionId(cookies: string): string | null {
    const sessionMatch = cookies.match(/session[id]?=[^;]+/i);
    return sessionMatch ? sessionMatch[0] : null;
  }

  private async testAuthBypass(baseUrl: string): Promise<VulnerabilityResult[]> {
    const vulnerabilities: VulnerabilityResult[] = [];

    const sensitivePaths = [
      '/admin',
      '/admin/dashboard',
      '/admin/users',
      '/api/admin',
      '/api/v1/admin',
      '/administrator',
      '/phpmyadmin',
      '/wp-admin',
      '/.git/config',
      '/.env',
    ];

    for (const path of sensitivePaths) {
      try {
        const url = new URL(path, baseUrl).href;
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'User-Agent': 'QADash-SecurityScanner/1.0' },
          signal: AbortSignal.timeout(5000),
        });

        if (response.status === 200) {
          vulnerabilities.push({
            title: 'Broken Access Control',
            description: `Sensitive endpoint accessible without authentication: ${path}`,
            severity: 'HIGH',
            status: 'OPEN',
            cweId: 'CWE-284',
            owaspCategory: 'A01_BROKEN_ACCESS_CONTROL',
            affectedUrl: url,
            evidence: { status: response.status },
            remediation: 'Implement proper authorization checks on all sensitive endpoints.',
          });
        }
      } catch {
        continue;
      }
    }

    return vulnerabilities;
  }

  private async testBruteForceProtection(baseUrl: string): Promise<VulnerabilityResult[]> {
    const vulnerabilities: VulnerabilityResult[] = [];
    const loginEndpoints = await this.findLoginEndpoints(baseUrl);

    if (loginEndpoints.length === 0) return vulnerabilities;

    const endpoint = loginEndpoints[0];
    let failedAttempts = 0;

    for (let i = 0; i < 10; i++) {
      try {
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          body: `username=test${i}&password=test`,
          headers: {
            'User-Agent': 'QADash-SecurityScanner/1.0',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          signal: AbortSignal.timeout(3000),
        });

        if (response.status === 429 || response.headers.get('x-rate-limit')) {
          return vulnerabilities;
        }

        if (response.status >= 400) {
          failedAttempts++;
        }
      } catch {
        continue;
      }
    }

    return vulnerabilities;
  }
}