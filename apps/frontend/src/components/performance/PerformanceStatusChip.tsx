'use client';

import { Chip } from '@mui/material';

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  PENDING: '#6b7280',
  QUEUED: '#3b82f6',
  RUNNING: '#8b5cf6',
  COMPLETED: '#10b981',
  FAILED: '#dc2626',
  CANCELLED: '#6b7280',
};

interface PerformanceStatusChipProps {
  status: string;
  size?: 'small' | 'medium';
}

export function PerformanceStatusChip({ status, size = 'small' }: PerformanceStatusChipProps) {
  return (
    <Chip
      label={status}
      size={size}
      sx={{
        bgcolor: STATUS_COLORS[status] ? `${STATUS_COLORS[status]}20` : undefined,
        color: STATUS_COLORS[status] || undefined,
        fontWeight: 500,
      }}
    />
  );
}

export default PerformanceStatusChip;
