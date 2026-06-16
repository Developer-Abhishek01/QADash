export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  tags: string[];
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}

export const projects = {
  qaDashboard: {
    id: 'proj-001',
    name: 'QA Dashboard',
    description: 'Main QA Dashboard Application',
    status: 'ACTIVE' as const,
  },
  apiTests: {
    id: 'proj-002',
    name: 'API Testing',
    description: 'API Integration Tests',
    status: 'ACTIVE' as const,
  },
  e2eTests: {
    id: 'proj-003',
    name: 'E2E Testing',
    description: 'End to End Test Suite',
    status: 'ACTIVE' as const,
  },
};

export const testCases = {
  loginTest: {
    id: 'test-001',
    name: 'Login Test',
    description: 'Verify user can login with valid credentials',
    tags: ['login', 'smoke', 'critical'],
    status: 'ACTIVE' as const,
  },
  dashboardTest: {
    id: 'test-002',
    name: 'Dashboard Test',
    description: 'Verify dashboard loads correctly',
    tags: ['dashboard', 'smoke'],
    status: 'ACTIVE' as const,
  },
  projectCreationTest: {
    id: 'test-003',
    name: 'Create Project',
    description: 'Verify user can create a new project',
    tags: ['project', 'create', 'regression'],
    status: 'ACTIVE' as const,
  },
  executionTest: {
    id: 'test-004',
    name: 'Run Test Execution',
    description: 'Verify test execution runs correctly',
    tags: ['execution', 'regression'],
    status: 'ACTIVE' as const,
  },
};

export const testTags = {
  smoke: { name: 'smoke', color: 'green', description: 'Smoke tests' },
  regression: { name: 'regression', color: 'blue', description: 'Regression tests' },
  critical: { name: 'critical', color: 'red', description: 'Critical path tests' },
  api: { name: 'api', color: 'purple', description: 'API tests' },
  ui: { name: 'ui', color: 'orange', description: 'UI tests' },
};