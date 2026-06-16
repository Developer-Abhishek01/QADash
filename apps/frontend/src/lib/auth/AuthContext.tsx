'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/client';

export enum UserRole {
  ADMIN = 'ADMIN',
  QA_LEAD = 'QA_LEAD',
  QA_ENGINEER = 'QA_ENGINEER',
  AUTOMATION_ENGINEER = 'AUTOMATION_ENGINEER',
  DEVELOPER = 'DEVELOPER',
  MANAGER = 'MANAGER',
  VIEWER = 'VIEWER',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  permissions: string[];
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string, mockRole?: UserRole) => Promise<void>;
  register: (data: { email: string; password: string; name: string; role?: UserRole }) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: ['*'],
  QA_LEAD: [
    'project:read', 'test:create', 'test:read', 'test:update', 'test:delete', 'test:run', 'test:approve',
    'sprint:create', 'sprint:read', 'sprint:update', 'report:read', 'bug:read', 'bug:update'
  ],
  QA_ENGINEER: [
    'project:read', 'test:create', 'test:read', 'test:update', 'test:run',
    'report:read', 'bug:create', 'bug:read', 'bug:update'
  ],
  AUTOMATION_ENGINEER: [
    'project:read', 'test:read', 'test:update', 'test:run',
    'framework:manage', 'locator:manage', 'ai:train'
  ],
  DEVELOPER: [
    'project:read', 'test:read', 'bug:read', 'bug:update', 'retest:trigger'
  ],
  MANAGER: [
    'project:read', 'report:read', 'analytics:read', 'release:approve'
  ],
  VIEWER: [
    'project:read', 'report:read'
  ],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const checkAuth = useCallback(() => {
    try {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('accessToken');
      if (userStr && token) {
        const user = JSON.parse(userStr);
        setState({ user, isAuthenticated: true, isLoading: false, error: null });
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string, mockRole?: UserRole) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await authApi.login(email, password);
      
      if (!response || !response.user) {
        throw new Error('Invalid response from server: Missing user data');
      }

      const user: User = {
        ...response.user,
        role: mockRole || response.user.role,
        permissions: ROLE_PERMISSIONS[(mockRole || response.user.role) as UserRole] || [],
      };

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      setState({ user, isAuthenticated: true, isLoading: false, error: null });
      
      // Force a small delay to ensure state is committed before redirect
      setTimeout(() => {
        router.replace('/dashboard');
      }, 100);
    } catch (error: any) {
      console.error('Production-Level Login Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL
        }
      });
      
      let message = 'Login failed. Please try again.';
      
      if (error.code === 'ERR_NETWORK') {
        message = 'Connection Refused: Backend server is not responding. Please ensure "run.bat" is running and the Backend window says "Nest application successfully started".';
      } else if (error.code === 'ECONNABORTED') {
        message = 'Request Timeout: The server is taking too long to respond. Check your database connection.';
      } else if (error.response?.status === 404) {
        message = 'API Endpoint not found. Verify backend routing configuration.';
      } else if (error.response?.status === 401) {
        message = 'Invalid email or password.';
      } else if (error.response?.data?.message) {
        message = Array.isArray(error.response.data.message) 
          ? error.response.data.message[0] 
          : error.response.data.message;
      }
      
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      throw new Error(message);
    }
  };

  const register = async (data: { email: string; password: string; name: string; role?: UserRole }) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await authApi.register(data);
      await login(data.email, data.password);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Registration failed';
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      throw new Error(message);
    }
  };

  const logout = async () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
    router.push('/login');
  };

  const refreshToken = async () => {};

  const hasPermission = (permission: string): boolean => {
    if (!state.user) return false;
    if (state.user.permissions.includes('*')) return true;
    return state.user.permissions.includes(permission);
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!state.user) return false;
    return roles.includes(state.user.role);
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshToken, hasPermission, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}