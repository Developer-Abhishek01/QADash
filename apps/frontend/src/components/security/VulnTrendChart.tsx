'use client';

import { Box, Card, CardContent, Typography } from '@mui/material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface TrendDataPoint {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface VulnTrendChartProps {
  data?: TrendDataPoint[];
}

export function VulnTrendChart({ data }: VulnTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Vulnerability Trend</Typography>
          <Box display="flex" alignItems="center" justifyContent="center" height={250}>
            <Typography color="text.secondary">No trend data available</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Vulnerability Trend</Typography>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="critical" stroke="#dc2626" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="high" stroke="#ea580c" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="medium" stroke="#ca8a04" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="low" stroke="#65a30d" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default VulnTrendChart;
