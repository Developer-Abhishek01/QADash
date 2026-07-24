'use client';

import { Box, Grid, Typography, Card, CardContent } from '@mui/material';

import { QueueStats } from './types';

interface QueueStatsPanelProps {
  stats: QueueStats | null;
  loading?: boolean;
}

export function QueueStatsPanel({ stats, loading }: QueueStatsPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary">Loading stats...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary">Queue stats unavailable</Typography>
        </CardContent>
      </Card>
    );
  }

  const items = [
    { label: 'Waiting', value: stats.waiting, color: 'info.main' },
    { label: 'Active', value: stats.active, color: 'primary.main' },
    { label: 'Completed', value: stats.completed, color: 'success.main' },
    { label: 'Failed', value: stats.failed, color: 'error.main' },
    { label: 'Delayed', value: stats.delayed, color: 'warning.main' },
    { label: 'Total', value: stats.total, color: 'text.primary' },
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Queue Statistics</Typography>
        <Grid container spacing={1}>
          {items.map((item) => (
            <Grid item xs={4} sm={2} key={item.label}>
              <Box sx={{ textAlign: 'center', p: 1, borderRadius: 1, bgcolor: 'background.default' }}>
                <Typography variant="h5" fontWeight={700} sx={{ color: item.color }}>{item.value}</Typography>
                <Typography variant="caption" color="text.secondary">{item.label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}
