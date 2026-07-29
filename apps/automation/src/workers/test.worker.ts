import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { logger } from '@qadash/logger';
import { Worker, Job, WorkerOptions } from 'bullmq';

interface TestJobData {
  executionId: string;
  projectId: string;
  testIds: string[];
  userId: string;
  triggerSource?: string;
}

export class TestWorker extends Worker<TestJobData> {
  private prisma: PrismaClient;

  constructor(options: WorkerOptions) {
    const queueName = process.env.AUTOMATION_QUEUE_NAME || 'automation-execution';
    super(queueName, async (job: Job<TestJobData>) => {
      return this.processExecution(job);
    }, options);
    this.prisma = new PrismaClient();
  }

  private async processExecution(job: Job<TestJobData>): Promise<{ status: string; passed: number; failed: number }> {
    if (process.env.AUTOMATION_WORKER_ENABLED !== 'true') {
      throw new Error('Automation worker is disabled. Set AUTOMATION_WORKER_ENABLED=true to use this worker.');
    }
    const { executionId } = job.data;
    const startTime = Date.now();

    // Query database to ensure we have all required fields even if job.data is incomplete
    const dbExecution = await this.prisma.execution.findUnique({
      where: { id: executionId },
    });

    if (!dbExecution) {
      throw new Error(`Execution ${executionId} not found in database`);
    }

    const projectId = job.data.projectId || dbExecution.projectId;
    const testIds = job.data.testIds || dbExecution.testIds || [];
    const userId = job.data.userId || dbExecution.userId;

    logger.info(`Starting execution ${executionId} with ${testIds.length} tests`);

    // Update execution status in DB
    await this.prisma.execution.update({
      where: { id: executionId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    let passed = 0;
    let failed = 0;

    for (let i = 0; i < testIds.length; i++) {
      const testId = testIds[i];
      await job.updateProgress(Math.round(((i + 1) / testIds.length) * 100));

      // Create test run record
      const run = await this.prisma.testRun.create({
        data: {
          testId,
          projectId,
          executionId,
          userId,
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      try {
        const result = await this.runSingleTest(testId);
        
        passed += result.passed ? 1 : 0;
        failed += result.passed ? 0 : 1;

        // Update test run record with results and screenshots/videos metadata
        await this.prisma.testRun.update({
          where: { id: run.id },
          data: {
            status: result.passed ? 'PASSED' : 'FAILED',
            duration: result.duration,
            logs: result.logs,
            error: result.error,
            metadata: {
              screenshot: result.screenshotUrl,
              video: result.videoUrl,
            },
            completedAt: new Date(),
          },
        });
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await this.prisma.testRun.update({
          where: { id: run.id },
          data: {
            status: 'FAILED',
            error: errorMessage,
            completedAt: new Date(),
          },
        });
      }
    }

    const duration = Date.now() - startTime;

    // Update final execution status
    await this.prisma.execution.update({
      where: { id: executionId },
      data: {
        status: failed === 0 ? 'PASSED' : 'FAILED',
        passedTests: passed,
        failedTests: failed,
        duration,
        completedAt: new Date(),
      },
    });

    logger.info(`Execution ${executionId} finished. Passed: ${passed}, Failed: ${failed}`);
    return { status: 'completed', passed, failed };
  }

  private async runSingleTest(testId: string): Promise<{ 
    passed: boolean; 
    duration: number; 
    logs?: string; 
    error?: string;
    screenshotUrl?: string;
    videoUrl?: string;
  }> {
    const startTime = Date.now();
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let videoPath = '';
    let screenshotUrl = '';

    try {
      // Fetch test details from DB
      const test = await this.prisma.test.findUnique({ where: { id: testId } });
      if (!test) throw new Error(`Test ${testId} not found`);

      const testConfig = test.config as unknown as Record<string, unknown>;
      const targetUrl = testConfig?.url as string | undefined;

      // Setup paths for static uploads — use env var, fall back to backend uploads
      const uploadsDir = process.env.UPLOADS_DIR || path.resolve(__dirname, '..', '..', '..', 'backend', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const videoDir = path.join(uploadsDir, 'videos');
      if (!fs.existsSync(videoDir)) {
        fs.mkdirSync(videoDir, { recursive: true });
      }

      const screenshotDir = path.join(uploadsDir, 'screenshots');
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }

      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      // Enable video recording in context options
      context = await browser.newContext({
        recordVideo: {
          dir: videoDir,
          size: { width: 1280, height: 720 },
        }
      });
      
      const page = await context.newPage();
      
      logger.info(`Running test ${test.name} against ${targetUrl || '(no URL set, using step navigation)'}`);
      
      const testRecord = test as unknown as Record<string, unknown>;
      const steps: Record<string, unknown>[] = ((testConfig?.steps as Record<string, unknown>[] | undefined) || (testRecord.steps as Record<string, unknown>[] | undefined) || []).map((s: Record<string, unknown>) => ({
        ...s,
        type: (s.type ?? s.action) as string,
      }));
      let title = '';

      if (test.code) {
        logger.info(`Executing custom code for test ${test.name}`);
        const allowedApiNames = new Set([
          'goto', 'click', 'fill', 'type', 'waitForSelector',
          'title', 'url', 'screenshot', 'content', 'textContent',
          'isVisible', '$', '$$', 'evaluate',
        ]);
        const sanitizedCode = test.code
          .replace(/require\s*\(/gi, 'null/')
          .replace(/import\s*\(/gi, 'null/')
          .replace(/process\s*\./gi, 'null.')
          .replace(/global\s*\./gi, 'null.')
          .replace(/__dirname/gi, '"."')
          .replace(/__filename/gi, '"test"');
        if (sanitizedCode.length > 5000) {
          throw new Error('Test code exceeds maximum length of 5000 characters');
        }

        const sandbox = {
         page: new Proxy({} as Record<string, (...args: unknown[]) => unknown>, {
            get: (_target, prop: string) => {
              if (!allowedApiNames.has(prop)) {
                throw new Error(`API "${prop}" is not allowed in test code`);
              }
             return (...args: unknown[]) => {
                for (const arg of args) {
                  if (arg !== null && arg !== undefined && typeof arg === 'object' && !Array.isArray(arg)) {
                    const proto = Object.getPrototypeOf(arg);
                    if (proto !== Object.prototype) {
                      throw new Error('Complex objects are not allowed as arguments');
                    }
                  }
                }
                return (page as unknown as Record<string, (...args: unknown[]) => unknown>)[prop](...args);
              };
            },
          }),
          console: { log: (...args: unknown[]) => logger.info(`[test.code] ${args.join(' ')}`) },
          setTimeout: undefined,
          setInterval: undefined,
          setImmediate: undefined,
          fetch: undefined,
          WebSocket: undefined,
          Worker: undefined,
        };
        const vm = await import('vm');
        vm.createContext(sandbox);
        const script = new vm.Script(`(async () => { ${sanitizedCode} })()`, {
          filename: `test-${testId}.js`,
        });
        await script.runInContext(sandbox, { timeout: 30000, breakOnSigint: true });
        title = await page.title();
      } else if (steps && Array.isArray(steps) && steps.length > 0) {
        logger.info(`Executing ${steps.length} steps for test ${test.name as string}`);
        if (steps[0].type !== 'navigate' || !(steps[0].url as string)) {
          const url = targetUrl || 'about:blank';
          logger.info(`Navigating to ${url}...`);
          await page.goto(url as string, { waitUntil: 'networkidle', timeout: 30000 });
        }
        await this.executeSteps(steps, page);
        title = await page.title();
      } else if (targetUrl) {
        logger.info(`Navigating to target URL: ${targetUrl}`);
        await page.goto(targetUrl as string, { waitUntil: 'networkidle', timeout: 30000 });
        title = await page.title();
      } else {
        const specResult = await this.runPlaywrightSpec(test, testId, startTime);
        if (specResult) return specResult;
        const msg = 'No target URL configured and no spec file matched. Please set a URL in the test configuration.';
        logger.warn(msg);
        throw new Error(msg);
      }

      // Take a real screenshot of the page
      const screenshotFilename = `${testId}-${Date.now()}.png`;
      const finalScreenshotPath = path.join(screenshotDir, screenshotFilename);
      await page.screenshot({ path: finalScreenshotPath, fullPage: true });
      screenshotUrl = `/uploads/screenshots/${screenshotFilename}`;

      // Get video object to capture path
      const video = page.video();
      if (video) {
        videoPath = await video.path();
      }

      // Close context and browser explicitly inside try to finalize video file
      if (context) {
        await context.close();
        context = null;
      }
      if (browser) {
        await browser.close();
        browser = null;
      }

      let videoUrl = '';
      if (videoPath && fs.existsSync(videoPath)) {
        videoUrl = `/uploads/videos/${path.basename(videoPath)}`;
      }
      
      return {
        passed: true,
        duration: Date.now() - startTime,
        logs: `Test "${test.name}" passed. Page title: ${title}`,
        screenshotUrl,
        videoUrl,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Attempt to take a failure screenshot
      let failureScreenshotUrl = '';
      try {
          if (context) {
          const pages = context.pages();
          if (pages.length > 0) {
            const page = pages[0];
            const screenshotFilename = `fail-${testId}-${Date.now()}.png`;
            const uploadsDir = process.env.UPLOADS_DIR || path.resolve(__dirname, '..', '..', '..', 'backend', 'uploads');
            const screenshotDir = path.join(uploadsDir, 'screenshots');
            if (!fs.existsSync(screenshotDir)) {
              fs.mkdirSync(screenshotDir, { recursive: true });
            }
            const finalScreenshotPath = path.join(screenshotDir, screenshotFilename);
            await page.screenshot({ path: finalScreenshotPath, fullPage: true });
            failureScreenshotUrl = `/uploads/screenshots/${screenshotFilename}`;
          }
        }
      } catch (screenshotErr) {
        logger.error(`Failed to take failure screenshot: ${screenshotErr}`);
      }

      // Explicitly close in catch to finalize video
      if (context) {
        await context.close();
        context = null;
      }
      if (browser) {
        await browser.close();
        browser = null;
      }

      let videoUrl = '';
      if (videoPath && fs.existsSync(videoPath)) {
        videoUrl = `/uploads/videos/${path.basename(videoPath)}`;
      }

      return {
        passed: false,
        duration: Date.now() - startTime,
        error: errorMessage,
        logs: `Test failed: ${errorMessage}`,
        screenshotUrl: failureScreenshotUrl || undefined,
        videoUrl: videoUrl || undefined,
      };
    } finally {
      if (context) await context.close();
      if (browser) await browser.close();
    }
  }

  private async runPlaywrightSpec(
    test: Record<string, unknown>,
    testId: string,
    startTime: number,
  ): Promise<{ passed: boolean; duration: number; logs?: string; error?: string; screenshotUrl?: string; videoUrl?: string } | null> {
    const testConfig = (test.config ?? {}) as unknown as Record<string, unknown>;
    let matchedSpec: string | undefined = (test.specFile as string) || (testConfig.specFile as string) || '';
    if (matchedSpec) {
      matchedSpec = path.basename(matchedSpec);
    }
    if (!matchedSpec) {
      const specName = ((test.name as string) ?? '').toLowerCase().replace(/\s+/g, '-') || '';
      const specDir = path.resolve(__dirname, '..', 'tests');
      if (!fs.existsSync(specDir)) return null;

      const specFiles = fs.readdirSync(specDir).filter((f: string) => f.endsWith('.spec.ts') || f.endsWith('.spec.js'));
      matchedSpec = specFiles.find((f: string) => {
        const baseName = path.basename(f).replace(/\.spec\.[tj]s$/, '');
        return specName.includes(baseName) || baseName.includes(specName);
      }) as string | undefined;
      if (!matchedSpec) return null;
    }

    logger.info(`Running Playwright spec: ${matchedSpec} for test ${test.name}`);

    const automationDir = path.resolve(__dirname, '..', '..');
    const testResultsDir = path.join(automationDir, 'test-results', `exec-${testId}-${Date.now()}`);
    fs.mkdirSync(testResultsDir, { recursive: true });

    try {
      execSync(
        `npx playwright test "${matchedSpec}" --reporter=json --output="${testResultsDir}" --workers=1 --retries=0`,
        {
          cwd: automationDir,
          timeout: 120000,
          env: { ...process.env, CI: 'true' },
          stdio: 'pipe',
        },
      );
    } catch (e: unknown) {
      logger.warn(`Playwright spec exit code non-zero: ${((e as { stderr?: Buffer | string }).stderr?.toString() ?? '').substring(0, 200)}`);
    }

    const uploadsDir = process.env.UPLOADS_DIR || path.resolve(automationDir, '..', 'backend', 'uploads');
    const screenshotDir = path.join(uploadsDir, 'screenshots');
    const videoDir = path.join(uploadsDir, 'videos');
    fs.mkdirSync(screenshotDir, { recursive: true });
    fs.mkdirSync(videoDir, { recursive: true });

    let screenshotUrl = '';
    let videoUrl = '';
    let testPassed = false;
    let testLogs = '';
    let testError = '';

    if (fs.existsSync(testResultsDir)) {
      this.copyTestArtifacts(testResultsDir, screenshotDir, videoDir, testId);

      const reportFile = path.join(testResultsDir, 'report.json');
      if (fs.existsSync(reportFile)) {
        try {
          const reportData = JSON.parse(fs.readFileSync(reportFile, 'utf-8'));
          const allTests = this.flattenTests(reportData.suites || reportData) as Record<string, unknown>[];
          const failedTests = allTests.filter((t) => (t as Record<string, unknown>).status === 'failed' || (t as Record<string, unknown>).status === 'timedOut');
          const passedTests = allTests.filter((t) => (t as Record<string, unknown>).status === 'passed' || (t as Record<string, unknown>).status === 'expected');
          testPassed = failedTests.length === 0 && passedTests.length > 0;
          testLogs = `${passedTests.length} passed, ${failedTests.length} failed`;
          if (failedTests.length > 0) {
            testError = failedTests.map((t) => ((t as Record<string, unknown>).errors as unknown as Array<Record<string, unknown>>)?.map((e) => (e as Record<string, unknown>).message as string).join('; ')).join('; ');
          }
        } catch { }
      }

      const screenshotFiles = this.findFiles(testResultsDir, ['.png', '.jpg']);
      if (screenshotFiles.length > 0) screenshotUrl = `/uploads/screenshots/${path.basename(screenshotFiles[0])}`;
      const videoFiles = this.findFiles(testResultsDir, ['.webm']);
      if (videoFiles.length > 0) videoUrl = `/uploads/videos/${path.basename(videoFiles[0])}`;

      try { fs.rmSync(testResultsDir, { recursive: true, force: true }); } catch { }
    }

    return {
      passed: testPassed,
      duration: Date.now() - startTime,
      logs: testLogs || `Spec "${matchedSpec}" completed`,
      error: testError || undefined,
      screenshotUrl: screenshotUrl || undefined,
      videoUrl: videoUrl || undefined,
    };
  }

  private copyTestArtifacts(srcDir: string, screenshotDir: string, videoDir: string, testId: string) {
    if (!fs.existsSync(srcDir)) return;
    try {
      for (const file of fs.readdirSync(srcDir)) {
        const fullPath = path.join(srcDir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          this.copyTestArtifacts(fullPath, screenshotDir, videoDir, testId);
        } else {
          const ext = path.extname(file).toLowerCase();
          const newName = `${testId}-${Date.now()}-${file}`;
          if (['.png', '.jpg', '.jpeg'].includes(ext)) {
            fs.copyFileSync(fullPath, path.join(screenshotDir, newName));
          } else if (ext === '.webm') {
            fs.copyFileSync(fullPath, path.join(videoDir, newName));
          }
        }
      }
    } catch { }
  }

  private findFiles(dir: string, exts: string[]): string[] {
    const results: string[] = [];
    try {
      for (const file of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          results.push(...this.findFiles(fullPath, exts));
        } else if (exts.includes(path.extname(file).toLowerCase())) {
          results.push(fullPath);
        }
      }
    } catch { }
    return results;
  }

  private flattenTests(suite: Record<string, unknown>): unknown[] {
    const tests: unknown[] = [];
    const suites = suite.suites as Record<string, unknown>[] | undefined;
    const specs = suite.specs as Record<string, unknown>[] | undefined;
    const suiteTests = suite.tests as unknown[] | undefined;
    if (suites) for (const s of suites) tests.push(...this.flattenTests(s));
    if (specs) for (const s of specs) tests.push(...((s.tests as unknown[]) || [s]));
    if (suiteTests) tests.push(...suiteTests);
    return tests;
  }

  private async executeSteps(steps: Record<string, unknown>[], page: Page) {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i] as { type?: string; url?: string; selector?: string; value?: string; waitFor?: string; ms?: number };
      switch (step.type) {
        case 'navigate':
          if (step.url) {
            await page.goto(step.url, { waitUntil: 'networkidle', timeout: 30000 });
          }
          break;
        case 'click':
          await page.click(step.selector!);
          break;
        case 'type':
          await page.fill(step.selector!, step.value!);
          break;
        case 'select':
          await page.selectOption(step.selector!, step.value!);
          break;
        case 'assert':
          {
            const actual = await page.textContent(step.selector!);
            if (actual?.trim() !== step.value) {
              throw new Error(`Assertion failed on "${step.selector}": expected "${step.value}", got "${actual?.trim()}"`);
            }
          }
          break;
        case 'wait':
          if (step.waitFor) {
            await page.waitForLoadState(step.waitFor as 'load' | 'domcontentloaded' | 'networkidle', { timeout: step.ms || 30000 });
          } else {
            await page.waitForTimeout(step.ms || 1000);
          }
          break;
        case 'screenshot':
          break;
        default:
          logger.warn(`Unknown step type: ${step.type}`);
      }
    }
  }

  async close() {
    await super.close();
    await this.prisma.$disconnect();
  }
}
