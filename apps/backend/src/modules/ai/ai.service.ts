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

  private async callAi(prompt: string): Promise<unknown> {
    if (this.provider !== 'openai') {
      this.logger.warn(`AI_PROVIDER is '${this.provider}', not 'openai'. Returning rule-based result.`);
      return null;
    }
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
    } catch (error) {
      this.logger.warn(`OpenAI call failed: ${error.message}`);
      return null;
    }
  }

  async analyzeTest(projectId: string, testCode: string) {
    this.logger.log(`Analyzing test code for project ${projectId}`);
    return this.callAi(
      `Analyze this test code and suggest improvements. Return JSON with keys: suggestions (string array), complexity (string), coverage (number 0-100), recommendedPatterns (string array). Test code:\n${testCode}`,
    );
  }

  async generateTestCases(projectId: string, description: string) {
    this.logger.log(`Generating test cases for project ${projectId}`);
    return this.callAi(
      `Generate test cases for this feature. Return JSON with key "testCases" containing an array of objects with keys: name (string), priority (string "high"/"medium"/"low"). Feature description:\n${description}`,
    );
  }

  async analyzeExecution(projectId: string, executionId: string) {
    this.logger.log(`Analyzing execution ${executionId}`);
    return this.callAi(
      `Analyze test execution ${executionId} results. Return JSON with keys: insights (string array), recommendations (string array), trends (object with keys: passRate (number), trend (string "up"/"down"/"stable")).`,
    );
  }

  async suggestFixes(bugId: string, errorStack: string) {
    this.logger.log(`Analyzing bug ${bugId}`);
    return this.callAi(
      `Suggest fixes for this error. Return JSON with keys: possibleCauses (string array), suggestedFixes (array of objects with keys: action (string), confidence (number 0-100)). Error:\n${errorStack}`,
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

    const aiResult = await this.callAi(
      `Given ${totalExecutions} total executions with ${failedExecutions} failures, ${tests} total tests, and ${bugs} open bugs, generate insights and recommendations. Return JSON with keys: recommendations (string array).`,
    ).catch(() => null);

    return {
      health: totalExecutions ? Math.round(((totalExecutions - failedExecutions) / totalExecutions) * 100) : 100,
      testCoverage: tests > 0 ? Math.min(100, tests * 10) : 0,
      openBugs: bugs,
      recommendations: (aiResult as { recommendations?: string[] } | null)?.recommendations || [],
    };
  }
}