import { DependencyVulnerability, VulnerabilitySeverity } from '../types';

export class DependencyScanner {
  async scan(packageJson: Record<string, unknown>): Promise<DependencyVulnerability[]> {
    const vulns: DependencyVulnerability[] = [];
    const pkgDeps = packageJson.dependencies as Record<string, string> | undefined;
    const pkgDevDeps = packageJson.devDependencies as Record<string, string> | undefined;
    const deps = { ...pkgDeps, ...pkgDevDeps };
    const knownVuln: Record<string, { cve: string; severity: VulnerabilitySeverity }> = { lodash: { cve: 'CVE-2021-23337', severity: 'high' }, axios: { cve: 'CVE-2020-28168', severity: 'medium' }, minimist: { cve: 'CVE-2021-44906', severity: 'critical' } };
    for (const [name, version] of Object.entries(deps)) {
      if (knownVuln[name]) {
        vulns.push({ library: name, version: version as string, severity: knownVuln[name].severity, vulnerabilities: [{ id: knownVuln[name].cve, title: `Vulnerability in ${name}`, severity: knownVuln[name].severity, cve: knownVuln[name].cve, description: `Known vulnerability in ${name}`, recommendation: `Update ${name}` }] });
      }
    }
    return vulns;
  }
}