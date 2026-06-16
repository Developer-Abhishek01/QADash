import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../common/logging';
import { MobileExecution, MobileExecutionResult } from './mobile-execution.service';

export interface MobileReport {
  executionId: string;
  generatedAt: Date;
  summary: ReportSummary;
  devices: DeviceReport[];
  screenshots: ScreenshotReport[];
  video?: string;
  logs?: string;
  metadata: ReportMetadata;
}

export interface ReportSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  successRate: number;
  totalDuration: number;
  platform: string;
}

export interface DeviceReport {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  osVersion: string;
  status: string;
  tests: TestReport[];
  duration: number;
  screenshot?: string;
}

export interface TestReport {
  testId: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  steps: StepReport[];
  error?: string;
  screenshot?: string;
}

export interface StepReport {
  id: string;
  action: string;
  locator?: string;
  value?: string;
  status: 'passed' | 'failed';
  duration: number;
  screenshot?: string;
}

export interface ScreenshotReport {
  testId: string;
  stepId: string;
  timestamp: Date;
  data: string;
}

export interface ReportMetadata {
  appVersion?: string;
  appPackage?: string;
  bundleId?: string;
  networkType?: string;
  locale?: string;
  deviceLocale?: string;
  automationFramework: string;
}

@Injectable()
export class MobileReportService {
  private reports: Map<string, MobileReport> = new Map();
  private readonly logger = new LoggerService({} as any);

  constructor() {}

  async generateReport(execution: MobileExecution): Promise<MobileReport> {
    const totalTests = execution.results.reduce((sum, r) => sum + r.testsPassed + r.testsFailed + r.testsSkipped, 0);
    const passed = execution.results.reduce((sum, r) => sum + r.testsPassed, 0);
    const failed = execution.results.reduce((sum, r) => sum + r.testsFailed, 0);
    const skipped = execution.results.reduce((sum, r) => sum + r.testsSkipped, 0);
    const totalDuration = execution.results.reduce((sum, r) => sum + r.duration, 0);

    const report: MobileReport = {
      executionId: execution.id,
      generatedAt: new Date(),
      summary: {
        totalTests,
        passed,
        failed,
        skipped,
        successRate: totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0,
        totalDuration,
        platform: execution.platform,
      },
      devices: execution.results.map(result => this.convertResultToDeviceReport(result)),
      screenshots: [],
      metadata: {
        automationFramework: 'Appium',
      },
    };

    this.reports.set(execution.id, report);

    this.logger.logBusinessEvent({
      event: 'mobile_report_generated',
      entity: 'report',
      entityId: execution.id,
      metadata: {
        totalTests,
        passed,
        failed,
        successRate: report.summary.successRate,
      },
    });

    return report;
  }

  private convertResultToDeviceReport(result: MobileExecutionResult): DeviceReport {
    return {
      deviceId: result.deviceId,
      deviceName: result.deviceName,
      deviceType: 'device',
      osVersion: '14',
      status: result.status,
      tests: [],
      duration: result.duration,
      screenshot: result.screenshots[0],
    };
  }

  async getReport(executionId: string): Promise<MobileReport | null> {
    return this.reports.get(executionId) || null;
  }

  async getReportAsJSON(executionId: string): Promise<string> {
    const report = this.reports.get(executionId);
    
    if (!report) {
      throw new Error('Report not found');
    }

    return JSON.stringify(report, null, 2);
  }

  async getReportAsXML(executionId: string): Promise<string> {
    const report = this.reports.get(executionId);
    
    if (!report) {
      throw new Error('Report not found');
    }

    const xml = this.generateXMLReport(report);
    return xml;
  }

  private generateXMLReport(report: MobileReport): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<testsuites>\n';
    xml += `  <testsuite name="Mobile Tests" tests="${report.summary.totalTests}" failures="${report.summary.failed}" time="${report.summary.totalDuration / 1000}">\n`;

    for (const device of report.devices) {
      xml += `    <testsuite name="${device.deviceName}" tests="${device.tests.length}" failures="${device.tests.filter(t => t.status === 'failed').length}">\n`;

      for (const test of device.tests) {
        const status = test.status === 'passed' ? 'success' : test.status === 'failed' ? 'failure' : 'skipped';
        xml += `      <testcase name="${test.testName}" time="${test.duration / 1000}" classname="${test.testId}">\n`;
        
        if (test.error) {
          xml += `        <failure message="${test.error}">${test.error}</failure>\n`;
        }
        
        xml += '      </testcase>\n';
      }

      xml += '    </testsuite>\n';
    }

    xml += '  </testsuite>\n';
    xml += '</testsuites>';

    return xml;
  }

  async getJUnitReport(executionId: string): Promise<string> {
    const report = this.reports.get(executionId);
    
    if (!report) {
      throw new Error('Report not found');
    }

    return this.generateJUnitReport(report);
  }

  private generateJUnitReport(report: MobileReport): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<testsuite name="QADash Mobile Tests" tests="${report.summary.totalTests}" failures="${report.summary.failed}" skipped="${report.summary.skipped}" time="${report.summary.totalDuration / 1000}" timestamp="${report.generatedAt.toISOString()}">\n`;

    for (const device of report.devices) {
      for (const test of device.tests) {
        const status = test.status === 'passed' ? 'success' : test.status === 'failed' ? 'failure' : 'skipped';
        const className = `${device.deviceName}.${test.testId}`;
        
        xml += `  <testcase name="${test.testName}" classname="${className}" time="${test.duration / 1000}">\n`;
        
        if (test.status === 'failed' && test.error) {
          xml += `    <failure type="AssertionError" message="${this.escapeXML(test.error)}">\n`;
          xml += `      <![CDATA[${this.escapeXML(test.error)}]]>\n`;
          xml += '    </failure>\n';
        }
        
        if (test.status === 'skipped') {
          xml += '    <skipped/>\n';
        }
        
        xml += '  </testcase>\n';
      }
    }

    xml += '</testsuite>';

    return xml;
  }

  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  async exportReport(executionId: string, format: 'json' | 'xml' | 'html'): Promise<string> {
    const report = this.reports.get(executionId);
    
    if (!report) {
      throw new Error('Report not found');
    }

    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'xml':
        return this.getReportAsXML(executionId);
      case 'html':
        return this.generateHTMLReport(report);
      default:
        throw new Error('Unsupported format');
    }
  }

  private generateHTMLReport(report: MobileReport): string {
    const successColor = report.summary.successRate >= 80 ? '#22c55e' : report.summary.successRate >= 60 ? '#f59e0b' : '#ef4444';

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Mobile Test Report - ${report.executionId}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #1f2937; }
    .summary { display: flex; gap: 20px; margin: 20px 0; }
    .stat { padding: 15px 25px; border-radius: 8px; text-align: center; }
    .stat.passed { background: #dcfce7; color: #166534; }
    .stat.failed { background: #fee2e2; color: #991b1b; }
    .stat.skipped { background: #fef3c7; color: #92400e; }
    .stat.total { background: #e0e7ff; color: #3730a3; }
    .success-rate { font-size: 36px; font-weight: bold; color: ${successColor}; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    .status { padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .status.passed { background: #dcfce7; color: #166534; }
    .status.failed { background: #fee2e2; color: #991b1b; }
    .status.skipped { background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Mobile Test Execution Report</h1>
    <p>Execution ID: ${report.executionId}</p>
    <p>Generated: ${report.generatedAt.toLocaleString()}</p>
    <p>Platform: ${report.summary.platform}</p>
    
    <div class="summary">
      <div class="stat total">
        <div>Total Tests</div>
        <div style="font-size: 32px; font-weight: bold;">${report.summary.totalTests}</div>
      </div>
      <div class="stat passed">
        <div>Passed</div>
        <div style="font-size: 32px; font-weight: bold;">${report.summary.passed}</div>
      </div>
      <div class="stat failed">
        <div>Failed</div>
        <div style="font-size: 32px; font-weight: bold;">${report.summary.failed}</div>
      </div>
      <div class="stat skipped">
        <div>Skipped</div>
        <div style="font-size: 32px; font-weight: bold;">${report.summary.skipped}</div>
      </div>
      <div class="stat">
        <div>Success Rate</div>
        <div class="success-rate">${report.summary.successRate}%</div>
      </div>
    </div>

    <h2>Device Results</h2>
    <table>
      <thead>
        <tr>
          <th>Device</th>
          <th>Status</th>
          <th>Tests</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        ${report.devices.map(device => `
          <tr>
            <td>${device.deviceName}</td>
            <td><span class="status ${device.status}">${device.status}</span></td>
            <td>${device.tests.filter(t => t.status === 'passed').length}/${device.tests.length}</td>
            <td>${(device.duration / 1000).toFixed(2)}s</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;
  }

  async getTrendingData(projectId: string, days: number = 7): Promise<Record<string, unknown>> {
    const reports = Array.from(this.reports.values()).slice(-days);

    const trend = reports.map((report, index) => ({
      day: index + 1,
      successRate: report.summary.successRate,
      totalTests: report.summary.totalTests,
      passed: report.summary.passed,
      failed: report.summary.failed,
    }));

    return {
      projectId,
      days,
      trend,
      averageSuccessRate: Math.round(trend.reduce((sum, r) => sum + r.successRate, 0) / trend.length) || 0,
    };
  }

  async getDeviceStatistics(): Promise<Record<string, unknown>> {
    const deviceStats: Record<string, { runs: number; failures: number; avgDuration: number }> = {};

    for (const report of this.reports.values()) {
      for (const device of report.devices) {
        if (!deviceStats[device.deviceName]) {
          deviceStats[device.deviceName] = { runs: 0, failures: 0, avgDuration: 0 };
        }
        
        deviceStats[device.deviceName].runs++;
        
        if (device.status === 'failed') {
          deviceStats[device.deviceName].failures++;
        }
        
        deviceStats[device.deviceName].avgDuration += device.duration;
      }
    }

    for (const device of Object.values(deviceStats)) {
      device.avgDuration = Math.round(device.avgDuration / device.runs);
    }

    return {
      deviceStats,
      totalRuns: Object.values(deviceStats).reduce((sum, d) => sum + d.runs, 0),
    };
  }
}