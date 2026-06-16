'use client';

import { useEffect, useState } from 'react';
import { ThemeProvider as MUIThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme, darkTheme } from './index';
import { useAppSelector } from '@/lib/hooks/useRedux';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeMode = useAppSelector((state) => state.ui.themeMode);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark =
    themeMode === 'dark' || 
    (mounted && themeMode === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const theme = isDark ? darkTheme : lightTheme;

  if (!mounted) {
    return (
      <MUIThemeProvider theme={lightTheme}>
        <CssBaseline />
        <div style={{ opacity: 0 }}>{children}</div>
      </MUIThemeProvider>
    );
  }

  return (
    <MUIThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MUIThemeProvider>
  );
}

export { lightTheme, darkTheme };