import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { usersApi, authApi, settingsApi } from '@/lib/api/client';

import type { User, AppSettings, CreateUserData, UpdateUserData, UpdateProfileData, ChangePasswordData } from './types';

export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
  profile: ['auth', 'profile'] as const,
  settings: ['settings'] as const,
};

export function useUsers() {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: () => usersApi.list() as Promise<User[]>,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => usersApi.get(id) as Promise<User>,
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserData) => usersApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: userKeys.all }); },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) => usersApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: userKeys.all }); },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: userKeys.all }); },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: userKeys.profile,
    queryFn: () => authApi.me() as Promise<User>,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileData) => authApi.updateProfile ? authApi.updateProfile(data) : Promise.resolve(null),
    onSuccess: () => { qc.invalidateQueries({ queryKey: userKeys.profile }); },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordData) => authApi.changePassword ? authApi.changePassword(data) : Promise.resolve(null),
  });
}

export function useSettings() {
  return useQuery({
    queryKey: userKeys.settings,
    queryFn: () => settingsApi.get() as Promise<AppSettings>,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AppSettings) => settingsApi.update(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: userKeys.settings }); },
  });
}
