'use client';

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
  Grid
} from '@mui/material';
import { 
  Notifications as NotifyIcon,
  Palette as ThemeIcon,
  Security as SecurityIcon,
  Language as LangIcon,
  Storage as StorageIcon,
  CloudQueue as CloudIcon
} from '@mui/icons-material';
import { PageHeader } from '@/components/common/PageHeader';
import { useState } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    emailNotify: true,
    pushNotify: false,
    darkMode: false,
    autoReport: true,
    publicProfile: false
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
                  <Switch checked={settings.darkMode} onChange={() => handleToggle('darkMode')} />
                </ListItem>
                <Divider variant="inset" component="li" />
                <ListItem>
                  <ListItemIcon><LangIcon /></ListItemIcon>
                  <ListItemText primary="Language" secondary="Current: English (US)" />
                  <Button size="small">Change</Button>
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
                  <Switch checked={settings.emailNotify} onChange={() => handleToggle('emailNotify')} />
                </ListItem>
                <Divider variant="inset" component="li" />
                <ListItem>
                  <ListItemIcon><CloudIcon /></ListItemIcon>
                  <ListItemText primary="Push Notifications" secondary="Real-time alerts in browser" />
                  <Switch checked={settings.pushNotify} onChange={() => handleToggle('pushNotify')} />
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
                  <Switch checked={settings.autoReport} onChange={() => handleToggle('autoReport')} />
                </ListItem>
                <Divider variant="inset" component="li" />
                <ListItem>
                  <ListItemIcon><SecurityIcon /></ListItemIcon>
                  <ListItemText primary="Security Scans" secondary="Include security scan in regression suite" />
                  <Switch defaultChecked />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined">Reset to Default</Button>
            <Button variant="contained">Save All Changes</Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}