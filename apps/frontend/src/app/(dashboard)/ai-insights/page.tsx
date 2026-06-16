'use client';

import { Box, Card, CardContent, Typography } from '@mui/material';
import { PageHeader } from '@/components/common/PageHeader';

export default function AIInsightsPage() {
  return (
    <Box>
      <PageHeader title="AI Insights" subtitle="AI-powered test analysis and predictions" />
      <Card>
        <CardContent>
          <Typography>AI Insights module - Predictive analysis, flaky test detection, recommendations.</Typography>
        </CardContent>
      </Card>
    </Box>
  );
}