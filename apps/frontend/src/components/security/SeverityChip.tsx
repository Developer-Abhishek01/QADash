'use client';

import { Chip } from '@mui/material';

export const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#ca8a04',
  LOW: '#65a30d',
  INFO: '#3b82f6',
};

interface SeverityChipProps {
  severity: string;
  size?: 'small' | 'medium';
}

export function SeverityChip({ severity, size = 'small' }: SeverityChipProps) {
  return (
    <Chip
      label={severity}
      size={size}
      sx={{
        bgcolor: SEVERITY_COLORS[severity] || '#6b7280',
        color: 'white',
        fontWeight: 600,
      }}
    />
  );
}

export default SeverityChip;
