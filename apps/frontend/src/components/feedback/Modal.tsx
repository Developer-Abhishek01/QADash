'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  Divider,
  Slide,
  DialogProps,
} from '@mui/material';
import { Close, Info } from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';
import React, { ReactNode } from 'react';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactNode },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props}><div>{props.children}</div></Slide>;
});

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'info' | 'warning' | 'error' | 'success';
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'info',
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Info color={type as any} />
        {title}
      </DialogTitle>
      <DialogContent>
        <Typography>{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{cancelText}</Button>
        <Button variant="contained" onClick={onConfirm} color={type}>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface ModalProps extends Omit<DialogProps, 'children'> {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showClose?: boolean;
}

export function Modal({
  title,
  children,
  actions,
  size = 'md',
  showClose = true,
  ...dialogProps
}: ModalProps) {
  return (
    <Dialog {...dialogProps} maxWidth={size} fullWidth TransitionComponent={Transition}>
      {title && (
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {title}
          {showClose && (
            <IconButton onClick={() => dialogProps.onClose?.({}, 'backdropClick')}>
              <Close />
            </IconButton>
          )}
        </DialogTitle>
      )}
      <DialogContent dividers>{children}</DialogContent>
      {actions && (
        <DialogActions sx={{ px: 3, py: 2 }}>{actions}</DialogActions>
      )}
    </Dialog>
  );
}

interface FormModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitText?: string;
  cancelText?: string;
  children: ReactNode;
  loading?: boolean;
}

export function FormModal({
  open,
  title,
  onClose,
  onSubmit,
  submitText = 'Save',
  cancelText = 'Cancel',
  children,
  loading,
}: FormModalProps) {
  return (
    <Modal open={open} title={title} onClose={onClose} size="md">
      <Box component="form" onSubmit={onSubmit}>
        <DialogContent>{children}</DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Saving...' : submitText}
          </Button>
        </DialogActions>
      </Box>
    </Modal>
  );
}

interface SlideOverProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

export function SlideOver({ open, title, onClose, children, width = 600 }: SlideOverProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          m: 0,
          width,
          borderRadius: 0,
        },
      }}
      TransitionComponent={Transition}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {title}
        <IconButton onClick={onClose}>
          <Close />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 0 }}>{children}</DialogContent>
    </Dialog>
  );
}

interface DrawerModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  position?: 'left' | 'right';
}

export function DrawerModal({
  open,
  title,
  onClose,
  children,
  position = 'right',
}: DrawerModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          position: 'fixed',
          [position]: 0,
          top: 0,
          bottom: 0,
          borderRadius: 0,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {title}
        <IconButton onClick={onClose}>
          <Close />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>{children}</DialogContent>
    </Dialog>
  );
}