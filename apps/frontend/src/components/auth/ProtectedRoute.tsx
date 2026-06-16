'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { useAuth, UserRole } from '@/lib/auth/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: UserRole[];
  permissions?: string[];
  fallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  roles,
  permissions,
  fallback,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;

    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (roles && user && !roles.includes(user.role)) {
      router.push('/unauthorized');
      return;
    }

    if (permissions && user) {
      const hasPermission = permissions.some((p) => user.permissions.includes(p));
      if (!hasPermission) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [mounted, isLoading, isAuthenticated, user, roles, permissions, router, pathname]);

  if (!mounted || isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return fallback || null;
  }

  if (roles && user && !roles.includes(user.role)) {
    return fallback || null;
  }

  if (permissions && user) {
    const hasPermission = permissions.some((p) => user.permissions.includes(p));
    if (!hasPermission) {
      return fallback || null;
    }
  }

  return <>{children}</>;
}

export default ProtectedRoute;