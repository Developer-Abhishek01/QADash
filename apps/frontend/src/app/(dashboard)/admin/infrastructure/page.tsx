'use client';

import {
  Storage as DBIcon,
  Memory as RedisIcon,
  CloudQueue as S3Icon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Wifi as NetworkIcon,
  Computer as CpuIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
} from '@mui/material';

import { PageHeader } from '@/components/common/PageHeader';
import { Loading } from '@/components/feedback/Loading';
import { HealthStatusChip, ResourceGauge, StatsCard } from '@/components/infrastructure';
import { useInfrastructureHealth, useDetailedHealth, useSystemInfo } from '@/lib/infrastructure/hooks';

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  database: <DBIcon color="primary" />,
  redis: <RedisIcon color="error" />,
  disk: <S3Icon color="info" />,
  memory: <MemoryIcon color="warning" />,
  cpu: <CpuIcon color="secondary" />,
  network: <NetworkIcon color="success" />,
};

const SERVICE_LABELS: Record<string, string> = {
  database: 'PostgreSQL Database',
  redis: 'Redis Cache & Queue',
  disk: 'Disk Storage',
  memory: 'System Memory',
  cpu: 'CPU',
  network: 'Network',
};

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export default function InfrastructurePage() {
  const { data: infra, isLoading: infraLoading, refetch: refetchInfra } = useInfrastructureHealth();
  const { data: detailed, isLoading: detailedLoading, refetch: refetchDetailed } = useDetailedHealth();
  const { data: systemInfo, isLoading: sysLoading } = useSystemInfo();

  const isLoading = infraLoading || detailedLoading || sysLoading;
  const checks = detailed?.checks;

  const handleRefresh = () => {
    refetchInfra();
    refetchDetailed();
  };

  if (isLoading) return <Loading />;

  return (
    <Box>
      <PageHeader
        title="Infrastructure Health"
        subtitle="Real-time monitoring of platform services, database clusters, and system resources"
        actions={
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh}>
            Refresh
          </Button>
        }
      />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Storage"
            icon={<StorageIcon color="primary" />}
            stats={[
              { label: 'Status', value: infra?.storage?.status ?? '-', color: infra?.storage?.status === 'healthy' ? 'success.main' : 'error.main' },
              { label: 'Usage', value: infra?.storage?.used != null ? `${infra.storage.used}%` : '-' },
              { label: 'Available', value: infra?.storage?.available != null ? `${infra.storage.available}%` : '-' },
            ]}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Memory"
            icon={<MemoryIcon color="warning" />}
            stats={[
              { label: 'Status', value: infra?.memory?.status ?? '-', color: infra?.memory?.status === 'healthy' ? 'success.main' : 'error.main' },
              { label: 'Used', value: infra?.memory?.usedPercent != null ? `${infra.memory.usedPercent}%` : '-' },
              { label: 'System Total', value: systemInfo?.memory?.total ?? '-' },
            ]}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Network"
            icon={<NetworkIcon color="success" />}
            stats={[
              { label: 'Status', value: infra?.network?.status ?? '-', color: infra?.network?.status === 'healthy' ? 'success.main' : 'error.main' },
              { label: 'Latency', value: infra?.network?.latency != null ? `${infra.network.latency}ms` : '-' },
            ]}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: detailed?.status === 'unhealthy' ? 'error.dark' : detailed?.status === 'degraded' ? 'warning.dark' : 'success.dark', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Overall Status</Typography>
              <Typography variant="h4" sx={{ textTransform: 'capitalize' }}>{detailed?.status ?? '-'}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                {detailed?.summary?.healthy ?? 0}/{detailed?.summary?.total ?? 0} services healthy
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Uptime: {systemInfo?.uptime ? formatUptime(systemInfo.uptime) : '-'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mb: 2 }}>Service Status</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <List>
                {checks ? Object.entries(checks).map(([key, check]) => (
                  <Box key={key}>
                    <ListItem>
                      <ListItemIcon>{SERVICE_ICONS[key]}</ListItemIcon>
                      <ListItemText
                        primary={SERVICE_LABELS[key] ?? key}
                        secondary={
                          check.latency != null
                            ? `Latency: ${check.latency}ms`
                            : key === 'cpu' && 'load' in check && Array.isArray((check as { load?: number[] }).load)
                            ? `Load: ${(check as { load?: number[] }).load!.join(', ')}`
                            : check.error
                            ? `Error: ${check.error}`
                            : undefined
                        }
                      />
                      <HealthStatusChip status={check.status} />
                    </ListItem>
                    <Divider component="li" />
                  </Box>
                )) : (
                  <ListItem>
                    <ListItemText primary="No health data available" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>System Information</Typography>
                  {systemInfo ? (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Platform</Typography>
                        <Typography variant="body2">{systemInfo.platform} {systemInfo.arch}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Node.js</Typography>
                        <Typography variant="body2">{systemInfo.nodeVersion}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">CPU</Typography>
                        <Typography variant="body2">{systemInfo.cpu.cores} cores</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">CPU Model</Typography>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>{systemInfo.cpu.model}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Process Memory</Typography>
                        <Typography variant="body2">{systemInfo.process.memory}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Process Uptime</Typography>
                        <Typography variant="body2">{formatUptime(systemInfo.process.uptime)}</Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">Not available</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {infra?.storage && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Storage Usage</Typography>
                    <ResourceGauge
                      label="Disk"
                      value={infra.storage.used ?? 0}
                      subtitle={`${infra.storage.available ?? 0}% available`}
                    />
                  </CardContent>
                </Card>
              </Grid>
            )}

            {systemInfo?.memory && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Memory Usage</Typography>
                    <ResourceGauge
                      label="RAM"
                      value={systemInfo.memory.usedPercent}
                      subtitle={`${systemInfo.memory.used} / ${systemInfo.memory.total}`}
                    />
                    <Box sx={{ mt: 2 }}>
                      <ResourceGauge
                        label="CPU Load"
                        value={Math.round((systemInfo.cpu.load[0] / systemInfo.cpu.cores) * 100)}
                        subtitle={`Load: ${systemInfo.cpu.load.join(', ')}`}
                        errorThreshold={80}
                        warningThreshold={60}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}
