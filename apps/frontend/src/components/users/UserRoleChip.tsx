'use client';

import { AdminPanelSettings, Person } from '@mui/icons-material';
import { Chip } from '@mui/material';

const ROLE_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'default'> = {
  ADMIN: 'primary',
  QA_LEAD: 'success',
  QA_ENGINEER: 'info',
  AUTOMATION_ENGINEER: 'warning',
  DEVELOPER: 'default',
  MANAGER: 'success',
  VIEWER: 'default',
};

interface UserRoleChipProps {
  role: string;
  size?: 'small' | 'medium';
}

export function UserRoleChip({ role, size = 'small' }: UserRoleChipProps) {
  return (
    <Chip
      icon={role === 'ADMIN' ? <AdminPanelSettings /> : <Person />}
      label={role.replace(/_/g, ' ')}
      variant="outlined"
      size={size}
      color={ROLE_COLORS[role] || 'default'}
    />
  );
}

export default UserRoleChip;
