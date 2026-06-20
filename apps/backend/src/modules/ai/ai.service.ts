import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly provider: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.provider = this.configService.get('AI_PROVIDER') || 'rule-based';
  }

  private async callAi(prompt: string, fallback: any): Promise<any> {
    if (this.provider === 'openai') {
      try {
        const { default: OpenAI } = await import('openai');
        const openai = new OpenAI({
          apiKey: this.configService.get('OPENAI_API_KEY'),
          baseURL: this.configService.get('AI_BASE_URL') || 'https://api.openai.com/v1',
        });
        const completion = await openai.chat.completions.create({
          model: this.configService.get('AI_MODEL') || 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        });
        const text = completion.choices[0]?.message?.content || '{}';
        try {
          return JSON.parse(text);
        } catch {
          return { aiGenerated: true, content: text };
        }
      } catch (err) {
        this.logger.warn(`OpenAI call failed, using fallback: ${err}`);
      }
    }
    return fallback;
  }

  async analyzeTest(projectId: string, testCode: string) {
    this.logger.log(`Analyzing test code for project ${projectId}`);
    return this.callAi(
      `Analyze this test code and suggest improvements. Return JSON with keys: suggestions (string array), complexity (string), coverage (number 0-100), recommendedPatterns (string array). Test code:\n${testCode}`,
      {
        suggestions: ['Consider adding more edge case tests', 'Add data-driven test patterns'],
        complexity: 'medium',
        coverage: 75,
        recommendedPatterns: ['Page Object Model', 'Data-driven testing'],
      },
    );
  }

  async generateTestCases(projectId: string, description: string) {
    this.logger.log(`Generating test cases for project ${projectId}`);
    return this.callAi(
      `Generate test cases for this feature. Return JSON with key "testCases" containing an array of objects with keys: name (string), priority (string "high"/"medium"/"low"). Feature description:\n${description}`,
      {
        testCases: [
          { name: 'Test login with valid credentials', priority: 'high' },
          { name: 'Test login with invalid credentials', priority: 'high' },
          { name: 'Test password reset flow', priority: 'medium' },
        ],
      },
    );
  }

  async analyzeExecution(projectId: string, executionId: string) {
    this.logger.log(`Analyzing execution ${executionId}`);
    return this.callAi(
      `Analyze test execution ${executionId} results. Return JSON with keys: insights (string array), recommendations (string array), trends (object with keys: passRate (number), trend (string "up"/"down"/"stable")).`,
      {
        insights: ['3 tests are flaky', '2 tests have timing issues'],
        recommendations: ['Add explicit waits', 'Increase retry count for flaky tests'],
        trends: { passRate: 85, trend: 'stable' },
      },
    );
  }

  async suggestFixes(bugId: string, errorStack: string) {
    this.logger.log(`Analyzing bug ${bugId}`);
    return this.callAi(
      `Suggest fixes for this error. Return JSON with keys: possibleCauses (string array), suggestedFixes (array of objects with keys: action (string), confidence (number 0-100)). Error:\n${errorStack}`,
      {
        possibleCauses: ['Race condition', 'Element not visible', 'Timing issue'],
        suggestedFixes: [
          { action: 'Add explicit wait', confidence: 85 },
          { action: 'Use retry mechanism', confidence: 70 },
        ],
      },
    );
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