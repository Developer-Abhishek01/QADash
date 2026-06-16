'use client';

import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Tooltip, Box, Divider } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  PlayArrow as ExecutionsIcon,
  Assessment as ReportsIcon,
  BugReport as BugsIcon,
  Analytics as AnalyticsIcon,
  Psychology as AIInsightsIcon,
  Schedule as SchedulerIcon,
  Cloud as EnvironmentsIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  People as UsersIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, UserRole } from '@/lib/auth/AuthContext';

type Permission = string;

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  permission?: Permission;
  roles?: UserRole[];
}

const menuItems: MenuItem[] = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { label: 'Executions', icon: <ExecutionsIcon />, path: '/executions', permission: 'execution:read' },
  { label: 'Reports', icon: <ReportsIcon />, path: '/reports', permission: 'report:read' },
  { label: 'Bugs', icon: <BugsIcon />, path: '/bugs', permission: 'bug:read' },
  { label: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics', permission: 'execution:read' },
  { label: 'AI Insights', icon: <AIInsightsIcon />, path: '/ai-insights', permission: 'ai:read' },
  { label: 'Scheduler', icon: <SchedulerIcon />, path: '/scheduler', permission: 'execution:create' },
  { label: 'Environments', icon: <EnvironmentsIcon />, path: '/environments', permission: 'project:read' },
];

const bottomMenuItems: MenuItem[] = [
  { label: 'Notifications', icon: <NotificationsIcon />, path: '/notifications' },
  { label: 'Settings', icon: <SettingsIcon />, path: '/settings', permission: 'settings:read' },
];

const adminMenuItems: MenuItem[] = [
  { label: 'Users', icon: <UsersIcon />, path: '/settings/users', permission: 'user:read' },
  { label: 'Security', icon: <SecurityIcon />, path: '/settings/security', permission: 'user:read' },
];

export function useMenuItems() {
  const { hasPermission, user: _user } = useAuth();

  const filteredMainItems = menuItems.filter((item) => {
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  });

  const filteredBottomItems = bottomMenuItems.filter((item) => {
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  });

  const filteredAdminItems = adminMenuItems.filter((item) => {
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  });

  return {
    mainItems: filteredMainItems,
    bottomItems: filteredBottomItems,
    adminItems: filteredAdminItems,
  };
}

export function RoleBasedMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { mainItems, bottomItems, adminItems } = useMenuItems();
  const { user } = useAuth();

  const handleMenuClick = (path: string) => {
    router.push(path);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <List sx={{ flex: 1 }}>
        {mainItems.map((item) => (
          <Tooltip key={item.path} title={item.label} placement="right">
            <ListItem disablePadding>
              <ListItemButton
                selected={pathname?.startsWith(item.path)}
                onClick={() => handleMenuClick(item.path)}
                sx={{ minHeight: 48, px: 2.5, justifyContent: 'flex-start' }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: pathname?.startsWith(item.path) ? 'primary.main' : 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          </Tooltip>
        ))}

        {adminItems.length > 0 && user?.role === UserRole.ADMIN && (
          <>
            <Divider sx={{ my: 2 }} />
            <ListItem disablePadding>
              <ListItemText
                primary="Administration"
                sx={{ px: 2, '& .MuiTypography-root': { fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 } }}
              />
            </ListItem>
            {adminItems.map((item) => (
              <Tooltip key={item.path} title={item.label} placement="right">
                <ListItem disablePadding>
                  <ListItemButton
                    selected={pathname?.startsWith(item.path)}
                    onClick={() => handleMenuClick(item.path)}
                    sx={{ minHeight: 48, px: 2.5, justifyContent: 'flex-start' }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                </ListItem>
              </Tooltip>
            ))}
          </>
        )}
      </List>

      <Divider />

      <List>
        {bottomItems.map((item) => (
          <Tooltip key={item.path} title={item.label} placement="right">
            <ListItem disablePadding>
              <ListItemButton
                selected={pathname?.startsWith(item.path)}
                onClick={() => handleMenuClick(item.path)}
                sx={{ minHeight: 48, px: 2.5, justifyContent: 'flex-start' }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          </Tooltip>
        ))}
      </List>
    </Box>
  );
}

export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  const permissionsMap: Record<UserRole, Permission[]> = {
    [UserRole.ADMIN]: [
      'test:create', 'test:read', 'test:update', 'test:delete', 'test:run',
      'execution:read', 'execution:create', 'execution:cancel',
      'report:read', 'report:create', 'report:export',
      'bug:read', 'bug:create', 'bug:update', 'bug:delete',
      'project:create', 'project:read', 'project:update', 'project:delete',
      'user:create', 'user:read', 'user:update', 'user:delete',
      'settings:read', 'settings:update',
      'ai:read', 'ai:analyze',
    ],
    [UserRole.MANAGER]: [
      'test:read', 'test:create', 'test:update',
      'execution:read', 'execution:create',
      'report:read', 'report:create', 'report:export',
      'bug:read', 'bug:create', 'bug:update',
      'project:read', 'project:create', 'project:update',
      'user:read', 'settings:read',
      'ai:read', 'ai:analyze',
    ],
    [UserRole.QA_LEAD]: [
      'test:read', 'test:create', 'test:update', 'test:delete', 'test:run',
      'execution:read', 'execution:create', 'execution:cancel',
      'report:read', 'report:create',
      'bug:read', 'bug:create', 'bug:update',
      'project:read',
      'ai:read', 'ai:analyze',
    ],
    [UserRole.QA_ENGINEER]: [
      'test:read', 'test:create', 'test:update', 'test:run',
      'execution:read', 'execution:create',
      'report:read',
      'bug:read', 'bug:create', 'bug:update',
      'project:read',
      'ai:read', 'ai:analyze',
    ],
    [UserRole.AUTOMATION_ENGINEER]: [
      'test:read', 'test:create', 'test:update', 'test:delete', 'test:run',
      'execution:read', 'execution:create', 'execution:cancel',
      'report:read', 'report:create',
      'bug:read', 'bug:create',
      'project:read', 'project:update',
    ],
    [UserRole.DEVELOPER]: [
      'test:read', 'test:run',
      'execution:read',
      'report:read',
      'bug:read', 'bug:create', 'bug:update',
      'project:read',
    ],
    [UserRole.VIEWER]: [
      'test:read',
      'execution:read',
      'report:read',
      'bug:read',
      'project:read',
    ],
  };

  return permissionsMap[role]?.includes(permission) || false;
};