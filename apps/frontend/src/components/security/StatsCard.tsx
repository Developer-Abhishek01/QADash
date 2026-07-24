'use client';

import { Box, Card, CardContent, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface StatsCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  bgcolor?: string;
  iconColor?: string;
}

export function StatsCard({ icon, value, label, bgcolor, iconColor }: StatsCardProps) {
  return (
    <Card sx={{ bgcolor }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2}>
          <Box sx={{ color: iconColor }}>{icon}</Box>
          <Box>
            <Typography variant="h4" fontWeight="bold" color={iconColor}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default StatsCard;
