'use client';

import { Refresh as RefreshIcon } from '@mui/icons-material';
import { Box, Grid, Typography, Card, CardContent, IconButton } from '@mui/material';

import { ServiceHealthCard } from './ServiceHealthCard';
import { ServiceHealth } from './types';

interface ServiceHealthGridProps {
  services: ServiceHealth[];
  loading?: boolean;
  onRefresh: () => void;
  onScale: (serviceName: string) => void;
}

export function ServiceHealthGrid({ services, loading, onRefresh, onScale }: ServiceHealthGridProps) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Service Health</Typography>
          <IconButton onClick={onRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
        <Grid container spacing={2}>
          {services.length === 0 && !loading && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" textAlign="center">No services registered</Typography>
            </Grid>
          )}
          {loading && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" textAlign="center">Loading...</Typography>
            </Grid>
          )}
          {services.map((s) => (
            <Grid item xs={12} sm={6} md={3} key={s.service}>
              <ServiceHealthCard service={s} onScale={onScale} />
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}
