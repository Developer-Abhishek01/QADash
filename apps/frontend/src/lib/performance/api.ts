import { client } from '../api/client';
import type {
  PerformanceTest,
  PerformanceMetric,
  ThresholdAlert,
  AlertEvent,
  DashboardStats,
  CreateTestDto,
} from './types';

export const performanceApi = {
  createTest: (data: CreateTestDto) =>
    client.post<PerformanceTest>('/performance/tests', data),

  runTest: (id: string) =>
    client.post(`/performance/tests/${id}/run`),

  cancelTest: (id: string) =>
    client.post(`/performance/tests/${id}/cancel`),

  getTests: (params?: {
    projectId?: string;
    status?: string;
    testType?: string;
    offset?: number;
    limit?: number;
  }) =>
    client.get<{ tests: PerformanceTest[]; total: number }>('/performance/tests', { params }),

  getTestById: (id: string) =>
    client.get<PerformanceTest>(`/performance/tests/${id}`),

  updateTest: (id: string, data: Partial<CreateTestDto>) =>
    client.put<PerformanceTest>(`/performance/tests/${id}`, data),

  deleteTest: (id: string) =>
    client.delete(`/performance/tests/${id}`),

  getTestMetrics: (testId: string, params?: {
    metricType?: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  }) =>
    client.get<PerformanceMetric[]>(`/performance/tests/${testId}/metrics`, { params }),

  getRealtimeMetrics: (testId: string) =>
    client.get<{ timestamp: string; metrics: Record<string, unknown>; active: boolean }>(`/performance/tests/${testId}/realtime`),

  getDashboardStats: (projectId?: string) =>
    client.get<DashboardStats>('/performance/dashboard', { params: { projectId } }),

  getHistoricalAnalytics: (projectId: string, timeRange: '24h' | '7d' | '30d' | '90d') =>
    client.get<{ completedTests: PerformanceTest[]; metrics: PerformanceMetric[] }>('/performance/analytics/historical', { params: { projectId, timeRange } }),

  createAlert: (data: {
    name: string;
    projectId: string;
    testId?: string;
    metricType: string;
    condition: string;
    threshold: number;
    severity: string;
  }) =>
    client.post<ThresholdAlert>('/performance/alerts', data),

  updateAlert: (id: string, data: Partial<ThresholdAlert>) =>
    client.put<ThresholdAlert>(`/performance/alerts/${id}`, data),

  deleteAlert: (id: string) =>
    client.delete(`/performance/alerts/${id}`),

  getAlerts: (projectId: string, testId?: string) =>
    client.get<ThresholdAlert[]>('/performance/alerts', { params: { projectId, testId } }),

  getAlertEvents: (projectId: string, unreadOnly?: boolean) =>
    client.get<AlertEvent[]>('/performance/alerts/events', { params: { projectId, unreadOnly } }),

  markAlertRead: (id: string) =>
    client.put(`/performance/alerts/${id}/read`),
};

export default performanceApi;