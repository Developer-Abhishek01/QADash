import { Injectable, Logger } from '@nestjs/common';
import { VulnerabilityResult, TargetResult } from './scanner.service';

interface ZapConfig {
  apiKey?: string;
  host?: string;
  port?: number;
  timeout?: number;
}

@Injectable()
export class OwaspZapScanner {
  private readonly logger = new Logger(OwaspZapScanner.name);
  private zapUrl: string;
  private config: ZapConfig;
  private zapApiKey: string;

  constructor() {
    this.zapUrl = process.env.ZAP_API_URL || 'http://localhost:8080';
    this.zapApiKey = process.env.ZAP_API_KEY || '';
    this.config = {
      apiKey: process.env.ZAP_API_KEY,
      port: 8080,
    };
  }

  async scan(
    scanId: string,
    baseUrl: string,
    config: Record<string, unknown>,
  ): Promise<{ vulnerabilities: VulnerabilityResult[]; targets: TargetResult[] }> {
    const vulnerabilities: VulnerabilityResult[] = [];
    const targets: TargetResult[] = [];

    this.config = {
      apiKey: config['zapApiKey'] as string,
      host: config['zapHost'] as string,
      port: config['zapPort'] as number,
      timeout: config['zapTimeout'] as number,
    };

    try {
      const spiderResult = await this.runSpider(baseUrl);
      targets.push(...spiderResult);

      const ascanResult = await this.runActiveScan(baseUrl);
      vulnerabilities.push(...ascanResult.vulnerabilities);

      const ajaxResult = await this.runAjaxSpider(baseUrl);
      targets.push(...ajaxResult);

      const alerts = await this.getAlerts(baseUrl);
      for (const alert of alerts) {
        const vuln = this.mapAlertToVulnerability(alert);
        if (vuln) vulnerabilities.push(vuln);
      }
    } catch (error) {
      this.logger.warn(`OWASP ZAP scan error: ${error}`);
      vulnerabilities.push(...await this.fallbackScan(baseUrl));
    }

    return { vulnerabilities, targets };
  }

  private getZapHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'User-Agent': 'QADash-SecurityScanner/1.0' };
    if (this.zapApiKey) {
      headers['X-ZAP-API-Key'] = this.zapApiKey;
    }
    return headers;
  }

  private buildZapUrl(path: string, params: Record<string, string> = {}): string {
    const url = new URL(`${this.zapUrl}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return url.toString();
  }

  private async zapFetch(url: string, timeoutMs = 30000): Promise<Response> {
    return fetch(url, { headers: this.getZapHeaders(), signal: AbortSignal.timeout(timeoutMs) });
  }

  private async runSpider(targetUrl: string): Promise<TargetResult[]> {
    const targets: TargetResult[] = [];

    try {
      const spiderUrl = this.buildZapUrl('/JSON/spider/action/scan', { url: targetUrl });
      const response = await fetch(spiderUrl, { signal: AbortSignal.timeout(30000) });
      const data = await response.json() as any;

      if (data.scan) {
        await this.waitForSpiderComplete(data.scan);
        const spiderResults = await this.getSpiderResults(targetUrl);
        targets.push(...spiderResults);
      }
    } catch (error) {
      this.logger.warn(`Spider error: ${error}`);
    }

    return targets;
  }

  private async runActiveScan(targetUrl: string): Promise<{ vulnerabilities: VulnerabilityResult[] }> {
    const vulnerabilities: VulnerabilityResult[] = [];

    try {
      const ascanUrl = this.buildZapUrl('/JSON/ascan/action/scan/', { url: targetUrl });
      const response = await this.zapFetch(ascanUrl, 60000);
      const data = await response.json() as any;

      if (data.scan) {
        await this.waitForActiveScanComplete(data.scan);
      }
    } catch (error) {
      this.logger.warn(`Active scan error: ${error}`);
    }

    return { vulnerabilities };
  }

  private async runAjaxSpider(targetUrl: string): Promise<TargetResult[]> {
    const targets: TargetResult[] = [];

    try {
      const ajaxUrl = this.buildZapUrl('/JSON/ajaxSpider/action/scan', { url: targetUrl });
      await this.zapFetch(ajaxUrl, 60000);

      await new Promise((resolve) => setTimeout(resolve, 5000));

      const resultsUrl = this.buildZapUrl('/JSON/ajaxSpider/view/results/');
      const response = await this.zapFetch(resultsUrl, 10000);
      const data = await response.json() as any;

      if (data.results) {
        for (const result of data.results) {
          targets.push({
            url: result.url,
            method: 'GET',
            isSecure: true,
          });
        }
      }
    } catch (error) {
      this.logger.warn(`Ajax spider error: ${error}`);
    }

    return targets;
  }

  private async getAlerts(targetUrl: string): Promise<Record<string, unknown>[]> {
    try {
      const alertsUrl = this.buildZapUrl('/JSON/alerts/view/alerts/', { url: targetUrl });
      const response = await this.zapFetch(alertsUrl, 10000);
      const data = await response.json() as any;
      return (data.alerts || []) as Record<string, unknown>[];
    } catch {
      return [];
    }
  }

  private mapAlertToVulnerability(alert: Record<string, unknown>): VulnerabilityResult | null {
    const risk = alert['risk'] as string;
    let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' = 'MEDIUM';

    switch (risk?.toLowerCase()) {
      case 'high':
        severity = 'HIGH';
        break;
      case 'medium':
        severity = 'MEDIUM';
        break;
      case 'low':
        severity = 'LOW';
        break;
      case 'informational':
        severity = 'INFO';
        break;
    }

    if (risk?.toLowerCase() === 'false positive') return null;

    const name = alert['name'] as string;
    const cwe = this.extractCwe(name);

    return {
      title: name || 'Security Issue',
      description: (alert['description'] as string) || '',
      severity,
      status: 'CONFIRMED',
      cweId: cwe,
      affectedUrl: alert['url'] as string,
      evidence: {
        alert,
        solution: alert['solution'],
      },
      remediation: alert['solution'] as string,
      owaspCategory: this.mapToOwaspCategory(name),
    };
  }

  private extractCwe(name: string): string | undefined {
    const cweMatch = name.match(/CWE-(\d+)/i);
    return cweMatch ? `CWE-${cweMatch[1]}` : undefined;
  }

  private mapToOwaspCategory(name: string): string | undefined {
    const nameLower = name.toLowerCase();

    if (nameLower.includes('sql') || nameLower.includes('injection')) return 'A03_INJECTION';
    if (nameLower.includes('xss') || nameLower.includes('cross')) return 'A03_INJECTION';
    if (nameLower.includes('auth') || nameLower.includes('credential')) return 'A07_AUTHENTICATION_FAILURES';
    if (nameLower.includes('access') || nameLower.includes('idor')) return 'A01_BROKEN_ACCESS_CONTROL';
    if (nameLower.includes('config')) return 'A05_SECURITY_MISCONFIGURATION';
    if (nameLower.includes('crypto') || nameLower.includes('hash')) return 'A02_CRYPTOGRAPHIC_FAILURES';
    if (nameLower.includes('component') || nameLower.includes('dependency')) return 'A06_VULNERABLE_COMPONENTS';

    return undefined;
  }

  private async getSpiderResults(targetUrl: string): Promise<TargetResult[]> {
    const targets: TargetResult[] = [];

    try {
      const resultsUrl = this.buildZapUrl('/JSON/spider/view/results/', { url: targetUrl });
      const response = await this.zapFetch(resultsUrl, 10000);
      const data = await response.json() as any;
    if (data && data.results) {
      for (const url of data.results) {
          targets.push({
            url,
            method: 'GET',
            isSecure: true,
          });
        }
      }
    } catch {
      // Ignore
    }

    return targets;
  }

  private async waitForSpiderComplete(scanId: string): Promise<void> {
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const statusUrl = this.buildZapUrl(`/JSON/spider/view/status/${scanId}`);
        const response = await this.zapFetch(statusUrl, 5000);
        const data = await response.json() as any;

        if (data.status === '100') break;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch {
        break;
      }
    }
  }

  private async waitForActiveScanComplete(scanId: string): Promise<void> {
    const maxAttempts = 120;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const statusUrl = this.buildZapUrl(`/JSON/ascan/view/status/${scanId}`);
        const response = await this.zapFetch(statusUrl, 5000);
        const data = await response.json() as any;

        if (data.status === '100') break;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch {
        break;
      }
    }
  }

  private async fallbackScan(baseUrl: string): Promise<VulnerabilityResult[]> {
    const vulnerabilities: VulnerabilityResult[] = [];

    try {
      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'QADash-SecurityScanner/1.0' },
        signal: AbortSignal.timeout(10000),
      });

      if (response.status === 200) {
        vulnerabilities.push({
          title: 'OWASP ZAP Integration Not Available',
          description: 'OWASP ZAP is not running. Using basic HTTP checks instead.',
          severity: 'INFO',
          status: 'OPEN',
          affectedUrl: baseUrl,
          remediation: 'Install and configure OWASP ZAP for comprehensive security scanning.',
        });
      }
    } catch (error) {
      vulnerabilities.push({
        title: 'Target Not Reachable',
        description: `Cannot connect to target: ${baseUrl}`,
        severity: 'HIGH',
        status: 'OPEN',
        affectedUrl: baseUrl,
        evidence: { error: String(error) },
      });
    }

    return vulnerabilities;
  }
}