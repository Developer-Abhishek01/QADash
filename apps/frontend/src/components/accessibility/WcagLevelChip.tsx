'use client';

import { Chip } from '@mui/material';

const LEVEL_COLORS: Record<string, string> = {
  A: '#3b82f6',
  AA: '#8b5cf6',
  AAA: '#10b981',
};

interface WcagLevelChipProps {
  level: string;
  size?: 'small' | 'medium';
}

export function WcagLevelChip({ level, size = 'small' }: WcagLevelChipProps) {
  return (
    <Chip
      label={level}
      size={size}
      variant="outlined"
      sx={{
        borderColor: LEVEL_COLORS[level],
        color: LEVEL_COLORS[level],
        fontWeight: 600,
      }}
    />
  );
}

export default WcagLevelChip;
