import { client } from '../api/client';
import type { FileImport, FieldMapping, ImportError, CreateImportDto } from './types';

export const importApi = {
  uploadFile: async (file: File, projectId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post<FileImport>('/import/upload', formData, {
      params: { projectId },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  createImport: (data: CreateImportDto) =>
    client.post<FileImport>('/import/create', data),

  parseFile: (id: string) =>
    client.post<{ importId: string; totalRows: number; schema: unknown; previewData: unknown[]; mappings: FieldMapping[] }>(`/import/${id}/parse`),

  getImports: (params?: { projectId?: string; status?: string; offset?: number; limit?: number }) =>
    client.get<{ imports: FileImport[]; total: number }>('/import/list', { params }),

  getImportById: (id: string) =>
    client.get<FileImport>(`/import/${id}`),

  saveMappings: (importId: string, mappings: Partial<FieldMapping>[]) =>
    client.post('/import/mappings/save', { importId, mappings }),

  processImport: (id: string) =>
    client.post<{ importId: string; totalRows: number; successRows: number; errorRows: number; status: string }>(`/import/${id}/process`),

  getPreview: (id: string, offset?: number, limit?: number) =>
    client.get<Record<string, unknown>[]>(`/import/${id}/preview`, { params: { offset, limit } }),

  getErrors: (id: string) =>
    client.get<ImportError[]>(`/import/${id}/errors`),

  resolveError: (id: string) =>
    client.put(`/import/errors/${id}/resolve`),

  deleteImport: (id: string) =>
    client.delete(`/import/${id}`),
};

export default importApi;