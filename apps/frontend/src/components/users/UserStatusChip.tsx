'use client';

import { Chip } from '@mui/material';

interface UserStatusChipProps {
  isActive: boolean;
  size?: 'small' | 'medium';
}

export function UserStatusChip({ isActive, size = 'small' }: UserStatusChipProps) {
  return (
    <Chip
      label={isActive ? 'Active' : 'Inactive'}
      size={size}
      color={isActive ? 'success' : 'default'}
    />
  );
}

export default UserStatusChip;
