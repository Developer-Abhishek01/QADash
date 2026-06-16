import { test } from '@playwright/test';
import { ApiClient } from '../api-client';
import { ApiAssertions } from '../assertions/api.assertions';
import { Logger } from '../../utils/logger';

const logger = new Logger('AuthApiTest');
const api = new ApiClient(
  { baseURL: process.env.API_URL || 'http://localhost:3001/api/v1', timeout: 30000, retries: 2 },
  logger
);
const assertions = new ApiAssertions(logger);

test.describe('Authentication API', () => {
  test.beforeAll(async () => {
    await api.init();
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('should login with valid credentials', async () => {
    const response = await api.post('/auth/login', {
      email: 'admin@qadash.io',
      password: 'Admin@123',
    });

    assertions.statusEquals(response, 200);
    assertions.hasProperty(response, 'accessToken');
    assertions.hasProperty(response, 'refreshToken');
    assertions.hasProperty(response, 'user');
    assertions.propertyEquals(response, 'user.email', 'admin@qadash.io');
  });

  test('should fail login with invalid credentials', async () => {
    const response = await api.post('/auth/login', {
      email: 'invalid@test.com',
      password: 'wrongpass',
    });

    assertions.statusClientError(response);
    assertions.bodyContains(response, 'Invalid credentials');
  });

  test('should fail login with missing email', async () => {
    const response = await api.post('/auth/login', {
      password: 'password',
    });

    assertions.statusClientError(response);
  });

  test('should register new user', async () => {
    const timestamp = Date.now();
    const response = await api.post('/auth/register', {
      email: `test${timestamp}@qadash.io`,
      password: 'Test@123456',
      name: 'Test User',
    });

    assertions.statusSuccess(response);
    assertions.hasProperty(response, 'accessToken');
  });

  test('should refresh token', async () => {
    const loginResponse = await api.post('/auth/login', {
      email: 'admin@qadash.io',
      password: 'Admin@123',
    });

    const refreshToken = (loginResponse.body as any).refreshToken;
    
    const refreshResponse = await api.post('/auth/refresh', {
      refreshToken,
    });

    assertions.statusSuccess(refreshResponse);
    assertions.hasProperty(refreshResponse, 'accessToken');
  });

  test('should logout', async () => {
    const loginResponse = await api.post('/auth/login', {
      email: 'admin@qadash.io',
      password: 'Admin@123',
    });

    const token = (loginResponse.body as any).accessToken;
    await api.setAuthToken(token);

    const logoutResponse = await api.post('/auth/logout', {});

    assertions.statusSuccess(logoutResponse);
  });
});

test.describe('User API', () => {
  let authToken: string;

  test.beforeAll(async () => {
    await api.init();
    const loginResponse = await api.post('/auth/login', {
      email: 'admin@qadash.io',
      password: 'Admin@123',
    });
    authToken = (loginResponse.body as any).accessToken;
    await api.setAuthToken(authToken);
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('should get current user profile', async () => {
    const response = await api.get('/auth/me');

    assertions.statusSuccess(response);
    assertions.hasProperty(response, 'email');
    assertions.hasProperty(response, 'name');
    assertions.hasProperty(response, 'role');
  });

  test('should get all users (admin only)', async () => {
    const response = await api.get('/users');

    assertions.statusSuccess(response);
    assertions.hasProperty(response, '');
    assertions.arrayLength(response, '', 1);
  });

  test('should update profile', async () => {
    const response = await api.put('/auth/profile', {
      name: 'Updated Name',
    });

    assertions.statusSuccess(response);
    assertions.propertyEquals(response, 'name', 'Updated Name');
  });

  test('should change password', async () => {
    const response = await api.post('/auth/change-password', {
      currentPassword: 'Admin@123',
      newPassword: 'NewPass@123',
    });

    assertions.statusSuccess(response);
  });
});

test.describe('Projects API', () => {
  let authToken: string;

  test.beforeAll(async () => {
    await api.init();
    const loginResponse = await api.post('/auth/login', {
      email: 'admin@qadash.io',
      password: 'Admin@123',
    });
    authToken = (loginResponse.body as any).accessToken;
    await api.setAuthToken(authToken);
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('should get all projects', async () => {
    const response = await api.get('/projects');

    assertions.statusSuccess(response);
  });

  test('should create project', async () => {
    const response = await api.post('/projects', {
      name: 'Test Project',
      description: 'API Test Project',
    });

    assertions.statusSuccess(response);
    assertions.propertyEquals(response, 'name', 'Test Project');
  });

  test('should get project by id', async () => {
    const createResponse = await api.post('/projects', {
      name: 'Project for GET',
    });
    const projectId = (createResponse.body as any).id;

    const response = await api.get(`/projects/${projectId}`);

    assertions.statusSuccess(response);
    assertions.propertyEquals(response, 'id', projectId);
  });

  test('should update project', async () => {
    const createResponse = await api.post('/projects', {
      name: 'Project to Update',
    });
    const projectId = (createResponse.body as any).id;

    const response = await api.put(`/projects/${projectId}`, {
      name: 'Updated Project Name',
    });

    assertions.statusSuccess(response);
    assertions.propertyEquals(response, 'name', 'Updated Project Name');
  });

  test('should delete project', async () => {
    const createResponse = await api.post('/projects', {
      name: 'Project to Delete',
    });
    const projectId = (createResponse.body as any).id;

    const response = await api.delete(`/projects/${projectId}`);

    assertions.statusSuccess(response);
  });

  test('should filter projects by status', async () => {
    const response = await api.get('/projects', {
      queryParams: { status: 'ACTIVE' },
    });

    assertions.statusSuccess(response);
  });
});