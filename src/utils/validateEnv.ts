/**
 * Environment Variables Validation
 * Validates required environment variables at startup
 */

import { logger } from '../services/SimpleLogger';

export interface EnvConfig {
  // Node Environment
  NODE_ENV: string;
  PORT: string;
  API_PORT: string;

  // Database
  DATABASE_URL?: string;

  // Redis
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: string;

  // Security
  JWT_SECRET?: string;
  JWT_REFRESH_SECRET?: string;
  ENCRYPTION_KEY?: string;
  SESSION_SECRET?: string;

  // CORS
  CORS_ORIGIN?: string;

  // Rate Limiting
  RATE_LIMIT_WINDOW?: string;
  RATE_LIMIT_MAX?: string;

  // Optional API Keys
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GOOGLE_AI_API_KEY?: string;

  // Monitoring
  SENTRY_DSN?: string;
  LOG_LEVEL?: string;
}

interface ValidationRule {
  required: boolean;
  pattern?: RegExp;
  minLength?: number;
  validator?: (value: string) => boolean;
  message?: string;
}

const envSchema: Record<keyof EnvConfig, ValidationRule> = {
  // Required in all environments
  NODE_ENV: {
    required: true,
    validator: (v) => ['development', 'production', 'test', 'staging'].includes(v),
    message: 'NODE_ENV must be one of: development, production, test, staging'
  },
  PORT: {
    required: true,
    pattern: /^\d+$/,
    message: 'PORT must be a valid number'
  },
  API_PORT: {
    required: true,
    pattern: /^\d+$/,
    message: 'API_PORT must be a valid number'
  },

  // Required in production
  DATABASE_URL: {
    required: false, // Will be checked conditionally
    pattern: /^postgres(ql)?:\/\/.+/,
    message: 'DATABASE_URL must be a valid PostgreSQL connection string'
  },
  REDIS_URL: {
    required: false,
    pattern: /^redis:\/\/.+/,
    message: 'REDIS_URL must be a valid Redis connection string'
  },
  REDIS_HOST: {
    required: false
  },
  REDIS_PORT: {
    required: false,
    pattern: /^\d+$/
  },

  // Security - Required in production
  JWT_SECRET: {
    required: false,
    minLength: 32,
    message: 'JWT_SECRET must be at least 32 characters long'
  },
  JWT_REFRESH_SECRET: {
    required: false,
    minLength: 32,
    message: 'JWT_REFRESH_SECRET must be at least 32 characters long'
  },
  ENCRYPTION_KEY: {
    required: false,
    minLength: 32,
    message: 'ENCRYPTION_KEY must be at least 32 characters long'
  },
  SESSION_SECRET: {
    required: false,
    minLength: 32,
    message: 'SESSION_SECRET must be at least 32 characters long'
  },

  // Configuration
  CORS_ORIGIN: {
    required: false
  },
  RATE_LIMIT_WINDOW: {
    required: false,
    pattern: /^\d+$/
  },
  RATE_LIMIT_MAX: {
    required: false,
    pattern: /^\d+$/
  },

  // Optional
  OPENAI_API_KEY: { required: false },
  ANTHROPIC_API_KEY: { required: false },
  GOOGLE_AI_API_KEY: { required: false },
  SENTRY_DSN: { required: false },
  LOG_LEVEL: {
    required: false,
    validator: (v) => ['error', 'warn', 'info', 'debug', 'silly'].includes(v)
  }
};

export class EnvValidationError extends Error {
  constructor(public errors: string[]) {
    super(`Environment validation failed:\n${errors.join('\n')}`);
    this.name = 'EnvValidationError';
  }
}

/**
 * Validate environment variables
 */
export function validateEnv(strictMode = false): EnvConfig {
  const errors: string[] = [];
  const warnings: string[] = [];
  const env = process.env;
  const isProduction = env.NODE_ENV === 'production';
  const isTest = env.NODE_ENV === 'test';

  // Production-specific required variables
  const productionRequired = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'ENCRYPTION_KEY',
    'SESSION_SECRET'
  ];

  for (const [key, rule] of Object.entries(envSchema)) {
    const value = env[key];

    // Check if required
    const isRequired = rule.required ||
      (isProduction && productionRequired.includes(key)) ||
      (strictMode && !isTest);

    if (isRequired && !value) {
      errors.push(`❌ ${key} is required but not set`);
      continue;
    }

    if (!value) {
      if (isProduction && !productionRequired.includes(key)) {
        warnings.push(`⚠️  ${key} is not set (using default or disabled)`);
      }
      continue;
    }

    // Validate pattern
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(`❌ ${key}: ${rule.message || 'Invalid format'}`);
    }

    // Validate min length
    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`❌ ${key}: ${rule.message || `Must be at least ${rule.minLength} characters`}`);
    }

    // Custom validator
    if (rule.validator && !rule.validator(value)) {
      errors.push(`❌ ${key}: ${rule.message || 'Invalid value'}`);
    }
  }

  // Additional validations
  if (isProduction) {
    // Check for default/insecure values
    const insecureValues = [
      'your-super-secret',
      'change-me',
      'your_',
      'secret',
      'password',
      '123456'
    ];

    const securityKeys = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY', 'SESSION_SECRET'];
    for (const key of securityKeys) {
      const value = env[key];
      if (value && insecureValues.some(insecure => value.toLowerCase().includes(insecure))) {
        errors.push(`❌ ${key} appears to use a default/insecure value. Use a strong random string.`);
      }
    }

    // Check CORS in production
    if (!env.CORS_ORIGIN || env.CORS_ORIGIN === '*') {
      errors.push(`❌ CORS_ORIGIN must be set to specific origins in production (not '*')`);
    }
  }

  // Log results
  if (warnings.length > 0) {
    logger.warn('Environment validation warnings:');
    warnings.forEach(w => logger.warn(w));
  }

  if (errors.length > 0) {
    logger.error('Environment validation failed:');
    errors.forEach(e => logger.error(e));
    throw new EnvValidationError(errors);
  }

  logger.info('✅ Environment validation passed');
  logger.info(`   Environment: ${env.NODE_ENV}`);
  logger.info(`   Port: ${env.PORT}`);
  logger.info(`   API Port: ${env.API_PORT}`);

  if (isProduction) {
    logger.info('   Database: ✅ Configured');
    logger.info('   Redis: ' + (env.REDIS_URL ? '✅ Configured' : '⚠️  Not configured (using memory fallback)'));
    logger.info('   Security: ✅ Secrets configured');
  }

  // Return a properly typed EnvConfig object
  return {
    NODE_ENV: env.NODE_ENV || 'development',
    PORT: env.PORT || '3000',
    API_PORT: env.API_PORT || '5000',
    DATABASE_URL: env.DATABASE_URL,
    REDIS_URL: env.REDIS_URL,
    REDIS_HOST: env.REDIS_HOST,
    REDIS_PORT: env.REDIS_PORT,
    JWT_SECRET: env.JWT_SECRET,
    JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET,
    ENCRYPTION_KEY: env.ENCRYPTION_KEY,
    SESSION_SECRET: env.SESSION_SECRET,
    CORS_ORIGIN: env.CORS_ORIGIN,
    RATE_LIMIT_WINDOW: env.RATE_LIMIT_WINDOW,
    RATE_LIMIT_MAX: env.RATE_LIMIT_MAX,
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
    GOOGLE_AI_API_KEY: env.GOOGLE_AI_API_KEY,
    SENTRY_DSN: env.SENTRY_DSN,
    LOG_LEVEL: env.LOG_LEVEL
  };
}

/**
 * Get a required environment variable or throw
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get an optional environment variable with default
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * Generate a secure random secret
 * Useful for development/testing
 */
export function generateSecret(length = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+';
  let secret = '';
  const crypto = require('crypto');
  const bytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    secret += chars[bytes[i] % chars.length];
  }

  return secret;
}

/**
 * Print environment setup guide
 */
export function printEnvSetupGuide(): void {
  logger.debug('\n' + '='.repeat(70));
  logger.debug('  ENVIRONMENT SETUP REQUIRED');
  logger.debug('='.repeat(70));
  logger.debug('\nMissing required environment variables.');
  logger.debug('\nQuick setup for development:\n');
  logger.debug('  cp .env.example .env.local');
  logger.debug('  # Edit .env.local with your values\n');
  logger.debug('Or use these generated secrets:\n');
  logger.debug(`  JWT_SECRET="${generateSecret(64)}"`);
  logger.debug(`  JWT_REFRESH_SECRET="${generateSecret(64)}"`);
  logger.debug(`  ENCRYPTION_KEY="${generateSecret(32)}"`);
  logger.debug(`  SESSION_SECRET="${generateSecret(64)}"`);
  logger.debug('\n' + '='.repeat(70) + '\n');
}
