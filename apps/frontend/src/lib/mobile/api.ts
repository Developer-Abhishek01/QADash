import { client } from '../api/client';
import type { Device, MobileTestConfig, MobileReport, AppUpload } from './types';

export const mobileApi = {
  uploadApp(projectId: string, file: File): Promise<AppUpload> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    return client.post('/mobile/upload-app', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  runTests(config: MobileTestConfig): Promise<{ executionId: string }> {
    return client.post('/mobile/run-tests', config);
  },

  getExecutionStatus(executionId: string): Promise<Record<string, unknown>> {
    return client.get(`/mobile/execution/${executionId}`);
  },

  getDevices(platform?: string): Promise<Device[]> {
    return client.get('/mobile/devices', { params: { platform } });
  },

  registerDevice(device: Partial<Device>): Promise<{ deviceId: string }> {
    return client.post('/mobile/devices', device);
  },

  getAvailableDevices(platform: 'android' | 'ios', osVersion?: string): Promise<Device[]> {
    return client.get('/mobile/devices/available', { params: { platform, osVersion } });
  },

  reserveDevice(deviceId: string, userId: string): Promise<{ reservationId: string }> {
    return client.post(`/mobile/devices/${deviceId}/reserve`, { userId });
  },

  releaseDevice(deviceId: string): Promise<void> {
    return client.post(`/mobile/devices/${deviceId}/release`);
  },

  getDevice(deviceId: string): Promise<Device> {
    return client.get(`/mobile/devices/${deviceId}`);
  },

  getReport(executionId: string): Promise<MobileReport> {
    return client.get(`/mobile/reports/${executionId}`);
  },

  getReportJSON(executionId: string): Promise<string> {
    return client.get(`/mobile/reports/${executionId}/json`);
  },

  getReportXML(executionId: string): Promise<string> {
    return client.get(`/mobile/reports/${executionId}/xml`);
  },

  getJUnitReport(executionId: string): Promise<string> {
    return client.get(`/mobile/reports/${executionId}/junit`);
  },

  getHTMLReport(executionId: string): Promise<string> {
    return client.get(`/mobile/reports/${executionId}/html`);
  },

  exportReport(executionId: string, format: 'json' | 'xml' | 'html'): Promise<string> {
    return client.get(`/mobile/reports/${executionId}/export`, { params: { format } });
  },

  getDeviceStatistics(): Promise<Record<string, unknown>> {
    return client.get('/mobile/statistics/devices');
  },

  getReportTrending(projectId: string, days?: number): Promise<Record<string, unknown>> {
    return client.get('/mobile/statistics/reports', { params: { projectId, days } });
  },

  getDeviceUsageStats(): Promise<Record<string, unknown>> {
    return client.get('/mobile/statistics/device-usage');
  },

  getEmulators(platform: 'android' | 'ios'): Promise<Device[]> {
    return client.get('/mobile/emulators', { params: { platform } });
  },

  getRealDevices(platform: 'android' | 'ios'): Promise<Device[]> {
    return client.get('/mobile/real-devices', { params: { platform } });
  },
};