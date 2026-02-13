import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    testTimeout: 30000, // 30 seconds default timeout
    hookTimeout: 30000, // 30 seconds for hooks
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/tests/e2e/**',
      '**/*.spec.ts', // Exclude Playwright specs
      '**/e2e/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        'src/test-setup.tsx',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/__tests__/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'events': 'events',
      'crypto': 'crypto-browserify',
      'stream': 'stream-browserify',
      'buffer': 'buffer',
      'process': 'process/browser'
    }
  },
  define: {
    global: 'globalThis',
    'process.env': process.env
  }
});