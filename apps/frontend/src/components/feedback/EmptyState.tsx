'use client';

import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { FolderOpen, Search, Add, Error as ErrorIcon, Warning, Info } from '@mui/icons-material';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'search' | 'error' | 'warning' | 'info';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
}: EmptyStateProps) {
  const variantConfig = {
    default: { icon: <FolderOpen />, color: 'text.secondary' as const },
    search: { icon: <Search />, color: 'text.secondary' as const },
    error: { icon: <ErrorIcon />, color: 'error.main' as const },
    warning: { icon: <Warning />, color: 'warning.main' as const },
    info: { icon: <Info />, color: 'info.main' as const },
  };

  const config = variantConfig[variant];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 4,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          p: 3,
          borderRadius: '50%',
          bgcolor: 'background.default',
          mb: 3,
        }}
      >
        <Box sx={{ fontSize: 48, color: config.color }}>
          {icon || config.icon}
        </Box>
      </Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
          {description}
        </Typography>
      )}
      {action && (
        <Button variant="contained" startIcon={<Add />} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Box>
  );
}

interface NoDataProps {
  message?: string;
}

export function NoData({ message = 'No data available' }: NoDataProps) {
  return (
    <EmptyState
      icon={<FolderOpen />}
      title="No Data"
      description={message}
    />
  );
}

interface NotFoundProps {
  title?: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}

export function NotFound({
  title = 'Not Found',
  message = 'The resource you are looking for does not exist.',
  action,
}: NotFoundProps) {
  return (
    <EmptyState
      icon={<Search />}
      title={title}
      description={message}
      action={action}
      variant="search"
    />
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={<ErrorIcon />}
      title={title}
      description={message}
      action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
      variant="error"
    />
  );
}

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

interface SkeletonListProps {
  rows?: number;
}

export function SkeletonList({ rows = 5 }: SkeletonListProps) {
  return (
    <Box>
      {Array.from({ length: rows }).map((_, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              bgcolor: 'grey.200',
            }}
          />
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{
                height: 16,
                width: '60%',
                bgcolor: 'grey.200',
                borderRadius: 1,
                mb: 1,
              }}
            />
            <Box
              sx={{
                height: 12,
                width: '40%',
                bgcolor: 'grey.100',
                borderRadius: 1,
              }}
            />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

interface SkeletonCardProps {
  variant?: 'stats' | 'chart' | 'table';
}

export function SkeletonCard({ variant = 'stats' }: SkeletonCardProps) {
  if (variant === 'stats') {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box>
              <Box
                sx={{
                  height: 14,
                  width: 80,
                  bgcolor: 'grey.200',
                  borderRadius: 1,
                  mb: 1,
                }}
              />
              <Box
                sx={{
                  height: 28,
                  width: 100,
                  bgcolor: 'grey.200',
                  borderRadius: 1,
                }}
              />
              <Box
                sx={{
                  height: 12,
                  width: 60,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  mt: 1,
                }}
              />
            </Box>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'grey.200',
              }}
            />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'chart') {
    return (
      <Card>
        <CardContent>
          <Box
            sx={{
              height: 200,
              bgcolor: 'grey.100',
              borderRadius: 1,
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return <SkeletonList />;
}

interface PageSkeletonProps {
  type?: 'dashboard' | 'list' | 'detail';
}

export function PageSkeleton({ type = 'dashboard' }: PageSkeletonProps) {
  if (type === 'dashboard') {
    return (
      <Box sx={{ p: 3 }}>
        <Box
          sx={{
            height: 32,
            width: 200,
            bgcolor: 'grey.200',
            borderRadius: 1,
            mb: 3,
          }}
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, mb: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} variant="stats" />
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
          <SkeletonCard variant="chart" />
          <SkeletonCard variant="chart" />
        </Box>
      </Box>
    );
  }

  if (type === 'list') {
    return (
      <Box sx={{ p: 3 }}>
        <Box
          sx={{
            height: 32,
            width: 200,
            bgcolor: 'grey.200',
            borderRadius: 1,
            mb: 3,
          }}
        />
        <SkeletonCard variant="table" />
      </Box>
    );
  }

  return <SkeletonList />;
}