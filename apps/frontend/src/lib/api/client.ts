import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL 
  ? (process.env.NEXT_PUBLIC_API_URL.endsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL}api/v1/` : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/`)
  : 'http://127.0.0.1:3001/api/v1/';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 60000, // Increased for large uploads (test case files with source data)
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        console.error('API Error:', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
        });

        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401) {
          if (!originalRequest._retry) {
            originalRequest._retry = true;

            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              try {
                const response = await axios.post(`${API_BASE_URL}auth/refresh`, {
                  refreshToken,
                });
                // Handle wrapped response from backend
                const data = response.data.success ? response.data.data : response.data;
                const { accessToken } = data;
                localStorage.setItem('accessToken', accessToken);
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return this.client(originalRequest);
              } catch {
                this.handleLogout();
              }
            } else {
              this.handleLogout();
            }
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private handleLogout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  private unwrap<T>(response: unknown): T {
    if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
      return (response as { data: T }).data;
    }
    return response as T;
  }

async get<T>(url: string, paramsOrConfig?: unknown): Promise<T> {
    const p = paramsOrConfig as Record<string, unknown> | undefined;
    const config = p && ('params' in p || 'headers' in p) ? p : { params: paramsOrConfig };
    const response = await this.client.get(url, config as Record<string, unknown>);
    return this.unwrap<T>(response.data);
  }

  async post<T>(url: string, data?: unknown, config?: unknown): Promise<T> {
    const response = await this.client.post(url, data, config as Record<string, unknown>);
    return this.unwrap<T>(response.data);
  }

  async put<T>(url: string, data?: unknown, config?: unknown): Promise<T> {
    const response = await this.client.put(url, data, config as Record<string, unknown>);
    return this.unwrap<T>(response.data);
  }

  async patch<T>(url: string, data?: unknown, config?: unknown): Promise<T> {
    const response = await this.client.patch(url, data, config as Record<string, unknown>);
    return this.unwrap<T>(response.data);
  }

  async delete<T>(url: string, config?: unknown): Promise<T> {
    const response = await this.client.delete(url, config as Record<string, unknown>);
    return this.unwrap<T>(response.data);
  }
}

export const apiClient = new ApiClient();
export const client = apiClient;

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ accessToken: string; refreshToken: string; user: unknown }>('auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string }) =>
    apiClient.post<{ id: string }>('auth/register', data),
  logout: () => apiClient.post<void>('auth/logout'),
  me: () => apiClient.get<unknown>('auth/me'),
  refreshToken: (refreshToken: string) =>
    apiClient.post<{ accessToken: string; refreshToken?: string }>('auth/refresh', { refreshToken }),
  updateProfile: (data: { name?: string; avatar?: string }) =>
    apiClient.put<unknown>('auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.post<void>('auth/change-password', data),
};

export const executionsApi = {
  list: (params?: unknown) => apiClient.get<unknown[]>('executions', params),
  get: (id: string) => apiClient.get<unknown>(`executions/${id}`),
  create: (data: unknown) => apiClient.post<unknown>('executions', data),
  start: (id: string) => apiClient.post<unknown>(`executions/${id}/start`),
  cancel: (id: string) => apiClient.post<unknown>(`executions/${id}/cancel`),
  retry: (id: string) => apiClient.post<unknown>(`executions/${id}/retry`),
  delete: (id: string) => apiClient.delete<unknown>(`executions/${id}`),
  livePreview: (id: string) => apiClient.get<unknown>(`executions/${id}/live-preview`),
};

export const usersApi = {
  list: (params?: unknown) => apiClient.get<unknown[]>('users', params),
  get: (id: string) => apiClient.get<unknown>(`users/${id}`),
  create: (data: unknown) => apiClient.post<unknown>('users', data),
  update: (id: string, data: unknown) => apiClient.put<unknown>(`users/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`users/${id}`),
};

export const projectsApi = {
  list: (params?: unknown) => apiClient.get<unknown[]>('projects', params),
  get: (id: string) => apiClient.get<unknown>(`projects/${id}`),
  create: (data: unknown) => apiClient.post<unknown>('projects', data),
  update: (id: string, data: unknown) => apiClient.put<unknown>(`projects/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`projects/${id}`),
};

export const importApi = {
  list: (params?: unknown) => apiClient.get<unknown>('import/list', params),
  get: (id: string) => apiClient.get<unknown>(`import/${id}`),
  upload: (data: FormData) => apiClient.post<unknown>('import/upload', data),
  delete: (id: string) => apiClient.delete<void>(`import/${id}`),
  getPreview: (id: string, offset = 0, limit = 10) => 
    apiClient.get<unknown[]>(`import/${id}/preview`, { offset, limit }),
  saveMappings: (id: string, mappings: unknown[]) => 
    apiClient.post<unknown>('import/mappings/save', { importId: id, mappings }),
  process: (id: string) => apiClient.post<unknown>(`import/${id}/process`),
};

export const testsApi = {
  list: (params?: unknown) => apiClient.get<unknown[]>('tests', params),
  get: (id: string) => apiClient.get<unknown>(`tests/${id}`),
  create: (data: unknown) => apiClient.post<unknown>('tests', data),
  update: (id: string, data: unknown) => apiClient.put<unknown>(`tests/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`tests/${id}`),
  run: (id: string) => apiClient.post<unknown>(`tests/${id}/run`),
  results: (id: string) => apiClient.get<unknown>(`tests/${id}/results`),
};

export const reportsApi = {
  list: (params?: unknown) => apiClient.get<unknown[]>('reports', params),
  get: (id: string) => apiClient.get<unknown>(`reports/${id}`),
  generate: (data: unknown) => apiClient.post<unknown>('reports', data),
  delete: (id: string) => apiClient.delete<void>(`reports/${id}`),
  bulkDelete: (ids: string[]) => apiClient.delete<void>(`reports/bulk?ids=${ids.join(',')}`),
};

export const bugsApi = {
  list: (params?: unknown) => apiClient.get<unknown[]>('bugs', params),
  get: (id: string) => apiClient.get<unknown>(`bugs/${id}`),
  create: (data: unknown) => apiClient.post<unknown>('bugs', data),
  update: (id: string, data: unknown) => apiClient.put<unknown>(`bugs/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`bugs/${id}`),
};

export const analyticsApi = {
  getDashboard: () => apiClient.get<unknown>('analytics/dashboard'),
  getOverview: () => apiClient.get<unknown>('analytics/overview'),
  getTrends: (params?: unknown) => apiClient.get<unknown>('analytics/trends', params),
  getFlakyTests: (params?: unknown) => apiClient.get<unknown>('analytics/flaky', params),
  getCoverage: (params?: unknown) => apiClient.get<unknown>('analytics/coverage', params),
};

export const aiApi = {
  analyze: (projectId: string, testCode: string) =>
    apiClient.post<unknown>(`ai/projects/${projectId}/analyze-test`, { testCode }),
  predict: (testHistory: unknown[], currentMetrics: unknown) =>
    apiClient.post<unknown>('ai/projects/global/predict', { test_history: testHistory, current_metrics: currentMetrics }),
  getInsights: (projectId: string) =>
    apiClient.get<unknown>(`ai/projects/${projectId}/insights`),
};

export const schedulerApi = {
  list: (params?: unknown) => apiClient.get<unknown[]>('scheduler/jobs', params),
  get: (id: string) => apiClient.get<unknown>(`scheduler/jobs/${id}`),
  create: (data: unknown) => apiClient.post<unknown>('scheduler/jobs', data),
  update: (id: string, data: unknown) => apiClient.put<unknown>(`scheduler/jobs/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`scheduler/jobs/${id}`),
  run: (id: string) => apiClient.post<unknown>(`scheduler/jobs/${id}/run`),
  pause: (id: string) => apiClient.post<unknown>(`scheduler/jobs/${id}/pause`),
  resume: (id: string) => apiClient.post<unknown>(`scheduler/jobs/${id}/resume`),
};

export const environmentsApi = {
  list: (params?: unknown) => apiClient.get<unknown[]>('environments', params),
  get: (id: string) => apiClient.get<unknown>(`environments/${id}`),
  create: (data: unknown) => apiClient.post<unknown>('environments', data),
  update: (id: string, data: unknown) => apiClient.put<unknown>(`environments/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`environments/${id}`),
  test: (id: string) => apiClient.post<unknown>(`environments/${id}/test`),
};

export const settingsApi = {
  get: () => apiClient.get<unknown>('settings'),
  update: (data: unknown) => apiClient.put<unknown>('settings', data),
  getTeam: () => apiClient.get<unknown>('settings/team'),
  updateTeam: (data: { userId: string; role: string }[]) => apiClient.put<unknown>('settings/team', data),
  getIntegrations: () => apiClient.get<unknown>('settings/integrations'),
  updateIntegrations: (data: unknown) => apiClient.put<unknown>('settings/integrations', data),
};

export const notificationsApi = {
  list: (params?: unknown) => apiClient.get<unknown[]>('notifications', params),
  get: (id: string) => apiClient.get<unknown>(`notifications/${id}`),
  markRead: (id: string) => apiClient.post<unknown>(`notifications/${id}/read`),
  markAllRead: () => apiClient.post<void>('notifications/read-all'),
  delete: (id: string) => apiClient.delete<void>(`notifications/${id}`),
};

export const healthApi = {
  check: () => apiClient.get<unknown>('health'),
};

export const generatorApi = {
  generate: (data: unknown) => apiClient.post<unknown>('generator/generate', data),
  runAction: (action: string, data?: unknown) => apiClient.post<unknown>('generator/action', { action, data }),
};

export const orchestrationApi = {
  submitJob: (data: unknown) => apiClient.post<unknown>('orchestration/jobs', data),
  submitBatch: (data: unknown[]) => apiClient.post<unknown>('orchestration/jobs/batch', data),
  listJobs: (params?: Record<string, string>) => apiClient.get<unknown>('orchestration/jobs', params ? { params } : undefined),
  getJobStatus: (id: string) => apiClient.get<unknown>(`orchestration/jobs/${id}`),
  cancelJob: (id: string) => apiClient.delete<unknown>(`orchestration/jobs/${id}`),
  orchestrateExecution: (executionId: string, options: unknown) =>
    apiClient.post<unknown>(`orchestration/execute/${executionId}`, options),
  getServiceHealth: () => apiClient.get<unknown[]>('orchestration/services/health'),
  scaleService: (name: string, replicas: number) =>
    apiClient.post<unknown>(`orchestration/services/${name}/scale`, { replicas }),
  getEvents: (limit?: number) => apiClient.get<unknown[]>('orchestration/events', { limit }),
  getQueueStats: () => apiClient.get<unknown>('orchestration/queue/stats'),
};

export const securityApi = {
  listScans: (params?: unknown) => apiClient.get<unknown[]>('security/scans', params),
  getScan: (id: string) => apiClient.get<unknown>(`security/scans/${id}`),
  createScan: (data: unknown) => apiClient.post<unknown>('security/scans', data),
  runScan: (id: string) => apiClient.post<unknown>(`security/scans/${id}/run`),
  stopScan: (id: string) => apiClient.post<unknown>(`security/scans/${id}/stop`),
  getVulnerabilities: (params?: unknown) => apiClient.get<unknown[]>('security/vulnerabilities', params),
  getReport: (scanId: string) => apiClient.get<unknown>(`security/scans/${scanId}/report`),
};

export const performanceApi = {
  listTests: (params?: unknown) => apiClient.get<unknown[]>('performance/tests', params),
  getTest: (id: string) => apiClient.get<unknown>(`performance/tests/${id}`),
  createTest: (data: unknown) => apiClient.post<unknown>('performance/tests', data),
  runTest: (id: string) => apiClient.post<unknown>(`performance/tests/${id}/run`),
  getResults: (id: string) => apiClient.get<unknown>(`performance/tests/${id}/results`),
  getMetrics: () => apiClient.get<unknown>('performance/metrics'),
};

export const accessibilityApi = {
  listTests: (params?: unknown) => apiClient.get<unknown[]>('accessibility/tests', params),
  getTest: (id: string) => apiClient.get<unknown>(`accessibility/tests/${id}`),
  createTest: (data: unknown) => apiClient.post<unknown>('accessibility/tests', data),
  runTest: (id: string) => apiClient.post<unknown>(`accessibility/tests/${id}/run`),
  getIssues: (params?: unknown) => apiClient.get<unknown[]>('accessibility/issues', params),
  getReport: (testId: string) => apiClient.get<unknown>(`accessibility/tests/${testId}/report`),
};

export const infrastructureApi = {
  getInfrastructure: () => apiClient.get<unknown>('monitoring/infrastructure'),
  getSystemStatus: () => apiClient.get<unknown>('monitoring/status'),
  getSystemInfo: () => apiClient.get<unknown>('monitoring/system'),
  getHealth: () => apiClient.get<unknown>('monitoring/health'),
  getDetailedHealth: () => apiClient.get<unknown>('monitoring/health/detailed'),
};

export const workersApi = {
  list: () => apiClient.get<unknown>('monitoring/workers'),
  getQueueHealth: () => apiClient.get<unknown>('queue/health'),
  getQueueMetrics: (queue: string) => apiClient.get<unknown>(`queue/metrics/${queue}`),
  getWorkers: () => apiClient.get<unknown>('queue/workers'),
  getFailedJobs: (queue?: string) => apiClient.get<unknown>('queue/failed-jobs', queue ? { queue } : undefined),
  scaleUp: (workers: number) => apiClient.post<unknown>('queue/scale-up', { workers }),
  scaleDown: (workers: number) => apiClient.post<unknown>('queue/scale-down', { workers }),
  retryJob: (queue: string, jobId: string) => apiClient.post<unknown>(`queue/retry/${queue}/${jobId}`),
  retryAllFailed: (queue: string) => apiClient.post<unknown>(`queue/retry-all/${queue}`),
  pauseQueue: (queue: string) => apiClient.post<unknown>(`queue/pause/${queue}`),
  resumeQueue: (queue: string) => apiClient.post<unknown>(`queue/resume/${queue}`),
  drainQueue: (queue: string) => apiClient.post<unknown>(`queue/drain/${queue}`),
};

export default apiClient;