'use client';

import { 
  Notifications as NotifyIcon,
  Palette as ThemeIcon,
  Security as SecurityIcon,
  Language as LangIcon,
  Storage as StorageIcon,
  CloudQueue as CloudIcon
} from '@mui/icons-material';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Switch, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Divider,
  Button,
  Grid,
  Snackbar,
  Alert,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { Loading } from '@/components/feedback/Loading';
import { useSettings, useUpdateSettings } from '@/lib/users/hooks';


export default function SettingsPage() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [settings, setSettings] = useState({
    emailNotify: true,
    pushNotify: false,
    darkMode: false,
    autoReport: true,
    publicProfile: false,
  });
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setSettings(data);
      setDirty(false);
    }
  }, [data]);

  const toggle = useCallback((key: keyof typeof settings) => {
    setSettings(prev => {
      const next = { ...prev, [key]: !prev[key] };
      setDirty(JSON.stringify(next) !== JSON.stringify(data));
      return next;
    });
  }, [data]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(settings);
      setSnackbar({ message: 'Settings saved successfully', severity: 'success' });
      setDirty(false);
    } catch {
      setSnackbar({ message: 'Failed to save settings', severity: 'error' });
    }
  };

  const handleReset = () => {
    if (data) {
      setSettings(data);
      setDirty(false);
    }
  };

  if (isLoading) return <Loading />;

  return (
    <Box>
      <PageHeader title="Settings" subtitle="Manage your account and platform preferences" />
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>General Settings</Typography>
              <List>
                <ListItem>
                  <ListItemIcon><ThemeIcon /></ListItemIcon>
                  <ListItemText primary="Dark Mode" secondary="Enable dark theme for the dashboard" />
                  <Switch checked={settings.darkMode} onChange={() => toggle('darkMode')} />
                </ListItem>
                <Divider variant="inset" component="li" />
                <ListItem>
                  <ListItemIcon><LangIcon /></ListItemIcon>
                  <ListItemText primary="Language" secondary="Current: English (US)" />
                  <Button size="small" onClick={() => setSnackbar({ message: 'Language settings coming soon!', severity: 'success' })}>Change</Button>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Notifications</Typography>
              <List>
                <ListItem>
                  <ListItemIcon><NotifyIcon /></ListItemIcon>
                  <ListItemText primary="Email Notifications" secondary="Receive test results via email" />
                  <Switch checked={settings.emailNotify} onChange={() => toggle('emailNotify')} />
                </ListItem>
                <Divider variant="inset" component="li" />
                <ListItem>
                  <ListItemIcon><CloudIcon /></ListItemIcon>
                  <ListItemText primary="Push Notifications" secondary="Real-time alerts in browser" />
                  <Switch checked={settings.pushNotify} onChange={() => toggle('pushNotify')} />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Automation & Reports</Typography>
              <List>
                <ListItem>
                  <ListItemIcon><StorageIcon /></ListItemIcon>
                  <ListItemText primary="Auto-Generate Reports" secondary="Create reports automatically after each run" />
                  <Switch checked={settings.autoReport} onChange={() => toggle('autoReport')} />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Privacy & Security</Typography>
              <List>
                <ListItem>
                  <ListItemIcon><SecurityIcon /></ListItemIcon>
                  <ListItemText primary="Public Profile" secondary="Allow other users to view your profile" />
                  <Switch checked={settings.publicProfile} onChange={() => toggle('publicProfile')} />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" onClick={handleReset} disabled={!dirty || updateSettings.isPending}>Reset to Default</Button>
            <Button variant="contained" onClick={handleSave} disabled={!dirty || updateSettings.isPending}>
              {updateSettings.isPending ? 'Saving...' : 'Save All Changes'}
            </Button>
          </Box>
        </Grid>
      </Grid>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? <Alert severity={snackbar.severity}>{snackbar.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
