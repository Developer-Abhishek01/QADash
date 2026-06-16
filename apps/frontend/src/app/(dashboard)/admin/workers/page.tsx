'use client';

import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Engineering as WorkerIcon,
  Speed as SpeedIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { PageHeader } from '@/components/common/PageHeader';
import { useState } from 'react';

export default function WorkerManagementPage() {
  const [workers] = useState<any[]>([
    { id: 'W-01', name: 'Playwright Worker 1', status: 'Online', cpu: 0, ram: 0, jobs: 0, uptime: 'Live' },
    { id: 'W-02', name: 'AI Engine Worker', status: 'Online', cpu: 0, ram: 0, jobs: 0, uptime: 'Live' },
  ]);

  return (
    <Box>
      <PageHeader
        title="Worker Management"
        subtitle="Monitor and manage execution workers and AI engines"
        actions={
          <Button variant="outlined" startIcon={<RefreshIcon />}>
            Refresh Status
          </Button>
        }
      />

      <Grid container spacing={3}>
        {workers.length > 0 ? workers.map((worker) => (
          <Grid item xs={12} md={6} lg={3} key={worker.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WorkerIcon color="primary" />
                    <Typography variant="subtitle2">{worker.id}</Typography>
                  </Box>
                  <Chip 
                    label={worker.status} 
                    size="small" 
                    color={worker.status === 'Online' ? 'success' : 'error'} 
                    variant="outlined"
                  />
                </Box>
                <Typography variant="h6" gutterBottom noWrap>{worker.name}</Typography>
                
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption">CPU Usage</Typography>
                    <Typography variant="caption">{worker.cpu}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={worker.cpu} color={worker.cpu > 80 ? 'error' : 'primary'} />
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption">RAM Usage</Typography>
                    <Typography variant="caption">{worker.ram}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={worker.ram} color={worker.ram > 80 ? 'warning' : 'primary'} />
                </Box>

                <Divider sx={{ my: 2 }} />
                
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">Jobs Processed</Typography>
                    <Typography variant="body2" fontWeight={600}>{worker.jobs}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">Uptime</Typography>
                    <Typography variant="body2" fontWeight={600}>{worker.uptime}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )) : (
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">No workers currently connected.</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Active Queue Status (BullMQ)</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <List>
                <ListItem>
                  <ListItemIcon><SpeedIcon color="primary" /></ListItemIcon>
                  <ListItemText 
                    primary="Functional Test Queue" 
                    secondary="12 jobs pending, 4 workers active" 
                  />
                  <Chip label="Processing" color="info" size="small" />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemIcon><SpeedIcon color="secondary" /></ListItemIcon>
                  <ListItemText 
                    primary="AI Analysis Queue" 
                    secondary="0 jobs pending, 1 worker active" 
                  />
                  <Chip label="Idle" size="small" />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemIcon><SpeedIcon color="warning" /></ListItemIcon>
                  <ListItemText 
                    primary="Report Generation Queue" 
                    secondary="5 jobs pending, 1 worker active" 
                  />
                  <Chip label="Processing" color="info" size="small" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: 'primary.dark', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Queue Health</Typography>
              <Typography variant="h3">99.8%</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Total jobs today: 1,240
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Average wait time: 1.2s
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
