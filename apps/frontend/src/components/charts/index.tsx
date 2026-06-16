'use client';

import { Box, Typography, ToggleButtonGroup, ToggleButton, Card, CardContent } from '@mui/material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from 'recharts';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface ChartContainerProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function ChartContainer({ title, subtitle, children, actions }: ChartContainerProps) {
  return (
    <Card>
      {(title || actions) && (
        <CardContent sx={{ pb: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              {title && <Typography variant="h6">{title}</Typography>}
              {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
            </Box>
            {actions}
          </Box>
        </CardContent>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}

interface LineChartProps {
  data: any[];
  lines: { dataKey: string; color: string; name?: string }[];
  xAxisKey?: string;
  height?: number;
}

export function TrendLineChart({ data, lines, xAxisKey = 'name', height = 300 }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="divider" />
        <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} stroke="text.secondary" />
        <YAxis tick={{ fontSize: 12 }} stroke="text.secondary" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 8,
          }}
        />
        <Legend />
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.color}
            name={line.name || line.dataKey}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

interface AreaChartProps {
  data: any[];
  areas: { dataKey: string; color: string; name?: string }[];
  xAxisKey?: string;
  height?: number;
  stacked?: boolean;
}

export function TrendAreaChart({ data, areas, xAxisKey = 'name', height = 300, stacked }: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="divider" />
        <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} stroke="text.secondary" />
        <YAxis tick={{ fontSize: 12 }} stroke="text.secondary" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 8,
          }}
        />
        <Legend />
        {areas.map((area) => (
          <Area
            key={area.dataKey}
            type="monotone"
            dataKey={area.dataKey}
            stackId={stacked ? 'stack' : undefined}
            stroke={area.color}
            fill={area.color}
            name={area.name || area.dataKey}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface BarChartProps {
  data: any[];
  bars: { dataKey: string; color: string; name?: string }[];
  xAxisKey?: string;
  height?: number;
  horizontal?: boolean;
}

export function TrendBarChart({ data, bars, xAxisKey = 'name', height = 300, horizontal }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'}>
        <CartesianGrid strokeDasharray="3 3" stroke="divider" />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 12 }} stroke="text.secondary" />
            <YAxis dataKey={xAxisKey} type="category" tick={{ fontSize: 12 }} stroke="text.secondary" width={80} />
          </>
        ) : (
          <>
            <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} stroke="text.secondary" />
            <YAxis tick={{ fontSize: 12 }} stroke="text.secondary" />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 8,
          }}
        />
        <Legend />
        {bars.map((bar) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            fill={bar.color}
            name={bar.name || bar.dataKey}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

interface PieChartProps {
  data: { name: string; value: number }[];
  height?: number;
  innerRadius?: number;
  showLegend?: boolean;
}

export function DistributionPieChart({
  data,
  height = 300,
  innerRadius = 0,
  showLegend = true,
}: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={innerRadius ? 80 : 100}
          fill="#8884d8"
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        {showLegend && <Legend />}
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface GaugeChartProps {
  value: number;
  max?: number;
  label?: string;
  color?: string;
}

export function GaugeChart({ value, max = 100, label, color = '#2563eb' }: GaugeChartProps) {
  const percentage = (value / max) * 100;

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', width: 200, height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="70%"
          outerRadius="100%"
          barSize={15}
          data={[{ value: percentage, fill: color }]}
          startAngle={180}
          endAngle={0}
        >
          <RadialBar background dataKey="value" cornerRadius={10} />
        </RadialBarChart>
      </ResponsiveContainer>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}
      >
        <Typography variant="h4" fontWeight={700}>
          {value.toFixed(1)}%
        </Typography>
        {label && (
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

interface TimeRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options?: string[];
}

export function TimeRangeSelector({ value, onChange, options = ['24h', '7d', '30d', '90d'] }: TimeRangeSelectorProps) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_, newValue) => newValue && onChange(newValue)}
      size="small"
    >
      {options.map((option) => (
        <ToggleButton key={option} value={option}>
          {option}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}