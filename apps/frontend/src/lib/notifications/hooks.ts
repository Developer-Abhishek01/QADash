import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { notificationsApi } from '@/lib/api/client';

import type { Notification } from './types';

export const notifKeys = { all: ['notifications'] as const, list: () => [...notifKeys.all, 'list'] as const };

export function useNotifications() {
  return useQuery({ queryKey: notifKeys.list(), queryFn: () => notificationsApi.list() as Promise<Notification[]> });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notifKeys.all }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: notifKeys.all }),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notifKeys.all }),
  });
}
