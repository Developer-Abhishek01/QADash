import { client } from '../api/client';
import type { AccessibilityTest, AccessibilityIssue, AccessibilityBaseline, DashboardStats, CreateTestDto } from './types';

export const accessibilityApi = {
  createTest: (data: CreateTestDto) =>
    client.post<AccessibilityTest>('/accessibility/tests', data),

  runTest: (id: string) =>
    client.post(`/accessibility/tests/${id}/run`),

  cancelTest: (id: string) =>
    client.post(`/accessibility/tests/${id}/cancel`),

  getTests: (params?: {
    projectId?: string;
    status?: string;
    offset?: number;
    limit?: number;
  }) =>
    client.get<{ tests: AccessibilityTest[]; total: number }>('/accessibility/tests', { params }),

  getTestById: (id: string) =>
    client.get<AccessibilityTest>(`/accessibility/tests/${id}`),

  updateTest: (id: string, data: Partial<CreateTestDto>) =>
    client.put<AccessibilityTest>(`/accessibility/tests/${id}`, data),

  deleteTest: (id: string) =>
    client.delete(`/accessibility/tests/${id}`),

  getIssues: (params?: {
    testId?: string;
    impact?: string;
    isResolved?: boolean;
    category?: string;
  }) =>
    client.get<AccessibilityIssue[]>('/accessibility/issues', { params }),

  resolveIssue: (id: string, data: { isResolved: boolean; resolutionNote?: string }) =>
    client.put(`/accessibility/issues/${id}/resolve`, data),

  createBaseline: (data: { projectId: string; testId?: string; name: string }) =>
    client.post<AccessibilityBaseline>('/accessibility/baselines', data),

  getBaselines: (projectId: string) =>
    client.get<AccessibilityBaseline[]>('/accessibility/baselines', { params: { projectId } }),

  getDashboardStats: (projectId?: string) =>
    client.get<DashboardStats>('/accessibility/dashboard', { params: { projectId } }),

  generateReport: (testId: string, format: 'json' | 'html' | 'pdf') =>
    client.post<{ reportId: string; downloadUrl: string }>('/accessibility/reports/generate', { testId, format }),
};

export default accessibilityApi;