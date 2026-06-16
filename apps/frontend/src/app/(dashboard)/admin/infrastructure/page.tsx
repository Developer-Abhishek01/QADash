'use client';

import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Storage as DBIcon,
  Memory as RedisIcon,
  CloudQueue as S3Icon,
  Search as SearchIcon,
  Psychology as AIIcon,
  CheckCircle as OnlineIcon,

} from '@mui/icons-material';
import { PageHeader } from '@/components/common/PageHeader';

const services = [
  { name: 'PostgreSQL Database', status: 'Healthy', latency: '12ms', icon: <DBIcon color="primary" /> },
  { name: 'Redis Cache & Queue', status: 'Healthy', latency: '2ms', icon: <RedisIcon color="error" /> },
  { name: 'Elasticsearch (Logs)', status: 'Healthy', latency: '45ms', icon: <SearchIcon color="warning" /> },
  { name: 'MinIO (Object Storage)', status: 'Healthy', latency: '8ms', icon: <S3Icon color="info" /> },
  { name: 'AI Inference Engine', status: 'Healthy', latency: '120ms', icon: <AIIcon color="secondary" /> },
];

export default function InfrastructurePage() {
  return (
    <Box>
      <PageHeader
        title="Infrastructure Health"
        subtitle="Real-time monitoring of platform services and database clusters"
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Service Status</Typography>
              <List>
                {services.map((service, index) => (
                  <Box key={service.name}>
                    <ListItem>
                      <ListItemIcon>{service.icon}</ListItemIcon>
                      <ListItemText 
                        primary={service.name} 
                        secondary={`Latency: ${service.latency}`} 
                      />
                      <Chip 
                        icon={<OnlineIcon />} 
                        label={service.status} 
                        color="success" 
                        variant="outlined" 
                        size="small" 
                      />
                    </ListItem>
                    {index < services.length - 1 && <Divider component="li" />}
                  </Box>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>System Uptime</Typography>
                  <Typography variant="h3">99.99%</Typography>
                  <Typography variant="body2">Last 30 days</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Storage Usage</Typography>
                  <Typography variant="h4">1.2 TB / 5 TB</Typography>
                  <Box sx={{ mt: 2, height: 8, bgcolor: 'divider', borderRadius: 4, overflow: 'hidden' }}>
                    <Box sx={{ width: '24%', height: '100%', bgcolor: 'primary.main' }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    24% capacity used
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}
