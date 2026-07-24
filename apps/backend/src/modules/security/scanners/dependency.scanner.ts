import { exec } from 'child_process';
import { promisify } from 'util';

import { Injectable, Logger } from '@nestjs/common';

const execAsync = promisify(exec);

export interface DependencyResult {
  name: string;
  version: string;
  currentVersion?: string;
  isVulnerable: boolean;
  vulnerabilities: { id: string; severity: string; title: string; cwe?: string }[];
}

@Injectable()
export class DependencyScanner {
  private readonly logger = new Logger(DependencyScanner.name);

  async scan(
    scanId: string,
    packageManager: string,
    targetPath?: string,
  ): Promise<{
    totalPackages: number;
    vulnerablePackages: number;
    counts: { critical: number; high: number; medium: number; low: number };
    dependencies: DependencyResult[];
  }> {
    this.logger.log(`Running dependency scan for ${packageManager} (scan: ${scanId})`);
    const deps = await this.runRealScan(packageManager, targetPath);
    return {
      totalPackages: deps.length,
      vulnerablePackages: deps.filter((d) => d.isVulnerable).length,
      counts: this.calculateCounts(deps),
      dependencies: deps,
    };
  }

  private async runRealScan(packageManager: string, targetPath?: string): Promise<DependencyResult[]> {
    const cwd = targetPath || process.cwd();

    switch (packageManager) {
      case 'npm':
        return this.scanNpm(cwd);
      case 'pip':
        return this.scanPip(cwd);
      case 'maven':
        return this.scanMaven(cwd);
      default:
        this.logger.warn(`Unknown package manager: ${packageManager}, falling back to npm scan`);
        return this.scanNpm(cwd);
    }
  }

  private async scanNpm(cwd: string): Promise<DependencyResult[]> {
    try {
      const { stdout } = await execAsync('npm audit --json', { cwd, timeout: 60000 });
      const audit = JSON.parse(stdout);
      const deps: DependencyResult[] = [];

      if (audit.vulnerabilities) {
        for (const [name, vuln] of Object.entries(audit.vulnerabilities)) {
          const v = vuln as any;
          deps.push({
            name,
            version: v.via?.[0]?.split(' ')[0] || '',
            isVulnerable: true,
            vulnerabilities: (v.via || []).map((item: any) => ({
              id: typeof item === 'string' ? item : item.source || item.title || 'unknown',
              severity: v.severity?.toUpperCase() || 'MEDIUM',
              title: typeof item === 'string' ? item : item.title || item.source || 'Unknown vulnerability',
            })),
          });
        }
      }
      return deps;
    } catch (err: any) {
      if (err.stderr?.includes('ENOAUDIT')) {
        this.logger.warn('npm audit not supported (ENOAUDIT), no packages published yet');
        return [];
      }
      this.logger.error(`npm audit failed: ${err.message}`);
      return [];
    }
  }

  private async scanPip(cwd: string): Promise<DependencyResult[]> {
    try {
      const { stdout } = await execAsync('pip-audit --json', { cwd, timeout: 60000 });
      const audit = JSON.parse(stdout);
      return (audit.dependencies || []).map((dep: any) => ({
        name: dep.name,
        version: dep.version,
        isVulnerable: (dep.vulnerabilities || []).length > 0,
        vulnerabilities: (dep.vulnerabilities || []).map((v: any) => ({
          id: v.id || 'unknown',
          severity: v.severity?.toUpperCase() || 'MEDIUM',
          title: v.description || v.id || 'Unknown vulnerability',
        })),
      }));
    } catch {
      this.logger.warn('pip-audit not available, try: pip install pip-audit');
      return [];
    }
  }

  private async scanMaven(cwd: string): Promise<DependencyResult[]> {
    try {
      const { stdout } = await execAsync(
        'mvn dependency-check:check -Dformat=JSON 2>&1 || true',
        { cwd, timeout: 300000 },
      );
      const reportPath = `${cwd}/target/dependency-check-report.json`;
      const fs = await import('fs');
      if (fs.existsSync(reportPath)) {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
        return (report.dependencies || []).map((dep: any) => ({
          name: dep.fileName || dep.packageName || 'unknown',
          version: dep.version || '',
          isVulnerable: (dep.vulnerabilities || []).length > 0,
          vulnerabilities: (dep.vulnerabilities || []).map((v: any) => ({
            id: v.name || v.cve || 'unknown',
            severity: v.severity?.toUpperCase() || 'MEDIUM',
            title: v.description || v.name || 'Unknown vulnerability',
          })),
        }));
      }
      return [];
    } catch {
      this.logger.warn('Maven dependency-check not available');
      return [];
    }
  }

  private calculateCounts(dependencies: DependencyResult[]): { critical: number; high: number; medium: number; low: number } {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };

    for (const dep of dependencies) {
      for (const vuln of dep.vulnerabilities) {
        switch (vuln.severity?.toUpperCase()) {
          case 'CRITICAL': counts.critical++; break;
          case 'HIGH': counts.high++; break;
          case 'MEDIUM': counts.medium++; break;
          case 'LOW': counts.low++; break;
        }
      }
    }

    return counts;
  }
}