import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { LoggerService } from '../../common/logging';
import { DeviceManagementService } from './device-management.service';
import { AppiumService } from './appium.service';
import { MobileExecutionService } from './mobile-execution.service';
import { MobileReportService } from './mobile-report.service';

export interface MobileTestConfig {
  projectId: string;
  testSuiteId: string;
  deviceIds: string[];
  platform: 'android' | 'ios';
  appPath?: string;
  appPackage?: string;
  appActivity?: string;
  bundleId?: string;
  capabilities?: Record<string, unknown>;
}

export interface MobileTestResult {
  executionId: string;
  deviceId: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  duration: number;
  screenshot?: string;
  video?: string;
  logs?: string;
  errors?: string[];
}

@Injectable()
export class MobileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly deviceManager: DeviceManagementService,
    private readonly appium: AppiumService,
    private readonly execution: MobileExecutionService,
    private readonly reportService: MobileReportService,
  ) {}

  async uploadApp(projectId: string, file: Buffer, fileName: string): Promise<{ appId: string; path: string }> {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    if (!['apk', 'ipa', 'app'].includes(ext || '')) {
      throw new Error('Invalid app file format. Supported: .apk (Android), .ipa/.app (iOS)');
    }

    const appId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const storagePath = `apps/${projectId}/${appId}.${ext}`;

    await this.prisma.file.create({
      data: {
        id: appId,
        projectId,
        filename: fileName,
        mimetype: ext === 'apk' ? 'application/vnd.android.package-archive' : 'application/octet-stream',
        path: storagePath,
        size: file.length,
        type: 'MOBILE_APP',
      },
    });

    this.logger.logBusinessEvent({
      event: 'mobile_app_uploaded',
      entity: 'app',
      entityId: appId,
      metadata: { fileName, size: file.length, platform: ext },
    });

    return { appId, path: storagePath };
  }

  async runTests(config: MobileTestConfig): Promise<{ executionId: string }> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.logBusinessEvent({
      event: 'mobile_test_started',
      entity: 'execution',
      entityId: executionId,
      metadata: {
        projectId: config.projectId,
        suiteId: config.testSuiteId,
        deviceCount: config.deviceIds.length,
        platform: config.platform,
      },
    });

    const execution = await this.execution.startExecution(executionId, config);

    return { executionId: execution.id };
  }

  async getExecutionStatus(executionId: string): Promise<any> {
    return this.execution.getExecutionStatus(executionId);
  }

  async getDeviceList(platform?: string): Promise<any[]> {
    return this.deviceManager.getDevices(platform as 'android' | 'ios' | undefined);
  }

  async getAvailableDevices(platform: 'android' | 'ios', osVersion?: string): Promise<any[]> {
    return this.deviceManager.getAvailableDevices(platform, osVersion);
  }

  async getDevicesByProject(projectId: string): Promise<any[]> {
    return this.deviceManager.getDevicesByProject(projectId);
  }

  async registerDevice(data: any): Promise<{ deviceId: string }> {
    return this.deviceManager.registerDevice(data);
  }

  async reserveDevice(deviceId: string, userId: string): Promise<{ reservationId: string }> {
    return this.deviceManager.reserveDevice(deviceId, userId);
  }

  async releaseDevice(deviceId: string): Promise<void> {
    return this.deviceManager.releaseDevice(deviceId);
  }

  async getTestReports(executionId: string): Promise<any> {
    return this.reportService.getReport(executionId);
  }
}