'use client';

import { Box, Typography, Chip, Avatar, IconButton } from '@mui/material';


interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  user?: { name: string; avatar?: string };
  status?: 'completed' | 'in-progress' | 'pending' | 'failed';
  icon?: React.ReactNode;
  actions?: { icon: React.ReactNode; onClick: () => void }[];
}

interface TimelineProps {
  items: TimelineItem[];
  showDate?: boolean;
}

export function Timeline({ items, showDate = true }: TimelineProps) {
  return (
    <Box sx={{ position: 'relative', '&::before': {
      content: '""',
      position: 'absolute',
      left: 20,
      top: 0,
      bottom: 0,
      width: 2,
      bgcolor: 'divider',
    }}}>
      {items.map((item, _index) => (
        <Box
          key={item.id}
          sx={{
            display: 'flex',
            gap: 2,
            mb: 3,
            position: 'relative',
          }}
        >
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: item.status === 'completed' ? 'success.main' :
                       item.status === 'failed' ? 'error.main' :
                       item.status === 'in-progress' ? 'primary.main' : 'grey.400',
              zIndex: 1,
            }}
          >
            {item.icon}
          </Avatar>
          <Box sx={{ flex: 1, bgcolor: 'background.paper', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  {item.title}
                </Typography>
                {item.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {item.description}
                  </Typography>
                )}
              </Box>
              {item.actions && (
                <Box>
                  {item.actions.map((action, i) => (
                    <IconButton key={i} size="small" onClick={action.onClick}>
                      {action.icon}
                    </IconButton>
                  ))}
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              {item.user && (
                <Chip
                  avatar={<Avatar src={item.user.avatar}>{item.user.name[0]}</Avatar>}
                  label={item.user.name}
                  size="small"
                  variant="outlined"
                />
              )}
              {showDate && (
                <Typography variant="caption" color="text.secondary">
                  {item.timestamp}
                </Typography>
              )}
              {item.status && (
                <Chip
                  label={item.status}
                  size="small"
                  color={item.status === 'completed' ? 'success' : item.status === 'failed' ? 'error' : item.status === 'in-progress' ? 'primary' : 'default'}
                />
              )}
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
}