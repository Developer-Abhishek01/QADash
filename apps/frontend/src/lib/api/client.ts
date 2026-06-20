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

        // Handle invalid/mock tokens
        const token = localStorage.getItem('accessToken');
        if (error.response?.status === 401 || (token === 'mock-token' && error.message === 'Network Error')) {
          if (!originalRequest._retry) {
            originalRequest._retry = true;

            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken && refreshToken !== 'mock-token') {
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

  private unwrap<T>(response: any): T {
    if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
      return response.data as T;
    }
    return response as T;
  }

  async get<T>(url: string, paramsOrConfig?: any): Promise<T> {
    // If paramsOrConfig has 'params' or 'headers', treat it as AxiosConfig
    const config = (paramsOrConfig && (paramsOrConfig.params || paramsOrConfig.headers))
      ? paramsOrConfig
      : { params: paramsOrConfig };
    const response = await this.client.get<any>(url, config);
    return this.unwrap<T>(response.data);
  }

  async post<T>(url: string, data?: unknown, config?: any): Promise<T> {
    const response = await this.client.post<any>(url, data, config);
    return this.unwrap<T>(response.data);
  }

  async put<T>(url: string, data?: unknown, config?: any): Promise<T> {
    const response = await this.client.put<any>(url, data, config);
    return this.unwrap<T>(response.data);
  }

  async patch<T>(url: string, data?: unknown, config?: any): Promise<T> {
    const response = await this.client.patch<any>(url, data, config);
    return this.unwrap<T>(response.data);
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete<any>(url, config);
    return this.unwrap<T>(response.data);
  }
}

export const apiClient = new ApiClient();
export const client = apiClient;

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ accessToken: string; refreshToken: string; user: any }>('auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string }) =>
    apiClient.post<{ id: string }>('auth/register', data),
  logout: () => apiClient.post<void>('auth/logout'),
  me: () => apiClient.get<any>('auth/me'),
  refreshToken: (refreshToken: string) =>
    apiClient.post<{ accessToken: string; refreshToken?: string }>('auth/refresh', { refreshToken }),
};

export const executionsApi = {
  list: (params?: any) => apiClient.get<any[]>('executions', params),
  get: (id: string) => apiClient.get<any>(`executions/${id}`),
  create: (data: any) => apiClient.post<any>('executions', data),
  start: (id: string) => apiClient.post<any>(`executions/${id}/start`),
  cancel: (id: string) => apiClient.post<any>(`executions/${id}/cancel`),
  retry: (id: string) => apiClient.post<any>(`executions/${id}/retry`),
  delete: (id: string) => apiClient.delete<any>(`executions/${id}`),
  livePreview: (id: string) => apiClient.get<any>(`executions/${id}/live-preview`),
};

export const usersApi = {
  list: (params?: any) => apiClient.get<any[]>('users', params),
  get: (id: string) => apiClient.get<any>(`users/${id}`),
  create: (data: any) => apiClient.post<any>('users', data),
  update: (id: string, data: any) => apiClient.put<any>(`users/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`users/${id}`),
};

export const projectsApi = {
  list: (params?: any) => apiClient.get<any[]>('projects', params),
  get: (id: string) => apiClient.get<any>(`projects/${id}`),
  create: (data: any) => apiClient.post<any>('projects', data),
  update: (id: string, data: any) => apiClient.put<any>(`projects/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`projects/${id}`),
};

export const importApi = {
  list: (params?: any) => apiClient.get<any>('import', params),
  get: (id: string) => apiClient.get<any>(`import/${id}`),
  upload: (data: FormData) => apiClient.post<any>('import/upload', data),
  delete: (id: string) => apiClient.delete<void>(`import/${id}`),
  getPreview: (id: string, offset = 0, limit = 10) => 
    apiClient.get<any[]>(`import/${id}/preview`, { offset, limit }),
  saveMappings: (id: string, mappings: any[]) => 
    apiClient.post<any>(`import/${id}/mappings`, { mappings }),
  process: (id: string) => apiClient.post<any>(`import/${id}/process`),
};

export const testsApi = {
  list: (params?: any) => apiClient.get<any[]>('tests', params),
  get: (id: string) => apiClient.get<any>(`tests/${id}`),
  create: (data: any) => apiClient.post<any>('tests', data),
  update: (id: string, data: any) => apiClient.put<any>(`tests/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`tests/${id}`),
  run: (id: string) => apiClient.post<any>(`tests/${id}/run`),
  results: (id: string) => apiClient.get<any>(`tests/${id}/results`),
};

export const reportsApi = {
  list: (params?: any) => apiClient.get<any[]>('reports', params),
  get: (id: string) => apiClient.get<any>(`reports/${id}`),
  generate: (data: any) => apiClient.post<any>('reports', data),
  delete: (id: string) => apiClient.delete<void>(`reports/${id}`),
  bulkDelete: (ids: string[]) => apiClient.delete<void>(`reports/bulk?ids=${ids.join(',')}`),
};

export const bugsApi = {
  list: (params?: any) => apiClient.get<any[]>('bugs', params),
  get: (id: string) => apiClient.get<any>(`bugs/${id}`),
  create: (data: any) => apiClient.post<any>('bugs', data),
  update: (id: string, data: any) => apiClient.put<any>(`bugs/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`bugs/${id}`),
};

export const analyticsApi = {
  getOverview: () => apiClient.get<any>('analytics/overview'),
  getTrends: (params?: any) => apiClient.get<any>('analytics/trends', params),
  getFlakyTests: (params?: any) => apiClient.get<any>('analytics/flaky', params),
  getCoverage: (params?: any) => apiClient.get<any>('analytics/coverage', params),
};

export const aiApi = {
  analyze: (testResults: any[], testName: string) =>
    apiClient.post<any>('ai/analysis', { test_results: testResults, test_name: testName }),
  predict: (testHistory: any[], currentMetrics: any) =>
    apiClient.post<any>('ai/predictions', { test_history: testHistory, current_metrics: currentMetrics }),
  getInsights: (params?: any) => apiClient.get<any>('ai/insights', params),
};

export const schedulerApi = {
  list: (params?: any) => apiClient.get<any[]>('scheduler/jobs', params),
  get: (id: string) => apiClient.get<any>(`scheduler/jobs/${id}`),
  create: (data: any) => apiClient.post<any>('scheduler/jobs', data),
  update: (id: string, data: any) => apiClient.put<any>(`scheduler/jobs/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`scheduler/jobs/${id}`),
  run: (id: string) => apiClient.post<any>(`scheduler/jobs/${id}/run`),
  pause: (id: string) => apiClient.post<any>(`scheduler/jobs/${id}/pause`),
  resume: (id: string) => apiClient.post<any>(`scheduler/jobs/${id}/resume`),
};

export const environmentsApi = {
  list: (params?: any) => apiClient.get<any[]>('environments', params),
  get: (id: string) => apiClient.get<any>(`environments/${id}`),
  create: (data: any) => apiClient.post<any>('environments', data),
  update: (id: string, data: any) => apiClient.put<any>(`environments/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`environments/${id}`),
  test: (id: string) => apiClient.post<any>(`environments/${id}/test`),
};

export const settingsApi = {
  get: () => apiClient.get<any>('settings'),
  update: (data: any) => apiClient.put<any>('settings', data),
  getTeam: () => apiClient.get<any>('settings/team'),
  updateTeam: (data: any) => apiClient.put<any>('settings/team', data),
  getIntegrations: () => apiClient.get<any>('settings/integrations'),
  updateIntegrations: (data: any) => apiClient.put<any>('settings/integrations', data),
};

export const notificationsApi = {
  list: (params?: any) => apiClient.get<any[]>('notifications', params),
  get: (id: string) => apiClient.get<any>(`notifications/${id}`),
  markRead: (id: string) => apiClient.post<any>(`notifications/${id}/read`),
  markAllRead: () => apiClient.post<void>('notifications/read-all'),
  delete: (id: string) => apiClient.delete<void>(`notifications/${id}`),
};

export const healthApi = {
  check: () => apiClient.get<any>('health'),
};

export const generatorApi = {
  generate: (data: any) => apiClient.post<any>('generator/generate', data),
  runAction: (action: string, data?: any) => apiClient.post<any>('generator/action', { action, data }),
};

export const orchestrationApi = {
  submitJob: (data: any) => apiClient.post<any>('orchestration/jobs', data),
  submitBatch: (data: any[]) => apiClient.post<any>('orchestration/jobs/batch', data),
  getJobStatus: (id: string) => apiClient.get<any>(`orchestration/jobs/${id}`),
  cancelJob: (id: string) => apiClient.delete<any>(`orchestration/jobs/${id}`),
  orchestrateExecution: (executionId: string, options: any) =>
    apiClient.post<any>(`orchestration/execute/${executionId}`, options),
  getServiceHealth: () => apiClient.get<any[]>('orchestration/services/health'),
  scaleService: (name: string, replicas: number) =>
    apiClient.post<any>(`orchestration/services/${name}/scale`, { replicas }),
  getEvents: (limit?: number) => apiClient.get<any[]>('orchestration/events', { limit }),
  getQueueStats: () => apiClient.get<any>('orchestration/queue/stats'),
};

export const securityApi = {
  listScans: (params?: any) => apiClient.get<any[]>('security/scans', params),
  getScan: (id: string) => apiClient.get<any>(`security/scans/${id}`),
  createScan: (data: any) => apiClient.post<any>('security/scans', data),
  runScan: (id: string) => apiClient.post<any>(`security/scans/${id}/run`),
  stopScan: (id: string) => apiClient.post<any>(`security/scans/${id}/stop`),
  getVulnerabilities: (params?: any) => apiClient.get<any[]>('security/vulnerabilities', params),
  getReport: (scanId: string) => apiClient.get<any>(`security/scans/${scanId}/report`),
};

export const performanceApi = {
  listTests: (params?: any) => apiClient.get<any[]>('performance/tests', params),
  getTest: (id: string) => apiClient.get<any>(`performance/tests/${id}`),
  createTest: (data: any) => apiClient.post<any>('performance/tests', data),
  runTest: (id: string) => apiClient.post<any>(`performance/tests/${id}/run`),
  getResults: (id: string) => apiClient.get<any>(`performance/tests/${id}/results`),
  getMetrics: () => apiClient.get<any>('performance/metrics'),
};

export const accessibilityApi = {
  listTests: (params?: any) => apiClient.get<any[]>('accessibility/tests', params),
  getTest: (id: string) => apiClient.get<any>(`accessibility/tests/${id}`),
  createTest: (data: any) => apiClient.post<any>('accessibility/tests', data),
  runTest: (id: string) => apiClient.post<any>(`accessibility/tests/${id}/run`),
  getIssues: (params?: any) => apiClient.get<any[]>('accessibility/issues', params),
  getReport: (testId: string) => apiClient.get<any>(`accessibility/tests/${testId}/report`),
};

export default apiClient;