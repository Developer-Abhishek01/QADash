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
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
} from '@mui/material';

import { useAlertEvents, useMarkAlertRead } from '@/lib/performance/hooks';

const ALERT_ICONS: Record<string, React.ReactNode> = {
  CRITICAL: <ErrorIcon sx={{ color: '#dc2626' }} />,
  WARNING: <WarningIcon sx={{ color: '#ea580c' }} />,
  INFO: <InfoIcon sx={{ color: '#3b82f6' }} />,
};

interface AlertsPanelProps {
  projectId?: string;
  maxAlerts?: number;
}

export function AlertsPanel({ projectId, maxAlerts = 10 }: AlertsPanelProps) {
  const { data: alertEvents } = useAlertEvents(projectId || '', false);
  const markRead = useMarkAlertRead();

  if (!projectId) return null;

  const unreadCount = alertEvents?.filter((e) => !e.isRead).length || 0;
  const displayAlerts = (alertEvents || []).slice(0, maxAlerts);

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
            <Typography variant="h6">Performance Alerts</Typography>
          </Box>
        </Box>

        {(!alertEvents || alertEvents.length === 0) && (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
            No threshold alerts
          </Typography>
        )}

        {displayAlerts.length > 0 && (
          <List dense disablePadding>
            {displayAlerts.map((event, index) => (
              <Box key={event.id}>
                {index > 0 && <Divider component="li" />}
                <ListItem
                  secondaryAction={
                    !event.isRead && (
                      <IconButton edge="end" size="small" onClick={() => markRead.mutate(event.id)}>
                        <CheckCircle fontSize="small" />
                      </IconButton>
                    )
                  }
                  sx={{ bgcolor: event.isRead ? 'transparent' : '#f8fafc', borderRadius: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {ALERT_ICONS[event.alert?.severity || 'INFO'] || <InfoIcon />}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight={event.isRead ? 400 : 600}>
                          {event.alert?.name || 'Alert'}
                        </Typography>
                        <Chip label={event.alert?.severity || 'INFO'} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {event.message} &middot; {new Date(event.createdAt).toLocaleString()}
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
