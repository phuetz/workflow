import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'build',
      'coverage',
      '.nyc_output',
      // archives and backups
      'backup_*',
      '**/*.BACKUP.*',
      '**/*.OLD.*',
      '**/*.broken.*',
      'backup/**',
      'src/backup/**',
      'src/**/backup/**',
      'archive/**',
      'src/**/archive/**',
      // Exclude known WIP/broken files from lint scope for now
      'src/backend/api/middleware/rateLimiter.ts',
    ],
  },
  // TypeScript + React (narrowed to stable files)
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: [
      'src/App.tsx',
      // add more stable TS/TSX files here as they become lint-clean
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // TypeScript strict rules
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // Code quality rules
      'no-console': 'off', // We use structured logging
      'prefer-const': 'warn',
      'no-var': 'error',
      'eqeqeq': ['warn', 'always'],
      'no-duplicate-imports': 'error',
      'complexity': ['warn', 20],
      'max-lines': ['warn', 1000],
      'max-depth': ['warn', 5],
      'max-params': ['warn', 5],
      'no-unreachable': 'error',
      'no-empty': 'warn',

      // React specific
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  // Plain JS (Node)
  {
    files: ['src/backend/server.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: { ...globals.node },
    },
    rules: {
      // Keep defaults for server runtime code
    },
  },
  // TypeScript (Node)
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: [
      'src/backend/api/server.ts',
      'src/backend/api/app.ts',
      'src/backend/api/middleware/*.ts',
      'src/backend/api/routes/*.ts',
      'src/middleware/globalErrorHandler.ts'
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': 'warn',
      'no-var': 'error',
      'eqeqeq': ['warn', 'always'],
    },
  }
);
