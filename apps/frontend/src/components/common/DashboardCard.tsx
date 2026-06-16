'use client';

import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  LinearProgress,
} from '@mui/material';
import { MoreVert, TrendingUp, TrendingDown } from '@mui/icons-material';
import { useState } from 'react';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; direction: 'up' | 'down' };
  icon?: ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'primary',
  loading,
}: StatCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ animate: 'pulse' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <Box sx={{ height: 16, width: '40%', bgcolor: 'grey.200', borderRadius: 1 }} />
            </Typography>
            <Typography variant="h4">
              <Box sx={{ height: 32, width: '60%', bgcolor: 'grey.200', borderRadius: 1 }} />
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                {trend.direction === 'up' ? (
                  <TrendingUp fontSize="small" color="success" />
                ) : (
                  <TrendingDown fontSize="small" color="error" />
                )}
                <Typography
                  variant="body2"
                  color={trend.direction === 'up' ? 'success.main' : 'error.main'}
                >
                  {trend.value}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  vs last period
                </Typography>
              </Box>
            )}
          </Box>
          {icon && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: `${color}.light`,
                color: `${color}.main`,
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

interface DashboardCardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  menuItems?: { label: string; onClick: () => void }[];
}

export function DashboardCard({
  title,
  subtitle,
  action,
  children,
  loading,
  menuItems,
}: DashboardCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <Card>
      {(title || menuItems) && (
        <CardHeader
          title={
            <Box>
              {title && <Typography variant="h6">{title}</Typography>}
              {subtitle && (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
          }
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {action}
              {menuItems && (
                <>
                  <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
                    <MoreVert fontSize="small" />
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => setAnchorEl(null)}
                  >
                    {menuItems.map((item, index) => (
                      <MenuItem key={index} onClick={() => { item.onClick(); setAnchorEl(null); }}>
                        {item.label}
                      </MenuItem>
                    ))}
                  </Menu>
                </>
              )}
            </Box>
          }
          sx={{ pb: 1 }}
        />
      )}
      <CardContent sx={{ pt: title ? 0 : 2 }}>
        {loading ? <LinearProgress /> : children}
      </CardContent>
    </Card>
  );
}

interface ProgressCardProps {
  title: string;
  current: number;
  total: number;
  unit?: string;
  color?: 'primary' | 'success' | 'warning' | 'error';
}

export function ProgressCard({ title, current, total, unit = '', color = 'primary' }: ProgressCardProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {current}/{total}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={percentage}
          color={color}
          sx={{ height: 8, borderRadius: 4 }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {percentage.toFixed(1)}%{unit}
        </Typography>
      </CardContent>
    </Card>
  );
}

interface QuickStatProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: string;
}

export function QuickStat({ label, value, icon, color = 'primary.main' }: QuickStatProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'background.default' }}>
      {icon && (
        <Box sx={{ color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </Box>
      )}
      <Box>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h6" fontWeight={600}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}