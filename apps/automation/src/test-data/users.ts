export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'QA' | 'AUTOMATION_ENGINEER' | 'DEVELOPER' | 'MANAGER' | 'VIEWER';
}

export const users = {
  admin: {
    id: 'admin-001',
    email: 'admin@qadash.io',
    password: 'Admin@123',
    name: 'Admin User',
    role: 'ADMIN' as const,
  },
  qa: {
    id: 'qa-001',
    email: 'qa@qadash.io',
    password: 'QA@123',
    name: 'QA Engineer',
    role: 'QA' as const,
  },
  automation: {
    id: 'auto-001',
    email: 'automation@qadash.io',
    password: 'Auto@123',
    name: 'Automation Engineer',
    role: 'AUTOMATION_ENGINEER' as const,
  },
  developer: {
    id: 'dev-001',
    email: 'developer@qadash.io',
    password: 'Dev@123',
    name: 'Developer',
    role: 'DEVELOPER' as const,
  },
  manager: {
    id: 'mgr-001',
    email: 'manager@qadash.io',
    password: 'Manager@123',
    name: 'Project Manager',
    role: 'MANAGER' as const,
  },
  viewer: {
    id: 'viewer-001',
    email: 'viewer@qadash.io',
    password: 'Viewer@123',
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

export const credentials = {
  valid: { email: 'admin@qadash.io', password: 'Admin@123' },
  invalid: { email: 'wrong@test.com', password: 'wrongpass' },
};