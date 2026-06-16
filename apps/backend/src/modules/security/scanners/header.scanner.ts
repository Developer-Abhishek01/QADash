import { Injectable, Logger } from '@nestjs/common';
import { VulnerabilityResult, TargetResult } from './scanner.service';

interface SecurityHeader {
  name: string;
  expected?: string;
  recommended?: boolean;
}

const REQUIRED_HEADERS: SecurityHeader[] = [
  { name: 'Strict-Transport-Security', expected: 'max-age=' },
  { name: 'Content-Security-Policy' },
  { name: 'X-Content-Type-Options', expected: 'nosniff' },
  { name: 'X-Frame-Options' },
  { name: 'X-XSS-Protection' },
  { name: 'Referrer-Policy' },
  { name: 'Permissions-Policy' },
];

const RECOMMENDED_HEADERS: SecurityHeader[] = [
  { name: 'Cache-Control' },
  { name: 'Pragma' },
  { name: 'Expires' },
  { name: 'Set-Cookie', expected: 'HttpOnly' },
  { name: 'Set-Cookie', expected: 'Secure' },
];

@Injectable()
export class HeaderScanner {
  private readonly logger = new Logger(HeaderScanner.name);

  async scan(
    _scanId: string,
    baseUrl: string,
    _config: Record<string, unknown>,
  ): Promise<{ vulnerabilities: VulnerabilityResult[]; targets: TargetResult[] }> {
    const vulnerabilities: VulnerabilityResult[] = [];
    const targets: TargetResult[] = [];

    try {
      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'QADash-SecurityScanner/1.0' },
        signal: AbortSignal.timeout(10000),
      });

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      targets.push({
        url: baseUrl,
        method: 'GET',
        status: response.status,
        isSecure: true,
        headers,
      });

      for (const header of REQUIRED_HEADERS) {
        const headerValue = headers[header.name.toLowerCase()];

        if (!headerValue) {
          vulnerabilities.push({
            title: `Missing Security Header: ${header.name}`,
            description: `The ${header.name} header is not set. This header helps protect against common web vulnerabilities.`,
            severity: 'HIGH',
            status: 'OPEN',
            cweId: 'CWE-693',
            owaspCategory: 'A05_SECURITY_MISCONFIGURATION',
            affectedUrl: baseUrl,
            evidence: { header: header.name },
            remediation: `Add the ${header.name} header to your server configuration.`,
            remediationUrl: 'https://owasp.org/www-project-secure-headers/',
          });
        } else if (header.expected && !headerValue.toLowerCase().includes(header.expected.toLowerCase())) {
          vulnerabilities.push({
            title: `Insecure ${header.name} Configuration`,
            description: `The ${header.name} header is set but doesn't include recommended value: ${header.expected}`,
            severity: 'MEDIUM',
            status: 'OPEN',
            cweId: 'CWE-693',
            owaspCategory: 'A05_SECURITY_MISCONFIGURATION',
            affectedUrl: baseUrl,
            evidence: { header: header.name, value: headerValue },
            remediation: `Configure ${header.name} with proper values.`,
          });
        }
      }

      for (const header of RECOMMENDED_HEADERS) {
        const headerValue = headers[header.name.toLowerCase()];

        if (header.name === 'Set-Cookie') {
          if (headerValue) {
            if (!headerValue.toLowerCase().includes('httponly')) {
              vulnerabilities.push({
                title: 'Missing HttpOnly Flag on Cookie',
                description: 'Session cookies should have HttpOnly flag to prevent XSS access',
                severity: 'MEDIUM',
                status: 'OPEN',
                cweId: 'CWE-1004',
                owaspCategory: 'A05_SECURITY_MISCONFIGURATION',
                affectedUrl: baseUrl,
                evidence: { cookie: headerValue },
                remediation: 'Add HttpOnly flag to cookie settings.',
              });
            }

            if (!headerValue.toLowerCase().includes('secure')) {
              vulnerabilities.push({
                title: 'Missing Secure Flag on Cookie',
                description: 'Session cookies should have Secure flag for HTTPS-only transmission',
                severity: 'MEDIUM',
                status: 'OPEN',
                cweId: 'CWE-614',
                owaspCategory: 'A05_SECURITY_MISCONFIGURATION',
                affectedUrl: baseUrl,
                evidence: { cookie: headerValue },
                remediation: 'Add Secure flag to cookie settings.',
              });
            }
          }
        } else if (!headerValue) {
          vulnerabilities.push({
            title: `Missing Recommended Header: ${header.name}`,
            description: `The ${header.name} header is not set.`,
            severity: 'LOW',
            status: 'OPEN',
            owaspCategory: 'A05_SECURITY_MISCONFIGURATION',
            affectedUrl: baseUrl,
            remediation: `Consider adding ${header.name} header.`,
          });
        }
      }

      const xPoweredBy = headers['x-powered-by'] || headers['x-aspnet-version'];
      if (xPoweredBy) {
        vulnerabilities.push({
          title: 'Information Disclosure - Server Technology',
          description: `Server reveals version information via ${xPoweredBy.includes('x-powered-by') ? 'X-Powered-By' : 'X-AspNet-Version'} header`,
          severity: 'INFO',
          status: 'OPEN',
          cweId: 'CWE-200',
          owaspCategory: 'A01_BROKEN_ACCESS_CONTROL',
          affectedUrl: baseUrl,
          evidence: { header: xPoweredBy },
          remediation: 'Remove version headers from server configuration.',
        });
      }

      if (!headers['strict-transport-security']) {
        vulnerabilities.push({
          title: 'Missing HSTS Header',
          description: 'HTTP Strict Transport Security (HSTS) is not enabled',
          severity: 'HIGH',
          status: 'OPEN',
          cweId: 'CWE-345',
          owaspCategory: 'A02_CRYPTOGRAPHIC_FAILURES',
          affectedUrl: baseUrl,
          remediation: 'Enable HSTS with a long max-age and include subdomains.',
        });
      }

      if (!headers['content-security-policy']) {
        vulnerabilities.push({
          title: 'Missing Content Security Policy',
          description: 'Content Security Policy (CSP) is not configured',
          severity: 'HIGH',
          status: 'OPEN',
          cweId: 'CWE-346',
          owaspCategory: 'A03_INJECTION',
          affectedUrl: baseUrl,
          remediation: 'Implement a Content Security Policy to prevent XSS and data injection attacks.',
        });
      }

      if (headers['x-frame-options']?.toLowerCase() !== 'deny' && headers['x-frame-options']?.toLowerCase() !== 'sameorigin') {
        vulnerabilities.push({
          title: 'Weak X-Frame-Options Configuration',
          description: 'X-Frame-Options should be set to DENY or SAMEORIGIN',
          severity: 'MEDIUM',
          status: 'OPEN',
          cweId: 'CWE-346',
          owaspCategory: 'A01_BROKEN_ACCESS_CONTROL',
          affectedUrl: baseUrl,
          evidence: { value: headers['x-frame-options'] },
          remediation: 'Set X-Frame-Options to DENY or SAMEORIGIN.',
        });
      }
    } catch (error) {
      targets.push({
        url: baseUrl,
        isSecure: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    }

    return { vulnerabilities, targets };
  }
}