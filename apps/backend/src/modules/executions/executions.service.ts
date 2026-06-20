import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma.service';
import { chromium, Browser, BrowserContext, CDPSession } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import * as vm from 'vm';
import { EventsGateway } from '../gateway/events.gateway';

export interface LivePreviewData {
  screenshot: string;
  step: string;
  timestamp: number;
}

export interface ActionEvent {
  type: 'click' | 'type' | 'navigate' | 'assert' | 'select' | 'wait' | 'screenshot' | 'scroll' | 'hover';
  selector?: string;
  value?: string;
  url?: string;
  status?: 'running' | 'passed' | 'failed';
  timestamp: number;
}

export interface ConsoleEvent {
  type: 'log' | 'warn' | 'error' | 'api' | 'info';
  message: string;
  url?: string;
  method?: string;
  statusCode?: number;
  timestamp: number;
}

export interface ElementHighlight {
  selector: string;
  tagName: string;
  rect: { x: number; y: number; width: number; height: number };
  action: 'click' | 'type' | 'hover';
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
    @InjectQueue('execution') private executionQueue: Queue | null,
    private readonly eventsGateway: EventsGateway,
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
    const project = await this.prisma.project.findUnique({ where: { id: data.projectId } });
    if (!project) {
      throw new NotFoundException(`Project with ID "${data.projectId}" not found. Please create the project first.`);
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
      data: { status: 'PENDING', startedAt: new Date() },
    });

    this.logger.log(`Queuing execution ${id} with ${execution.testIds?.length || 0} tests`);

    if (this.executionQueue) {
      await this.executionQueue.add('execute', {
        executionId: id,
        projectId: execution.projectId,
        testIds: execution.testIds || [],
        userId: execution.userId,
        triggerSource: 'api',
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });
      this.logger.log(`Execution ${id} added to BullMQ queue`);
    } else {
      this.logger.warn(`BullMQ queue not available, running execution ${id} inline`);
      this.executeTests(execution.projectId, execution.testIds || [], execution.userId, id)
        .catch(err => this.logger.error(`Execution ${id} failed: ${err.message}`));
    }

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

  async updateStatus(id: string, status: string) {
    const data: any = { status };
    if (status === 'RUNNING') data.startedAt = new Date();
    if (['PASSED', 'FAILED', 'CANCELLED'].includes(status)) data.completedAt = new Date();
    await this.prisma.execution.update({ where: { id }, data });
  }

  async executeTestsInline(
    projectId: string, testIds: string[], userId: string, executionId: string,
    onProgress?: (current: number, total: number) => Promise<void>,
  ): Promise<number> {
    let passed = 0;
    try { this.eventsGateway.emitToProject(projectId, 'execution-status', { executionId, status: 'RUNNING', total: testIds.length }); } catch {}
    for (let i = 0; i < testIds.length; i++) {
      if (onProgress) await onProgress(i, testIds.length);
      const run = await this.prisma.testRun.create({
        data: {
          testId: testIds[i],
          projectId,
          executionId,
          userId,
          status: 'RUNNING',
        },
      });
      try { this.eventsGateway.emitToProject(projectId, 'test-status', { executionId, testId: testIds[i], status: 'RUNNING', index: i }); } catch {}
      const testResult = await this.runTest(testIds[i], executionId, i);
      if (testResult.passed) passed++;
      await this.prisma.testRun.update({
        where: { id: run.id },
        data: {
          status: testResult.passed ? 'PASSED' : 'FAILED',
          duration: testResult.duration,
          logs: testResult.logs,
          error: testResult.error,
          metadata: { screenshot: testResult.screenshotUrl, video: testResult.videoUrl },
          completedAt: new Date(),
        },
      });
      try {
        this.eventsGateway.emitToProject(projectId, 'test-status', {
          executionId, testId: testIds[i], status: testResult.passed ? 'PASSED' : 'FAILED', index: i,
        });
      } catch {}
    }
    const duration = Date.now() - (await this.prisma.execution.findUnique({ where: { id: executionId } }))?.startedAt?.getTime() || 0;
    const status = passed === testIds.length ? 'PASSED' : 'FAILED';
    await this.prisma.execution.update({
      where: { id: executionId },
      data: { status, passedTests: passed, failedTests: testIds.length - passed, duration, completedAt: new Date() },
    });
    try { this.eventsGateway.emitToProject(projectId, 'execution-status', { executionId, status, passed, failed: testIds.length - passed, duration }); } catch {};
    await this.autoCreateReport(executionId, projectId, userId, testIds, passed);
    if (passed < testIds.length) await this.autoCreateBugs(executionId, projectId, userId);
    return passed;
  }

  async executeTests(projectId: string, testIds: string[], userId: string, executionId: string) {
    await this.updateStatus(executionId, 'RUNNING');
    try {
      await this.executeTestsInline(projectId, testIds, userId, executionId);
    } catch (error) {
      this.logger.error(`Execution ${executionId} failed: ${(error as Error).message}`);
      await this.updateStatus(executionId, 'FAILED');
    }
  }

  private async autoCreateReport(executionId: string, projectId: string, userId: string, testIds: string[], passed: number) {
    try {
      const execution = await this.prisma.execution.findUnique({ where: { id: executionId } });
      const testRuns = await this.prisma.testRun.findMany({
        where: { executionId },
        include: { test: { select: { id: true, name: true, config: true } } },
      });
      const testNames = testRuns.map(r => r.test?.name || 'Unknown').filter(Boolean);
      const uniqueTestNames = [...new Set(testNames)];
      const reportName = uniqueTestNames.length <= 3
        ? `${uniqueTestNames.join(', ')} — ${execution?.name}`
        : `${uniqueTestNames.slice(0, 3).join(', ')} +${uniqueTestNames.length - 3} more — ${execution?.name}`;
      const failed = testIds.length - passed;
      await this.prisma.report.create({
        data: {
          projectId, userId,
          type: 'TEST_SUMMARY',
          name: reportName,
          summary: {
            totalTests: testIds.length,
            passed, failed,
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
      this.logger.error(`Failed to auto-create report: ${(reportError as Error).message}`);
    }
  }

  private async autoCreateBugs(executionId: string, projectId: string, userId: string) {
    try {
      const execution = await this.prisma.execution.findUnique({ where: { id: executionId } });
      const failedRuns = await this.prisma.testRun.findMany({
        where: { executionId, status: 'FAILED' },
        include: { test: true },
      });
      for (const run of failedRuns) {
        await this.prisma.bug.create({
          data: {
            title: `Test Failure: ${run.test?.name || 'Unknown test'}`,
            description: `Test failed during execution "${execution?.name}"\n\nError: ${run.error || 'No error details'}\n\nLogs: ${run.logs || 'No logs'}`,
            projectId, userId, testRunId: run.id,
            severity: 'HIGH', priority: 'P2', status: 'OPEN',
            stackTrace: run.error, logs: run.logs,
            tags: ['auto-generated', 'test-failure'],
          },
        });
      }
      this.logger.log(`${failedRuns.length} bugs auto-created for execution ${executionId}`);
    } catch (bugError) {
      this.logger.error(`Failed to auto-create bugs: ${(bugError as Error).message}`);
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
      const data = { screenshot: screenshotBase64, step, timestamp: Date.now() };
      this.setLivePreview(executionId, data);
      if (screenshotBase64) {
        try { this.eventsGateway.emitToAll('live-preview', { executionId, ...data }); } catch {}
      }
    };

    const emitAction = (action: Omit<ActionEvent, 'timestamp'>) => {
      const event: ActionEvent = { ...action, timestamp: Date.now() };
      try { this.eventsGateway.emitToAll('action-log', { executionId, ...event }); } catch {}
    };

    let streaming = false;
    let cdpSession: CDPSession | null = null;

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

      // ─── Inject JS event capture for mouse/input tracking ────────
      await page.exposeFunction('__qadash_onAction', (_actionType: string, data: any) => {
        const actionEvent: ElementHighlight = {
          selector: data.selector || '',
          tagName: data.tagName || '',
          rect: data.rect || { x: 0, y: 0, width: 0, height: 0 },
          action: data.action || 'hover',
          timestamp: Date.now(),
        };
        try { this.eventsGateway.emitToAll('element-highlight', { executionId, ...actionEvent }); } catch {}
      });
      await page.addInitScript(`
        document.addEventListener('mouseover', (e) => {
          const el = e.target;
          if (!el || el === document.body) return;
          const rect = el.getBoundingClientRect();
          window.__qadash_onAction('hover', {
            selector: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''),
            tagName: el.tagName.toLowerCase(),
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            action: 'hover',
          });
        }, { passive: true });
      `);

      // ─── Console / API / Network event listeners ─────────────────
      page.on('console', (msg) => {
        const consoleEvent: ConsoleEvent = {
          type: msg.type() as any,
          message: msg.text(),
          timestamp: Date.now(),
        };
        try { this.eventsGateway.emitToAll('console-log', { executionId, ...consoleEvent }); } catch {}
      });
      page.on('request', (req) => {
        if (req.url().includes('api') || req.url().includes('graphql')) {
          try { this.eventsGateway.emitToAll('console-log', { executionId, type: 'api', message: `${req.method()} ${req.url()}`, method: req.method(), url: req.url(), timestamp: Date.now() }); } catch {}
        }
      });
      page.on('response', (res) => {
        if (res.url().includes('api') || res.url().includes('graphql')) {
          const status = res.status();
          try { this.eventsGateway.emitToAll('console-log', { executionId, type: 'api', message: `${status} ${res.url()}`, statusCode: status, url: res.url(), method: res.request().method(), timestamp: Date.now() }); } catch {}
        }
      });
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) {
          try { this.eventsGateway.emitToAll('action-log', { executionId, type: 'navigate', url: frame.url(), timestamp: Date.now() }); } catch {}
        }
      });

      try {
        cdpSession = await context.newCDPSession(page);
      } catch (cdpErr) {
        this.logger.warn(`CDP session not available (non-Chromium?): ${cdpErr}`);
      }

      // ─── CDP Screencast streaming (~10-15fps) instead of polled screenshots ──
      if (cdpSession) {
        streaming = true;
        await cdpSession.send('Page.startScreencast', {
          format: 'jpeg',
          quality: 80,
          maxWidth: 1280,
          maxHeight: 720,
          everyNthFrame: 1,
        }).catch((e: any) => this.logger.warn(`startScreencast failed: ${e.message}`));

        cdpSession.on('Page.screencastFrame', (frame: any) => {
          if (!streaming) return;
          const b64 = frame?.data;
          if (b64) {
            this.setLivePreview(executionId, { screenshot: b64, step: '', timestamp: Date.now() });
            try { this.eventsGateway.emitToAll('live-preview', { executionId, screenshot: b64, step: '', timestamp: Date.now() }); } catch {}
          }
          // Acknowledge frame to continue receiving
          if (frame?.sessionId && cdpSession) {
            cdpSession.send('Page.screencastFrameAck', { sessionId: frame.sessionId }).catch(() => {});
          }
        });
      } else {
        // Fallback: polled screenshots for non-Chromium browsers
        streaming = true;
        const fallbackLoop = async () => {
          while (streaming) {
            try {
              const buf = await page.screenshot({ type: 'png', fullPage: false });
              const b64 = typeof buf === 'string' ? buf : Buffer.isBuffer(buf) ? buf.toString('base64') : Buffer.from(buf as Uint8Array).toString('base64');
              if (b64 && streaming) {
                this.setLivePreview(executionId, { screenshot: b64, step: '', timestamp: Date.now() });
                try { this.eventsGateway.emitToAll('live-preview', { executionId, screenshot: b64, step: '', timestamp: Date.now() }); } catch {}
              }
            } catch {}
            if (streaming) await new Promise(r => setTimeout(r, 200));
          }
        };
        fallbackLoop();
      }

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

      // Resolve template variables from source file data
      const sourceDataRows = testConfig._sourceFileData;
      const templateVars: Record<string, string> = {};
      if (sourceDataRows && Array.isArray(sourceDataRows) && sourceDataRows.length > 0) {
        const row = sourceDataRows[0];
        if (typeof row === 'object' && row !== null) {
          for (const [k, v] of Object.entries(row)) {
            templateVars[k] = String(v ?? '');
          }
        }
      }
      const resolveTemplates = (val: string): string =>
        val.replace(/\{\{(\w+)\}\}/g, (_, name) => templateVars[name] || `{{${name}}}`);

      const renderedSteps = (steps && Array.isArray(steps))
        ? steps.map(s => {
            const rendered: any = { ...s };
            for (const key of Object.keys(rendered)) {
              if (typeof rendered[key] === 'string') {
                rendered[key] = resolveTemplates(rendered[key]);
              }
            }
            return rendered;
          })
        : steps;

      if (test.code) {
        emitLive('Running test code...', '');
        await this.captureAndEmit(page, emitLive, 'About to run test code');
        const sandbox = {
          page, browser, context,
          console: { log: (...args: any[]) => this.logger.log(`[test.code] ${args.join(' ')}`) },
        };
        vm.createContext(sandbox);
        const script = new vm.Script(`(async () => { ${test.code} })()`);
        await script.runInContext(sandbox, { timeout: 30000 });
        await this.captureAndEmit(page, emitLive, 'Test code executed');
        title = await page.title();
      } else if (renderedSteps && Array.isArray(renderedSteps) && renderedSteps.length > 0) {
        emitLive('About to execute test steps...', '');
        await this.captureAndEmit(page, emitLive, 'Starting step execution');
        if (renderedSteps[0].type !== 'navigate' || !renderedSteps[0].url) {
          const url = targetUrl || 'about:blank';
          emitLive(`Navigating to ${url}...`, '');
          await page.goto(url, { waitUntil: 'load', timeout: 30000 });
          await page.waitForTimeout(800);
          await this.captureAndEmit(page, emitLive, `Page loaded from ${url}`);
        }
        await this.executeSteps(renderedSteps, page, emitLive, emitAction);
        title = await page.title();
      } else if (targetUrl) {
        await this.captureAndEmit(page, emitLive, `Starting — about to load ${targetUrl}`);
        emitLive(`Navigating to ${targetUrl}...`, '');
        await page.goto(targetUrl, { waitUntil: 'load', timeout: 30000 });
        await page.waitForTimeout(800);
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

      if (cdpSession) {
        try { cdpSession.send('Page.stopScreencast').catch(() => {}); cdpSession.detach(); } catch {}
        cdpSession = null;
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

      if (cdpSession) {
        try { cdpSession.send('Page.stopScreencast').catch(() => {}); cdpSession.detach(); } catch {}
        cdpSession = null;
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
      streaming = false;
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
        } catch (parseErr) {
          this.logger.warn(`Failed to parse report JSON: ${parseErr}`);
        }
      }

      try {
        fs.rmSync(testResultsDir, { recursive: true, force: true });
      } catch (rmErr) {
        this.logger.warn(`Failed to clean up test results dir: ${rmErr}`);
      }
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
    } catch (copyErr) {
      this.logger.warn(`Failed to copy test artifacts: ${copyErr}`);
    }
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
    } catch (findErr) {
      this.logger.warn(`Failed to find artifacts: ${findErr}`);
    }
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
      let screenshotBuffer: any;
      try {
        screenshotBuffer = await page.screenshot({ type: 'png', fullPage: false });
      } catch (innerErr: any) {
        this.logger.warn(`captureAndEmit primary screenshot failed for "${step}": ${innerErr.message}`);
        // Fallback: try to get page from context
        if (page && page.context) {
          const pages = page.context().pages();
          if (pages.length > 0) {
            screenshotBuffer = await pages[0].screenshot({ type: 'png', fullPage: false });
          }
        }
        if (!screenshotBuffer) {
          emitLive(step, '');
          return;
        }
      }

      const base64 = typeof screenshotBuffer === 'string'
        ? screenshotBuffer
        : Buffer.isBuffer(screenshotBuffer)
          ? screenshotBuffer.toString('base64')
          : Buffer.from(screenshotBuffer as Uint8Array).toString('base64');

      if (base64 && base64.length > 0) {
        emitLive(step, base64);
      } else {
        this.logger.warn(`captureAndEmit empty screenshot buffer for step: "${step}"`);
        emitLive(step, '');
      }
    } catch (captureErr: any) {
      this.logger.warn(`captureAndEmit failed for "${step}": ${captureErr.message}`);
      emitLive(step, '');
    }
  }

  private async executeSteps(
    steps: any[],
    page: any,
    emitLive: (step: string, screenshotBase64: string) => void,
    emitAction?: (action: Omit<ActionEvent, 'timestamp'>) => void,
  ) {
    this.logger.log(`executeSteps called with ${steps.length} steps`);
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      this.logger.log(`Executing step ${i + 1}: ${step.type}`);

      // Emit step description and capture live screenshot BEFORE the action
      const stepDesc = `Step ${i + 1}: ${step.type}${step.selector ? ' ' + step.selector : ''}${step.url ? ' ' + step.url : ''}${step.value ? ` = "${step.value}"` : ''}`;
      await this.captureAndEmit(page, emitLive, stepDesc);

      switch (step.type) {
        case 'navigate':
          if (!step.url) {
            this.logger.log(`Step ${i + 1}: navigate skipped (URL already loaded from config)`);
            emitLive(`Step ${i + 1}: navigate skipped (already on target URL)`, '');
            break;
          }
          this.logger.log(`Step ${i + 1}: navigating to ${step.url}`);
          if (emitAction) emitAction({ type: 'navigate', url: step.url, status: 'running' });
          await page.goto(step.url, { waitUntil: 'load', timeout: 30000 });
          await page.waitForTimeout(500);
          await this.captureAndEmit(page, emitLive, `Navigated to ${step.url}`);
          if (emitAction) emitAction({ type: 'navigate', url: step.url, status: 'passed' });
          break;
        case 'click':
          if (step.selector) {
            this.logger.log(`Step ${i + 1}: clicking ${step.selector}`);
            if (emitAction) emitAction({ type: 'click', selector: step.selector, status: 'running' });
            await page.click(step.selector);
            if (emitAction) emitAction({ type: 'click', selector: step.selector, status: 'passed' });
          }
          break;
        case 'type':
          if (step.selector) {
            this.logger.log(`Step ${i + 1}: typing "${step.value}" into ${step.selector}`);
            if (emitAction) emitAction({ type: 'type', selector: step.selector, value: step.value, status: 'running' });
            await page.fill(step.selector, step.value || '');
            if (emitAction) emitAction({ type: 'type', selector: step.selector, value: step.value, status: 'passed' });
          }
          break;
        case 'select':
          if (step.selector) {
            this.logger.log(`Step ${i + 1}: selecting "${step.value}" in ${step.selector}`);
            if (emitAction) emitAction({ type: 'select', selector: step.selector, value: step.value, status: 'running' });
            await page.selectOption(step.selector, step.value);
            if (emitAction) emitAction({ type: 'select', selector: step.selector, value: step.value, status: 'passed' });
          }
          break;
        case 'assert':
          {
            if (!step.selector) { this.logger.log(`Step ${i + 1}: assert skipped (no selector)`); break; }
            this.logger.log(`Step ${i + 1}: asserting text in ${step.selector} equals "${step.value}"`);
            if (emitAction) emitAction({ type: 'assert', selector: step.selector, value: step.value, status: 'running' });
            const actual = await page.textContent(step.selector);
            if (actual?.trim() !== step.value) {
              if (emitAction) emitAction({ type: 'assert', selector: step.selector, value: step.value, status: 'failed' });
              throw new Error(`Assertion failed on "${step.selector}": expected "${step.value}", got "${actual?.trim()}"`);
            }
            if (emitAction) emitAction({ type: 'assert', selector: step.selector, value: step.value, status: 'passed' });
          }
          break;
        case 'wait':
          this.logger.log(`Step ${i + 1}: waiting ${step.ms || 1000}ms`);
          if (emitAction) emitAction({ type: 'wait', value: `${step.ms || 1000}ms`, status: 'running' });
          if (step.waitFor) {
            await page.waitForLoadState(step.waitFor, { timeout: step.ms || 30000 });
          } else {
            await page.waitForTimeout(step.ms || 1000);
          }
          if (emitAction) emitAction({ type: 'wait', value: `${step.ms || 1000}ms`, status: 'passed' });
          break;
        case 'screenshot':
          this.logger.log(`Step ${i + 1}: taking screenshot`);
          if (emitAction) emitAction({ type: 'screenshot', status: 'passed' });
          break;
        case 'custom':
          this.logger.log(`Step ${i + 1}: custom step — ${step.description || 'no description'}`);
          emitLive(`Step ${i + 1}: ${step.description || 'custom step (no action defined)'}`, '');
          if (emitAction) emitAction({ type: 'wait', value: step.description || 'custom', status: 'passed' });
          break;
        default:
          this.logger.warn(`Unknown step type: ${step.type}`);
      }

      fs.appendFileSync(path.join(uploadsDir, 'execution-debug.log'), `${new Date().toISOString()} - Step ${i + 1} (${step.type}) completed\n`);
      await this.captureAndEmit(page, emitLive, `Step ${i + 1} completed`);
    }
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