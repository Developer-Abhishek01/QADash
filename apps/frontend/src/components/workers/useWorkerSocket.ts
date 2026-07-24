'use client';

import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface WorkerSocketCallbacks {
  onJobStarted?: (data: { jobId: string; queue: string }) => void;
  onJobCompleted?: (data: { jobId: string; queue: string }) => void;
  onJobFailed?: (data: { jobId: string; queue: string; error: string }) => void;
}

export function useWorkerSocket(projectId?: string, callbacks?: WorkerSocketCallbacks) {
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
        socketRef.current?.emit('join-project', projectId);
      }
    });

    socketRef.current.on('job:started', (data: any) => {
      callbacks?.onJobStarted?.(data);
    });

    socketRef.current.on('job:completed', (data: any) => {
      callbacks?.onJobCompleted?.(data);
    });

    socketRef.current.on('execution:failed', (data: any) => {
      callbacks?.onJobFailed?.(data);
    });
  }, [projectId, callbacks]);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);

  return socketRef;
}
