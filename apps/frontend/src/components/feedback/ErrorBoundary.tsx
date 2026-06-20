'use client';

import { Component, ReactNode } from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { Error as ErrorIcon, Refresh } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            p: 3,
          }}
        >
          <Card sx={{ maxWidth: 500, width: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Something went wrong
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {this.state.error?.message || 'An unexpected error occurred'}
              </Typography>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={this.handleReset}
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

interface AsyncErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class AsyncErrorBoundary extends Component<Props & { children: (error: Error | null) => ReactNode }, AsyncErrorBoundaryState> {
  state: AsyncErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): AsyncErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('AsyncErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error">{this.state.error?.message || 'An error occurred'}</Typography>
          <Button onClick={this.handleReset} sx={{ mt: 2 }}>
            Retry
          </Button>
        </Box>
      );
    }

    return this.props.children(this.state.error);
  }
}