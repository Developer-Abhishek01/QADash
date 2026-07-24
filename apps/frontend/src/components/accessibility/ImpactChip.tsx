'use client';

import { Chip } from '@mui/material';

export const IMPACT_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  SERIOUS: '#ea580c',
  MODERATE: '#ca8a04',
  MINOR: '#65a30d',
};

interface ImpactChipProps {
  impact: string;
  size?: 'small' | 'medium';
}

export function ImpactChip({ impact, size = 'small' }: ImpactChipProps) {
  const color = IMPACT_COLORS[impact] || '#6b7280';
  return (
    <Chip
      label={impact}
      size={size}
      sx={{ bgcolor: color, color: 'white', fontWeight: 600 }}
    />
  );
}

export default ImpactChip;
