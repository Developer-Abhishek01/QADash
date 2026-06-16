import { Injectable } from '@nestjs/common';
import { SqlInjectionScanner } from './sql-injection.scanner';
import { XssScanner } from './xss.scanner';
import { AuthScanner } from './auth.scanner';
import { HeaderScanner } from './header.scanner';
import { JwtScanner } from './jwt.scanner';
import { ApiSecurityScanner } from './api-security.scanner';
import { OwaspZapScanner } from './owasp-zap.scanner';
import { DependencyScanner } from './dependency.scanner';

export interface ScanResult {
  vulnerabilities: VulnerabilityResult[];
  targets: TargetResult[];
  counts: { critical: number; high: number; medium: number; low: number; info: number };
  duration: number;
}

export interface VulnerabilityResult {
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  status: 'OPEN' | 'CONFIRMED';
  cweId?: string;
  cveId?: string;
  owaspCategory?: string;
  affectedUrl?: string;
  affectedParam?: string;
  evidence?: Record<string, unknown>;
  remediation?: string;
  remediationUrl?: string;
}

export interface TargetResult {
  url: string;
  method?: string;
  status?: number;
  responseTime?: number;
  isSecure: boolean;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  errors?: string[];
}

@Injectable()
export class SecurityScannerService {
  constructor(
    private readonly sqlInjectionScanner: SqlInjectionScanner,
    private readonly xssScanner: XssScanner,
    private readonly authScanner: AuthScanner,
    private readonly headerScanner: HeaderScanner,
    private readonly jwtScanner: JwtScanner,
    private readonly apiSecurityScanner: ApiSecurityScanner,
    private readonly owaspZapScanner: OwaspZapScanner,
    private readonly dependencyScanner: DependencyScanner,
  ) {}

  async runSecurityScan(
    scanId: string,
    baseUrl: string,
    config: Record<string, unknown>,
    scanType: string,
  ): Promise<ScanResult> {
    const startTime = Date.now();
    const vulnerabilities: VulnerabilityResult[] = [];
    const targets: TargetResult[] = [];

    const activeScanners = this.getActiveScanners(scanType, config);

    for (const scanner of activeScanners) {
      const results = await scanner.scan(scanId, baseUrl, config);
      vulnerabilities.push(...results.vulnerabilities);
      targets.push(...results.targets);
    }

    const counts = this.calculateCounts(vulnerabilities);

    return {
      vulnerabilities,
      targets,
      counts,
      duration: Date.now() - startTime,
    };
  }

  private getActiveScanners(scanType: string, config: Record<string, unknown>) {
    const scannerMap: Record<string, any> = {
      SQL_INJECTION: this.sqlInjectionScanner,
      XSS: this.xssScanner,
      AUTH: this.authScanner,
      HEADERS: this.headerScanner,
      JWT: this.jwtScanner,
      API: this.apiSecurityScanner,
      OWASP_ZAP: this.owaspZapScanner,
    };

    if (scanType === 'QUICK') {
      return [this.headerScanner, this.authScanner];
    }

    if (scanType === 'FULL') {
      return [
        this.owaspZapScanner,
        this.sqlInjectionScanner,
        this.xssScanner,
        this.authScanner,
        this.headerScanner,
        this.jwtScanner,
        this.apiSecurityScanner,
      ];
    }

    if (scanType === 'AUTHENTICATION') {
      return [this.authScanner, this.jwtScanner];
    }

    if (scanType === 'API') {
      return [this.apiSecurityScanner, this.jwtScanner];
    }

    return [this.headerScanner];
  }

  private calculateCounts(vulnerabilities: VulnerabilityResult[]) {
    return {
      critical: vulnerabilities.filter((v) => v.severity === 'CRITICAL').length,
      high: vulnerabilities.filter((v) => v.severity === 'HIGH').length,
      medium: vulnerabilities.filter((v) => v.severity === 'MEDIUM').length,
      low: vulnerabilities.filter((v) => v.severity === 'LOW').length,
      info: vulnerabilities.filter((v) => v.severity === 'INFO').length,
    };
  }

  async runDependencyScan(
    scanId: string,
    packageManager: string,
  ): Promise<{
    totalPackages: number;
    vulnerablePackages: number;
    counts: { critical: number; high: number; medium: number; low: number };
    dependencies: Record<string, unknown>[];
  }> {
    return this.dependencyScanner.scan(scanId, packageManager);
  }
}