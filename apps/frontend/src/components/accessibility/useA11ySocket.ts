'use client';

import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface A11ySocketCallbacks {
  onProgress?: (data: { testId: string; scannedPages: number; totalPages: number; issuesFound: number }) => void;
  onCompleted?: (data: { testId: string; status: string }) => void;
}

export function useA11ySocket(projectId?: string, testId?: string, callbacks?: A11ySocketCallbacks) {
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

    socketRef.current.on('accessibility.page-scanned', (data: any) => {
      if ((!testId || data.testId === testId) && callbacks?.onProgress) {
        callbacks.onProgress(data);
      }
    });

    socketRef.current.on('accessibility.completed', (data: any) => {
      if (callbacks?.onCompleted) {
        callbacks.onCompleted(data);
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

export default useA11ySocket;
