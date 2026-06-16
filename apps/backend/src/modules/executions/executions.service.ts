import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma.service';
import { chromium, Browser, BrowserContext } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import * as vm from 'vm';
import { v4 as uuidv4 } from 'uuid';

export interface LivePreviewData {
  screenshot: string;
  step: string;
  timestamp: number;
}

interface TestResult {
  passed: boolean;
  duration: number;
  logs?: string;
  error?: string;
  screenshotUrl?: string;
  videoUrl?: string;
}

@Injectable()
export class ExecutionsService implements OnModuleInit {
  private livePreviews = new Map<string, LivePreviewData>();
  private readonly logger = new Logger(ExecutionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('execution') private executionQueue: Queue
  ) {}

  async onModuleInit() {
    await this.cleanupStaleExecutions();
  }

  async cleanupStaleExecutions() {
    const staleTime = new Date(Date.now() - 15 * 60 * 1000);
    const staleExecutions = await this.prisma.execution.updateMany({
      where: {
        status: 'RUNNING',
        startedAt: { lt: staleTime },
      },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
      },
    });

    if (staleExecutions.count > 0) {
      this.logger.warn(`Cleaned up ${staleExecutions.count} stale executions that were stuck in RUNNING state.`);
    }
  }

  async findAll(projectId?: string) {
    const where = projectId ? { projectId } : {};
    return this.prisma.execution.findMany({
      where,
      include: { project: true, user: { select: { id: true, name: true } } },
      orderBy: { startedAt: 'desc' },
    });
  }

  async findById(id: string) {
    const execution = await this.prisma.execution.findUnique({ 
      where: { id },
      include: { 
        project: true, 
        user: { select: { id: true, name: true } },
        testRuns: {
          include: { test: true },
          orderBy: { startedAt: 'asc' }
        }
      }
    });
    if (!execution) throw new NotFoundException('Execution not found');
    return execution;
  }

  async create(data: { name: string; projectId: string; userId: string; testIds: string[] }) {
    let project = await this.prisma.project.findUnique({ where: { id: data.projectId } });
    if (!project) {
      project = await this.prisma.project.create({
        data: {
          id: uuidv4(),
          name: data.name ? `${data.name} Project` : 'Auto-created Project',
          description: 'Auto-created for execution',
          status: 'ACTIVE',
        },
      });
      this.logger.log(`Auto-created project for execution: ${project.name} (${project.id})`);
    }
    return this.prisma.execution.create({
      data: {
        name: data.name,
        projectId: project.id,
        userId: data.userId,
        testIds: data.testIds,
        totalTests: data.testIds.length,
      },
    });
  }

  async start(id: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
    });
    if (!execution) throw new NotFoundException('Execution not found');

    const updated = await this.prisma.execution.update({
      where: { id },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    this.logger.log(`Enqueuing execution job for ID: ${id}`);

    await this.executionQueue.add('run-tests', {
      executionId: id,
      projectId: execution.projectId,
      testIds: execution.testIds,
      userId: execution.userId,
    });

    this.logger.log(`Execution ${id} enqueued to queue 'execution'`);

    return updated;
  }

  async cancel(id: string) {
    const execution = await this.prisma.execution.findUnique({ where: { id } });
    if (!execution) throw new NotFoundException('Execution not found');
    if (execution.status === 'PASSED' || execution.status === 'FAILED') {
      throw new Error('Cannot cancel a completed execution');
    }
    return this.prisma.execution.update({
      where: { id },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
  }

  async retry(id: string, userId: string) {
    const execution = await this.prisma.execution.findUnique({ where: { id } });
    if (!execution) throw new NotFoundException('Execution not found');
    const newExecution = await this.prisma.execution.create({
      data: {
        name: `Retry: ${execution.name}`,
        projectId: execution.projectId,
        userId: userId || execution.userId,
        testIds: execution.testIds,
        totalTests: execution.testIds.length,
      },
    });
    await this.start(newExecution.id);
    return newExecution;
  }

  async executeTests(projectId: string, testIds: string[], userId: string, executionId: string) {
    this.logger.log(`Processing execution ${executionId} with ${testIds.length} tests`);
    const execStartTime = Date.now();

    const timeoutMs = parseInt(process.env.EXECUTION_TIMEOUT_MS || '300000', 10);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Execution ${executionId} timed out after ${timeoutMs / 1000}s`)), timeoutMs)
    );

    try {
      await Promise.race([
        this.executeTestsInternal(projectId, testIds, userId, executionId),
        timeoutPromise,
      ]);
    } catch (error) {
      this.logger.error(`Execution ${executionId} failed: ${(error as Error).message}`);
      await this.prisma.execution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          duration: Date.now() - execStartTime,
          completedAt: new Date(),
        },
      });
    }
  }

  private async executeTestsInternal(projectId: string, testIds: string[], userId: string, executionId: string) {
    this.logger.log(`Processing execution ${executionId} with ${testIds.length} tests`);
    const execStartTime = Date.now();

    try {
      let passed = 0;
      let failed = 0;

      for (let i = 0; i < testIds.length; i++) {
        const run = await this.prisma.testRun.create({
          data: {
            testId: testIds[i],
            projectId,
            executionId,
            userId,
            status: 'RUNNING',
          },
        });

        const testResult = await this.runTest(testIds[i], executionId, i);
        if (testResult.passed) passed++;
        else failed++;

        await this.prisma.testRun.update({
          where: { id: run.id },
          data: {
            status: testResult.passed ? 'PASSED' : 'FAILED',
            duration: testResult.duration,
            logs: testResult.logs,
            error: testResult.error,
            metadata: {
              screenshot: testResult.screenshotUrl,
              video: testResult.videoUrl,
            },
            completedAt: new Date(),
          },
        });
      }

      const duration = Date.now() - execStartTime;
      const execution = await this.prisma.execution.update({
        where: { id: executionId },
        data: {
          status: failed === 0 ? 'PASSED' : 'FAILED',
          passedTests: passed,
          failedTests: failed,
          duration,
          completedAt: new Date(),
        },
        include: { project: true },
      });

      // Auto-create report after execution completes
      try {
        const testRuns = await this.prisma.testRun.findMany({
          where: { executionId },
          include: { test: { select: { id: true, name: true, config: true } } },
        });
        const testNames = testRuns.map(r => r.test?.name || 'Unknown').filter(Boolean);
        const uniqueTestNames = [...new Set(testNames)];
        const reportName = uniqueTestNames.length <= 3
          ? `${uniqueTestNames.join(', ')} — ${execution.name}`
          : `${uniqueTestNames.slice(0, 3).join(', ')} +${uniqueTestNames.length - 3} more — ${execution.name}`;
        await this.prisma.report.create({
          data: {
            projectId,
            userId,
            type: 'TEST_SUMMARY',
            name: reportName,
            summary: {
              totalTests: testIds.length,
              passed,
              failed,
              status: failed === 0 ? 'PASSED' : 'FAILED',
              executionId,
              completedAt: new Date().toISOString(),
            },
            data: {
              testResults: testRuns.map((run) => ({
                id: run.id,
                testId: run.testId,
                testName: run.test?.name || 'Unknown Test',
                status: run.status,
                duration: run.duration,
                error: run.error,
                logs: run.logs,
                screenshotUrl: (run.metadata as any)?.screenshot,
                videoUrl: (run.metadata as any)?.video,
                completedAt: run.completedAt,
              })),
            },
          },
        });
        this.logger.log(`Report auto-created for execution ${executionId}`);
      } catch (reportError) {
        this.logger.error(`Failed to auto-create report: ${reportError.message}`);
      }

      // Auto-create bugs for failed test runs
      if (failed > 0) {
        try {
          const failedRuns = await this.prisma.testRun.findMany({
            where: { executionId, status: 'FAILED' },
            include: { test: true },
          });
          for (const run of failedRuns) {
            await this.prisma.bug.create({
              data: {
                title: `Test Failure: ${run.test?.name || 'Unknown test'}`,
                description: `Test failed during execution "${execution.name}"\n\nError: ${run.error || 'No error details'}\n\nLogs: ${run.logs || 'No logs'}`,
                projectId,
                userId,
                testRunId: run.id,
                severity: 'HIGH',
                priority: 'P2',
                status: 'OPEN',
                stackTrace: run.error,
                logs: run.logs,
                tags: ['auto-generated', 'test-failure'],
              },
            });
          }
          this.logger.log(`${failedRuns.length} bugs auto-created for execution ${executionId}`);
        } catch (bugError) {
          this.logger.error(`Failed to auto-create bugs: ${bugError.message}`);
        }
      }

      this.logger.log(`Execution ${executionId} completed: ${passed} passed, ${failed} failed`);
    } catch (error) {
      this.logger.error(`Execution ${executionId} failed: ${error.message}`);
      await this.prisma.execution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          duration: Date.now() - execStartTime,
          completedAt: new Date(),
        },
      });
    }
  }

  private async runTest(
    testId: string,
    executionId: string,
    testIndex: number,
  ): Promise<TestResult> {
    const startTime = Date.now();
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let videoPath = '';
    let screenshotUrl = '';

    const emitLive = (step: string, screenshotBase64: string) => {
      this.setLivePreview(executionId, {
        screenshot: screenshotBase64,
        step,
        timestamp: Date.now(),
      });
    };

    try {
      const test = await this.prisma.test.findUnique({ where: { id: testId } });
      if (!test) throw new Error(`Test ${testId} not found`);

      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      const videoDir = path.join(uploadsDir, 'videos');
      const screenshotDir = path.join(uploadsDir, 'screenshots');
      fs.mkdirSync(videoDir, { recursive: true });
      fs.mkdirSync(screenshotDir, { recursive: true });

      emitLive('Launching browser...', '');

      const headless = process.env.HEADLESS !== 'false';
      browser = await chromium.launch({
        headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 30000,
      });

      context = await browser.newContext({
        recordVideo: {
          dir: videoDir,
          size: { width: 1280, height: 720 },
        },
      });

      const page = await context.newPage();

      let title = '';
      const rawConfig = typeof test.config === 'string' ? JSON.parse(test.config) : test.config;
      const testConfig = rawConfig || {};
      const targetUrl = testConfig?.url;
      const steps = testConfig?.steps || (test as any).steps;
      const logLine = [
        `Running test ${test.name}`,
        `Config keys: ${Object.keys(testConfig).join(', ')}`,
        `Steps type: ${typeof steps}, isArray: ${Array.isArray(steps)}, length: ${Array.isArray(steps) ? steps.length : 'N/A'}`,
        Array.isArray(steps) && steps.length > 0 ? `First step: ${JSON.stringify(steps[0])}` : 'No steps',
        `Target URL: ${targetUrl || 'not set'}`,
      ].join(' | ');
      this.logger.log(logLine);
      fs.appendFileSync(path.join(uploadsDir, 'execution-debug.log'), `${new Date().toISOString()} - ${logLine}\n`);

      if (test.code) {
        emitLive('Running test code...', '');
        const sandbox = {
          page, browser, context,
          console: { log: (...args: any[]) => this.logger.log(`[test.code] ${args.join(' ')}`) },
        };
        vm.createContext(sandbox);
        const script = new vm.Script(`(async () => { ${test.code} })()`);
        await script.runInContext(sandbox, { timeout: 30000 });
        await this.captureAndEmit(page, emitLive, 'Test code executed');
        title = await page.title();
      } else if (steps && Array.isArray(steps) && steps.length > 0) {
        emitLive('Executing test steps...', '');
        if (steps[0].type !== 'navigate' || !steps[0].url) {
          const url = targetUrl || 'about:blank';
          emitLive(`Navigating to ${url}...`, '');
          await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        }
        await this.executeSteps(steps, page, emitLive);
        title = await page.title();
      } else if (targetUrl) {
        emitLive(`Navigating to ${targetUrl}...`, '');
        await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await this.captureAndEmit(page, emitLive, 'Page loaded successfully');
        title = await page.title();
        await this.captureAndEmit(page, emitLive, `Page title: ${title}`);
      } else {
        const specRun = await this.runPlaywrightSpec(test, emitLive);
        if (specRun) {
          return specRun;
        }
        const msg = 'No target URL configured and no spec file matched. Please set a URL in the test configuration.';
        emitLive(msg, '');
        this.logger.warn(msg);
        throw new Error(msg);
      }

      await this.captureAndEmit(page, emitLive, 'Taking final screenshot...');

      const screenshotFilename = `${testId}-${Date.now()}.png`;
      const finalScreenshotPath = path.join(screenshotDir, screenshotFilename);
      await page.screenshot({ path: finalScreenshotPath, fullPage: true });
      screenshotUrl = `/uploads/screenshots/${screenshotFilename}`;

      const video = page.video();
      if (video) {
        videoPath = await video.path();
      }

      if (context) { await context.close(); context = null; }
      if (browser) { await browser.close(); browser = null; }

      let videoUrl = '';
      if (videoPath && fs.existsSync(videoPath)) {
        videoUrl = `/uploads/videos/${path.basename(videoPath)}`;
      }

      emitLive('Test completed', screenshotUrl);

      return {
        passed: true,
        duration: Date.now() - startTime,
        logs: `Test "${test.name}" passed. Page title: ${title}`,
        screenshotUrl,
        videoUrl,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      emitLive(`Failed: ${errorMessage}`, '');

      let failureScreenshotUrl = '';
      try {
        if (context) {
          const pages = context.pages();
          if (pages.length > 0) {
            const page = pages[0];
            const screenshotFilename = `fail-${testId}-${Date.now()}.png`;
            const uploadsDir = path.resolve(process.cwd(), 'uploads');
            const screenshotDir = path.join(uploadsDir, 'screenshots');
            fs.mkdirSync(screenshotDir, { recursive: true });
            const finalScreenshotPath = path.join(screenshotDir, screenshotFilename);
            await page.screenshot({ path: finalScreenshotPath, fullPage: true });
            failureScreenshotUrl = `/uploads/screenshots/${screenshotFilename}`;
          }
        }
      } catch (screenshotErr) {
        this.logger.error(`Failed to take failure screenshot: ${screenshotErr}`);
      }

      if (context) { await context.close(); context = null; }
      if (browser) { await browser.close(); browser = null; }

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
      if (context) await context.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    }
  }

  private async runPlaywrightSpec(
    test: any,
    emitLive: (step: string, screenshotBase64: string) => void,
  ): Promise<TestResult | null> {
    const automationDir = path.resolve(process.cwd(), '..', 'automation');
    const testConfig = (test.config || {}) as any;
    let matchedSpec = test.specFile || testConfig.specFile || '';
    if (matchedSpec) {
      matchedSpec = path.basename(matchedSpec);
    }
    if (!matchedSpec) {
      const specName = test.name?.toLowerCase().replace(/\s+/g, '-') || '';
      const specDir = path.join(automationDir, 'src', 'tests');
      if (!fs.existsSync(specDir)) return null;

      const specFiles = fs.readdirSync(specDir).filter(f => f.endsWith('.spec.ts') || f.endsWith('.spec.js'));
      matchedSpec = specFiles.find(f => {
        const baseName = path.basename(f).replace(/\.spec\.[tj]s$/, '');
        return specName.includes(baseName) || baseName.includes(specName) || test.tags?.some((tag: string) => f.includes(tag));
      });
      if (!matchedSpec) return null;
    }

    emitLive(`Running Playwright spec: ${matchedSpec}...`, '');

    const startTime = Date.now();
    const testResultsDir = path.join(automationDir, 'test-results', `exec-${test.id}-${Date.now()}`);
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
    } catch (e: any) {
      const stdout = e.stdout?.toString() || '';
      const stderr = e.stderr?.toString() || '';
      this.logger.warn(`Playwright spec exit code non-zero: ${stderr.substring(0, 200)}`);
    }

    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    const screenshotDir = path.join(uploadsDir, 'screenshots');
    fs.mkdirSync(screenshotDir, { recursive: true });

    let screenshotUrl = '';
    let videoUrl = '';
    let testPassed = false;
    let testLogs = '';
    let testError = '';

    if (fs.existsSync(testResultsDir)) {
      this.copyTestArtifacts(testResultsDir, screenshotDir, test.id);
      const resultFiles = this.findArtifacts(testResultsDir);
      if (resultFiles.screenshot) screenshotUrl = `/uploads/screenshots/${path.basename(resultFiles.screenshot)}`;
      if (resultFiles.video) videoUrl = `/uploads/videos/${path.basename(resultFiles.video)}`;

      const reportFile = path.join(testResultsDir, 'report.json');
      if (fs.existsSync(reportFile)) {
        try {
          const reportData = JSON.parse(fs.readFileSync(reportFile, 'utf-8'));
          const suites = reportData.suites || reportData;
          const allTests = this.flattenTests(suites);
          const failedTests = allTests.filter((t: any) => t.status === 'failed' || t.status === 'timedOut');
          const passedTests = allTests.filter((t: any) => t.status === 'passed' || t.status === 'expected');
          testPassed = failedTests.length === 0 && passedTests.length > 0;
          testLogs = `${passedTests.length} passed, ${failedTests.length} failed`;
          if (failedTests.length > 0) {
            testError = failedTests.map((t: any) => t.errors?.map((e: any) => e.message).join('; ')).join('; ');
          }
        } catch { }
      }

      try {
        fs.rmSync(testResultsDir, { recursive: true, force: true });
      } catch { }
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

  private copyTestArtifacts(srcDir: string, destDir: string, testId: string) {
    if (!fs.existsSync(srcDir)) return;
    try {
      for (const file of fs.readdirSync(srcDir)) {
        const fullPath = path.join(srcDir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          this.copyTestArtifacts(fullPath, destDir, testId);
        } else {
          const ext = path.extname(file);
          const isScreenshot = ext === '.png' || ext === '.jpg' || ext === '.jpeg';
          const isVideo = ext === '.webm';
          if (isScreenshot || isVideo) {
            const newName = `${testId}-${Date.now()}-${file}`;
            fs.copyFileSync(fullPath, path.join(destDir, newName));
          }
        }
      }
    } catch { }
  }

  private findArtifacts(dir: string): { screenshot?: string; video?: string } {
    const result: { screenshot?: string; video?: string } = {};
    try {
      for (const file of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          const sub = this.findArtifacts(fullPath);
          if (sub.screenshot && !result.screenshot) result.screenshot = sub.screenshot;
          if (sub.video && !result.video) result.video = sub.video;
        } else {
          const ext = path.extname(file).toLowerCase();
          if (['.png', '.jpg', '.jpeg'].includes(ext) && !result.screenshot) result.screenshot = fullPath;
          if (ext === '.webm' && !result.video) result.video = fullPath;
        }
      }
    } catch { }
    return result;
  }

  private flattenTests(suite: any): any[] {
    const tests: any[] = [];
    if (suite.suites) for (const s of suite.suites) tests.push(...this.flattenTests(s));
    if (suite.specs) for (const s of suite.specs) tests.push(...(s.tests || [s]));
    if (suite.tests) tests.push(...suite.tests);
    return tests;
  }

  private async captureAndEmit(
    page: any,
    emitLive: (step: string, screenshotBase64: string) => void,
    step: string,
  ) {
    try {
      const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 60, fullPage: false });
      const base64 = screenshotBuffer.toString('base64');
      emitLive(step, base64);
    } catch {
      emitLive(step, '');
    }
  }

  private async executeSteps(
    steps: any[],
    page: any,
    emitLive: (step: string, screenshotBase64: string) => void,
  ) {
    this.logger.log(`executeSteps called with ${steps.length} steps`);
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      this.logger.log(`Executing step ${i + 1}: ${step.type}`);
      emitLive(`Step ${i + 1}: ${step.type}${step.selector ? ' ' + step.selector : ''}${step.url ? ' ' + step.url : ''}`, '');

      switch (step.type) {
        case 'navigate':
          this.logger.log(`Step ${i + 1}: navigating to ${step.url}`);
          await page.goto(step.url, { waitUntil: 'networkidle', timeout: 30000 });
          break;
        case 'click':
          if (step.selector) { this.logger.log(`Step ${i + 1}: clicking ${step.selector}`); await page.click(step.selector); }
          break;
        case 'type':
          if (step.selector) { this.logger.log(`Step ${i + 1}: typing "${step.value}" into ${step.selector}`); await page.fill(step.selector, step.value || ''); }
          break;
        case 'select':
          if (step.selector) { this.logger.log(`Step ${i + 1}: selecting "${step.value}" in ${step.selector}`); await page.selectOption(step.selector, step.value); }
          break;
        case 'assert':
          {
            if (!step.selector) { this.logger.log(`Step ${i + 1}: assert skipped (no selector)`); break; }
            this.logger.log(`Step ${i + 1}: asserting text in ${step.selector} equals "${step.value}"`);
            const actual = await page.textContent(step.selector);
            if (actual?.trim() !== step.value) {
              throw new Error(`Assertion failed on "${step.selector}": expected "${step.value}", got "${actual?.trim()}"`);
            }
          }
          break;
        case 'wait':
          this.logger.log(`Step ${i + 1}: waiting ${step.ms || 1000}ms`);
          if (step.waitFor) {
            await page.waitForLoadState(step.waitFor, { timeout: step.ms || 30000 });
          } else {
            await page.waitForTimeout(step.ms || 1000);
          }
          break;
        case 'screenshot':
          this.logger.log(`Step ${i + 1}: taking screenshot`);
          break;
        default:
          this.logger.warn(`Unknown step type: ${step.type}`);
      }

      fs.appendFileSync(path.join(uploadsDir, 'execution-debug.log'), `${new Date().toISOString()} - Step ${i + 1} (${step.type}) completed\n`);
      await this.captureAndEmit(page, emitLive, `Step ${i + 1} completed`);
    }
  }

  async updateStatus(id: string, status: string, results?: { passed: number; failed: number; duration: number }) {
    return this.prisma.execution.update({
      where: { id },
      data: {
        status: status as any,
        passedTests: results?.passed || 0,
        failedTests: results?.failed || 0,
        duration: results?.duration,
        completedAt: results ? new Date() : undefined,
      },
    });
  }

  async delete(id: string) {
    this.livePreviews.delete(id);
    return this.prisma.execution.delete({ where: { id } });
  }

  setLivePreview(executionId: string, data: LivePreviewData) {
    this.livePreviews.set(executionId, data);
  }

  getLivePreview(executionId: string): LivePreviewData | null {
    return this.livePreviews.get(executionId) || null;
  }

  clearLivePreview(executionId: string) {
    this.livePreviews.delete(executionId);
  }
}