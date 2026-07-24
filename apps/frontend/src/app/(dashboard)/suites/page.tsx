'use client';

import { Folder as SuiteIcon, Add as AddIcon } from '@mui/icons-material';
import { Box, Grid, Card, CardContent, Typography, Chip, Button, Divider } from '@mui/material';
import { useQuery } from '@tanstack/react-query';

import { PageHeader } from '@/components/common/PageHeader';
import { Loading } from '@/components/feedback/Loading';
import { apiClient } from '@/lib/api/client';

export default function TestSuitesPage() {
  const { data: suites, isLoading } = useQuery({
    queryKey: ['suites'],
    queryFn: () => apiClient.get<any[]>('suites'),
  });

  if (isLoading) return <Loading />;

  return (
    <Box>
      <PageHeader
        title="Test Suites"
        subtitle="Organize and manage your test suites"
        actions={
          <Button variant="contained" startIcon={<AddIcon />}>Create Suite</Button>
        }
      />

      <Grid container spacing={3}>
        {suites && suites.length > 0 ? suites.map((suite: any) => (
          <Grid item xs={12} md={6} lg={4} key={suite.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SuiteIcon color="primary" />
                    <Typography variant="h6">{suite.name}</Typography>
                  </Box>
                  <Chip label={suite.status ?? 'Active'} size="small" color={suite.status === 'Active' ? 'success' : 'default'} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {suite.description ?? 'No description'}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary" display="block">Tests</Typography>
                    <Typography variant="body1" fontWeight={600}>{suite.testCount ?? suite.tests ?? 0}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary" display="block">Passed</Typography>
                    <Typography variant="body1" fontWeight={600} color="success.main">{suite.passed ?? 0}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary" display="block">Failed</Typography>
                    <Typography variant="body1" fontWeight={600} color="error.main">{suite.failed ?? 0}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )) : (
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <SuiteIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">No test suites found. Create your first suite to get started.</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
