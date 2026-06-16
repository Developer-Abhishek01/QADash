import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DependencyScanner {
  private readonly logger = new Logger(DependencyScanner.name);

  async scan(
    _scanId: string,
    packageManager: string,
  ): Promise<{
    totalPackages: number;
    vulnerablePackages: number;
    counts: { critical: number; high: number; medium: number; low: number };
    dependencies: Record<string, unknown>[];
  }> {
    this.logger.log(`Running dependency scan for ${packageManager}`);

    const mockResults = this.generateMockResults(packageManager);

    return {
      totalPackages: mockResults.length,
      vulnerablePackages: mockResults.filter((d: { vulnerabilities: unknown[] }) => d.vulnerabilities.length > 0).length,
      counts: this.calculateCounts(mockResults),
      dependencies: mockResults,
    };
  }

  private generateMockResults(packageManager: string): Record<string, unknown>[] {
    const mockDeps: Record<string, unknown>[] = [
      {
        name: 'lodash',
        version: '4.17.20',
        currentVersion: '4.17.21',
        isVulnerable: true,
        vulnerabilities: [
          { id: 'CVE-2021-23337', severity: 'HIGH', title: 'Prototype Pollution', cwe: 'CWE-1321' },
        ],
      },
      {
        name: 'axios',
        version: '0.21.1',
        currentVersion: '1.6.0',
        isVulnerable: true,
        vulnerabilities: [
          { id: 'CVE-2023-45803', severity: 'HIGH', title: 'Server-Side Request Forgery', cwe: 'CWE-918' },
        ],
      },
      {
        name: 'express',
        version: '4.17.1',
        currentVersion: '4.18.2',
        isVulnerable: true,
        vulnerabilities: [
          { id: 'CVE-2022-24999', severity: 'HIGH', title: 'Open Redirect', cwe: 'CWE-601' },
        ],
      },
      {
        name: 'moment',
        version: '2.29.2',
        currentVersion: '2.29.4',
        isVulnerable: true,
        vulnerabilities: [
          { id: 'CVE-2022-31129', severity: 'MEDIUM', title: 'Path Traversal', cwe: 'CWE-22' },
        ],
      },
      {
        name: 'react',
        version: '17.0.1',
        currentVersion: '18.2.0',
        isVulnerable: false,
        vulnerabilities: [],
      },
      {
        name: 'typescript',
        version: '4.5.4',
        currentVersion: '5.3.3',
        isVulnerable: false,
        vulnerabilities: [],
      },
    ];

    if (packageManager === 'pip') {
      return [
        {
          name: 'django',
          version: '3.2.10',
          currentVersion: '4.2.7',
          isVulnerable: true,
          vulnerabilities: [
            { id: 'CVE-2023-36069', severity: 'HIGH', title: 'Potential Denial of Service', cwe: 'CWE-400' },
          ],
        },
        {
          name: 'requests',
          version: '2.25.1',
          currentVersion: '2.31.0',
          isVulnerable: true,
          vulnerabilities: [
            { id: 'CVE-2023-32681', severity: 'MEDIUM', title: 'Unintended Leakage of Sensitive Information', cwe: 'CWE-200' },
          ],
        },
        {
          name: 'flask',
          version: '1.1.2',
          currentVersion: '3.0.0',
          isVulnerable: true,
          vulnerabilities: [
            { id: 'CVE-2023-30861', severity: 'HIGH', title: 'Cookie exposure', cwe: 'CWE-79' },
          ],
        },
      ];
    }

    if (packageManager === 'maven') {
      return [
        {
          groupId: 'org.apache.struts',
          artifactId: 'struts2-core',
          version: '2.5.30',
          currentVersion: '6.3.0',
          isVulnerable: true,
          vulnerabilities: [
            { id: 'CVE-2023-50164', severity: 'CRITICAL', title: 'Remote Code Execution', cwe: 'CWE-94' },
          ],
        },
        {
          groupId: 'org.springframework',
          artifactId: 'spring-core',
          version: '5.3.18',
          currentVersion: '6.1.0',
          isVulnerable: true,
          vulnerabilities: [
            { id: 'CVE-2023-34054', severity: 'HIGH', title: 'Path Traversal', cwe: 'CWE-22' },
          ],
        },
      ];
    }

    return mockDeps;
  }

  private calculateCounts(dependencies: Record<string, unknown>[]): {
    critical: number;
    high: number;
    medium: number;
    low: number;
  } {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };

    for (const dep of dependencies) {
      const vulns = dep['vulnerabilities'] as { severity: string }[];
      if (vulns) {
        for (const vuln of vulns) {
          switch (vuln.severity?.toUpperCase()) {
            case 'CRITICAL':
              counts.critical++;
              break;
            case 'HIGH':
              counts.high++;
              break;
            case 'MEDIUM':
              counts.medium++;
              break;
            case 'LOW':
              counts.low++;
              break;
          }
        }
      }
    }

    return counts;
  }
}