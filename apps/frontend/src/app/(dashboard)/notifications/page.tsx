'use client';

import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Markunread as UnreadIcon,
  Delete as DeleteIcon,
  Done as ReadIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Button,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Badge,
} from '@mui/material';
import { useState, useEffect } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { Loading } from '@/components/feedback/Loading';
import { useNotifications, useMarkRead, useMarkAllRead, useDeleteNotification } from '@/lib/notifications/hooks';
import type { Notification } from '@/lib/notifications/types';
import { socketClient, socketEvents } from '@/lib/socket';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  success: <SuccessIcon color="success" />,
  warning: <WarningIcon color="warning" />,
  error: <ErrorIcon color="error" />,
  info: <InfoIcon color="info" />,
};

function groupNotifications(notifs: Notification[]): Record<string, Notification[]> {
  const groups: Record<string, Notification[]> = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;

  for (const n of notifs) {
    const t = new Date(n.time).getTime();
    let key: string;
    if (t >= today) key = 'Today';
    else if (t >= yesterday) key = 'Yesterday';
    else key = 'Older';
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  }
  return groups;
}

export default function NotificationsPage() {
  const { data: notifications, isLoading, refetch } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const deleteNotif = useDeleteNotification();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  useEffect(() => {
    const socket = socketClient.connect();
    socket.on(socketEvents.NOTIFICATION_NEW, () => { refetch(); });
    return () => { socket.off(socketEvents.NOTIFICATION_NEW); };
  }, [refetch]);

  if (isLoading) return <Loading />;

  const notifs = notifications ?? [];

  const filtered = notifs.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  const unreadCount = notifs.filter((n) => !n.read).length;
  const grouped = groupNotifications(filtered);

  const GROUP_ORDER = ['Today', 'Yesterday', 'Older'];

  return (
    <Box>
      <PageHeader
        title="Notifications"
        subtitle="Stay updated with your testing activities"
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Badge badgeContent={unreadCount} color="error">
              <Button
                variant="outlined"
                startIcon={<UnreadIcon />}
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending || unreadCount === 0}
              >
                Mark All Read
              </Button>
            </Badge>
          </Box>
        }
      />

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
        </Typography>
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, v) => v && setFilter(v)}
          size="small"
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="unread">Unread</ToggleButton>
          <ToggleButton value="read">Read</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {filtered.length > 0 ? GROUP_ORDER.map((group) => {
            const items = grouped[group];
            if (!items?.length) return null;
            return (
              <Box key={group}>
                <Box sx={{ px: 3, pt: 2, pb: 1 }}>
                  <Typography variant="overline" color="text.secondary" fontWeight={600}>{group}</Typography>
                </Box>
                {items.map((notification: Notification) => (
                  <Box key={notification.id}>
                    <ListItem
                      alignItems="flex-start"
                      secondaryAction={
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {!notification.read && (
                            <IconButton size="small" onClick={() => markRead.mutate(notification.id)} disabled={markRead.isPending}>
                              <ReadIcon fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton size="small" color="error" onClick={() => deleteNotif.mutate(notification.id)} disabled={deleteNotif.isPending}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      }
                      sx={{
                        py: 1.5,
                        bgcolor: notification.read ? 'transparent' : 'action.hover',
                        cursor: notification.read ? 'default' : 'pointer',
                        '&:hover': { bgcolor: 'action.selected' },
                        pr: 12,
                      }}
                      onClick={() => { if (!notification.read) markRead.mutate(notification.id); }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'background.default' }}>
                          {TYPE_ICONS[notification.type] ?? <InfoIcon color="info" />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2" fontWeight={notification.read ? 400 : 700}>
                              {notification.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{notification.time}</Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{notification.message}</Typography>
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </Box>
                ))}
              </Box>
            );
          }) : (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <UnreadIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                {filter === 'all' ? 'No notifications yet.' : `No ${filter} notifications.`}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
