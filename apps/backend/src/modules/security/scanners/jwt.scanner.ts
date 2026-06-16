import { Injectable, Logger } from '@nestjs/common';
import { VulnerabilityResult, TargetResult } from './scanner.service';

interface JwtHeader {
  alg: string;
  typ?: string;
}

interface JwtPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [key: string]: unknown;
}

@Injectable()
export class JwtScanner {
  private readonly logger = new Logger(JwtScanner.name);

  async scan(
    _scanId: string,
    baseUrl: string,
    _config: Record<string, unknown>,
  ): Promise<{ vulnerabilities: VulnerabilityResult[]; targets: TargetResult[] }> {
    const vulnerabilities: VulnerabilityResult[] = [];
    const targets: TargetResult[] = [];

    try {
      const authEndpoints = [
        `${baseUrl}/api/auth/login`,
        `${baseUrl}/api/login`,
        `${baseUrl}/auth/login`,
        `${baseUrl}/login`,
        `${baseUrl}/api/auth/token`,
        `${baseUrl}/api/token`,
      ];

      for (const endpoint of authEndpoints) {
        const result = await this.testJwtEndpoint(endpoint);
        vulnerabilities.push(...result.vulnerabilities);
        targets.push(...result.targets);
      }

      const tokenVulns = await this.extractAndAnalyzeTokens(baseUrl);
      vulnerabilities.push(...tokenVulns);
    } catch (error) {
      this.logger.error(`JWT scan error: ${error}`);
    }

    return { vulnerabilities, targets };
  }

  private async testJwtEndpoint(
    url: string,
  ): Promise<{ vulnerabilities: VulnerabilityResult[]; targets: TargetResult[] }> {
    const vulnerabilities: VulnerabilityResult[] = [];
    const targets: TargetResult[] = [];

    try {
      const testCredentials = [
        { user: 'admin', pass: 'admin' },
        { user: 'test', pass: 'test' },
      ];

      for (const cred of testCredentials) {
        const response = await fetch(url, {
          method: 'POST',
          body: JSON.stringify(cred),
          headers: {
            'User-Agent': 'QADash-SecurityScanner/1.0',
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        });

        const body = await response.text();

        targets.push({
          url,
          method: 'POST',
          status: response.status,
          isSecure: true,
        });

        const token = this.extractToken(response.headers.get('authorization') || '', body);
        if (token) {
          const analysis = this.analyzeJwt(token);
          vulnerabilities.push(...analysis);
        }
      }
    } catch {
      // Ignore errors
    }

    return { vulnerabilities, targets };
  }

  private extractToken(authHeader: string, body: string): string | null {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    try {
      const json = JSON.parse(body);
      if (json.token) return json.token;
      if (json.access_token) return json.access_token;
      if (json.jwt) return json.jwt;
      if (json.data?.token) return json.data.token;
    } catch {
      // Not JSON
    }

    const tokenMatch = body.match(/"token"\s*:\s*"([^"]+)"/);
    if (tokenMatch) return tokenMatch[1];

    return null;
  }

  private analyzeJwt(token: string): VulnerabilityResult[] {
    const vulnerabilities: VulnerabilityResult[] = [];

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        vulnerabilities.push({
          title: 'Invalid JWT Format',
          description: 'JWT does not have correct structure (3 parts)',
          severity: 'HIGH',
          status: 'OPEN',
          cweId: 'CWE-345',
          owaspCategory: 'A07_AUTHENTICATION_FAILURES',
          remediation: 'Use standard JWT format with header.payload.signature',
        });
        return vulnerabilities;
      }

      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString()) as JwtHeader;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString()) as JwtPayload;

      if (header.alg === 'none') {
        vulnerabilities.push({
          title: 'JWT Algorithm Confusion - "none"',
          description: 'JWT uses "none" algorithm which bypasses signature verification',
          severity: 'CRITICAL',
          status: 'OPEN',
          cweId: 'CWE-347',
          owaspCategory: 'A02_CRYPTOGRAPHIC_FAILURES',
          evidence: { algorithm: 'none' },
          remediation: 'Remove JWTs with "none" algorithm. Use RS256 or ES256.',
        });
      }

      if (header.alg.startsWith('HS') && header.alg !== 'HS256') {
        vulnerabilities.push({
          title: 'Weak JWT Algorithm',
          description: `JWT uses weak symmetric algorithm: ${header.alg}`,
          severity: 'MEDIUM',
          status: 'OPEN',
          cweId: 'CWE-331',
          owaspCategory: 'A02_CRYPTOGRAPHIC_FAILURES',
          evidence: { algorithm: header.alg },
          remediation: 'Use asymmetric algorithms like RS256 or ES256.',
        });
      }

      if (header.alg === 'HS256' || header.alg === 'HS384' || header.alg === 'HS512') {
        vulnerabilities.push({
          title: 'Symmetric JWT Algorithm',
          description: `Using symmetric algorithm ${header.alg} - ensure secret is strong`,
          severity: 'INFO',
          status: 'OPEN',
          evidence: { algorithm: header.alg },
          remediation: 'Use strong secret keys (256+ bits) with HS algorithms.',
        });
      }

      if (payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        const expiryDate = new Date(payload.exp * 1000).toISOString();

        if (payload.exp < now) {
          vulnerabilities.push({
            title: 'Expired JWT Token',
            description: `JWT token expired at ${expiryDate}`,
            severity: 'MEDIUM',
            status: 'OPEN',
            cweId: 'CWE-613',
            owaspCategory: 'A07_AUTHENTICATION_FAILURES',
            evidence: { expiredAt: expiryDate },
            remediation: 'Implement proper token refresh mechanism.',
          });
        }
      } else {
        vulnerabilities.push({
          title: 'JWT Without Expiration',
          description: 'JWT token has no expiration time (exp claim)',
          severity: 'HIGH',
          status: 'OPEN',
          cweId: 'CWE-613',
          owaspCategory: 'A07_AUTHENTICATION_FAILURES',
          remediation: 'Always set exp claim for JWT tokens.',
        });
      }

      if (!payload.iat) {
        vulnerabilities.push({
          title: 'JWT Without Issued At',
          description: 'JWT token has no issued at time (iat claim)',
          severity: 'LOW',
          status: 'OPEN',
          remediation: 'Add iat claim for token tracking.',
        });
      }

      if (!payload.iss) {
        vulnerabilities.push({
          title: 'JWT Without Issuer',
          description: 'JWT token has no issuer claim',
          severity: 'LOW',
          status: 'OPEN',
          remediation: 'Add iss claim for token source validation.',
        });
      }
    } catch (error) {
      vulnerabilities.push({
        title: 'Invalid JWT Structure',
        description: 'Unable to parse JWT token',
        severity: 'HIGH',
        status: 'OPEN',
        cweId: 'CWE-345',
        owaspCategory: 'A07_AUTHENTICATION_FAILURES',
        evidence: { error: String(error) },
      });
    }

    return vulnerabilities;
  }

  private async extractAndAnalyzeTokens(baseUrl: string): Promise<VulnerabilityResult[]> {
    const vulnerabilities: VulnerabilityResult[] = [];

    try {
      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'QADash-SecurityScanner/1.0' },
        signal: AbortSignal.timeout(5000),
      });

      const authHeader = response.headers.get('authorization') || '';
      const token = this.extractToken(authHeader, '');

      if (token) {
        const analysis = this.analyzeJwt(token);
        vulnerabilities.push(...analysis);
      }
    } catch {
      // Ignore
    }

    return vulnerabilities;
  }
}