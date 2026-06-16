'use client';

import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  InputBase,
  Tooltip,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  DarkMode,
  LightMode,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/hooks/useRedux';
import { toggleSidebar, setThemeMode } from '@/store/slices/uiSlice';
import { useAuth, UserRole } from '@/lib/auth/AuthContext';

export function Header() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, logout, login } = useAuth();
  const { themeMode, sidebarOpen } = useAppSelector((state) => state.ui);
  const { unreadCount } = useAppSelector((state) => state.notifications);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [roleAnchorEl, setRoleAnchorEl] = useState<null | HTMLElement>(null);

  const roles: UserRole[] = ['ADMIN' as UserRole, 'QA_LEAD' as UserRole, 'QA_ENGINEER' as UserRole, 'AUTOMATION_ENGINEER' as UserRole, 'DEVELOPER' as UserRole, 'MANAGER' as UserRole, 'VIEWER' as UserRole];

  const handleRoleChange = (role: UserRole) => {
    login('admin@example.com', process.env.NEXT_PUBLIC_DEMO_PASSWORD || 'demo-password', role);
    setRoleAnchorEl(null);
  };

  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const toggleTheme = () => {
    dispatch(setThemeMode(themeMode === 'dark' ? 'light' : 'dark'));
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        width: `calc(100% - ${sidebarOpen ? 260 : 72}px)`,
        ml: `${sidebarOpen ? 260 : 72}px`,
        transition: 'width 0.2s ease, margin 0.2s ease',
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          onClick={() => dispatch(toggleSidebar())}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ flexGrow: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: 'background.paper',
              borderRadius: 1,
              px: 2,
              py: 0.5,
              width: 300,
            }}
          >
            <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
            <InputBase
              placeholder="Search tests, reports..."
              sx={{ flex: 1 }}
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            variant="contained"
            color="secondary"
            onClick={(e) => setRoleAnchorEl(e.currentTarget)}
            startIcon={<AdminIcon />}
            sx={{ mr: 2, fontWeight: 'bold' }}
          >
            Switch Role: {user?.role}
          </Button>
          <Menu
            anchorEl={roleAnchorEl}
            open={Boolean(roleAnchorEl)}
            onClose={() => setRoleAnchorEl(null)}
          >
            {roles.map((role) => (
              <MenuItem key={role} onClick={() => handleRoleChange(role)} selected={user?.role === role}>
                {role.replace('_', ' ')}
              </MenuItem>
            ))}
          </Menu>

          <Tooltip title="Toggle theme">
            <IconButton color="inherit" onClick={toggleTheme}>
              {themeMode === 'dark' ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Notifications">
            <IconButton color="inherit" onClick={handleNotificationOpen}>
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Account">
            <IconButton onClick={handleProfileMenuOpen} sx={{ ml: 1 }}>
              <Avatar
                src={user?.avatar}
                alt={user?.name}
                sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}
              >
                {user?.name?.charAt(0) || 'U'}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleProfileMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {user?.name || 'User'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.email || 'user@example.com'}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => { router.push('/profile'); handleProfileMenuClose(); }}>
            <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Profile</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { router.push('/settings'); handleProfileMenuClose(); }}>
            <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Settings</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { logout(); handleProfileMenuClose(); }}>
            <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>

        <Menu
          anchorEl={notificationAnchor}
          open={Boolean(notificationAnchor)}
          onClose={handleNotificationClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{ sx: { width: 320, maxHeight: 400 } }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6">Notifications</Typography>
          </Box>
          <MenuItem onClick={() => { router.push('/notifications'); handleNotificationClose(); }}>
            <Box>
              <Typography variant="body2">View all notifications</Typography>
            </Box>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}