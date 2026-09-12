import { apiClient } from '@/lib/api/client';

export const requirementsApi = {
  parseDocument: (data: { document: string; metadata?: Record<string, unknown> }) =>
    apiClient.post<unknown>('requirements/parse', data),
  uploadDocument: (file: File, documentType: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    return apiClient.post<unknown>('requirements/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },
  generateTests: (data: { requirements: unknown[]; framework?: string; documentId?: string }) =>
    apiClient.post<unknown>('requirements/generate-tests', data),
  getDocumentAnalysis: (id: string) =>
    apiClient.get<unknown>(`requirements/${id}/analysis`),
  list: (params?: Record<string, unknown>) =>
    apiClient.get<unknown>('requirements', params),
  get: (id: string) =>
    apiClient.get<unknown>(`requirements/${id}`),
  delete: (id: string) =>
    apiClient.delete<void>(`requirements/${id}`),
};
