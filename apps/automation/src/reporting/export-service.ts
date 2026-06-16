import { Logger } from '../utils/logger';
import { ReportData, ReportConfig } from './report-generator';
import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';
import * as XLSX from 'xlsx';

export type ExportFormat = 'html' | 'pdf' | 'excel' | 'json' | 'allure';

export interface ExportResult {
  format: ExportFormat;
  filePath: string;
  fileName: string;
  size: number;
  generatedAt: string;
}

export class ExportService {
  private logger: Logger;
  private outputDir: string;

  constructor(outputDir = './test-results/reports', logger?: Logger) {
    this.logger = logger || new Logger('ExportService');
    this.outputDir = outputDir;
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async exportJson(report: ReportData, config: ReportConfig): Promise<ExportResult> {
    const fileName = `report-${config.executionId}-${Date.now()}.json`;
    const filePath = path.join(this.outputDir, fileName);

    const jsonContent = JSON.stringify(report, null, 2);
    fs.writeFileSync(filePath, jsonContent);

    this.logger.info(`JSON report exported: ${filePath}`);
    return {
      format: 'json',
      filePath,
      fileName,
      size: Buffer.byteLength(jsonContent),
      generatedAt: new Date().toISOString(),
    };
  }

  async exportHtml(report: ReportData, config: ReportConfig): Promise<ExportResult> {
    const fileName = `report-${config.executionId}-${Date.now()}.html`;
    const filePath = path.join(this.outputDir, fileName);

    const html = this.generateHtml(report);
    fs.writeFileSync(filePath, html);

    this.logger.info(`HTML report exported: ${filePath}`);
    return {
      format: 'html',
      filePath,
      fileName,
      size: Buffer.byteLength(html),
      generatedAt: new Date().toISOString(),
    };
  }

  private generateHtml(report: ReportData): string {
    const { config, statistics, tests, environment, aiInsights } = report;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.title}</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 20px; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-value { font-size: 32px; font-weight: bold; color: #333; }
        .stat-label { color: #666; margin-top: 5px; }
        .passed { color: #22c55e; }
        .failed { color: #ef4444; }
        .skipped { color: #f59e0b; }
        .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .section-title { font-size: 20px; font-weight: bold; color: #333; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; font-weight: 600; }
        .test-passed { color: #22c55e; }
        .test-failed { color: #ef4444; }
        .test-skipped { color: #f59e0b; }
        .timeline { max-height: 400px; overflow-y: auto; }
        .timeline-item { padding: 10px; border-left: 3px solid #667eea; margin-left: 20px; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${config.title}</h1>
            <p>Execution ID: ${config.executionId}</p>
            <p>Generated: ${new Date().toISOString()}</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${statistics.totalTests}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card">
                <div class="stat-value passed">${statistics.passed}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value failed">${statistics.failed}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value skipped">${statistics.skipped}</div>
                <div class="stat-label">Skipped</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${statistics.passRate}%</div>
                <div class="stat-label">Pass Rate</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Environment</div>
            <table>
                <tr><td>OS</td><td>${environment.os} ${environment.osVersion}</td></tr>
                <tr><td>Browser</td><td>${environment.browser} ${environment.browserVersion}</td></tr>
                <tr><td>Resolution</td><td>${environment.resolution}</td></tr>
                <tr><td>Node Version</td><td>${environment.nodeVersion}</td></tr>
                <tr><td>Timezone</td><td>${environment.timezone}</td></tr>
            </table>
        </div>

        <div class="section">
            <div class="section-title">Test Results</div>
            <table>
                <thead>
                    <tr>
                        <th>Test Name</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Retries</th>
                    </tr>
                </thead>
                <tbody>
                    ${tests.map(test => `
                    <tr>
                        <td>${test.name}</td>
                        <td class="test-${test.status}">${test.status.toUpperCase()}</td>
                        <td>${test.duration}ms</td>
                        <td>${test.retries}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        ${aiInsights ? `
        <div class="section">
            <div class="section-title">AI Insights</div>
            <p>${aiInsights.summary}</p>
            <h4>Recommendations:</h4>
            <ul>
                ${aiInsights.recommendations.map(r => `<li>${r}</li>`).join('')}
            </ul>
            <h4>Patterns Identified:</h4>
            <ul>
                ${aiInsights.patterns.map(p => `<li>${p}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
    </div>
</body>
</html>`;
  }

  async exportPdf(report: ReportData, config: ReportConfig): Promise<ExportResult> {
    const fileName = `report-${config.executionId}-${Date.now()}.pdf`;
    const filePath = path.join(this.outputDir, fileName);

    const html = this.generateHtml(report);
    const pdfContent = await this.convertHtmlToPdf(html);

    fs.writeFileSync(filePath, pdfContent);

    this.logger.info(`PDF report exported: ${filePath}`);
    return {
      format: 'pdf',
      filePath,
      fileName,
      size: Buffer.byteLength(pdfContent),
      generatedAt: new Date().toISOString(),
    };
  }

  private async convertHtmlToPdf(html: string): Promise<Buffer> {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px' } });
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  async exportExcel(report: ReportData, config: ReportConfig): Promise<ExportResult> {
    const fileName = `report-${config.executionId}-${Date.now()}.xlsx`;
    const filePath = path.join(this.outputDir, fileName);

    const xlsxBuffer = this.convertToXlsx(report);

    fs.writeFileSync(filePath, xlsxBuffer);

    this.logger.info(`Excel report exported: ${filePath}`);
    return {
      format: 'excel',
      filePath,
      fileName,
      size: xlsxBuffer.length,
      generatedAt: new Date().toISOString(),
    };
  }

  private convertToXlsx(report: ReportData): Buffer {
    const data = report.tests.map(test => ({
      'Test Name': test.name,
      'Status': test.status,
      'Duration (ms)': test.duration,
      'Retries': test.retries,
      'Error': test.error || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test Results');
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  async exportAll(formats: ExportFormat[], report: ReportData, config: ReportConfig): Promise<ExportResult[]> {
    const results: ExportResult[] = [];

    for (const format of formats) {
      switch (format) {
        case 'json':
          results.push(await this.exportJson(report, config));
          break;
        case 'html':
          results.push(await this.exportHtml(report, config));
          break;
        case 'pdf':
          results.push(await this.exportPdf(report, config));
          break;
        case 'excel':
          results.push(await this.exportExcel(report, config));
          break;
      }
    }

    return results;
  }
}

export const exportService = new ExportService();