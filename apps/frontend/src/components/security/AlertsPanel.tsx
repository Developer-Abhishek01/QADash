'use client';

import {
  Notifications as NotificationsIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Button,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
} from '@mui/material';
import { useState } from 'react';

import { useSecurityAlerts, useMarkAlertRead } from '@/lib/security/hooks';

const ALERT_ICONS: Record<string, React.ReactNode> = {
  CRITICAL: <ErrorIcon sx={{ color: '#dc2626' }} />,
  HIGH: <WarningIcon sx={{ color: '#ea580c' }} />,
  MEDIUM: <WarningIcon sx={{ color: '#ca8a04' }} />,
  LOW: <InfoIcon sx={{ color: '#3b82f6' }} />,
};

interface AlertsPanelProps {
  projectId?: string;
  maxAlerts?: number;
}

export function AlertsPanel({ projectId, maxAlerts = 10 }: AlertsPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const { data: alerts, isLoading } = useSecurityAlerts(projectId || '');
  const markRead = useMarkAlertRead();

  if (!projectId) return null;

  const unreadCount = alerts?.filter((a) => !a.isRead).length || 0;
  const displayAlerts = showAll ? (alerts || []) : (alerts || []).slice(0, maxAlerts);

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
            <Typography variant="h6">Security Alerts</Typography>
          </Box>
          {!showAll && unreadCount > maxAlerts && (
            <Button size="small" onClick={() => setShowAll(true)}>
              View All ({unreadCount})
            </Button>
          )}
          {showAll && (
            <Button size="small" onClick={() => setShowAll(false)}>
              Show Recent
            </Button>
          )}
        </Box>

        {isLoading && (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
            Loading alerts...
          </Typography>
        )}

        {!isLoading && (!alerts || alerts.length === 0) && (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
            No security alerts
          </Typography>
        )}

        {!isLoading && displayAlerts.length > 0 && (
          <List dense disablePadding>
            {displayAlerts.map((alert, index) => (
              <Box key={alert.id}>
                {index > 0 && <Divider component="li" />}
                <ListItem
                  secondaryAction={
                    !alert.isRead && (
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => markRead.mutate(alert.id)}
                      >
                        <CheckCircle fontSize="small" />
                      </IconButton>
                    )
                  }
                  sx={{
                    bgcolor: alert.isRead ? 'transparent' : '#f8fafc',
                    borderRadius: 1,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {ALERT_ICONS[alert.severity] || <InfoIcon />}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight={alert.isRead ? 400 : 600}>
                          {alert.title}
                        </Typography>
                        <Chip label={alert.severity} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {alert.message} &middot; {new Date(alert.createdAt).toLocaleString()}
                      </Typography>
                    }
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

export default AlertsPanel;
