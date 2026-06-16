export interface Device {
  id: string;
  name: string;
  platform: 'android' | 'ios';
  type: 'emulator' | 'real';
  osVersion: string;
  manufacturer?: string;
  model?: string;
  udid?: string;
  status: 'available' | 'busy' | 'offline' | 'maintenance';
  capabilities: string[];
}

export interface MobileTestConfig {
  projectId: string;
  testSuiteId: string;
  deviceIds: string[];
  platform: 'android' | 'ios';
  appPath?: string;
  appPackage?: string;
  appActivity?: string;
  bundleId?: string;
}

export interface MobileExecution {
  id: string;
  projectId: string;
  testSuiteId: string;
  devices: string[];
  platform: 'android' | 'ios';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
}

export interface DeviceReport {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  osVersion: string;
  status: 'passed' | 'failed' | 'skipped';
  testsPassed: number;
  testsFailed: number;
  testsSkipped: number;
  duration: number;
  screenshots: string[];
}

export interface MobileReport {
  executionId: string;
  generatedAt: string;
  summary: ReportSummary;
  devices: DeviceReport[];
}

export interface ReportSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  successRate: number;
  totalDuration: number;
  platform: string;
}

export interface AppUpload {
  appId: string;
  path: string;
  filename: string;
  platform: 'android' | 'ios';
}