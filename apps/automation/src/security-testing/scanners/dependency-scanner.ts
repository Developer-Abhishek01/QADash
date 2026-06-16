import { DependencyVulnerability } from '../types';

export class DependencyScanner {
  async scan(packageJson: any): Promise<DependencyVulnerability[]> {
    const vulns: DependencyVulnerability[] = [];
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const knownVuln: Record<string, { cve: string; severity: any }> = { 'lodash': { cve: 'CVE-2021-23337', severity: 'high' }, 'axios': { cve: 'CVE-2020-28168', severity: 'medium' }, 'minimist': { cve: 'CVE-2021-44906', severity: 'critical' } };
    for (const [name, version] of Object.entries(deps)) {
      if (knownVuln[name as string]) {
        vulns.push({ library: name as string, version: version as string, severity: knownVuln[name as string].severity, vulnerabilities: [{ id: knownVuln[name as string].cve, title: `Vulnerability in ${name}`, severity: knownVuln[name as string].severity, cve: knownVuln[name as string].cve, description: `Known vulnerability in ${name}`, recommendation: `Update ${name}` }] });
      }
    }
    return vulns;
  }
}