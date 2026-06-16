import { Page } from '@playwright/test';
import { Vulnerability, SecurityScanResult, ScanSummary, SecurityConfig } from './types';

export class SecurityEngine {
  private page: Page;
  private config: SecurityConfig;

  constructor(page: Page, config: SecurityConfig) {
    this.page = page;
    this.config = config;
  }

  async runFullScan(target: string): Promise<SecurityScanResult> {
    const scanId = `scan_${Date.now()}`;
    const startTime = Date.now();
    const vulnerabilities: Vulnerability[] = [];

    await this.page.goto(target);
    const spiderUrls = await this.discoverUrls(target);

    const sqlVulns = await this.scanSqlInjection(spiderUrls);
    vulnerabilities.push(...sqlVulns);

    const xssVulns = await this.scanXSS(spiderUrls);
    vulnerabilities.push(...xssVulns);

    const headerVulns = await this.validateHeaders(target);
    vulnerabilities.push(...headerVulns);

    if (this.config.authConfig) {
      const authVulns = await this.validateAuth(target);
      vulnerabilities.push(...authVulns);
    }

    const endTime = Date.now();
    return { scanId, target, startTime, endTime, duration: endTime - startTime, vulnerabilities, summary: this.calculateSummary(vulnerabilities), spiderUrls: spiderUrls.length, alertsCount: vulnerabilities.length };
  }

  private async discoverUrls(baseUrl: string): Promise<string[]> {
    const urls = new Set<string>([baseUrl]);
    try {
      const links = await this.page.$$eval('a', els => els.map(e => e.href));
      links.forEach(link => { if (link.startsWith(baseUrl)) urls.add(link); });
    } catch { }
    return Array.from(urls).slice(0, 50);
  }

  private async scanSqlInjection(urls: string[]): Promise<Vulnerability[]> {
    const vulns: Vulnerability[] = [];
    const payloads = ["'", "1' OR '1'='1", "1; DROP TABLE users", "1' UNION SELECT * FROM--"];
    for (const url of urls.slice(0, 10)) {
      for (const payload of payloads) {
        try {
          const testUrl = url.includes('?') ? `${url}&id=${payload}` : url;
          await this.page.goto(testUrl, { timeout: 5000 }).catch(() => {});
          const content = await this.page.content();
          if (/sql.*error|mysql.*error|ORA-|syntax.*error/i.test(content)) {
            vulns.push({ id: `sqli_${Date.now()}`, name: 'SQL Injection', description: 'Potential SQL injection vulnerability', category: 'sql_injection', severity: 'critical', confidence: 'high', url: testUrl, parameter: 'id', evidence: 'SQL error detected', solution: 'Use parameterized queries', foundAt: Date.now() });
          }
        } catch { }
      }
    }
    return vulns;
  }

  private async scanXSS(urls: string[]): Promise<Vulnerability[]> {
    const vulns: Vulnerability[] = [];
    const payloads = ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '<svg/onload=alert(1)>', 'javascript:alert(1)'];
    for (const url of urls.slice(0, 10)) {
      for (const payload of payloads) {
        try {
          const testUrl = url.includes('?') ? `${url}&q=${encodeURIComponent(payload)}` : url;
          const response = await this.page.goto(testUrl, { timeout: 5000 }).catch(() => null);
          if (response && response.url().includes(payload)) {
            vulns.push({ id: `xss_${Date.now()}`, name: 'Cross-Site Scripting (XSS)', description: 'Potential XSS vulnerability', category: 'xss', severity: 'high', confidence: 'medium', url: testUrl, parameter: 'q', evidence: 'Payload reflected in response', solution: 'Sanitize user input', foundAt: Date.now() });
          }
        } catch { }
      }
    }
    return vulns;
  }

  private async validateHeaders(url: string): Promise<Vulnerability[]> {
    const vulns: Vulnerability[] = [];
    const headers = await this.page.goto(url).then(r => r?.allHeaders()).catch(() => ({} as Record<string, string>)) || {};
    const required = ['X-Content-Type-Options', 'X-Frame-Options', 'Content-Security-Policy', 'Strict-Transport-Security'];
    for (const header of required) {
      if (!headers[header.toLowerCase()] && !headers[header]) {
        vulns.push({ id: `hdr_${Date.now()}_${header}`, name: `Missing ${header}`, description: `Security header ${header} is missing`, category: 'headers', severity: 'medium', confidence: 'high', url, evidence: `Header ${header} not found`, solution: `Add ${header} header`, foundAt: Date.now() });
      }
    }
    return vulns;
  }

  private async validateAuth(url: string): Promise<Vulnerability[]> {
    const vulns: Vulnerability[] = [];
    await this.page.goto(url);
    const forms = await this.page.$$('form');
    if (forms.length > 0) {
      const hasPassword = await this.page.$('input[type="password"]');
      if (!hasPassword) {
        vulns.push({ id: `auth_${Date.now()}`, name: 'Password Field Missing', description: 'Login form lacks password field', category: 'auth', severity: 'low', confidence: 'high', url, evidence: 'No password input found', solution: 'Add password field', foundAt: Date.now() });
      }
    }
    return vulns;
  }

  private calculateSummary(vulnerabilities: Vulnerability[]): ScanSummary {
    return { critical: vulnerabilities.filter(v => v.severity === 'critical').length, high: vulnerabilities.filter(v => v.severity === 'high').length, medium: vulnerabilities.filter(v => v.severity === 'medium').length, low: vulnerabilities.filter(v => v.severity === 'low').length, info: vulnerabilities.filter(v => v.severity === 'info').length, total: vulnerabilities.length, riskScore: vulnerabilities.reduce((acc, v) => acc + (v.severity === 'critical' ? 10 : v.severity === 'high' ? 5 : v.severity === 'medium' ? 2 : 1), 0) };
  }

  async runOWASPZAP(target: string, zapUrl: string, apiKey: string): Promise<SecurityScanResult> {
    const scanId = `zap_${Date.now()}`;
    const startTime = Date.now();
    try {
      await fetch(`${zapUrl}/JSON/spider/action/scan?url=${encodeURIComponent(target)}&apikey=${apiKey}`);
      await new Promise(r => setTimeout(r, 5000));
      await fetch(`${zapUrl}/JSON/ascan/action/scan?url=${encodeURIComponent(target)}&apikey=${apiKey}`);
      await new Promise(r => setTimeout(r, 10000));
      const res = await fetch(`${zapUrl}/JSON/core/view/alerts?apikey=${apiKey}`);
      const data = await res.json();
      const vulns = this.parseZAPAlerts(data);
      return { scanId, target, startTime, endTime: Date.now(), duration: Date.now() - startTime, vulnerabilities: vulns, summary: this.calculateSummary(vulns), spiderUrls: 0, alertsCount: vulns.length };
    } catch (e) { return { scanId, target, startTime, endTime: Date.now(), duration: 0, vulnerabilities: [], summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0, riskScore: 0 }, spiderUrls: 0, alertsCount: 0 }; }
  }

  private parseZAPAlerts(alerts: any): Vulnerability[] {
    const severityMap: Record<string, string> = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };
    return (alerts?.alerts || []).map((a: any) => ({ id: `zap_${Date.now()}`, name: a.name || '', description: a.description || '', category: (/sql/i.test(a.name || '') ? 'sql_injection' : /xss/i.test(a.name || '') ? 'xss' : /header/i.test(a.name || '') ? 'headers' : 'other') as any, severity: severityMap[a.risk] || 'medium', confidence: severityMap[a.confidence] || 'medium', url: a.url || '', parameter: a.param, evidence: a.evidence || '', solution: a.solution || '', cwe: a.cweid, foundAt: Date.now() }));
  }

  async scanDependencies(pkg: any): Promise<any[]> {
    const vulns: any[] = [];
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const [name, version] of Object.entries(deps)) {
      if (/lodash|axios|express|react|vue/.test(name as string) && version === '*') {
        vulns.push({ library: name, version: 'latest', severity: 'medium', vulnerabilities: [{ id: 'CVE-UNKNOWN', title: 'Unknown version', severity: 'medium', description: 'Using wildcard version', recommendation: 'Pin specific version' }] });
      }
    }
    return vulns;
  }
}