'use client';

import { Chip, ChipProps } from '@mui/material';

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'default' | 'primary' | 'secondary';

interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'small' | 'medium';
}

const statusMap: Record<string, { variant: StatusVariant; label: string }> = {
  passed: { variant: 'success', label: 'Passed' },
  success: { variant: 'success', label: 'Success' },
  completed: { variant: 'success', label: 'Completed' },
  active: { variant: 'success', label: 'Active' },
  running: { variant: 'primary', label: 'Running' },
  pending: { variant: 'info', label: 'Pending' },
  queued: { variant: 'info', label: 'Queued' },
  failed: { variant: 'error', label: 'Failed' },
  error: { variant: 'error', label: 'Error' },
  cancelled: { variant: 'warning', label: 'Cancelled' },
  skipped: { variant: 'default', label: 'Skipped' },
  draft: { variant: 'default', label: 'Draft' },
  archived: { variant: 'default', label: 'Archived' },
  inactive: { variant: 'default', label: 'Inactive' },
  high: { variant: 'error', label: 'High' },
  medium: { variant: 'warning', label: 'Medium' },
  low: { variant: 'info', label: 'Low' },
};

export function StatusBadge({ status, label, size = 'small' }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  const config = statusMap[normalizedStatus] || { variant: 'default', label: status };

  return (
    <Chip
      label={label || config.label}
      color={config.variant}
      size={size}
      sx={{ fontWeight: 500 }}
    />
  );
}

export function getStatusColor(status: string): ChipProps['color'] {
  const normalizedStatus = status.toLowerCase();
  const config = statusMap[normalizedStatus];
  return config?.variant as ChipProps['color'] || 'default';
}