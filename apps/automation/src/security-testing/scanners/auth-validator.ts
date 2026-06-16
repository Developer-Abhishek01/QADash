import { Page } from '@playwright/test';
import { Vulnerability } from '../types';

export class AuthValidator {
  constructor(private page: Page) {}

  async validate(url: string): Promise<Vulnerability[]> {
    const vulns: Vulnerability[] = [];
    try {
      await this.page.goto(url);
      const forms = await this.page.$$('form');
      for (const form of forms) {
        const inputs = await form.$$('input');
        let hasPassword = false;
        for (const input of inputs) {
          const type = await input.getAttribute('type');
          if ((type || '').includes('password')) {
            hasPassword = true;
            break;
          }
        }
        const hasToken = (await this.page.content()).toLowerCase().includes('csrf');
        if (hasPassword && !hasToken) {
          vulns.push({ id: `auth_${Date.now()}`, name: 'CSRF Vulnerability', description: 'Form lacks CSRF token', category: 'auth', severity: 'high', confidence: 'high', url, evidence: 'No CSRF token found', solution: 'Add CSRF token', cwe: 'CWE-352', foundAt: Date.now() });
        }
      }
    } catch { }
    return vulns;
  }
}