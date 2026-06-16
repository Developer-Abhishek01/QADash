// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'ADMIN' | 'QA_LEAD' | 'QA_ENGINEER' | 'AUTOMATION_ENGINEER' | 'DEVELOPER' | 'MANAGER' | 'VIEWER';

export interface CreateUserDto {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  role?: UserRole;
}

// Test Types
export interface Test {
  id: string;
  name: string;
  description: string;
  suiteId: string;
  status: TestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type TestStatus = 'draft' | 'active' | 'archived';

export interface CreateTestDto {
  name: string;
  description?: string;
  suiteId: string;
  config: TestConfig;
}

export interface TestConfig {
  framework: 'playwright' | 'cypress' | 'selenium';
  timeout: number;
  retries: number;
  browsers: string[];
  viewport?: ViewportConfig;
}

export interface ViewportConfig {
  width: number;
  height: number;
}

// Test Suite Types
export interface TestSuite {
  id: string;
  name: string;
  projectId: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTestSuiteDto {
  name: string;
  projectId: string;
  description?: string;
}

// Test Run Types
export interface TestRun {
  id: string;
  testId: string;
  status: TestRunStatus;
  duration: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, unknown>;
}

export type TestRunStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

// Project Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  organizationId: string;
}

// Report Types
export interface Report {
  id: string;
  projectId: string;
  type: ReportType;
  summary: ReportSummary;
  createdAt: Date;
}

export type ReportType = 'test-summary' | 'coverage' | 'performance' | 'flaky-tests';

export interface ReportSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Auth Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto extends CreateUserDto {}

// Queue Types
export interface QueueJob {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;
  status: JobStatus;
  result?: unknown;
  createdAt: Date;
  completedAt?: Date;
}

export type JobType = 'test-run' | 'report-generation' | 'data-sync' | 'ai-analysis';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Health Check Types
export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    queue: ServiceHealth;
  };
}

export interface ServiceHealth {
  status: 'up' | 'down';
  latency?: number;
  message?: string;
}

// WebSocket Event Types
export interface WsEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: Date;
}

export type TestRunEvent = WsEvent<{
  runId: string;
  status: TestRunStatus;
  progress: number;
}>;

// Common
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}