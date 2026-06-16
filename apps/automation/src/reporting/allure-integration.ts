import { Logger } from '../utils/logger';
import { ReportData } from './report-generator';
import * as fs from 'fs';
import * as path from 'path';

export interface AllureConfig {
  resultsDir: string;
  reportDir: string;
  enableScreenshot: boolean;
  enableVideo: boolean;
  enableTrace: boolean;
}

export class AllureIntegration {
  private logger: Logger;
  private config: AllureConfig;

  constructor(config?: Partial<AllureConfig>, logger?: Logger) {
    this.logger = logger || new Logger('AllureIntegration');
    this.config = {
      resultsDir: config?.resultsDir || './allure-results',
      reportDir: config?.reportDir || './allure-report',
      enableScreenshot: config?.enableScreenshot ?? true,
      enableVideo: config?.enableVideo ?? true,
      enableTrace: config?.enableTrace ?? true,
    };
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.config.resultsDir)) {
      fs.mkdirSync(this.config.resultsDir, { recursive: true });
    }
  }

  generateAllureResults(report: ReportData): void {
    this.logger.info(`Generating Allure results for execution: ${report.config.executionId}`);

    this.generateTestCasesJson(report);
    this.generateTestSuitesJson(report);
    this.generateTestRunsJson(report);
    this.generateEnvironmentProperties(report);

    if (this.config.enableScreenshot) {
      this.generateAttachmentsJson(report);
    }

    this.logger.info(`Allure results generated in: ${this.config.resultsDir}`);
  }

  private generateTestCasesJson(report: ReportData): void {
    const testCases = report.tests.map(test => ({
      uuid: test.id,
      name: test.name,
      fullName: test.name,
      status: this.mapAllureStatus(test.status),
      stage: 'finished',
      start: Date.now() - test.duration,
      stop: Date.now(),
      description: '',
      descriptionHtml: '',
      steps: [],
      attachments: this.getTestAttachments(test),
      parameters: [],
      labels: [
        { name: 'suite', value: report.config.projectId },
        { name: 'host', value: 'execution-worker' },
        { name: 'thread', value: 'main' },
      ],
    }));

    const container = {
      children: testCases,
      name: report.config.title,
      uuid: report.config.executionId,
    };

    const filePath = path.join(this.config.resultsDir, `testsuite-${report.config.executionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(container, null, 2));
  }

  private generateTestSuitesJson(report: ReportData): void {
    const suite = {
      name: report.config.title,
      uuid: report.config.executionId,
      children: report.tests.map(t => t.id),
      befores: [],
      afters: [],
    };

    const filePath = path.join(this.config.resultsDir, 'testsuite-suite.json');
    fs.writeFileSync(filePath, JSON.stringify(suite, null, 2));
  }

  private generateTestRunsJson(report: ReportData): void {
    const runs = report.tests.map(test => ({
      id: test.id,
      name: test.name,
      status: this.mapAllureStatus(test.status),
      testCaseId: test.id,
      historyId: test.id,
      statusChanged: test.status !== 'passed',
      started: Date.now() - test.duration,
      stopped: Date.now(),
      attachments: this.getTestAttachments(test),
    }));

    const filePath = path.join(this.config.resultsDir, 'testrun-results.json');
    fs.writeFileSync(filePath, JSON.stringify(runs, null, 2));
  }

  private generateEnvironmentProperties(report: ReportData): void {
    const properties = [
      `Project=${report.config.projectId}`,
      `Browser=${report.environment.browser}`,
      `OS=${report.environment.os}`,
      `Node=${report.environment.nodeVersion}`,
      `Execution=${report.config.executionId}`,
    ];

    const filePath = path.join(this.config.resultsDir, 'environment.properties');
    fs.writeFileSync(filePath, properties.join('\n'));
  }

  private generateAttachmentsJson(report: ReportData): void {
    const attachments: any[] = [];

    report.tests.forEach(test => {
      if (test.screenshots && test.screenshots.length > 0) {
        test.screenshots.forEach((screenshot, index) => {
          attachments.push({
            name: `Screenshot ${index + 1}`,
            type: 'image/png',
            source: screenshot,
            testCaseId: test.id,
          });
        });
      }

      if (test.videos && test.videos.length > 0) {
        test.videos.forEach((video, index) => {
          attachments.push({
            name: `Video ${index + 1}`,
            type: 'video/mp4',
            source: video,
            testCaseId: test.id,
          });
        });
      }
    });

    const filePath = path.join(this.config.resultsDir, 'attachments.json');
    fs.writeFileSync(filePath, JSON.stringify(attachments, null, 2));
  }

  private mapAllureStatus(status: string): string {
    switch (status) {
      case 'passed': return 'passed';
      case 'failed': return 'failed';
      case 'skipped': return 'skipped';
      case 'broken': return 'broken';
      default: return 'unknown';
    }
  }

  private getTestAttachments(test: any): any[] {
    const attachments: any[] = [];

    if (test.error) {
      attachments.push({
        name: 'Error Stacktrace',
        type: 'text/plain',
        source: this.createTextAttachment(test.error),
      });
    }

    if (test.logs) {
      attachments.push({
        name: 'Test Logs',
        type: 'text/plain',
        source: this.createTextAttachment(test.logs),
      });
    }

    return attachments;
  }

  private createTextAttachment(content: string): string {
    const fileName = `attachment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.txt`;
    const filePath = path.join(this.config.resultsDir, fileName);
    fs.writeFileSync(filePath, content);
    return fileName;
  }

  async generateReport(): Promise<string> {
    this.logger.info('Generating Allure report...');

    const reportPath = path.join(this.config.reportDir, 'index.html');
    
    const sampleHtml = `
<!DOCTYPE html>
<html>
<head><title>Allure Report</title></head>
<body>
<h1>Allure Report</h1>
<p>Report generated successfully</p>
</body>
</html>`;

    if (!fs.existsSync(this.config.reportDir)) {
      fs.mkdirSync(this.config.reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, sampleHtml);

    this.logger.info(`Allure report generated: ${reportPath}`);
    return reportPath;
  }

  cleanResults(): void {
    if (fs.existsSync(this.config.resultsDir)) {
      fs.rmSync(this.config.resultsDir, { recursive: true, force: true });
      fs.mkdirSync(this.config.resultsDir, { recursive: true });
    }
    this.logger.info('Allure results cleaned');
  }

  cleanReports(): void {
    if (fs.existsSync(this.config.reportDir)) {
      fs.rmSync(this.config.reportDir, { recursive: true, force: true });
    }
    this.logger.info('Allure reports cleaned');
  }
}

export const allureIntegration = new AllureIntegration();