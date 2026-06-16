import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

export interface JiraIssue {
  key: string;
  summary: string;
  description: string;
  priority: string;
  status: string;
  assignee?: string;
  labels: string[];
}

export class JiraIntegration {
  private readonly logger = new Logger(JiraIntegration.name);
  private config: JiraConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      baseUrl: configService.get('JIRA_URL', ''),
      email: configService.get('JIRA_EMAIL', ''),
      apiToken: configService.get('JIRA_TOKEN', ''),
      projectKey: configService.get('JIRA_PROJECT_KEY', 'QA'),
    };
  }

  async createIssue(bug: any): Promise<JiraIssue> {
    if (!this.config.baseUrl) {
      this.logger.warn('Jira not configured');
      return this.mockCreateIssue(bug);
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            project: { key: this.config.projectKey },
            summary: bug.title,
            description: {
              type: 'doc',
              version: 1,
              content: [{
                type: 'paragraph',
                content: [{ type: 'text', text: bug.description || '' }],
              }],
            },
            issuetype: { name: 'Bug' },
            priority: { name: this.mapPriority(bug.priority) },
            labels: bug.tags || [],
          },
        }),
      });

      const data = await response.json() as any;
      this.logger.log(`Jira issue created: ${data.key}`);
      return { key: data.key, summary: bug.title, description: bug.description || '', priority: bug.priority, status: 'OPEN', labels: bug.tags || [] };
    } catch (error) {
      this.logger.error(`Jira creation failed: ${error}`);
      return this.mockCreateIssue(bug);
    }
  }

  private mockCreateIssue(bug: any): JiraIssue {
    const key = `QA-${Date.now()}`;
    this.logger.log(`Mock Jira issue created: ${key}`);
    return { key, summary: bug.title, description: bug.description || '', priority: bug.priority, status: 'OPEN', labels: bug.tags || [] };
  }

  private mapPriority(priority?: string): string {
    const mapping: Record<string, string> = { 'P1': 'Highest', 'P2': 'High', 'P3': 'Medium', 'P4': 'Low' };
    return mapping[priority || 'P3'] || 'Medium';
  }

  async syncStatus(bugId: string, jiraKey: string): Promise<string> {
    if (!this.config.baseUrl) return 'OPEN';

    try {
      const response = await fetch(`${this.config.baseUrl}/rest/api/3/issue/${jiraKey}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64')}`,
        },
      });
      const data = await response.json() as any;
      return data.fields?.status?.name || 'OPEN';
    } catch {
      return 'OPEN';
    }
  }

  isConfigured(): boolean {
    return !!(this.config.baseUrl && this.config.email && this.config.apiToken);
  }
}

// JiraIntegration should be instantiated via NestJS DI with ConfigService injected
// Use @Injectable() decorator and inject through the module's providers array
export const jiraIntegrationFactory = (configService: ConfigService) => new JiraIntegration(configService);