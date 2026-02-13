import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    name: 'integration',
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 10000,
    globals: true,
    setupFiles: ['./tests/setup/integration-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/integration',
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '*.config.*',
        'src/**/*.d.ts',
        'src/**/*.test.*',
        'src/**/*.spec.*'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    sequence: {
      concurrent: false
    },
    include: [
      'tests/integration/**/*.test.ts',
      'tests/integration/**/*.spec.ts'
    ],
    exclude: [
      'tests/e2e/**',
      'tests/unit/**',
      'src/**/*.test.*',
      'src/**/*.spec.*'
    ],
    reporter: [
      'verbose',
      'json',
      'junit'
    ],
    outputFile: {
      json: './test-results/integration-results.json',
      junit: './test-results/integration-results.xml'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@tests': resolve(__dirname, 'tests')
    }
  },
  define: {
    'process.env.NODE_ENV': '"test"'
  }
});