export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'QA' | 'AUTOMATION_ENGINEER' | 'DEVELOPER' | 'MANAGER' | 'VIEWER';
}

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}. Set it in .env or CI secrets.`);
  return val;
}

export const users = {
  admin: {
    id: 'admin-001',
    email: getEnv('TEST_ADMIN_EMAIL'),
    password: getEnv('TEST_ADMIN_PASSWORD'),
    name: 'Admin User',
    role: 'ADMIN' as const,
  },
  qa: {
    id: 'qa-001',
    email: getEnv('TEST_QA_EMAIL'),
    password: getEnv('TEST_QA_PASSWORD'),
    name: 'QA Engineer',
    role: 'QA' as const,
  },
  automation: {
    id: 'auto-001',
    email: getEnv('TEST_AUTOMATION_EMAIL'),
    password: getEnv('TEST_AUTOMATION_PASSWORD'),
    name: 'Automation Engineer',
    role: 'AUTOMATION_ENGINEER' as const,
  },
  developer: {
    id: 'dev-001',
    email: getEnv('TEST_DEV_EMAIL'),
    password: getEnv('TEST_DEV_PASSWORD'),
    name: 'Developer',
    role: 'DEVELOPER' as const,
  },
  manager: {
    id: 'mgr-001',
    email: getEnv('TEST_MANAGER_EMAIL'),
    password: getEnv('TEST_MANAGER_PASSWORD'),
    name: 'Project Manager',
    role: 'MANAGER' as const,
  },
  viewer: {
    id: 'viewer-001',
    email: getEnv('TEST_VIEWER_EMAIL'),
    password: getEnv('TEST_VIEWER_PASSWORD'),
    name: 'Viewer',
    role: 'VIEWER' as const,
  },
};

export const testUsers: User[] = Object.values(users);

export const invalidUsers = [
  { email: 'invalid@test.com', password: 'wrongpass', expectedError: 'Invalid credentials' },
  { email: '', password: 'password', expectedError: 'Email is required' },
  { email: 'test@test.com', password: '', expectedError: 'Password is required' },
];

function getCredentials() {
  return {
    valid: { email: getEnv('TEST_ADMIN_EMAIL'), password: getEnv('TEST_ADMIN_PASSWORD') },
    invalid: { email: 'wrong@test.com', password: 'wrongpass' },
  };
}

export const credentials = getCredentials();
