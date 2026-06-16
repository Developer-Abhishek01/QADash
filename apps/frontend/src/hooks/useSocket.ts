'use client';

import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSnackbar } from 'notistack';

interface UseSocketOptions {
  url?: string;
  autoConnect?: boolean;
  userId?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onExecutionUpdate?: (data: any) => void;
  onJobUpdate?: (data: any) => void;
  onAlert?: (data: any) => void;
  onAnalyticsUpdate?: (data: any) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
    autoConnect = true,
    userId,
    onConnect,
    onDisconnect,
    onExecutionUpdate,
    onJobUpdate,
    onAlert,
    onAnalyticsUpdate,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    socketRef.current = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: userId ? { userId } : {},
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      onConnect?.();

      if (userId) {
        socketRef.current?.emit('join:user', { userId });
      }
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
      onDisconnect?.();
    });

    socketRef.current.on('execution:update', (data) => {
      onExecutionUpdate?.(data);
    });

    socketRef.current.on('job:update', (data) => {
      onJobUpdate?.(data);
    });

    socketRef.current.on('alerts', (data) => {
      onAlert?.(data);
      enqueueSnackbar(data.message, { variant: data.severity });
    });

    socketRef.current.on('analytics', (data) => {
      onAnalyticsUpdate?.(data);
    });

    socketRef.current.on('error', (error) => {
      console.error('Socket error:', error);
      enqueueSnackbar('Connection error', { variant: 'error' });
    });
  }, [url, userId, onConnect, onDisconnect, onExecutionUpdate, onJobUpdate, onAlert, onAnalyticsUpdate, enqueueSnackbar]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.off('connect');
      socketRef.current.off('disconnect');
      socketRef.current.off('execution:update');
      socketRef.current.off('job:update');
      socketRef.current.off('alerts');
      socketRef.current.off('analytics');
      socketRef.current.off('error');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const emit = useCallback((event: string, data: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  const subscribe = useCallback((channel: string) => {
    socketRef.current?.emit('subscribe', { channel });
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    socketRef.current?.emit('unsubscribe', { channel });
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    socket: socketRef.current,
    connect,
    disconnect,
    emit,
    subscribe,
    unsubscribe,
    isConnected: socketRef.current?.connected ?? false,
  };
}

export function useExecutionSocket(executionId: string, onUpdate?: (data: any) => void) {
  const { emit, subscribe, unsubscribe } = useSocket({
    onExecutionUpdate: (data) => {
      if (data.executionId === executionId) {
        onUpdate?.(data);
      }
    },
  });

  useEffect(() => {
    const channel = `execution:${executionId}`;
    subscribe(channel);

    return () => {
      unsubscribe(channel);
    };
  }, [executionId, subscribe, unsubscribe]);

  return { emit, subscribe, unsubscribe };
}

export function useJobSocket(jobId: string, onUpdate?: (data: any) => void) {
  const { emit, subscribe, unsubscribe } = useSocket({
    onJobUpdate: (data) => {
      if (data.jobId === jobId) {
        onUpdate?.(data);
      }
    },
  });

  useEffect(() => {
    const channel = `job:${jobId}`;
    subscribe(channel);

    return () => {
      unsubscribe(channel);
    };
  }, [jobId, subscribe, unsubscribe]);

  return { emit, subscribe, unsubscribe };
}