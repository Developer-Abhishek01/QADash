'use client';

import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  Typography, Slider, TextField,
} from '@mui/material';
import { useState } from 'react';

interface ServiceScaleDialogProps {
  open: boolean;
  serviceName: string;
  currentReplicas?: number;
  onClose: () => void;
  onSubmit: (serviceName: string, replicas: number) => void;
}

export function ServiceScaleDialog({ open, serviceName, currentReplicas = 1, onClose, onSubmit }: ServiceScaleDialogProps) {
  const [replicas, setReplicas] = useState(currentReplicas);

  const handleSubmit = () => {
    onSubmit(serviceName, replicas);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Scale Service: {serviceName}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography gutterBottom>Replicas: {replicas}</Typography>
          <Slider
            value={replicas}
            onChange={(_, v) => setReplicas(v as number)}
            min={1}
            max={20}
            step={1}
            marks={[{ value: 1, label: '1' }, { value: 5, label: '5' }, { value: 10, label: '10' }, { value: 20, label: '20' }]}
          />
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Replicas"
            value={replicas}
            onChange={(e) => setReplicas(Math.max(1, Math.min(20, Number(e.target.value))))}
            inputProps={{ min: 1, max: 20 }}
            sx={{ mt: 1 }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>Scale to {replicas}</Button>
      </DialogActions>
    </Dialog>
  );
}
