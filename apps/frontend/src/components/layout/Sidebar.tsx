'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/hooks/useRedux';
import { toggleSidebarCollapsed } from '@/store/slices/uiSlice';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Divider,
  Tooltip,
  ListSubheader,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  PlayArrow as ExecutionsIcon,
  Assessment as ReportsIcon,
  BugReport as BugsIcon,
  Psychology as AIInsightsIcon,
  Cloud as EnvironmentsIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Speed as PerformanceIcon,
  AccessibilityNew as AccessibilityIcon,
  Hub as OrchestrationIcon,
  Person as PersonIcon,
  People as UsersIcon,
  Storage as InfrastructureIcon,
  Engineering as WorkersIcon,
  Assignment as SprintsIcon,
  ChevronLeft,
  ChevronRight,
  AutoFixHigh as AIIcon,
} from '@mui/icons-material';

const menuItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: ['*'] },
  { label: 'Test Cases', icon: <SprintsIcon />, path: '/test-cases', roles: ['ADMIN', 'QA_LEAD', 'QA_ENGINEER'] },
  { label: 'Executions', icon: <ExecutionsIcon />, path: '/executions', roles: ['ADMIN', 'QA_LEAD', 'QA_ENGINEER', 'AUTOMATION_ENGINEER'] },
  { label: 'Reports', icon: <ReportsIcon />, path: '/reports', roles: ['*'] },
  { label: 'Bugs', icon: <BugsIcon />, path: '/bugs', roles: ['*'] },
  { label: 'AI Insights', icon: <AIInsightsIcon />, path: '/ai-insights', roles: ['ADMIN', 'QA_LEAD', 'AUTOMATION_ENGINEER'] },
  { label: 'AI Generator', icon: <AIIcon />, path: '/generator', roles: ['ADMIN', 'QA_LEAD', 'QA_ENGINEER'] },
  { label: 'Orchestration', icon: <OrchestrationIcon />, path: '/orchestration', roles: ['ADMIN', 'QA_LEAD', 'AUTOMATION_ENGINEER'] },
  { label: 'Security', icon: <SecurityIcon />, path: '/security', roles: ['ADMIN', 'QA_LEAD', 'QA_ENGINEER'] },
  { label: 'Performance', icon: <PerformanceIcon />, path: '/performance', roles: ['ADMIN', 'QA_LEAD', 'QA_ENGINEER'] },
  { label: 'Accessibility', icon: <AccessibilityIcon />, path: '/accessibility', roles: ['ADMIN', 'QA_LEAD', 'QA_ENGINEER'] },
];

const adminMenuItems = [
  { label: 'User Management', icon: <UsersIcon />, path: '/admin/users' },
  { label: 'Environments', icon: <EnvironmentsIcon />, path: '/admin/environments' },
  { label: 'Workers', icon: <WorkersIcon />, path: '/admin/workers' },
  { label: 'Infrastructure', icon: <InfrastructureIcon />, path: '/admin/infrastructure' },
];

const qaLeadMenuItems = [
  { label: 'Sprints', icon: <SprintsIcon />, path: '/sprints' },
  { label: 'Test Suites', icon: <SprintsIcon />, path: '/suites' },
];

const bottomMenuItems = [
  { label: 'Notifications', icon: <NotificationsIcon />, path: '/notifications' },
  { label: 'Profile', icon: <PersonIcon />, path: '/profile' },
  { label: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { sidebarOpen, sidebarCollapsed } = useAppSelector((state: { ui: { sidebarOpen: boolean; sidebarCollapsed: boolean; themeMode: string } }) => state.ui);

  const handleMenuClick = (path: string) => {
    router.push(path);
  };

  const hasRoleAccess = (itemRoles?: string[]) => {
    if (!itemRoles || itemRoles.includes('*')) return true;
    if (!user) return false;
    return itemRoles.includes(user.role);
  };

  const drawerWidth = sidebarCollapsed ? 72 : 260;

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={sidebarOpen}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          transition: 'width 0.2s ease',
          borderRight: '1px solid',
          borderColor: 'divider',
          overflowX: 'hidden',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, minHeight: 64 }}>
        {!sidebarCollapsed && (
          <Typography variant="h6" color="primary" sx={{ ml: 2, fontWeight: 'bold' }}>
            QA DASH
          </Typography>
        )}
        <IconButton onClick={() => dispatch(toggleSidebarCollapsed())}>
          {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </IconButton>
      </Box>

      <Divider />

      <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 65px)', justifyContent: 'space-between' }}>
        <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
          <List>
            {menuItems.filter(item => hasRoleAccess(item.roles)).map((item) => (
              <Tooltip key={item.path} title={sidebarCollapsed ? item.label : ''} placement="right">
                <ListItem disablePadding>
                  <ListItemButton
                    selected={pathname?.startsWith(item.path)}
                    onClick={() => handleMenuClick(item.path)}
                    sx={{ minHeight: 48, px: 2.5, justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: sidebarCollapsed ? 0 : 2,
                        justifyContent: 'center',
                        color: pathname?.startsWith(item.path) ? 'primary.main' : 'inherit',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {!sidebarCollapsed && <ListItemText primary={item.label} />}
                  </ListItemButton>
                </ListItem>
              </Tooltip>
            ))}
          </List>

          {user?.role === 'ADMIN' && (
            <>
              <Divider />
              {!sidebarCollapsed && <ListSubheader>Administration</ListSubheader>}
              <List>
                {adminMenuItems.map((item) => (
                  <Tooltip key={item.path} title={sidebarCollapsed ? item.label : ''} placement="right">
                    <ListItem disablePadding>
                      <ListItemButton
                        selected={pathname?.startsWith(item.path)}
                        onClick={() => handleMenuClick(item.path)}
                        sx={{ minHeight: 48, px: 2.5, justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 0,
                            mr: sidebarCollapsed ? 0 : 2,
                            justifyContent: 'center',
                            color: pathname?.startsWith(item.path) ? 'primary.main' : 'inherit',
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        {!sidebarCollapsed && <ListItemText primary={item.label} />}
                      </ListItemButton>
                    </ListItem>
                  </Tooltip>
                ))}
              </List>
            </>
          )}

          {user?.role === 'QA_LEAD' && (
            <>
              <Divider />
              {!sidebarCollapsed && <ListSubheader>Planning</ListSubheader>}
              <List>
                {qaLeadMenuItems.map((item) => (
                  <Tooltip key={item.path} title={sidebarCollapsed ? item.label : ''} placement="right">
                    <ListItem disablePadding>
                      <ListItemButton
                        selected={pathname?.startsWith(item.path)}
                        onClick={() => handleMenuClick(item.path)}
                        sx={{ minHeight: 48, px: 2.5, justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 0,
                            mr: sidebarCollapsed ? 0 : 2,
                            justifyContent: 'center',
                            color: pathname?.startsWith(item.path) ? 'primary.main' : 'inherit',
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        {!sidebarCollapsed && <ListItemText primary={item.label} />}
                      </ListItemButton>
                    </ListItem>
                  </Tooltip>
                ))}
              </List>
            </>
          )}
        </Box>

        <Box>
          <Divider />
          <List>
            {bottomMenuItems.map((item) => (
              <Tooltip key={item.path} title={sidebarCollapsed ? item.label : ''} placement="right">
                <ListItem disablePadding>
                  <ListItemButton
                    selected={pathname?.startsWith(item.path)}
                    onClick={() => handleMenuClick(item.path)}
                    sx={{ minHeight: 48, px: 2.5, justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: sidebarCollapsed ? 0 : 2,
                        justifyContent: 'center',
                        color: pathname?.startsWith(item.path) ? 'primary.main' : 'inherit',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {!sidebarCollapsed && <ListItemText primary={item.label} />}
                  </ListItemButton>
                </ListItem>
              </Tooltip>
            ))}
          </List>
        </Box>
      </Box>
    </Drawer>
  );
}