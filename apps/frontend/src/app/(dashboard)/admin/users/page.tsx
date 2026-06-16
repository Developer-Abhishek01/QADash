'use client';

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
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon,
  Person as UserIcon,
} from '@mui/icons-material';
import { PageHeader } from '@/components/common/PageHeader';
import { useState, useEffect } from 'react';
import { UserRole } from '@/lib/auth/AuthContext';

const roles: UserRole[] = ['ADMIN' as UserRole, 'QA_LEAD' as UserRole, 'QA_ENGINEER' as UserRole, 'AUTOMATION_ENGINEER' as UserRole, 'DEVELOPER' as UserRole, 'MANAGER' as UserRole, 'VIEWER' as UserRole];

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [newUser, setNewUser] = useState<{ name: string; email: string; role: UserRole }>({ name: '', email: '', role: 'VIEWER' as unknown as UserRole });

  // Initial load from localStorage to persist
  useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('qadash_users');
      if (saved) {
        setUsers(JSON.parse(saved));
      } else {
        // Only default admin if no users exist
        setUsers([{ id: '1', name: 'John Admin', email: 'admin@example.com', role: 'ADMIN', status: 'Active' }]);
      }
    }
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('qadash_users', JSON.stringify(users));
    }
  }, [users, isMounted]);

  const handleAddUser = () => {
    setUsers([...users, { ...newUser, id: Date.now().toString(), status: 'Active' }]);
    setOpen(false);
    setNewUser({ name: '', email: '', role: 'VIEWER' as unknown as UserRole });
  };

  return (
    <Box>
      <PageHeader
        title="User Management"
        subtitle="Manage platform users, roles and permissions"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
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
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>{user.name.charAt(0)}</Avatar>
                    <Box>
                      <Typography variant="body1" fontWeight={600}>{user.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    icon={user.role === 'ADMIN' ? <AdminIcon /> : <UserIcon />} 
                    label={user.role.replace('_', ' ')} 
                    variant="outlined" 
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={user.status} 
                    color={user.status === 'Active' ? 'success' : 'default'} 
                    size="small" 
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small"><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error"><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Full Name"
              fullWidth
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            />
            <TextField
              label="Email Address"
              fullWidth
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
            <TextField
              select
              label="Role"
              fullWidth
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
            >
              {roles.map((role) => (
                <MenuItem key={role} value={role}>{role.replace('_', ' ')}</MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddUser}>Create User</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
