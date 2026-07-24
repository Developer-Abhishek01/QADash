'use client';

import { Box, Typography, Chip } from '@mui/material';

import { ServiceHealth } from './types';

interface ServiceHealthCardProps {
  service: ServiceHealth;
  onScale?: (serviceName: string) => void;
}

export function ServiceHealthCard({ service, onScale }: ServiceHealthCardProps) {
  const statusColor = service.status === 'healthy' ? 'success' : service.status === 'degraded' ? 'warning' : 'error';

  return (
    <Box
      onClick={() => onScale?.(service.service)}
      sx={{
        p: 2,
        borderRadius: 1,
        cursor: onScale ? 'pointer' : 'default',
        bgcolor: `${statusColor}.light`,
        border: '1px solid',
        borderColor: `${statusColor}.main`,
        transition: 'transform 0.15s, box-shadow 0.15s',
        '&:hover': onScale ? { transform: 'scale(1.03)', boxShadow: 2 } : undefined,
      }}
    >
      <Typography variant="subtitle2" fontWeight={600}>{service.service}</Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
        <Chip label={service.status} size="small" color={statusColor} />
        <Typography variant="caption" color="text.secondary">{service.latency}ms</Typography>
      </Box>
      {service.version && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          v{service.version}
        </Typography>
      )}
    </Box>
  );
}
