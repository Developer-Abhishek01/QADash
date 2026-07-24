'use client';

import {
  Email as EmailIcon,
  Badge as BadgeIcon,
  CalendarToday as CalendarIcon,
  Security as SecurityIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  Close as CloseIcon,
  Visibility,
  VisibilityOff,
  CloudUpload as UploadIcon,
  Login as LoginIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Grid,
  Divider,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  InputAdornment,
  Snackbar,
  LinearProgress,
  Tooltip,
  Badge,
} from '@mui/material';
import { useState, useRef } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/lib/auth/AuthContext';
import { useUpdateProfile, useChangePassword } from '@/lib/users/hooks';


const PASSWORD_MIN = 8;

function getPasswordStrength(pw: string): { label: string; color: 'error' | 'warning' | 'info' | 'success'; value: number } {
  if (!pw) return { label: '', color: 'error', value: 0 };
  let score = 0;
  if (pw.length >= PASSWORD_MIN) score += 25;
  if (/[a-z]/.test(pw)) score += 15;
  if (/[A-Z]/.test(pw)) score += 20;
  if (/[0-9]/.test(pw)) score += 20;
  if (/[^a-zA-Z0-9]/.test(pw)) score += 20;
  if (score < 30) return { label: 'Weak', color: 'error', value: score };
  if (score < 60) return { label: 'Fair', color: 'warning', value: score };
  if (score < 80) return { label: 'Good', color: 'info', value: score };
  return { label: 'Strong', color: 'success', value: score };
}

export default function ProfilePage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const [name, setName] = useState(user?.name || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (!user) return null;

  const pwStrength = getPasswordStrength(newPassword);
  const passwordsMatch = newPassword === confirmPassword;
  const passwordValid = newPassword.length >= PASSWORD_MIN && passwordsMatch;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleEditSubmit = async () => {
    try {
      await updateProfile.mutateAsync({ name, avatar: avatarPreview ?? undefined });
      setSnackbar({ message: 'Profile updated successfully!', severity: 'success' });
      setEditOpen(false);
      setAvatarPreview(null);
    } catch {
      setSnackbar({ message: 'Failed to update profile', severity: 'error' });
    }
  };

  const handlePasswordSubmit = async () => {
    if (newPassword !== confirmPassword) {
      setSnackbar({ message: 'New passwords do not match!', severity: 'error' });
      return;
    }
    if (newPassword.length < PASSWORD_MIN) {
      setSnackbar({ message: `Password must be at least ${PASSWORD_MIN} characters`, severity: 'error' });
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setSnackbar({ message: 'Password changed successfully!', severity: 'success' });
      setPasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setSnackbar({ message: 'Failed to change password', severity: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        title="Profile"
        subtitle="Manage your personal information and preferences"
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<LockIcon />}
              onClick={() => setPasswordOpen(true)}
            >
              Change Password
            </Button>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => setEditOpen(true)}
            >
              Edit Profile
            </Button>
          </Box>
        }
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Avatar
                  src={avatarPreview ?? user.avatar}
                  sx={{ width: 120, height: 120, mx: 'auto', mb: 2, bgcolor: 'primary.main', fontSize: '3rem' }}
                >
                  {user.name.charAt(0)}
                </Avatar>
              </Box>
              <Typography variant="h5" fontWeight={600}>
                {user.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {user.role.toUpperCase()}
              </Typography>
              <Chip label="Active" color="success" size="small" sx={{ mt: 1 }} />
              {user.lastLoginAt && (
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <LoginIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    Last login: {new Date(user.lastLoginAt).toLocaleDateString()}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Personal Information</Typography>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <EmailIcon color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Email Address</Typography>
                      <Typography variant="body1">{user.email}</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <BadgeIcon color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">User ID</Typography>
                      <Typography variant="body1">{user.id}</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CalendarIcon color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Joined Date</Typography>
                      <Typography variant="body1">{new Date(user.createdAt).toLocaleDateString()}</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <SecurityIcon color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Role</Typography>
                      <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>{user.role}</Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              {user.permissions && user.permissions.length > 0 && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>Permissions</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {user.permissions.map((permission: string) => (
                      <Chip key={permission} label={permission.replace(':', ' ')} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onClose={() => { setEditOpen(false); setAvatarPreview(null); }} fullWidth maxWidth="xs">
        <DialogTitle>
          Edit Profile
          <IconButton onClick={() => { setEditOpen(false); setAvatarPreview(null); }} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                <Tooltip title="Upload photo">
                  <IconButton size="small" sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }} onClick={() => fileInputRef.current?.click()}>
                    <UploadIcon sx={{ fontSize: 16, color: 'white' }} />
                  </IconButton>
                </Tooltip>
              }
            >
              <Avatar src={avatarPreview ?? user.avatar} sx={{ width: 80, height: 80, mx: 'auto', bgcolor: 'primary.main', fontSize: '2rem' }}>
                {user.name.charAt(0)}
              </Avatar>
              </Badge>
          </Box>
          <TextField fullWidth label="Full Name" value={name} onChange={(e) => setName(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Email Address" value={user.email} disabled helperText="Email cannot be changed" />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setEditOpen(false); setAvatarPreview(null); }}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSubmit} disabled={updateProfile.isPending || !name.trim()}>
            {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordOpen} onClose={() => setPasswordOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>
          Change Password
          <IconButton onClick={() => setPasswordOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mt: 1 }}>
            <TextField fullWidth type={showCurrentPassword ? 'text' : 'password'} label="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} sx={{ mb: 2 }}
              InputProps={{
                endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)} edge="end">{showCurrentPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>,
              }} />
            <TextField fullWidth type={showNewPassword ? 'text' : 'password'} label="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} sx={{ mb: 1 }}
              InputProps={{
                endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end">{showNewPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>,
              }} />
            {newPassword && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption">Password strength</Typography>
                  <Typography variant="caption" fontWeight={600} color={`${pwStrength.color}.main`}>{pwStrength.label}</Typography>
                </Box>
                <LinearProgress variant="determinate" value={pwStrength.value} color={pwStrength.color} sx={{ height: 4, borderRadius: 2 }} />
              </Box>
            )}
            <TextField fullWidth type={showConfirmPassword ? 'text' : 'password'} label="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              error={!!confirmPassword && !passwordsMatch}
              helperText={!!confirmPassword && !passwordsMatch ? 'Passwords do not match' : undefined}
              InputProps={{
                endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">{showConfirmPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>,
              }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPasswordOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handlePasswordSubmit} disabled={changePassword.isPending || !passwordValid || !currentPassword}>
            {changePassword.isPending ? 'Updating...' : 'Update Password'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snackbar ? <Alert severity={snackbar.severity} sx={{}}>{snackbar.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
