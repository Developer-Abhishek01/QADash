'use client';

import { Refresh as RefreshIcon } from '@mui/icons-material';
import { Box, Typography, Card, CardContent, Chip, IconButton } from '@mui/material';

import { EventMessage } from './types';

interface EventHistoryTimelineProps {
  events: EventMessage[];
  loading?: boolean;
  onRefresh: () => void;
}

export function EventHistoryTimeline({ events, loading, onRefresh }: EventHistoryTimelineProps) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Event History</Typography>
          <IconButton onClick={onRefresh} disabled={loading}><RefreshIcon /></IconButton>
        </Box>
        <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
          {loading && <Typography variant="body2" color="text.secondary">Loading...</Typography>}
          {!loading && events.length === 0 && (
            <Typography variant="body2" color="text.secondary">No events yet</Typography>
          )}
          {events.map((evt) => (
            <Box
              key={evt.id}
              sx={{
                display: 'flex', gap: 1.5, py: 1, borderBottom: '1px solid',
                borderColor: 'divider', '&:last-child': { borderBottom: 'none' },
              }}
            >
              <Chip label={evt.channel} size="small" variant="outlined" sx={{ minWidth: 90, fontSize: 11 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                  {typeof evt.payload === 'object' ? JSON.stringify(evt.payload).slice(0, 120) : String(evt.payload)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(evt.timestamp).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
