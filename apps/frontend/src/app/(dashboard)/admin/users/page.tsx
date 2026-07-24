'use client';

import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Snackbar,
} from '@mui/material';
import { useState } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { Loading } from '@/components/feedback/Loading';
import { UserRoleChip, UserStatusChip, UserAvatar } from '@/components/users';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/lib/users/hooks';
import type { User } from '@/lib/users/types';

const ROLES = ['ADMIN', 'QA_LEAD', 'QA_ENGINEER', 'AUTOMATION_ENGINEER', 'DEVELOPER', 'MANAGER', 'VIEWER'];

export default function UserManagementPage() {
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'VIEWER' });
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', password: '', role: 'VIEWER' });
    setDialogOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingUser) {
        await updateUser.mutateAsync({ id: editingUser.id, data: { name: form.name, role: form.role } });
        setSnackbar({ message: 'User updated', severity: 'success' });
      } else {
        await createUser.mutateAsync({ name: form.name, email: form.email, password: form.password, role: form.role });
        setSnackbar({ message: 'User created', severity: 'success' });
      }
      setDialogOpen(false);
    } catch {
      setSnackbar({ message: 'Operation failed', severity: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUser.mutateAsync(id);
      setSnackbar({ message: 'User deleted', severity: 'success' });
    } catch {
      setSnackbar({ message: 'Delete failed', severity: 'error' });
    }
  };

  if (isLoading) return <Loading />;

  return (
    <Box>
      <PageHeader
        title="User Management"
        subtitle="Manage platform users, roles and permissions"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
            Add User
          </Button>
        }
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(users || []).map((user: User) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <UserAvatar name={user.name} avatar={user.avatar} />
                    <Box>
                      <Typography variant="body1" fontWeight={600}>{user.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell><UserRoleChip role={user.role} /></TableCell>
                <TableCell><UserStatusChip isActive={user.isActive} /></TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleOpenEdit(user)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(user.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {(!users || users.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography py={4} color="text.secondary">No users found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Full Name" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Email" fullWidth value={form.email} disabled={!!editingUser} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {!editingUser && (
              <TextField label="Password" type="password" fullWidth value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            )}
            <TextField select label="Role" fullWidth value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((role) => (
                <MenuItem key={role} value={role}>{role.replace(/_/g, ' ')}</MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={createUser.isPending || updateUser.isPending}>
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

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
