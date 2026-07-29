'use client';

import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface ScanSocketCallbacks {
  onProgress?: (data: { scanId: string; status: string; progress: number; findings?: number }) => void;
  onVulnerabilityFound?: (data: { scanId: string; id: string; title: string; severity: string; affectedUrl: string }) => void;
  onCompleted?: (data: { scanId: string; status: string; findings: number }) => void;
  onError?: (data: { scanId: string; error: string }) => void;
}

export function useScanSocket(projectId?: string, scanId?: string, callbacks?: ScanSocketCallbacks) {
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
      if (scanId) {
        socketRef.current?.emit('join-security-scan', { scanId });
      }
    });

    socketRef.current.on('security-scan-update', (data: { scanId: string; status: string; progress: number; findings?: number }) => {
      if ((!scanId || data.scanId === scanId) && callbacks?.onProgress) {
        callbacks.onProgress(data);
      }
    });

    socketRef.current.on('vulnerability-found', (data: { scanId: string; id: string; title: string; severity: string; affectedUrl: string }) => {
      if ((!scanId || data.scanId === scanId) && callbacks?.onVulnerabilityFound) {
        callbacks.onVulnerabilityFound(data);
      }
    });

    socketRef.current.on('security-alert', (data: { scanId: string; error: string; severity?: string }) => {
      if (callbacks?.onError && data.severity === 'ERROR') {
        callbacks.onError(data);
      }
    });
  }, [projectId, scanId, callbacks]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      if (projectId) {
        socketRef.current.emit('leave-project', { projectId });
      }
      if (scanId) {
        socketRef.current.emit('leave-security-scan', { scanId });
      }
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [projectId, scanId]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { socket: socketRef.current, disconnect };
}

export default useScanSocket;
