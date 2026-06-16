'use client';

import { Box, CircularProgress, Backdrop, Typography, Skeleton } from '@mui/material';

interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  message?: string;
}

export function Loading({ size = 'medium', fullScreen = false, message }: LoadingProps) {
  const sizeMap = { small: 20, medium: 40, large: 60 };

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <CircularProgress size={sizeMap[size]} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );

  if (fullScreen) {
    return (
      <Backdrop open sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: 'background.default' }}>
        {content}
      </Backdrop>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
      {content}
    </Box>
  );
}

export default Loading;

export function PageLoading() {
  return (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={100} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={150} />
    </Box>
  );
}

export function TableLoading({ rows = 5 }: { rows?: number }) {
  return (
    <Box>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} variant="rectangular" height={52} sx={{ mb: 1 }} />
      ))}
    </Box>
  );
}

export function CardLoading() {
  return (
    <Box sx={{ p: 2 }}>
      <Skeleton variant="text" width="30%" height={24} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="60%" height={20} />
      <Skeleton variant="rectangular" height={100} sx={{ mt: 2 }} />
    </Box>
  );
}