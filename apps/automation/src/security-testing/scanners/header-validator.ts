import { Page } from '@playwright/test';
import { Vulnerability } from '../types';

export class HeaderValidator {
  constructor(private page: Page) {}

  async validate(url: string): Promise<Vulnerability[]> {
    const vulns: Vulnerability[] = [];
    try {
      const response = await this.page.goto(url);
      const headers = response?.headers() || {};
      const requiredHeaders: Record<string, { severity: any; solution: string }> = {
        'X-Content-Type-Options': { severity: 'medium', solution: 'Add X-Content-Type-Options: nosniff' },
        'X-Frame-Options': { severity: 'medium', solution: 'Add X-Frame-Options: DENY' },
        'Content-Security-Policy': { severity: 'high', solution: 'Add Content-Security-Policy header' },
        'Strict-Transport-Security': { severity: 'medium', solution: 'Add Strict-Transport-Security header' },
      };
      for (const header of Object.keys(requiredHeaders)) {
        if (!headers[header.toLowerCase()]) {
          vulns.push({ id: `hdr_${Date.now()}_${header}`, name: `Missing ${header}`, description: `Security header ${header} is missing`, category: 'headers', severity: requiredHeaders[header].severity, confidence: 'high', url, evidence: `Header ${header} not found`, solution: requiredHeaders[header].solution, foundAt: Date.now() });
        }
      }
    } catch { }
    return vulns;
  }
}