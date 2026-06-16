import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly prisma: PrismaService) {}

  async analyzeTest(projectId: string, testCode: string) {
    this.logger.log(`Analyzing test code for project ${projectId}`);
    return {
      suggestions: ['Consider adding more edge case tests', 'Add data-driven test patterns'],
      complexity: 'medium',
      coverage: 75,
      recommendedPatterns: ['Page Object Model', 'Data-driven testing'],
    };
  }

  async generateTestCases(projectId: string, description: string) {
    this.logger.log(`Generating test cases for project ${projectId}`);
    return {
      testCases: [
        { name: 'Test login with valid credentials', priority: 'high' },
        { name: 'Test login with invalid credentials', priority: 'high' },
        { name: 'Test password reset flow', priority: 'medium' },
      ],
    };
  }

  async analyzeExecution(projectId: string, executionId: string) {
    this.logger.log(`Analyzing execution ${executionId}`);
    return {
      insights: ['3 tests are flaky', '2 tests have timing issues'],
      recommendations: ['Add explicit waits', 'Increase retry count for flaky tests'],
      trends: { passRate: 85, trend: 'stable' },
    };
  }

  async suggestFixes(bugId: string, errorStack: string) {
    this.logger.log(`Analyzing bug ${bugId}`);
    return {
      possibleCauses: ['Race condition', 'Element not visible', 'Timing issue'],
      suggestedFixes: [
        { action: 'Add explicit wait', confidence: 85 },
        { action: 'Use retry mechanism', confidence: 70 },
      ],
    };
  }

  async getInsights(projectId: string) {
    const [tests, executions, bugs] = await Promise.all([
      this.prisma.test.count({ where: { projectId } }),
      this.prisma.execution.findMany({ where: { projectId } }),
      this.prisma.bug.count({ where: { projectId, status: { not: 'CLOSED' } } }),
    ]);

    const failedExecutions = executions.filter(e => e.status === 'FAILED').length;
    const totalExecutions = executions.length;

    return {
      health: totalExecutions ? Math.round(((totalExecutions - failedExecutions) / totalExecutions) * 100) : 100,
      testCoverage: tests > 0 ? Math.min(100, tests * 10) : 0,
      openBugs: bugs,
      recommendations: [
        'Add more integration tests',
        'Fix flaky tests in critical path',
        'Increase test data variety',
      ],
    };
  }
}