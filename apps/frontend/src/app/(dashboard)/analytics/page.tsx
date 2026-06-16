'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Divider,
  Button,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  PieChart as PieChartIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { PageHeader } from '@/components/common/PageHeader';

export default function AnalyticsPage() {
  const [_stats, _setStats] = useState<any>(null);

  useEffect(() => {
    // In a real app, fetch from API
    // setStats(apiResponse);
  }, []);

  return (
    <Box>
      <PageHeader 
        title="Analytics" 
        subtitle="Historical trends and deep quality insights"
        actions={
          <Button variant="outlined" startIcon={<RefreshIcon />}>Sync Data</Button>
        }
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <TimelineIcon color="primary" />
                <Typography variant="h6">Execution Success Trend</Typography>
              </Box>
              {/* Chart Placeholder */}
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f9f9f9', borderRadius: 1 }}>
                <Typography color="text.secondary">No historical data available for the selected period.</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <PieChartIcon color="secondary" />
                <Typography variant="h6">Test Coverage</Typography>
              </Box>
              <Box sx={{ py: 4 }}>
                <Box sx={{ position: 'relative', height: 200, width: 200, mx: 'auto' }}>
                  <Box sx={{ 
                    height: '100%', width: '100%', 
                    borderRadius: '50%', 
                    border: '20px solid', 
                    borderColor: '#eee',
                  }} />
                  <Typography variant="h3" sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: 700, color: '#ccc' }}>
                    0%
                  </Typography>
                </Box>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Automated</Typography>
                  <Typography variant="body1" fontWeight={600}>0</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Manual</Typography>
                  <Typography variant="body1" fontWeight={600}>0</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Defect Density by Module</Typography>
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">Run more tests to see defect density analysis.</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}