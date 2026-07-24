import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { useScaleWorkers } from '@/lib/workers/hooks';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ScaleDialog({ open, onClose }: Props) {
  const [count, setCount] = useState(5);
  const scaleWorkers = useScaleWorkers();

  const handleScale = (action: 'up' | 'down') => {
    scaleWorkers.mutate({ action, count }, { onSuccess: onClose });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Scale Workers</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Set the target number of workers
          </Typography>
          <TextField
            fullWidth
            type="number"
            label="Worker Count"
            value={count}
            onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
            inputProps={{ min: 1, max: 50 }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => handleScale('down')} disabled={scaleWorkers.isPending} color="warning">
          Scale Down
        </Button>
        <Button onClick={() => handleScale('up')} disabled={scaleWorkers.isPending} variant="contained">
          Scale Up
        </Button>
      </DialogActions>
    </Dialog>
  );
}
