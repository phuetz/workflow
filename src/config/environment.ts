/**
 * Environment Configuration
 * Centralized configuration management for all environments
 */

// Lazy import to avoid circular dependency during bundling
const getLogger = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../services/LoggingService').logger;
  } catch {
    // Fallback during build time
    return {
      info: (msg: string, data?: unknown) => console.info(`[Config] ${msg}`, data),
      warn: (msg: string, data?: unknown) => console.warn(`[Config] ${msg}`, data),
      error: (msg: string, data?: unknown) => console.error(`[Config] ${msg}`, data),
    };
  }
};

export interface APIEndpoints {
  base: string;
  graphql: string;
  websocket: string;
  workflows: string;
  analytics: string;
  auth: string;
  webhooks: string;
  uploads: string;
  marketplace: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  ssl: boolean;
}

export interface SecurityConfig {
  allowedOrigins: string[];
  corsEnabled: boolean;
  httpsOnly: boolean;
  rateLimitEnabled: boolean;
  maxRequestsPerMinute: number;
}

export interface FeatureFlags {
  aiAssistant: boolean;
  visualDesigner: boolean;
  collaborativeEditing: boolean;
  advancedAnalytics: boolean;
  marketplaceIntegration: boolean;
  voiceCommands: boolean;
  edgeComputing: boolean;
  debugging: boolean;
}

export interface ExternalServices {
  openai: {
    apiUrl: string;
    model: string;
  };
  github: {
    apiUrl: string;
    webhookUrl: string;
  };
  slack: {
    webhookUrl: string;
    botToken: string;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
  };
  monitoring: {
    sentryDsn: string;
    logflareToken: string;
    amplitudeApiKey: string;
  };
}

export interface EnvironmentConfig {
  env: 'development' | 'staging' | 'production' | 'test';
  version: string;
  buildNumber: string;
  debug: boolean;
  api: APIEndpoints;
  database: DatabaseConfig;
  security: SecurityConfig;
  features: FeatureFlags;
  external: ExternalServices;
  timeouts: {
    apiRequest: number;
    workflowExecution: number;
    fileUpload: number;
    nodeExecution: number;
    httpRequest: number;
    marketplace: number;
    vectorStore: number;
    pluginEngine: number;
    connectionStatus: number;
    database: number;
    llmRequest: number;
    graphqlRequest: number;
    aiWorkflow: number;
    secretsHealthCheck: number;
    secretsRotation: number;
    secretsBackup: number;
    retry: number;
    shortDelay: number;
    mediumDelay: number;
    longDelay: number;
    uiAnimation: number;
  };
  limits: {
    maxWorkflowNodes: number;
    maxFileSize: number;
    maxConcurrentExecutions: number;
  };
}

/**
 * Get environment variable with fallback
 */
function getEnvVar(key: string, fallback: string = ''): string {
  const value = process.env[key];
  if (!value && fallback === '' && process.env.NODE_ENV === 'production') {
    getLogger().warn(`Missing required environment variable: ${key}`);
  }
  return value || fallback;
}

/**
 * Get environment variable as number
 */
function getEnvNumber(key: string, fallback: number): number {
  const value = getEnvVar(key, '');
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Get environment variable as boolean
 */
function getEnvBool(key: string, fallback: boolean): boolean {
  const value = getEnvVar(key, '');
  if (!value) return fallback;
  return value === 'true' || value === '1' || value === 'yes';
}

/**
 * Build API endpoints based on environment
 */
function buildAPIEndpoints(): APIEndpoints {
  const baseUrl = getEnvVar('VITE_API_URL',
    process.env.NODE_ENV === 'production' 
      ? 'https://api.workflowbuilder.com/v1'
      : 'http://localhost:3001/api/v1'
  );

  return {
    base: baseUrl,
    graphql: getEnvVar('VITE_GRAPHQL_URL', `${baseUrl}/graphql`),
    websocket: getEnvVar('VITE_WS_URL', baseUrl.replace('http', 'ws').replace('/api/v1', '/ws')),
    workflows: `${baseUrl}/workflows`,
    analytics: `${baseUrl}/analytics`,
    auth: `${baseUrl}/auth`,
    webhooks: `${baseUrl}/webhooks`,
    uploads: `${baseUrl}/uploads`,
    marketplace: `${baseUrl}/marketplace`
  };
}

/**
 * Build database configuration
 */
function buildDatabaseConfig(): DatabaseConfig {
  return {
    host: getEnvVar('DB_HOST', 'localhost'),
    port: getEnvNumber('DB_PORT', 5432),
    database: getEnvVar('DB_NAME', 'workflow_builder'),
    ssl: getEnvBool('DB_SSL', process.env.NODE_ENV === 'production')
  };
}

/**
 * Build security configuration
 */
function buildSecurityConfig(): SecurityConfig {
  const allowedOrigins = getEnvVar('CORS_ORIGINS',
    process.env.NODE_ENV === 'production' 
      ? 'https://workflowbuilder.com,https://app.workflowbuilder.com'
      : 'http://localhost:3000,http://localhost:3001,http://localhost:5173'
  ).split(',');

  return {
    allowedOrigins,
    corsEnabled: getEnvBool('CORS_ENABLED', true),
    httpsOnly: getEnvBool('HTTPS_ONLY', process.env.NODE_ENV === 'production'),
    rateLimitEnabled: getEnvBool('RATE_LIMIT_ENABLED', true),
    maxRequestsPerMinute: getEnvNumber('RATE_LIMIT_MAX', 100)
  };
}

/**
 * Build feature flags
 */
function buildFeatureFlags(): FeatureFlags {
  return {
    aiAssistant: getEnvBool('FEATURE_AI_ASSISTANT', true),
    visualDesigner: getEnvBool('FEATURE_VISUAL_DESIGNER', true),
    collaborativeEditing: getEnvBool('FEATURE_COLLABORATIVE_EDITING', false),
    advancedAnalytics: getEnvBool('FEATURE_ADVANCED_ANALYTICS', true),
    marketplaceIntegration: getEnvBool('FEATURE_MARKETPLACE', true),
    voiceCommands: getEnvBool('FEATURE_VOICE_COMMANDS', false),
    edgeComputing: getEnvBool('FEATURE_EDGE_COMPUTING', false),
    debugging: getEnvBool('FEATURE_DEBUGGING', process.env.NODE_ENV !== 'production')
  };
}

/**
 * Build external services configuration
 */
function buildExternalServices(): ExternalServices {
  return {
    openai: {
      apiUrl: getEnvVar('OPENAI_API_URL', 'https://api.openai.com/v1'),
      model: getEnvVar('OPENAI_MODEL', 'gpt-4')
    },
    github: {
      apiUrl: getEnvVar('GITHUB_API_URL', 'https://api.github.com'),
      webhookUrl: getEnvVar('GITHUB_WEBHOOK_URL', '')
    },
    slack: {
      webhookUrl: getEnvVar('SLACK_WEBHOOK_URL', ''),
      botToken: getEnvVar('SLACK_BOT_TOKEN', '')
    },
    email: {
      smtpHost: getEnvVar('SMTP_HOST', 'localhost'),
      smtpPort: getEnvNumber('SMTP_PORT', 587),
      smtpSecure: getEnvBool('SMTP_SECURE', true)
    },
    monitoring: {
      sentryDsn: getEnvVar('SENTRY_DSN', ''),
      logflareToken: getEnvVar('LOGFLARE_TOKEN', ''),
      amplitudeApiKey: getEnvVar('AMPLITUDE_API_KEY', '')
    }
  };
}

/**
 * Load and validate environment configuration
 */
function loadEnvironmentConfig(): EnvironmentConfig {
  const env = (getEnvVar('VITE_APP_ENV', process.env.NODE_ENV || 'development') as 'development' | 'staging' | 'production' | 'test');

  const config: EnvironmentConfig = {
    env,
    version: getEnvVar('VITE_APP_VERSION', '1.0.0'),
    buildNumber: getEnvVar('VITE_BUILD_NUMBER', Date.now().toString()),
    debug: getEnvBool('VITE_DEBUG', env === 'development'),
    api: buildAPIEndpoints(),
    database: buildDatabaseConfig(),
    security: buildSecurityConfig(),
    features: buildFeatureFlags(),
    external: buildExternalServices(),
    timeouts: {
      apiRequest: getEnvNumber('TIMEOUT_API_REQUEST', 30000),
      workflowExecution: getEnvNumber('TIMEOUT_WORKFLOW_EXECUTION', 300000),
      fileUpload: getEnvNumber('TIMEOUT_FILE_UPLOAD', 60000),
      nodeExecution: getEnvNumber('TIMEOUT_NODE_EXECUTION', 120000),
      httpRequest: getEnvNumber('TIMEOUT_HTTP_REQUEST', 30000),
      marketplace: getEnvNumber('TIMEOUT_MARKETPLACE', 10000),
      vectorStore: getEnvNumber('TIMEOUT_VECTOR_STORE', 30000),
      pluginEngine: getEnvNumber('TIMEOUT_PLUGIN_ENGINE', 15000),
      connectionStatus: getEnvNumber('TIMEOUT_CONNECTION_STATUS', 5000),
      database: getEnvNumber('TIMEOUT_DATABASE', 30000),
      llmRequest: getEnvNumber('TIMEOUT_LLM_REQUEST', 30000),
      graphqlRequest: getEnvNumber('TIMEOUT_GRAPHQL_REQUEST', 30000),
      aiWorkflow: getEnvNumber('TIMEOUT_AI_WORKFLOW', 30000),
      secretsHealthCheck: getEnvNumber('TIMEOUT_SECRETS_HEALTH_CHECK', 3600000), // 1 hour
      secretsRotation: getEnvNumber('TIMEOUT_SECRETS_ROTATION', 86400000), // 24 hours
      secretsBackup: getEnvNumber('TIMEOUT_SECRETS_BACKUP', 86400000), // 24 hours
      retry: getEnvNumber('TIMEOUT_RETRY', 1000),
      shortDelay: getEnvNumber('TIMEOUT_SHORT_DELAY', 100),
      mediumDelay: getEnvNumber('TIMEOUT_MEDIUM_DELAY', 2000),
      longDelay: getEnvNumber('TIMEOUT_LONG_DELAY', 3000),
      uiAnimation: getEnvNumber('TIMEOUT_UI_ANIMATION', 1000),
    },
    limits: {
      maxWorkflowNodes: getEnvNumber('LIMIT_MAX_WORKFLOW_NODES', 1000),
      maxFileSize: getEnvNumber('LIMIT_MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
      maxConcurrentExecutions: getEnvNumber('LIMIT_MAX_CONCURRENT_EXECUTIONS', 10)
    }
  };

  // Validate critical configuration
  validateConfig(config);

  getLogger().info('Environment configuration loaded', {
    env: config.env,
    version: config.version,
    debug: config.debug,
    featuresEnabled: Object.entries(config.features)
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature)
  });

  return config;
}

/**
 * Validate configuration
 */
function validateConfig(config: EnvironmentConfig): void {
  const errors: string[] = [];

  // Validate API endpoints
  if (!config.api.base) {
    errors.push('API base URL is required');
  }

  // Validate production settings
  if (config.env === 'production') {
    if (!config.security.httpsOnly) {
      errors.push('HTTPS must be enabled in production');
    }
    
    if (config.debug) {
      getLogger().warn('Debug mode is enabled in production');
    }
  }

  // Validate database settings
  if (!config.database.host) {
    errors.push('Database host is required');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }
}

/**
 * Environment configuration singleton
 */
export const config = loadEnvironmentConfig();

/**
 * Helper functions to access configuration
 */
export const ConfigHelpers = {
  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return config.features[feature];
  },

  /**
   * Get API endpoint with path
   */
  getApiUrl(path: string = ''): string {
    return `${config.api.base}${path}`;
  },

  /**
   * Get WebSocket URL
   */
  getWebSocketUrl(): string {
    return config.api.websocket;
  },

  /**
   * Check if running in development
   */
  isDevelopment(): boolean {
    return config.env === 'development';
  },

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    return config.env === 'production';
  },

  /**
   * Get timeout for specific operation
   */
  getTimeout(operation: keyof typeof config.timeouts): number {
    return config.timeouts[operation];
  },

  /**
   * Get limit for specific resource
   */
  getLimit(resource: keyof typeof config.limits): number {
    return config.limits[resource];
  }
};

// Export configuration as default
export default config;