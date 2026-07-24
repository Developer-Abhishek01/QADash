import { apiClient } from '@/lib/api/client';

export const requirementsApi = {
  parseDocument: (data: { document: string; metadata?: Record<string, unknown> }) =>
    apiClient.post<any>('requirements/parse', data),
  uploadDocument: (file: File, documentType: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    return apiClient.post<any>('requirements/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },
  generateTests: (data: { requirements: any[]; framework?: string }) =>
    apiClient.post<any>('requirements/generate-tests', data),
  list: (params?: Record<string, unknown>) =>
    apiClient.get<any>('requirements', params),
  get: (id: string) =>
    apiClient.get<any>(`requirements/${id}`),
  delete: (id: string) =>
    apiClient.delete<void>(`requirements/${id}`),
};
