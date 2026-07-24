'use client';

import { Chip } from '@mui/material';

export const TEST_TYPE_LABELS: Record<string, string> = {
  LOAD: 'Load',
  STRESS: 'Stress',
  SPIKE: 'Spike',
  SOAK: 'Soak',
  SMOKE: 'Smoke',
};

interface TestTypeChipProps {
  type: string;
  size?: 'small' | 'medium';
}

export function TestTypeChip({ type, size = 'small' }: TestTypeChipProps) {
  return (
    <Chip
      label={TEST_TYPE_LABELS[type] || type}
      size={size}
      variant="outlined"
    />
  );
}

export default TestTypeChip;
