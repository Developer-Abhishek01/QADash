import { client } from '../api/client';
import type {
  SecurityScan,
  Vulnerability,
  DependencyScan,
  SecurityAlert,
  DashboardStats,
  CreateScanDto,
} from './types';

export const securityApi = {
  createScan: (data: CreateScanDto) =>
    client.post<SecurityScan>('/security/scans', data),

  startScan: (id: string) =>
    client.post(`/security/scans/${id}/start`),

  cancelScan: (id: string) =>
    client.post(`/security/scans/${id}/cancel`),

  getScans: (params?: {
    projectId?: string;
    status?: string;
    scanType?: string;
    offset?: number;
    limit?: number;
  }) =>
    client.get<{ scans: SecurityScan[]; total: number }>('/security/scans', { params }),

  getScanById: (id: string) =>
    client.get<SecurityScan>(`/security/scans/${id}`),

  updateScan: (id: string, data: { name?: string; config?: Record<string, unknown>; schedule?: string }) =>
    client.put<SecurityScan>(`/security/scans/${id}`, data),

  getVulnerabilities: (params?: {
    scanId?: string;
    severity?: string;
    status?: string;
    owaspCategory?: string;
    offset?: number;
    limit?: number;
  }) =>
    client.get<{ vulnerabilities: Vulnerability[]; total: number }>('/security/vulnerabilities', { params }),

  updateVulnerability: (id: string, data: { status: string; reason?: string }) =>
    client.put<Vulnerability>(`/security/vulnerabilities/${id}`, data),

  getDashboardStats: (projectId?: string) =>
    client.get<DashboardStats>('/security/dashboard', { params: { projectId } }),

  runDependencyScan: (projectId: string, packageManager: string) =>
    client.post('/security/dependency-scan', { projectId, packageManager }),

  getDependencyScans: (projectId: string) =>
    client.get<DependencyScan[]>('/security/dependency-scans', { params: { projectId } }),

  getAlerts: (projectId: string, unreadOnly?: boolean) =>
    client.get<SecurityAlert[]>('/security/alerts', { params: { projectId, unreadOnly } }),

  markAlertRead: (id: string) =>
    client.put(`/security/alerts/${id}/read`),

  generateReport: (scanId: string, format: 'json' | 'html' | 'pdf', type?: string) =>
    client.post<{ reportId: string; downloadUrl: string }>('/security/reports/generate', { scanId, format, type }),

  downloadReport: (id: string) =>
    client.get<{ url: string; fileName: string }>(`/security/reports/${id}/download`),
};

export default securityApi;