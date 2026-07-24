'use client';

import { Box, Chip } from '@mui/material';

interface FindingBadgeProps {
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
}

export function FindingBadge({ critical = 0, high = 0, medium = 0, low = 0 }: FindingBadgeProps) {
  return (
    <Box display="flex" gap={0.5}>
      {critical > 0 && (
        <Chip label={`${critical}C`} size="small" sx={{ bgcolor: '#dc2626', color: 'white' }} />
      )}
      {high > 0 && (
        <Chip label={`${high}H`} size="small" sx={{ bgcolor: '#ea580c', color: 'white' }} />
      )}
      {medium > 0 && (
        <Chip label={`${medium}M`} size="small" sx={{ bgcolor: '#ca8a04', color: 'white' }} />
      )}
      {low > 0 && (
        <Chip label={`${low}L`} size="small" sx={{ bgcolor: '#65a30d', color: 'white' }} />
      )}
    </Box>
  );
}

export default FindingBadge;
