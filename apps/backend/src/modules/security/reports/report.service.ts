import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ReportData {
  scan: {
    id: string;
    name: string;
    projectId: string;
    status: string;
    scanType: string;
    startedAt: Date;
    completedAt: Date;
    duration: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
  };
  vulnerabilities: {
    id: string;
    title: string;
    description: string;
    severity: string;
    status: string;
    cweId: string | null;
    cveId: string | null;
    owaspCategory: string | null;
    affectedUrl: string | null;
    remediation: string | null;
  }[];
  project: { name: string } | null;
  environment: { name: string; baseUrl: string } | null;
}

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async generateReport(
    scanId: string,
    format: 'json' | 'html' | 'pdf',
    type: 'executive' | 'developer' | 'compliance' = 'developer',
  ): Promise<{ reportId: string; downloadUrl: string }> {
    const scan = await this.prisma.securityScan.findUnique({
      where: { id: scanId },
      include: {
        project: { select: { name: true } },
        environment: { select: { name: true, baseUrl: true } },
        vulnerabilities: { orderBy: { severity: 'desc' } },
      },
    });

    if (!scan) throw new NotFoundException('Scan not found');

    const reportData = this.prepareReportData(scan, type);
    let fileContent: string;
    let fileName: string;

    switch (format) {
      case 'json':
        fileContent = JSON.stringify(reportData, null, 2);
        fileName = `security-report-${scanId}-${Date.now()}.json`;
        break;
      case 'html':
        fileContent = this.generateHtmlReport(reportData);
        fileName = `security-report-${scanId}-${Date.now()}.html`;
        break;
      case 'pdf':
        fileContent = this.generateHtmlReport(reportData);
        fileName = `security-report-${scanId}-${Date.now()}.html`;
        break;
      default:
        throw new Error('Unsupported format');
    }

    const reportsDir = path.join(process.cwd(), 'reports');
    await fs.mkdir(reportsDir, { recursive: true });

    const filePath = path.join(reportsDir, fileName);
    await fs.writeFile(filePath, fileContent, 'utf-8');

    const report = await this.prisma.securityReport.create({
      data: {
        scanId,
        type: type || 'developer',
        format,
        fileName,
        filePath,
        fileSize: Buffer.byteLength(fileContent, 'utf-8'),
      },
    });

    return {
      reportId: report.id,
      downloadUrl: `/api/security/reports/${report.id}/download`,
    };
  }

  private prepareReportData(scan: ReportData['scan'] & {
    project?: { name: string } | null;
    environment?: { name: string; baseUrl: string } | null;
    vulnerabilities?: ReportData['vulnerabilities'];
  }, type: string) {
    const baseData = {
      scanId: scan.id,
      scanName: scan.name,
      projectName: scan.project?.name || 'N/A',
      environmentName: scan.environment?.name || 'N/A',
      baseUrl: scan.environment?.baseUrl || 'N/A',
      scanType: scan.scanType,
      status: scan.status,
      scanDate: scan.startedAt,
      duration: scan.duration,
      summary: {
        total: scan.criticalCount + scan.highCount + scan.mediumCount + scan.lowCount + scan.infoCount,
        critical: scan.criticalCount,
        high: scan.highCount,
        medium: scan.mediumCount,
        low: scan.lowCount,
        informational: scan.infoCount,
      },
    };

    if (type === 'executive') {
      return {
        ...baseData,
        vulnerabilities: scan.vulnerabilities
          ?.filter((v) => v.severity === 'CRITICAL' || v.severity === 'HIGH')
          .map((v) => ({ title: v.title, severity: v.severity, status: v.status })),
        recommendations: this.generateExecutiveRecommendations(scan),
      };
    }

    if (type === 'compliance') {
      return {
        ...baseData,
        complianceFrameworks: {
          owaspTop10: this.mapToOwaspTop10(scan.vulnerabilities || []),
          NIST: this.mapToNist(scan.vulnerabilities || []),
          PCI: this.mapToPci(scan.vulnerabilities || []),
        },
      };
    }

    return {
      ...baseData,
      vulnerabilities: scan.vulnerabilities?.map((v) => ({
        id: v.id,
        title: v.title,
        description: v.description,
        severity: v.severity,
        status: v.status,
        cweId: v.cweId,
        cveId: v.cveId,
        owaspCategory: v.owaspCategory,
        affectedUrl: v.affectedUrl,
        remediation: v.remediation,
      })),
    };
  }

  private generateHtmlReport(data: Record<string, unknown>): string {
    const severityColors: Record<string, string> = {
      CRITICAL: '#dc2626',
      HIGH: '#ea580c',
      MEDIUM: '#ca8a04',
      LOW: '#65a30d',
      INFO: '#3b82f6',
    };

    const summary = (data['summary'] as Record<string, number>) || {};
    const vulnerabilities = (data['vulnerabilities'] as Record<string, unknown>[]) || [];

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Report - ${data['scanName']}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; background: #f9fafb; }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 2rem; border-radius: 1rem; margin-bottom: 2rem; }
    .header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .header .meta { opacity: 0.9; font-size: 0.875rem; }
    .card { background: white; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
    .stat { text-align: center; padding: 1rem; border-radius: 0.5rem; }
    .stat.critical { background: #fef2f2; border: 2px solid #dc2626; }
    .stat.high { background: #fff7ed; border: 2px solid #ea580c; }
    .stat.medium { background: #fefce8; border: 2px solid #ca8a04; }
    .stat.low { background: #f0fdf4; border: 2px solid #65a30d; }
    .stat-value { font-size: 2rem; font-weight: bold; }
    .stat-label { font-size: 0.875rem; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    .severity { padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600; }
    .footer { text-align: center; color: #6b7280; padding: 2rem; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Security Assessment Report</h1>
      <div class="meta">
        <p>Project: ${data['projectName']} | Environment: ${data['environmentName']}</p>
        <p>Scan Date: ${new Date(data['scanDate'] as string).toLocaleDateString()} | Duration: ${(data['duration'] as number) || 0}ms</p>
      </div>
    </div>

    <div class="card">
      <h2 style="margin-bottom: 1rem;">Vulnerability Summary</h2>
      <div class="grid">
        <div class="stat critical">
          <div class="stat-value" style="color: #dc2626;">${summary.critical || 0}</div>
          <div class="stat-label">Critical</div>
        </div>
        <div class="stat high">
          <div class="stat-value" style="color: #ea580c;">${summary.high || 0}</div>
          <div class="stat-label">High</div>
        </div>
        <div class="stat medium">
          <div class="stat-value" style="color: #ca8a04;">${summary.medium || 0}</div>
          <div class="stat-label">Medium</div>
        </div>
        <div class="stat low">
          <div class="stat-value" style="color: #65a30d;">${summary.low || 0}</div>
          <div class="stat-label">Low</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2 style="margin-bottom: 1rem;">Vulnerabilities (${vulnerabilities.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Title</th>
            <th>Status</th>
            <th>CWE</th>
          </tr>
        </thead>
        <tbody>
          ${vulnerabilities.map((v) => `
<tr>
              <td><span class="severity" style="background: ${severityColors[String(v.severity)] || '#6b7280'}; color: white;">${v.severity}</span></td>
              <td>${v.title}</td>
              <td>${v.status}</td>
              <td>${v.cweId || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Generated by QADash Security Scanner</p>
      <p>${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>`;
  }

  private generateExecutiveRecommendations(scan: ReportData['scan']): string[] {
    const recommendations: string[] = [];

    if (scan.criticalCount > 0) {
      recommendations.push('URGENT: Address critical vulnerabilities immediately to prevent potential breaches.');
    }

    if (scan.highCount > 0) {
      recommendations.push('Schedule remediation of high-severity issues within the next sprint.');
    }

    recommendations.push('Implement security testing in CI/CD pipeline.');
    recommendations.push('Conduct regular security training for development team.');
    recommendations.push('Review and update security policies annually.');

    return recommendations;
  }

  private mapToOwaspTop10(vulnerabilities: ReportData['vulnerabilities']): Record<string, number> {
    const mapping: Record<string, string[]> = {
      A01_BROKEN_ACCESS_CONTROL: ['CWE-284', 'CWE-639', 'CWE-862'],
      A02_CRYPTOGRAPHIC_FAILURES: ['CWE-327', 'CWE-331', 'CWE-345'],
      A03_INJECTION: ['CWE-79', 'CWE-89', 'CWE-564'],
      A04_INSECURE_DESIGN: ['CWE-434', 'CWE-502'],
      A05_SECURITY_MISCONFIGURATION: ['CWE-16', 'CWE-693', 'CWE-754'],
      A06_VULNERABLE_COMPONENTS: ['CWE-1104', 'CWE-1305'],
      A07_AUTHENTICATION_FAILURES: ['CWE-287', 'CWE-798', 'CWE-613'],
      A08_SOFTWARE_DATA_INTEGRITY_FAILURES: ['CWE-345', 'CWE-494'],
      A09_LOGGING_MONITORING: ['CWE-778', 'CWE-117'],
      A10_SSRF: ['CWE-918'],
    };

    const counts: Record<string, number> = {};
    for (const [category, cwes] of Object.entries(mapping)) {
      counts[category] = vulnerabilities.filter(
        (v) => v.cweId && cwes.includes(v.cweId),
      ).length;
    }

    return counts;
  }

  private mapToNist(vulnerabilities: ReportData['vulnerabilities']): Record<string, number> {
    return {
      identify: vulnerabilities.filter((v) => ['CWE-200', 'CWE-552'].includes(v.cweId || '')).length,
      protect: vulnerabilities.filter((v) => ['CWE-287', 'CWE-798', 'CWE-306'].includes(v.cweId || '')).length,
      detect: vulnerabilities.filter((v) => ['CWE-706', 'CWE-754'].includes(v.cweId || '')).length,
      respond: vulnerabilities.filter((v) => ['CWE-778', 'CWE-404'].includes(v.cweId || '')).length,
      recover: vulnerabilities.filter((v) => ['CWE-690', 'CWE-665'].includes(v.cweId || '')).length,
    };
  }

  private mapToPci(vulnerabilities: ReportData['vulnerabilities']): Record<string, number> {
    return {
      '6.5.1': vulnerabilities.filter((v) => v.cweId === 'CWE-89').length,
      '6.5.2': vulnerabilities.filter((v) => v.cweId === 'CWE-79').length,
      '6.5.3': vulnerabilities.filter((v) => v.cweId === 'CWE-306').length,
      '6.5.4': vulnerabilities.filter((v) => v.cweId === 'CWE-287').length,
      '6.5.5': vulnerabilities.filter((v) => v.cweId === 'CWE-284').length,
      '6.5.6': vulnerabilities.filter((v) => v.cweId === 'CWE-327').length,
    };
  }

  async getReportDownloadUrl(reportId: string): Promise<{ url: string; fileName: string }> {
    const report = await this.prisma.securityReport.findUnique({
      where: { id: reportId },
    });

    if (!report) throw new NotFoundException('Report not found');

    return {
      url: `/api/security/reports/${reportId}/file`,
      fileName: report.fileName,
    };
  }

  async getReportFile(reportId: string): Promise<{ filePath: string; fileName: string; contentType: string }> {
    const report = await this.prisma.securityReport.findUnique({
      where: { id: reportId },
    });

    if (!report) throw new NotFoundException('Report not found');

    const contentType = report.format === 'json' ? 'application/json' : 'text/html';

    return {
      filePath: report.filePath,
      fileName: report.fileName,
      contentType,
    };
  }
}