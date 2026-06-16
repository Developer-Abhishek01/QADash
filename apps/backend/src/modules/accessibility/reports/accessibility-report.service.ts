import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ReportData {
  test: {
    id: string;
    name: string;
    projectId: string;
    status: string;
    startedAt: Date;
    completedAt: Date;
    duration: number;
    score: number;
    totalPages: number;
    criticalCount: number;
    seriousCount: number;
    moderateCount: number;
    minorCount: number;
    passCount: number;
    wcagLevel: string;
  };
  project: { name: string } | null;
  issues: {
    id: string;
    ruleId: string;
    impact: string;
    category: string;
    description: string;
    help: string;
    helpUrl: string;
    wcagCriteria: string[];
    wcagTechniques: string[];
    htmlSnippet: string;
    selector: string;
    pageUrl: string;
  }[];
  recommendations: {
    priority: string;
    category: string;
    issue: string;
    fix: string;
    code: string;
    wcag: string[];
  }[];
}

@Injectable()
export class AccessibilityReportService {
  constructor(private readonly prisma: PrismaService) {}

  async generateReport(testId: string, format: 'json' | 'html' | 'pdf'): Promise<{ reportId: string; downloadUrl: string }> {
    const test = await this.prisma.accessibilityTest.findUnique({
      where: { id: testId },
      include: {
        project: { select: { name: true } },
        issues: { orderBy: { impact: 'desc' } },
      },
    });

    if (!test) throw new NotFoundException('Test not found');

    const reportData = this.prepareReportData(test);
    let fileContent: string;
    let fileName: string;
    let contentType: string;

    switch (format) {
      case 'json':
        fileContent = JSON.stringify(reportData, null, 2);
        fileName = `accessibility-report-${testId}-${Date.now()}.json`;
        contentType = 'application/json';
        break;
      case 'html':
        fileContent = this.generateHtmlReport(reportData);
        fileName = `accessibility-report-${testId}-${Date.now()}.html`;
        contentType = 'text/html';
        break;
      case 'pdf':
        fileContent = this.generateHtmlReport(reportData);
        fileName = `accessibility-report-${testId}-${Date.now()}.html`;
        contentType = 'text/html';
        break;
      default:
        throw new Error('Unsupported format');
    }

    const reportsDir = path.join(process.cwd(), 'reports', 'accessibility');
    await fs.mkdir(reportsDir, { recursive: true });

    const filePath = path.join(reportsDir, fileName);
    await fs.writeFile(filePath, fileContent, 'utf-8');

    await this.prisma.accessibilityTest.update({
      where: { id: testId },
      data: { reportUrl: `/api/accessibility/reports/${testId}/download` },
    });

    return {
      reportId: testId,
      downloadUrl: `/api/accessibility/reports/${testId}/download`,
    };
  }

  private prepareReportData(test: any): ReportData {
    const recommendations = this.generateRecommendations(test.issues);

    return {
      test: {
        id: test.id,
        name: test.name,
        projectId: test.projectId,
        status: test.status,
        startedAt: test.startedAt,
        completedAt: test.completedAt,
        duration: test.duration || 0,
        score: test.score,
        totalPages: test.totalPages,
        criticalCount: test.criticalCount,
        seriousCount: test.seriousCount,
        moderateCount: test.moderateCount,
        minorCount: test.minorCount,
        passCount: test.passCount,
        wcagLevel: test.wcagLevel,
      },
      project: test.project,
      issues: test.issues.map((i: any) => ({
        id: i.id,
        ruleId: i.ruleId,
        impact: i.impact,
        category: i.category,
        description: i.description,
        help: i.help,
        helpUrl: i.helpUrl,
        wcagCriteria: i.wcagCriteria || [],
        wcagTechniques: i.wcagTechniques || [],
        htmlSnippet: i.htmlSnippet,
        selector: i.selector,
        pageUrl: i.pageUrl,
      })),
      recommendations,
    };
  }

  private generateRecommendations(issues: any[]): {
    priority: string;
    category: string;
    issue: string;
    fix: string;
    code: string;
    wcag: string[];
  }[] {
    const recommendations: {
      priority: string;
      category: string;
      issue: string;
      fix: string;
      code: string;
      wcag: string[];
    }[] = [];

    const fixMap: Record<string, { fix: string; code: string; wcag: string[] }> = {
      'image-alt': {
        fix: 'Add alt attribute to image elements',
        code: '<img src="image.jpg" alt="Description of image">',
        wcag: ['1.1.1 Non-text Content'],
      },
      'link-name': {
        fix: 'Add text content or aria-label to link',
        code: '<a href="/page">Click here</a> or <a href="/page" aria-label="Go to page"></a>',
        wcag: ['2.4.4 Link Purpose'],
      },
      'label': {
        fix: 'Add label element or aria-label to input',
        code: '<label for="input-id">Label</label><input id="input-id"> or <input aria-label="Label">',
        wcag: ['3.3.2 Labels or Instructions'],
      },
      'heading-order': {
        fix: 'Ensure headings are in logical order without skipping levels',
        code: '<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>',
        wcag: ['1.3.1 Info and Relationships'],
      },
      'color-contrast': {
        fix: 'Ensure text has sufficient color contrast (4.5:1 for normal text)',
        code: 'Use color: #333 instead of #999 for text on white background',
        wcag: ['1.4.3 Contrast (Minimum)', '1.4.6 Contrast (AAA)'],
      },
      'html-has-lang': {
        fix: 'Add lang attribute to html element',
        code: '<html lang="en">',
        wcag: ['3.1.1 Language of Page'],
      },
      'region': {
        fix: 'Use ARIA landmark roles or semantic HTML elements',
        code: '<header>, <nav>, <main>, <footer>, <aside>',
        wcag: ['1.3.1 Info and Relationships'],
      },
      'form-field-multiple-labels': {
        fix: 'Ensure each form field has only one label',
        code: '<label for="name">Name:</label><input id="name">',
        wcag: ['1.3.1 Info and Relationships'],
      },
      'aria-valid-attr': {
        fix: 'Use valid ARIA attribute names',
        code: 'aria-hidden, aria-label, aria-describedby (not misspelled)',
        wcag: ['4.1.2 Name, Role, Value'],
      },
      'video-caption': {
        fix: 'Add captions to video content',
        code: '<track kind="captions" src="captions.vtt" srclang="en">',
        wcag: ['1.2.2 Captions (Prerecorded)'],
      },
    };

    for (const issue of issues) {
      const ruleId = issue.ruleId as string;
      const fixInfo = fixMap[ruleId] || { fix: 'Review accessibility guidelines', code: '', wcag: ['WCAG 2.0'] };

      recommendations.push({
        priority: issue.impact.toUpperCase(),
        category: issue.category || 'Other',
        issue: issue.description,
        fix: fixInfo.fix,
        code: fixInfo.code,
        wcag: issue.wcagCriteria || fixInfo.wcag,
      });
    }

    return recommendations;
  }

  private generateHtmlReport(data: ReportData): string {
    const severityColors: Record<string, string> = {
      CRITICAL: '#dc2626',
      SERIOUS: '#ea580c',
      MODERATE: '#ca8a04',
      MINOR: '#65a30d',
    };

    const scoreColor = data.test.score >= 90 ? '#10b981' : data.test.score >= 70 ? '#ca8a04' : '#dc2626';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Report - ${data.test.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; background: #f9fafb; }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 2rem; border-radius: 1rem; margin-bottom: 2rem; }
    .header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .card { background: white; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
    .stat { text-align: center; padding: 1rem; border-radius: 0.5rem; }
    .score { font-size: 3rem; font-weight: bold; color: ${scoreColor}; }
    .severity { padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600; color: white; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    .code { background: #1f2937; color: #10b981; padding: 0.5rem; border-radius: 0.25rem; font-family: monospace; font-size: 0.875rem; overflow-x: auto; }
    .recommendation { border-left: 4px solid #10b981; padding-left: 1rem; margin-bottom: 1rem; }
    .footer { text-align: center; color: #6b7280; padding: 2rem; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Accessibility Assessment Report</h1>
      <p>${data.test.name} - ${data.project?.name || 'N/A'}</p>
    </div>

    <div class="card">
      <div class="grid">
        <div class="stat">
          <div class="score">${data.test.score}%</div>
          <div>Accessibility Score</div>
        </div>
        <div class="stat" style="background: #fef2f2;">
          <div style="font-size: 2rem; font-weight: bold; color: #dc2626;">${data.test.criticalCount}</div>
          <div>Critical Issues</div>
        </div>
        <div class="stat" style="background: #fff7ed;">
          <div style="font-size: 2rem; font-weight: bold; color: #ea580c;">${data.test.seriousCount}</div>
          <div>Serious Issues</div>
        </div>
        <div class="stat">
          <div style="font-size: 2rem; font-weight: bold;">${data.test.totalPages}</div>
          <div>Pages Scanned</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2 style="margin-bottom: 1rem;">WCAG Compliance</h2>
      <p>Target Level: <strong>${data.test.wcagLevel}</strong></p>
      <p style="margin-top: 0.5rem; color: #6b7280;">
        ${data.test.wcagLevel === 'AAA' ? 'Highest level of accessibility compliance' :
          data.test.wcagLevel === 'AA' ? 'Standard accessibility compliance (recommended)' :
          'Basic accessibility compliance'}
      </p>
    </div>

    <div class="card">
      <h2 style="margin-bottom: 1rem;">Issues Summary</h2>
      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Category</th>
            <th>Issue</th>
            <th>Page</th>
          </tr>
        </thead>
        <tbody>
          ${data.issues.slice(0, 20).map((issue) => `
            <tr>
              <td><span class="severity" style="background: ${severityColors[issue.impact?.toUpperCase()] || '#6b7280'}">${issue.impact}</span></td>
              <td>${issue.category}</td>
              <td>${issue.description?.substring(0, 80) || issue.ruleId}</td>
              <td><a href="${issue.pageUrl}" style="color: #3b82f6;">${new URL(issue.pageUrl).pathname}</a></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2 style="margin-bottom: 1rem;">Remediation Recommendations</h2>
      ${data.recommendations.slice(0, 10).map((rec) => `
        <div class="recommendation">
          <h4 style="color: ${severityColors[rec.priority] || '#6b7280'}">${rec.priority}: ${rec.category}</h4>
          <p><strong>Issue:</strong> ${rec.issue}</p>
          <p><strong>Fix:</strong> ${rec.fix}</p>
          ${rec.code ? `<p><strong>Example:</strong></p><div class="code">${rec.code}</div>` : ''}
          <p style="margin-top: 0.5rem; color: #6b7280; font-size: 0.875rem;">
            <strong>WCAG:</strong> ${rec.wcag.join(', ')}
          </p>
        </div>
      `).join('')}
    </div>

    <div class="footer">
      <p>Generated by QADash Accessibility Scanner (Axe Core)</p>
      <p>${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>`;
  }

  async downloadReport(testId: string): Promise<{ filePath: string; fileName: string }> {
    const test = await this.prisma.accessibilityTest.findUnique({ where: { id: testId } });
    if (!test) throw new NotFoundException('Test not found');

    return {
      filePath: path.join(process.cwd(), 'reports', 'accessibility'),
      fileName: `accessibility-report-${testId}.html`,
    };
  }
}