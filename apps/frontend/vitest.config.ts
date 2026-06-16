import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@qadash/config': path.resolve(__dirname, '../../packages/config/src'),
      '@qadash/logger': path.resolve(__dirname, '../../packages/logger/src'),
      '@qadash/types': path.resolve(__dirname, '../../packages/types/src'),
      '@qadash/utils': path.resolve(__dirname, '../../packages/utils/src'),
    },
  },
});
