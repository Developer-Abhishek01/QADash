'use client';

import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Event as SprintIcon,
} from '@mui/icons-material';
import { PageHeader } from '@/components/common/PageHeader';
import { useState, useEffect } from 'react';

export default function SprintsPage() {
  const [sprints, setSprints] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('qadash_sprints');
    if (saved) {
      setSprints(JSON.parse(saved));
    }
  }, []);

  return (
    <Box>
      <PageHeader
        title="Sprint Planning"
        subtitle="Manage testing cycles, sprints and release readiness"
        actions={
          <Button variant="contained" startIcon={<AddIcon />}>
            Create Sprint
          </Button>
        }
      />

      <Grid container spacing={3}>
        {sprints.length > 0 ? sprints.map((sprint: any) => (
          <Grid item xs={12} md={6} key={sprint.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SprintIcon color="primary" />
                    <Typography variant="subtitle2">{sprint.id}</Typography>
                  </Box>
                  <Chip 
                    label={sprint.status} 
                    size="small" 
                    color={sprint.status === 'Active' ? 'primary' : sprint.status === 'Completed' ? 'success' : 'default'} 
                  />
                </Box>
                <Typography variant="h6" gutterBottom>{sprint.name}</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {sprint.start} to {sprint.end}
                </Typography>
                
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption">Testing Progress</Typography>
                    <Typography variant="caption">{sprint.progress}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={sprint.progress} />
                </Box>

                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Total Tests</Typography>
                    <Typography variant="body1" fontWeight={600}>{sprint.tests}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Open Bugs</Typography>
                    <Typography variant="body1" fontWeight={600} color="error.main">{sprint.bugs}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Ready</Typography>
                    <Typography variant="body1" fontWeight={600} color="success.main">
                      {Math.round((sprint.tests * sprint.progress) / 100)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )) : (
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">No active sprints. Create one to get started.</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
