import { Injectable, Logger } from '@nestjs/common';
import { VulnerabilityResult, TargetResult } from './scanner.service';

const SENSITIVE_PARAMS = [
  'password',
  'secret',
  'token',
  'api_key',
  'apikey',
  'access_token',
  'auth',
  'credential',
  'private_key',
  'session_id',
];

@Injectable()
export class ApiSecurityScanner {
  private readonly logger = new Logger(ApiSecurityScanner.name);

  async scan(
    _scanId: string,
    baseUrl: string,
    config: Record<string, unknown>,
  ): Promise<{ vulnerabilities: VulnerabilityResult[]; targets: TargetResult[] }> {
    const vulnerabilities: VulnerabilityResult[] = [];
    const targets: TargetResult[] = [];

    const endpoints = await this.discoverEndpoints(baseUrl);
    for (const endpoint of endpoints) {
      const result = await this.testEndpoint(endpoint, config);
      vulnerabilities.push(...result.vulnerabilities);
      targets.push(...result.targets);
    }

    const idorVulns = await this.testIdor(baseUrl, endpoints);
    vulnerabilities.push(...idorVulns);

    const rateLimitVulns = await this.testRateLimiting(baseUrl, endpoints);
    if (rateLimitVulns.length === 0) {
      vulnerabilities.push({
        title: 'Missing API Rate Limiting',
        description: 'No rate limiting detected on API endpoints',
        severity: 'MEDIUM',
        status: 'OPEN',
        cweId: 'CWE-770',
        owaspCategory: 'A04_INSECURE_DESIGN',
        remediation: 'Implement rate limiting to prevent abuse.',
      });
    }

    return { vulnerabilities, targets };
  }

  private async discoverEndpoints(baseUrl: string): Promise<{ url: string; method: string }[]> {
    const endpoints: { url: string; method: string }[] = [];
    const commonPaths = [
      '/api',
      '/api/v1',
      '/api/v2',
      '/api/users',
      '/api/products',
      '/api/orders',
      '/api/admin',
      '/api/auth',
      '/graphql',
      '/rest',
      '/api/search',
      '/api/config',
    ];

    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    for (const path of commonPaths) {
      for (const method of methods) {
        try {
          const url = new URL(path, baseUrl).href;
          const response = await fetch(url, {
            method: 'OPTIONS',
            headers: { 'User-Agent': 'QADash-SecurityScanner/1.0' },
            signal: AbortSignal.timeout(3000),
          });

          const allow = response.headers.get('allow')?.split(',').map((m) => m.trim()) || [];
          if (allow.length > 0) {
            for (const m of allow) {
              if (methods.includes(m.toUpperCase())) {
                endpoints.push({ url, method: m.toUpperCase() });
              }
            }
          } else if (response.status !== 404) {
            endpoints.push({ url, method: 'GET' });
          }
        } catch {
          continue;
        }
      }
    }

    return endpoints.slice(0, 20);
  }

  private async testEndpoint(
    endpoint: { url: string; method: string },
    config: Record<string, unknown>,
  ): Promise<{ vulnerabilities: VulnerabilityResult[]; targets: TargetResult[] }> {
    const vulnerabilities: VulnerabilityResult[] = [];
    const targets: TargetResult[] = [];

    try {
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: { 'User-Agent': 'QADash-SecurityScanner/1.0' },
        signal: AbortSignal.timeout(5000),
      });

      targets.push({
        url: endpoint.url,
        method: endpoint.method,
        status: response.status,
        isSecure: response.status < 400,
      });

      if (response.status === 200) {
        const body = await response.text();

        if (this.containsSensitiveData(body)) {
          vulnerabilities.push({
            title: 'Sensitive Data Exposure in API Response',
            description: 'API response contains potentially sensitive data',
            severity: 'HIGH',
            status: 'OPEN',
            cweId: 'CWE-200',
            owaspCategory: 'A01_BROKEN_ACCESS_CONTROL',
            affectedUrl: endpoint.url,
            evidence: { contentLength: body.length },
            remediation: 'Implement proper data classification and access controls.',
          });
        }

        const hasPagination = body.includes('total') || body.includes('page') || body.includes('limit');
        if (!hasPagination && (body.includes('[') || body.includes('{'))) {
          vulnerabilities.push({
            title: 'Missing API Pagination',
            description: 'API may return all records without pagination',
            severity: 'MEDIUM',
            status: 'OPEN',
            cweId: 'CWE-770',
            owaspCategory: 'A04_INSECURE_DESIGN',
            affectedUrl: endpoint.url,
            remediation: 'Implement pagination to prevent DoS and improve performance.',
          });
        }
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json') && response.status === 200) {
        vulnerabilities.push({
          title: 'Missing Content-Type Header',
          description: 'API response missing proper Content-Type header',
          severity: 'LOW',
          status: 'OPEN',
          cweId: 'CWE-693',
          owaspCategory: 'A05_SECURITY_MISCONFIGURATION',
          affectedUrl: endpoint.url,
          remediation: 'Set appropriate Content-Type headers for API responses.',
        });
      }

      if (endpoint.method !== 'GET') {
        const cors = response.headers.get('access-control-allow-origin');
        if (!cors) {
          vulnerabilities.push({
            title: 'Missing CORS Configuration',
            description: 'API lacks CORS headers',
            severity: 'LOW',
            status: 'OPEN',
            cweId: 'CWE-346',
            owaspCategory: 'A05_SECURITY_MISCONFIGURATION',
            affectedUrl: endpoint.url,
            remediation: 'Implement proper CORS configuration.',
          });
        } else if (cors === '*') {
          vulnerabilities.push({
            title: 'Overly Permissive CORS',
            description: 'API allows all origins (*)',
            severity: 'MEDIUM',
            status: 'OPEN',
            cweId: 'CWE-346',
            owaspCategory: 'A05_SECURITY_MISCONFIGURATION',
            affectedUrl: endpoint.url,
            remediation: 'Restrict CORS to specific trusted origins.',
          });
        }
      }
    } catch (error) {
      targets.push({
        url: endpoint.url,
        method: endpoint.method,
        isSecure: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    }

    return { vulnerabilities, targets };
  }

  private containsSensitiveData(body: string): boolean {
    const patterns = [
      /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/, // SSN
      /\b\d{16}\b/, // Credit card
      /password["\s]*[:=]["\s]*[^\s,"]+/i,
      /secret["\s]*[:=]["\s]*[^\s,"]+/i,
      /api[_-]?key["\s]*[:=]["\s]*[^\s,"]+/i,
      /token["\s]*[:=]["\s]*[^\s,"]+/i,
    ];

    for (const pattern of patterns) {
      if (pattern.test(body)) return true;
    }

    return false;
  }

  private async testIdor(
    baseUrl: string,
    endpoints: { url: string; method: string }[],
  ): Promise<VulnerabilityResult[]> {
    const vulnerabilities: VulnerabilityResult[] = [];

    const numericEndpoints = endpoints.filter((e) => e.url.match(/\/\d+(\/|$)/));
    if (numericEndpoints.length === 0) return vulnerabilities;

    const testIds = [1, 2, 0, -1, 999999999];

    for (const endpoint of numericEndpoints.slice(0, 5)) {
      for (const id of testIds) {
        try {
          const url = endpoint.url.replace(/\/\d+(\/|$)/, `/${id}$1`);
          const response = await fetch(url, {
            method: endpoint.method,
            headers: { 'User-Agent': 'QADash-SecurityScanner/1.0' },
            signal: AbortSignal.timeout(3000),
          });

          if (response.status === 200) {
            const nextEndpoint = endpoint.url.replace(/\/\d+(\/|$)/, `/${id + 1}$1`);
            const response2 = await fetch(nextEndpoint, {
              method: endpoint.method,
              headers: { 'User-Agent': 'QADash-SecurityScanner/1.0' },
              signal: AbortSignal.timeout(3000),
            });

            if (response.status !== response2.status || response.status === 200) {
              vulnerabilities.push({
                title: 'Insecure Direct Object Reference (IDOR)',
                description: `Potential IDOR vulnerability allowing access to resource ${id}`,
                severity: 'HIGH',
                status: 'OPEN',
                cweId: 'CWE-639',
                owaspCategory: 'A01_BROKEN_ACCESS_CONTROL',
                affectedUrl: url,
                evidence: { id, status: response.status },
                remediation: 'Implement proper authorization checks for all resource access.',
              });
              break;
            }
          }
        } catch {
          continue;
        }
      }
    }

    return vulnerabilities;
  }

  private async testRateLimiting(
    baseUrl: string,
    endpoints: { url: string; method: string }[],
  ): Promise<VulnerabilityResult[]> {
    const vulnerabilities: VulnerabilityResult[] = [];

    if (endpoints.length === 0) return vulnerabilities;

    const endpoint = endpoints[0];

    for (let i = 0; i < 20; i++) {
      try {
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            'User-Agent': 'QADash-SecurityScanner/1.0',
            'X-Request-ID': `test-${i}`,
          },
          signal: AbortSignal.timeout(2000),
        });

        if (response.status === 429) {
          return vulnerabilities;
        }

        const rateLimitHeader = response.headers.get('x-rate-limit') ||
          response.headers.get('ratelimit-limit');

        if (rateLimitHeader) {
          return vulnerabilities;
        }
      } catch {
        continue;
      }
    }

    return vulnerabilities;
  }
}