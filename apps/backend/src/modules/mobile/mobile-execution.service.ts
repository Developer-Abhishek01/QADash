import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../common/logging';
import { DeviceManagementService, Device } from './device-management.service';
import { AppiumService, AppiumCapabilities } from './appium.service';
import { MobileReportService } from './mobile-report.service';
import { MetricsService } from '../monitoring/metrics.service';

export interface MobileTestSuite {
  id: string;
  name: string;
  tests: MobileTestCase[];
  setup?: string;
  teardown?: string;
}

export interface MobileTestCase {
  id: string;
  name: string;
  testId: string;
  steps: MobileTestStep[];
  retries?: number;
  timeout?: number;
}

export interface MobileTestStep {
  id: string;
  action: 'click' | 'type' | 'swipe' | 'screenshot' | 'assert' | 'wait' | 'scroll' | 'hideKeyboard' | 'launchApp' | 'closeApp' | 'installApp' | 'uninstallApp';
  locator?: string;
  value?: string;
  expected?: string;
  timeout?: number;
}

export interface MobileExecution {
  id: string;
  projectId: string;
  testSuiteId: string;
  devices: string[];
  platform: 'android' | 'ios';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  results: MobileExecutionResult[];
}

export interface MobileExecutionResult {
  deviceId: string;
  deviceName: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  startTime: Date;
  endTime: Date;
  duration: number;
  testsPassed: number;
  testsFailed: number;
  testsSkipped: number;
  screenshots: string[];
  video?: string;
  logs?: string;
  errors?: TestFailure[];
}

export interface TestFailure {
  testId: string;
  testName: string;
  step: number;
  message: string;
  screenshot?: string;
}

@Injectable()
export class MobileExecutionService {
  private executions: Map<string, MobileExecution> = new Map();

  constructor(
    private readonly logger: LoggerService,
    private readonly deviceManager: DeviceManagementService,
    private readonly appium: AppiumService,
    private readonly reportService: MobileReportService,
    private readonly metricsService?: MetricsService,
  ) {}

  async startExecution(executionId: string, config: {
    projectId: string;
    testSuiteId: string;
    deviceIds: string[];
    platform: 'android' | 'ios';
    appPath?: string;
    appPackage?: string;
    appActivity?: string;
    bundleId?: string;
  }): Promise<MobileExecution> {
    const execution: MobileExecution = {
      id: executionId,
      projectId: config.projectId,
      testSuiteId: config.testSuiteId,
      devices: config.deviceIds,
      platform: config.platform,
      status: 'queued',
      startTime: new Date(),
      results: [],
    };

    this.executions.set(executionId, execution);

    this.logger.logBusinessEvent({
      event: 'mobile_execution_started',
      entity: 'execution',
      entityId: executionId,
      metadata: {
        projectId: config.projectId,
        suiteId: config.testSuiteId,
        deviceCount: config.deviceIds.length,
        platform: config.platform,
      },
    });

    this.runExecutionAsync(executionId, config);

    return execution;
  }

  private async runExecutionAsync(executionId: string, config: {
    projectId: string;
    testSuiteId: string;
    deviceIds: string[];
    platform: 'android' | 'ios';
    appPath?: string;
    appPackage?: string;
    appActivity?: string;
    bundleId?: string;
  }): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = 'running';
    this.executions.set(executionId, execution);

    const mockTestSuite: MobileTestSuite = {
      id: config.testSuiteId,
      name: 'Test Suite',
      tests: [
        { id: 'test-001', name: 'Login Test', testId: 'test-login', steps: [{ id: 's1', action: 'click', locator: 'id', value: 'login_btn' }, { id: 's2', action: 'type', locator: 'id', value: 'username', expected: 'admin' }, { id: 's3', action: 'screenshot' }] },
        { id: 'test-002', name: 'Dashboard Test', testId: 'test-dashboard', steps: [{ id: 's1', action: 'assert', value: 'dashboard', expected: 'visible' }] },
      ],
    };

    const results: MobileExecutionResult[] = [];

    for (const deviceId of config.deviceIds) {
      const device = await this.deviceManager.getDeviceById(deviceId);
      if (!device) continue;

      const result = await this.runTestsOnDevice(executionId, device, mockTestSuite, config);
      results.push(result);

      this.metricsService?.incrementExecution(device.projectId || 'default', 'production');
      this.metricsService?.incrementExecutionByStatus(config.projectId, result.status, 'production');
      this.metricsService?.observeExecutionDuration(config.projectId, 'mobile', result.duration);
    }

    execution.results = results;
    execution.status = results.some(r => r.status === 'failed') ? 'failed' : 'completed';
    execution.endTime = new Date();
    this.executions.set(executionId, execution);

    await this.reportService.generateReport(execution);

    this.logger.logBusinessEvent({
      event: 'mobile_execution_completed',
      entity: 'execution',
      entityId: executionId,
      metadata: {
        status: execution.status,
        totalTests: results.reduce((sum, r) => sum + r.testsPassed + r.testsFailed + r.testsSkipped, 0),
        passed: results.reduce((sum, r) => sum + r.testsPassed, 0),
        failed: results.reduce((sum, r) => sum + r.testsFailed, 0),
      },
    });
  }

  private async runTestsOnDevice(
    executionId: string,
    device: Device,
    testSuite: MobileTestSuite,
    config: { platform: 'android' | 'ios'; appPath?: string; appPackage?: string; appActivity?: string; bundleId?: string }
  ): Promise<MobileExecutionResult> {
    const capabilities = this.appium.getDefaultCapabilities(config.platform, device.name);
    
    if (config.appPackage) capabilities.appPackage = config.appPackage;
    if (config.appActivity) capabilities.appActivity = config.appActivity;
    if (config.bundleId) capabilities.bundleId = config.bundleId;

    const { sessionId } = await this.appium.createSession(device.id, capabilities);

    const result: MobileExecutionResult = {
      deviceId: device.id,
      deviceName: device.name,
      status: 'passed',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      testsPassed: 0,
      testsFailed: 0,
      testsSkipped: 0,
      screenshots: [],
      errors: [],
    };

    for (const test of testSuite.tests) {
      const testResult = await this.runTest(sessionId, test);
      
      if (testResult.status === 'passed') {
        result.testsPassed++;
      } else if (testResult.status === 'failed') {
        result.testsFailed++;
        result.errors?.push(...testResult.errors);
      } else {
        result.testsSkipped++;
      }

      if (testResult.screenshot) {
        result.screenshots.push(testResult.screenshot);
      }
    }

    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();

    if (result.testsFailed > 0) {
      result.status = 'failed';
    }

    const screenshot = await this.appium.takeScreenshot(sessionId);
    result.screenshots.push(screenshot);

    await this.appium.endSession(sessionId);

    return result;
  }

  private async runTest(sessionId: string, test: MobileTestCase): Promise<{ status: 'passed' | 'failed'; screenshot?: string; errors: TestFailure[] }> {
    const errors: TestFailure[] = [];

    for (const step of test.steps) {
      try {
        await this.executeStep(sessionId, step);
      } catch (error) {
        const screenshot = await this.appium.takeScreenshot(sessionId);
        
        errors.push({
          testId: test.testId,
          testName: test.name,
          step: test.steps.indexOf(step),
          message: error instanceof Error ? error.message : 'Unknown error',
          screenshot,
        });

        return { status: 'failed', screenshot, errors };
      }
    }

    return { status: 'passed', errors: [] };
  }

  private async executeStep(sessionId: string, step: MobileTestStep): Promise<void> {
    switch (step.action) {
      case 'click':
        if (step.locator && step.value) {
          const element = await this.appium.findElement(sessionId, step.locator, step.value);
          await this.appium.clickElement(sessionId, element.id);
        }
        break;

      case 'type':
        if (step.locator && step.value && step.expected) {
          const element = await this.appium.findElement(sessionId, step.locator, step.value);
          await this.appium.sendKeys(sessionId, element.id, step.expected);
        }
        break;

      case 'screenshot':
        await this.appium.takeScreenshot(sessionId);
        break;

      case 'swipe':
        await this.appium.swipe(sessionId, 500, 1000, 500, 500);
        break;

      case 'wait':
        await this.delay(step.timeout || 1000);
        break;

      case 'hideKeyboard':
        await this.delay(200);
        break;

      case 'assert':
        break;

      default:
        await this.delay(200);
    }
  }

  async getExecutionStatus(executionId: string): Promise<Record<string, unknown>> {
    const execution = this.executions.get(executionId);
    
    if (!execution) {
      return { error: 'Execution not found' };
    }

    return {
      id: execution.id,
      status: execution.status,
      startTime: execution.startTime,
      endTime: execution.endTime,
      duration: execution.endTime ? execution.endTime.getTime() - execution.startTime.getTime() : 0,
      devices: execution.devices.map(d => {
        const result = execution.results.find(r => r.deviceId === d);
        return {
          deviceId: d,
          status: result?.status || 'pending',
          testsPassed: result?.testsPassed || 0,
          testsFailed: result?.testsFailed || 0,
        };
      }),
    };
  }

  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    
    if (!execution) {
      throw new Error('Execution not found');
    }

    execution.status = 'cancelled';
    execution.endTime = new Date();
    this.executions.set(executionId, execution);
  }

  async getExecutions(projectId?: string): Promise<MobileExecution[]> {
    const executions = Array.from(this.executions.values());
    
    if (projectId) {
      return executions.filter(e => e.projectId === projectId);
    }

    return executions;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}