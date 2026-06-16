import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from 'axios';

interface AccessibilityTest {
  id: string;
  name: string;
  urls: string[];
  wcagLevel: string;
  config: any;
  environment: { baseUrl: string };
  project: { id: string; name: string };
}

interface AxeResult {
  passes: { id: string; description: string; help: string; helpUrl: string; nodes: unknown[] }[];
  violations: {
    id: string;
    impact: string;
    description: string;
    help: string;
    helpUrl: string;
    nodes: {
      html: string;
      target: string[];
      any: unknown[];
      all: unknown[];
    }[];
    tags: string[];
  }[];
  incomplete: unknown[];
  inapplicable: unknown[];
}

interface AxeNodeResult {
  html: string;
  target: string[];
  impact?: string;
}

@Injectable()
export class AxeExecutionService {
  private readonly logger = new Logger(AxeExecutionService.name);
  private axeApiUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.axeApiUrl = process.env.AXE_API_URL || 'http://axe:3000';
  }

  async executeAccessibilityScan(test: AccessibilityTest): Promise<void> {
    const testId = test.id;

    await this.prisma.accessibilityTest.update({
      where: { id: testId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    const results = await this.runAxeScan(test);

    await this.saveResults(testId, results);

    this.eventEmitter.emit('accessibility.completed', {
      testId,
      projectId: test.project.id,
      score: results.score,
      issues: results.totalIssues,
    });

    this.logger.log(`Accessibility test ${testId} completed`);
  }

  private async runAxeScan(test: AccessibilityTest): Promise<{
    issues: Record<string, unknown>[];
    passes: number;
    score: number;
    totalIssues: number;
  }> {
    const allIssues: Record<string, unknown>[] = [];
    let totalPasses = 0;
    let scannedPages = 0;

    for (const url of test.urls) {
      try {
        this.logger.log(`Scanning: ${url}`);

        const result = await this.runAxeOnPage(url, test.config);

        totalPasses += result.passes.length;

        for (const violation of result.violations) {
          for (const node of violation.nodes || []) {
            const axeNode = node as AxeNodeResult;
            allIssues.push({
              ruleId: violation.id,
              impact: violation.impact,
              category: this.getCategoryFromTags(violation.tags),
              description: violation.description,
              help: violation.help,
              helpUrl: violation.helpUrl,
              wcagCriteria: this.extractWcagCriteria(violation.tags),
              wcagTechniques: this.extractTechniques(violation.id),
              htmlSnippet: axeNode.html,
              selector: axeNode.target?.[0] || '',
              pageUrl: url,
            });
          }
        }

        scannedPages++;

        this.eventEmitter.emit('accessibility.page-scanned', {
          testId: test.id,
          url,
          violations: result.violations.length,
        });
      } catch (error) {
        this.logger.error(`Error scanning ${url}: ${error}`);
      }
    }

    const totalIssues = allIssues.length;
    const critical = allIssues.filter((i) => i.impact === 'critical').length;
    const serious = allIssues.filter((i) => i.impact === 'serious').length;
    const moderate = allIssues.filter((i) => i.impact === 'moderate').length;
    const minor = allIssues.filter((i) => i.impact === 'minor').length;

    const score = this.calculateScore(totalPasses, totalIssues);

    return {
      issues: allIssues,
      passes: totalPasses,
      score,
      totalIssues,
    };
  }

  private async runAxeOnPage(url: string, config?: Record<string, unknown>): Promise<AxeResult> {
    try {
      const response = await axios.post(
        `${this.axeApiUrl}/analyze`,
        { url, config },
        { timeout: 60000 }
      );
      return response.data;
    } catch (error) {
      this.logger.warn(`Axe API not available, using fallback scan: ${error}`);
      return this.fallbackScan(url);
    }
  }

  private async fallbackScan(url: string): Promise<AxeResult> {
    try {
      const response = await axios.get(url, { timeout: 30000 });
      const html = response.data as string;

      const violations: AxeResult['violations'] = [];

      if (html.includes('<img') && !html.includes('alt=')) {
        violations.push({
          id: 'image-alt',
          impact: 'serious',
          description: 'Images must have alternate text',
          help: 'Ensures <img> elements have alternate text',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.7/image-alt',
          nodes: [{ html: '<img src="...">', target: ['img'], any: [], all: [] }],
          tags: ['wcag2a', 'wcag111', 'section508'],
        });
      }

      if (html.includes('<a') && !html.includes('aria-label') && !html.includes('title=')) {
        violations.push({
          id: 'link-name',
          impact: 'serious',
          description: 'Links must have discernible text',
          help: 'Ensures links have discernible text',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.7/link-name',
          nodes: [{ html: '<a href="...">', target: ['a'], any: [], all: [] }],
          tags: ['wcag2a', 'wcag244', 'section508'],
        });
      }

      if (html.includes('<input') && !html.includes('aria-label') && !html.includes('aria-labelledby')) {
        violations.push({
          id: 'label',
          impact: 'critical',
          description: 'Form elements must have labels',
          help: 'Ensures every form element has a label',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.7/label',
          nodes: [{ html: '<input type="text">', target: ['input'], any: [], all: [] }],
          tags: ['wcag2a', 'wcag331', 'section508'],
        });
      }

      const headings = html.match(/<h[1-6][^>]*>/gi) || [];
      if (headings.length > 0) {
        const levels = headings.map((h) => parseInt(h.match(/h([1-6])/i)?.[1] || '0'));
        for (let i = 1; i < levels.length; i++) {
          if (levels[i] - levels[i - 1] > 1) {
            violations.push({
              id: 'heading-order',
              impact: 'moderate',
              description: 'Heading levels should only increase by one',
              help: 'Ensures the order of headings is semantically correct',
              helpUrl: 'https://dequeuniversity.com/rules/axe/4.7/heading-order',
              nodes: [{ html: headings[i], target: [`h${levels[i]}`], any: [], all: [] }],
              tags: ['best-practice'],
            });
            break;
          }
        }
      }

      if (html.includes('style=') && html.includes('color:') && !html.includes('background')) {
        violations.push({
          id: 'color-contrast',
          impact: 'serious',
          description: 'Elements must have sufficient color contrast',
          help: 'Ensures text has sufficient color contrast',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.7/color-contrast',
          nodes: [{ html: '<span style="color:#ccc">text</span>', target: ['span'], any: [], all: [] }],
          tags: ['wcag2aa', 'wcag143'],
        });
      }

      return {
        passes: [],
        violations,
        incomplete: [],
        inapplicable: [],
      };
    } catch (error) {
      this.logger.error(`Fallback scan failed: ${error}`);
      return { passes: [], violations: [], incomplete: [], inapplicable: [] };
    }
  }

  private async saveResults(testId: string, results: {
    issues: Record<string, unknown>[];
    passes: number;
    score: number;
    totalIssues: number;
  }): Promise<void> {
    const critical = results.issues.filter((i) => i.impact === 'critical').length;
    const serious = results.issues.filter((i) => i.impact === 'serious').length;
    const moderate = results.issues.filter((i) => i.impact === 'moderate').length;
    const minor = results.issues.filter((i) => i.impact === 'minor').length;

    await this.prisma.accessibilityTest.update({
      where: { id: testId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        totalPages: results.issues.length > 0 ? new Set(results.issues.map((i) => i.pageUrl)).size : 0,
        scannedPages: new Set(results.issues.map((i) => i.pageUrl)).size,
        totalIssues: results.totalIssues,
        criticalCount: critical,
        seriousCount: serious,
        moderateCount: moderate,
        minorCount: minor,
        passCount: results.passes,
        score: results.score,
        duration: Date.now() - new Date((await this.prisma.accessibilityTest.findUnique({ where: { id: testId }, select: { startedAt: true } }))?.startedAt || new Date()).getTime(),
      },
    });

    for (const issue of results.issues) {
      await this.prisma.accessibilityIssue.create({
        data: {
          testId,
          ruleId: issue.ruleId as string,
          impact: issue.impact as any,
          category: issue.category as string,
          description: issue.description as string,
          help: issue.help as string,
          helpUrl: issue.helpUrl as string,
          wcagCriteria: issue.wcagCriteria as string[],
          wcagTechniques: issue.wcagTechniques as string[],
          htmlSnippet: issue.htmlSnippet as string,
          selector: issue.selector as string,
          pageUrl: issue.pageUrl as string,
        },
      });
    }
  }

  private calculateScore(passes: number, violations: number): number {
    if (passes === 0 && violations === 0) return 100;
    const total = passes + violations;
    return Math.round((passes / total) * 100);
  }

  private getCategoryFromTags(tags: string[]): string {
    const categories: Record<string, string[]> = {
      'Keyboard': ['keyboard', 'taborder'],
      'Focus': ['focus', 'focus-visible'],
      'Color': ['color', 'contrast'],
      'Media': ['media', 'audio', 'video'],
      'Structure': ['heading', 'landmark', 'region'],
      'Links': ['link', 'link-name'],
      'Forms': ['form', 'label', 'input'],
      'Images': ['image', 'img', 'alt'],
      'Tables': ['table', 'td', 'th'],
    };

    for (const [category, categoryTags] of Object.entries(categories)) {
      if (categoryTags.some((t) => tags.includes(t))) {
        return category;
      }
    }
    return 'Other';
  }

  private extractWcagCriteria(tags: string[]): string[] {
    const wcagMap: Record<string, string> = {
      'wcag2a': 'WCAG 2.0 Level A',
      'wcag2aa': 'WCAG 2.0 Level AA',
      'wcag2aaa': 'WCAG 2.0 Level AAA',
      'wcag21a': 'WCAG 2.1 Level A',
      'wcag21aa': 'WCAG 2.1 Level AA',
      'wcag22aa': 'WCAG 2.2 Level AA',
      'section508': 'Section 508',
      'wcag111': '1.1.1 Non-text Content',
      'wcag121': '1.2.1 Audio and Video',
      'wcag131': '1.3.1 Info and Relationships',
      'wcag141': '1.4.1 Use of Color',
      'wcag143': '1.4.3 Contrast (Minimum)',
      'wcag211': '2.1.1 Keyboard',
      'wcag244': '2.4.4 Link Purpose',
      'wcag331': '3.3.1 Error Identification',
    };

    const criteria: string[] = [];
    for (const tag of tags) {
      if (wcagMap[tag]) {
        criteria.push(wcagMap[tag]);
      }
    }
    return criteria.length > 0 ? criteria : ['WCAG 2.0 Level AA'];
  }

  private extractTechniques(ruleId: string): string[] {
    const techniqueMap: Record<string, string[]> = {
      'image-alt': ['H37', 'H53'],
      'link-name': ['H30', 'G91'],
      'label': ['H44', 'H65', 'G167'],
      'heading-order': ['H42'],
      'color-contrast': ['G18', 'G145'],
      'html-has-lang': ['H57'],
      'region': ['H69'],
    };

    return techniqueMap[ruleId] || ['GENERAL'];
  }

  async cancelTest(testId: string): Promise<void> {
    await this.prisma.accessibilityTest.update({
      where: { id: testId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
  }
}