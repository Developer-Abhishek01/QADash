'use client';

import { Box, Card, CardContent, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface MetricCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  subtitle?: string;
  color?: string;
  bgcolor?: string;
}

export function MetricCard({ icon, value, label, subtitle, color, bgcolor }: MetricCardProps) {
  return (
    <Card sx={{ bgcolor }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2}>
          <Box sx={{ color }}>{icon}</Box>
          <Box>
            <Typography variant="h4" fontWeight="bold" color={color}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default MetricCard;
