'use client';

import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface PerfSocketCallbacks {
  onRealtimeMetrics?: (data: { testId: string; metrics: { timestamp: string; metrics: Record<string, unknown>; active: boolean } }) => void;
  onAlert?: (data: { alertId: string; testId: string; severity: string; title: string; message: string }) => void;
  onCompleted?: (data: { testId: string; status: string }) => void;
}

export function usePerfSocket(projectId?: string, testId?: string, callbacks?: PerfSocketCallbacks) {
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    const url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    socketRef.current = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      if (projectId) {
        socketRef.current?.emit('join-project', { projectId });
      }
    });

    socketRef.current.on('performance.realtime', (data: any) => {
      if ((!testId || data.testId === testId) && callbacks?.onRealtimeMetrics) {
        callbacks.onRealtimeMetrics(data);
      }
    });

    socketRef.current.on('performance.alert', (data: any) => {
      if (callbacks?.onAlert) {
        callbacks.onAlert(data);
      }
    });
  }, [projectId, testId, callbacks]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      if (projectId) {
        socketRef.current.emit('leave-project', { projectId });
      }
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [projectId]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { socket: socketRef.current, disconnect };
}

export default usePerfSocket;
