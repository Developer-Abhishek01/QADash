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
  AreaChart,
  Area,
} from 'recharts';

interface MetricChartProps {
  title: string;
  data: Record<string, unknown>[];
  lines: { dataKey: string; stroke: string; name: string }[];
  xKey?: string;
  type?: 'line' | 'area';
  height?: number;
  yLabel?: string;
}

export function MetricChart({
  title,
  data,
  lines,
  xKey = 'name',
  type = 'line',
  height = 250,
  yLabel,
}: MetricChartProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={height}>
            {type === 'area' ? (
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
                <YAxis label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft' } : undefined} />
                <Tooltip />
                <Legend />
                {lines.map((l) => (
                  <Area
                    key={l.dataKey}
                    type="monotone"
                    dataKey={l.dataKey}
                    stroke={l.stroke}
                    fill={l.stroke}
                    fillOpacity={0.1}
                    name={l.name}
                  />
                ))}
              </AreaChart>
            ) : (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
                <YAxis label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft' } : undefined} />
                <Tooltip />
                <Legend />
                {lines.map((l) => (
                  <Line
                    key={l.dataKey}
                    type="monotone"
                    dataKey={l.dataKey}
                    stroke={l.stroke}
                    strokeWidth={2}
                    dot={false}
                    name={l.name}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : (
          <Box display="flex" alignItems="center" justifyContent="center" height={height}>
            <Typography color="text.secondary">No data available</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default MetricChart;
