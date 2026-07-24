'use client';

import { Chip } from '@mui/material';

export const SCAN_TYPE_LABELS: Record<string, string> = {
  FULL: 'Full Scan',
  QUICK: 'Quick Scan',
  AUTHENTICATION: 'Auth Scan',
  API: 'API Scan',
  DEPENDENCY: 'Dependency Scan',
  CUSTOM: 'Custom',
};

interface ScanTypeChipProps {
  type: string;
  size?: 'small' | 'medium';
}

export function ScanTypeChip({ type, size = 'small' }: ScanTypeChipProps) {
  return (
    <Chip
      label={SCAN_TYPE_LABELS[type] || type}
      size={size}
      variant="outlined"
    />
  );
}

export default ScanTypeChip;
