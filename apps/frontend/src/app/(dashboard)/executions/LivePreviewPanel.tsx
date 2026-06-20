'use client';

import {
  Box,
  Typography,
  CircularProgress,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  alpha,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Visibility as VisibilityIcon,
  Code as CodeIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { useState, useRef, useEffect } from 'react';

interface ActionEvent {
  type: 'click' | 'type' | 'navigate' | 'assert' | 'select' | 'wait' | 'screenshot' | 'scroll' | 'hover';
  selector?: string;
  value?: string;
  url?: string;
  status?: 'running' | 'passed' | 'failed';
  timestamp: number;
}

interface ConsoleEvent {
  type: 'log' | 'warn' | 'error' | 'api' | 'info';
  message: string;
  url?: string;
  method?: string;
  statusCode?: number;
  timestamp: number;
}

interface ElementHighlight {
  selector: string;
  tagName: string;
  rect: { x: number; y: number; width: number; height: number };
  action: 'click' | 'type' | 'hover';
  timestamp: number;
}

interface LivePreviewData {
  screenshot: string;
  step: string;
  timestamp: number;
}

interface Props {
  livePreview: LivePreviewData | null;
  actionLogs: ActionEvent[];
  consoleLogs: ConsoleEvent[];
  elementHighlights: ElementHighlight[];
  isRunning: boolean;
}

const actionIcons: Record<string, React.ReactNode> = {
  click: <span style={{ fontSize: 14 }}>👆</span>,
  type: <span style={{ fontSize: 14 }}>⌨️</span>,
  navigate: <span style={{ fontSize: 14 }}>🔗</span>,
  assert: <span style={{ fontSize: 14 }}>✓</span>,
  select: <span style={{ fontSize: 14 }}>▼</span>,
  wait: <span style={{ fontSize: 14 }}>⏳</span>,
  screenshot: <span style={{ fontSize: 14 }}>📷</span>,
};

const statusColors: Record<string, string> = {
  running: '#f59e0b',
  passed: '#10b981',
  failed: '#ef4444',
};

export default function LivePreviewPanel({ livePreview, actionLogs, consoleLogs, elementHighlights, isRunning }: Props) {
  const [tab, setTab] = useState<'actions' | 'console'>('actions');
  const [isPaused, setIsPaused] = useState(false);
  const [zoom, setZoom] = useState<number>(1);
  const actionListRef = useRef<HTMLDivElement>(null);
  const consoleListRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgRect, setImgRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (actionListRef.current) {
      actionListRef.current.scrollTop = actionListRef.current.scrollHeight;
    }
  }, [actionLogs]);

  useEffect(() => {
    if (tab === 'console' && consoleListRef.current) {
      consoleListRef.current.scrollTop = consoleListRef.current.scrollHeight;
    }
  }, [consoleLogs, tab]);

  useEffect(() => {
    if (imgRef.current) {
      const updateRect = () => setImgRect(imgRef.current!.getBoundingClientRect());
      updateRect();
      window.addEventListener('resize', updateRect);
      return () => window.removeEventListener('resize', updateRect);
    }
  }, [livePreview?.screenshot]);

  const scaleOverlay = (rect: { x: number; y: number; width: number; height: number }) => {
    if (!imgRect) return null;
    const naturalW = imgRef.current?.naturalWidth || 1280;
    const naturalH = imgRef.current?.naturalHeight || 720;
    const displayedW = imgRef.current?.clientWidth || imgRect.width;
    const displayedH = imgRef.current?.clientHeight || imgRect.height;
    const scaleX = displayedW / naturalW;
    const scaleY = displayedH / naturalH;
    return {
      left: rect.x * scaleX,
      top: rect.y * scaleY,
      width: rect.width * scaleX,
      height: rect.height * scaleY,
    };
  };

  const latestHighlight = elementHighlights.length > 0 ? elementHighlights[elementHighlights.length - 1] : null;
  const overlayStyle = latestHighlight ? scaleOverlay(latestHighlight.rect) : null;

  const imgSrc = livePreview?.screenshot
    ? livePreview.screenshot.startsWith('/')
      ? `http://localhost:3001${livePreview.screenshot}`
      : livePreview.screenshot.startsWith('/9j/')
        ? `data:image/jpeg;base64,${livePreview.screenshot}`
        : `data:image/png;base64,${livePreview.screenshot}`
    : null;

  const consoleTypeColor: Record<string, string> = {
    log: '#10b981',
    warn: '#f59e0b',
    error: '#ef4444',
    api: '#6366f1',
    info: '#3b82f6',
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2, bgcolor: alpha('#6366f1', 0.03), borderRadius: 2, border: '1px solid', borderColor: alpha('#6366f1', 0.15) }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isRunning && (
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444', animation: 'pulse 1s infinite' }} />
          )}
          <Typography variant="subtitle1" fontWeight={600} color="primary">Live Preview</Typography>
          {livePreview?.step && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {livePreview.step}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ToggleButtonGroup
            size="small"
            value={zoom}
            exclusive
            onChange={(_, v) => v !== null && setZoom(v)}
            sx={{ '& .MuiToggleButton-root': { px: 1, py: 0.3, fontSize: 11 } }}
          >
            <ToggleButton value={0.5}>0.5x</ToggleButton>
            <ToggleButton value={1}>1x</ToggleButton>
            <ToggleButton value={1.5}>1.5x</ToggleButton>
          </ToggleButtonGroup>
          <IconButton size="small" onClick={() => setIsPaused(p => !p)} color={isPaused ? 'warning' : 'default'}>
            {isPaused ? <PlayIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
          </IconButton>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'flex', gap: 2, height: 480, minHeight: 0 }}>
        {/* Left: Browser Preview */}
        <Box sx={{ flex: 3, minWidth: 0 }}>
          <Box sx={{
            width: '100%',
            height: '100%',
            bgcolor: '#000',
            borderRadius: 2,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}>
            {livePreview?.screenshot && !isPaused ? (
              <>
                <Box
                  component="img"
                  ref={imgRef}
                  src={imgSrc || ''}
                  sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  alt="Live browser preview"
                />
                {/* Element highlight overlay */}
                {overlayStyle && (
                  <Box sx={{
                    position: 'absolute',
                    border: '2px solid #6366f1',
                    bgcolor: alpha('#6366f1', 0.15),
                    borderRadius: 1,
                    pointerEvents: 'none',
                    transition: 'all 0.15s ease',
                    zIndex: 10,
                    ...overlayStyle,
                  }} />
                )}
              </>
            ) : (
              <Box sx={{ textAlign: 'center', color: 'white' }}>
                <CircularProgress color="inherit" size={32} sx={{ mb: 1 }} />
                <Typography variant="body2">{livePreview?.step || 'Initializing browser...'}</Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Right: Action Timeline / Console */}
        <Box sx={{ flex: 2, minWidth: 280, maxWidth: 400, display: 'flex', flexDirection: 'column', bgcolor: '#1a1a2e', borderRadius: 2, overflow: 'hidden' }}>
          {/* Tabs */}
          <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: alpha('#fff', 0.1) }}>
            {[
              { key: 'actions', label: 'Actions', icon: <TimelineIcon sx={{ fontSize: 14 }} />, count: actionLogs.length },
              { key: 'console', label: 'Console', icon: <CodeIcon sx={{ fontSize: 14 }} />, count: consoleLogs.length },
            ].map(t => (
              <Box
                key={t.key}
                onClick={() => setTab(t.key as any)}
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  py: 1,
                  cursor: 'pointer',
                  fontSize: 12,
                  color: tab === t.key ? '#6366f1' : alpha('#fff', 0.5),
                  borderBottom: tab === t.key ? '2px solid #6366f1' : '2px solid transparent',
                  transition: 'all 0.2s',
                  '&:hover': { color: '#fff', bgcolor: alpha('#fff', 0.05) },
                }}
              >
                {t.icon}
                <span>{t.label}</span>
                {t.count > 0 && (
                  <Chip label={t.count} size="small" sx={{ height: 18, fontSize: 10, bgcolor: alpha('#6366f1', 0.2), color: '#6366f1' }} />
                )}
              </Box>
            ))}
          </Box>

          {/* Panel content */}
          <Box ref={tab === 'actions' ? actionListRef : consoleListRef} sx={{ flex: 1, overflow: 'auto', p: 1 }}>
            {tab === 'actions' ? (
              actionLogs.length === 0 ? (
                <Typography variant="caption" color={alpha('#fff', 0.3)} sx={{ p: 2, display: 'block', textAlign: 'center' }}>
                  Waiting for actions...
                </Typography>
              ) : (
                [...actionLogs].reverse().map((action, idx) => (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.5, px: 0.5, borderBottom: '1px solid', borderColor: alpha('#fff', 0.05), fontSize: 12, color: alpha('#fff', 0.8) }}>
                    <Box sx={{ flexShrink: 0, mt: 0.2 }}>{actionIcons[action.type] || <VisibilityIcon sx={{ fontSize: 14 }} />}</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="caption" sx={{ color: alpha('#fff', 0.9), fontWeight: 500 }}>
                        {action.type}
                      </Typography>
                      {action.selector && (
                        <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), ml: 0.5, fontFamily: 'monospace', fontSize: 10 }}>
                          {action.selector}
                        </Typography>
                      )}
                      {action.value && (
                        <Typography variant="caption" sx={{ color: alpha('#fff', 0.4), ml: 0.5 }}>
                          = &quot;{action.value}&quot;
                        </Typography>
                      )}
                      {action.url && (
                        <Typography variant="caption" sx={{ color: alpha('#6366f1', 0.7), ml: 0.5, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>
                          {action.url}
                        </Typography>
                      )}
                    </Box>
                    {action.status && (
                      <Box sx={{
                        width: 6, height: 6, borderRadius: '50%', mt: 0.5, flexShrink: 0,
                        bgcolor: statusColors[action.status] || '#888',
                      }} />
                    )}
                  </Box>
                ))
              )
            ) : (
              consoleLogs.length === 0 ? (
                <Typography variant="caption" color={alpha('#fff', 0.3)} sx={{ p: 2, display: 'block', textAlign: 'center' }}>
                  Waiting for console/network events...
                </Typography>
              ) : (
                [...consoleLogs].reverse().map((log, idx) => (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.4, px: 0.5, borderBottom: '1px solid', borderColor: alpha('#fff', 0.05), fontSize: 11 }}>
                    <Box sx={{
                      flexShrink: 0, mt: 0.3, width: 4, height: 4, borderRadius: '50%',
                      bgcolor: consoleTypeColor[log.type] || '#888',
                    }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="caption" sx={{
                        color: log.type === 'error' ? '#ef4444' : log.type === 'warn' ? '#f59e0b' : alpha('#fff', 0.7),
                        fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all',
                      }}>
                        {log.message}
                      </Typography>
                      {log.url && (
                        <Typography variant="caption" sx={{ color: alpha('#6366f1', 0.5), display: 'block', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>
                          {log.url}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))
              )
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
