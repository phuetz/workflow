// Inline logger to avoid circular dependency during build
const logger = {
  debug: (msg: string, data?: unknown) => console.debug(`[ConfigService] ${msg}`, data),
  info: (msg: string, data?: unknown) => console.info(`[ConfigService] ${msg}`, data),
  warn: (msg: string, data?: unknown) => console.warn(`[ConfigService] ${msg}`, data),
  error: (msg: string, data?: unknown) => console.error(`[ConfigService] ${msg}`, data),
};
import { config, ConfigHelpers } from '../config/environment';
export interface EnvironmentConfig {
  name: string;
  apiUrl: string;
  apiKey: string;
  features: string[];
  maxConcurrentExecutions: number;
  rateLimit?: {
    requestsPerMinute: number;
    burstLimit: number;
  };
  monitoring?: {
    enabled: boolean;
    metricsEndpoint?: string;
    alertingEnabled?: boolean;
  };
  security?: {
    requiresAuth: boolean;
    sslRequired: boolean;
    corsEnabled: boolean;
    allowedOrigins?: string[];
  };
}

export interface ExternalServiceConfig {
  openai: {
    apiKey: string;
    baseUrl: string;
    organization?: string;
  };
  anthropic: {
    apiKey: string;
    baseUrl: string;
  };
  google: {
    apiKey: string;
    baseUrl: string;
  };
  azure: {
    apiKey: string;
    endpoint: string;
    deployment?: string;
  };
}

class ConfigService {
  private environments: Record<string, EnvironmentConfig>;
  private externalServices: ExternalServiceConfig;
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.environments = this.initializeEnvironments();
    this.externalServices = this.initializeExternalServices();
  }

  private initializeEnvironments(): Record<string, EnvironmentConfig> {
    return {
      dev: {
        name: 'Development',
        apiUrl: this.getEnvVar('REACT_APP_DEV_API_URL', 'http://localhost:3000'),
        apiKey: this.getEnvVar('REACT_APP_DEV_API_KEY', ''),
        features: ['debug', 'verbose_logging', 'hot_reload'],
        maxConcurrentExecutions: 10,
        rateLimit: {
          requestsPerMinute: 1000,
          burstLimit: 100
        },
        monitoring: {
          enabled: true,
          metricsEndpoint: '/metrics',
          alertingEnabled: false
        },
        security: {
          requiresAuth: false,
          sslRequired: false,
          corsEnabled: true,
          allowedOrigins: ['http://localhost:3000', 'http://localhost:3001']
        }
      },
      staging: {
        name: 'Staging',
        apiUrl: this.getEnvVar('REACT_APP_STAGING_API_URL', 'https://staging.api.company.com'),
        apiKey: this.getEnvVar('REACT_APP_STAGING_API_KEY', ''),
        features: ['performance_monitoring', 'load_testing'],
        maxConcurrentExecutions: 50,
        rateLimit: {
          requestsPerMinute: 5000,
          burstLimit: 500
        },
        monitoring: {
          enabled: true,
          metricsEndpoint: '/api/v1/metrics',
          alertingEnabled: true
        },
        security: {
          requiresAuth: true,
          sslRequired: true,
          corsEnabled: true,
          allowedOrigins: ['https://staging.company.com']
        }
      },
      prod: {
        name: 'Production',
        apiUrl: this.getEnvVar('REACT_APP_PROD_API_URL', 'https://api.company.com'),
        apiKey: this.getEnvVar('REACT_APP_PROD_API_KEY', ''),
        features: ['high_availability', 'auto_scaling', 'disaster_recovery'],
        maxConcurrentExecutions: 100,
        rateLimit: {
          requestsPerMinute: 10000,
          burstLimit: 1000
        },
        monitoring: {
          enabled: true,
          metricsEndpoint: '/api/v1/metrics',
          alertingEnabled: true
        },
        security: {
          requiresAuth: true,
          sslRequired: true,
          corsEnabled: false,
          allowedOrigins: ['https://company.com', 'https://app.company.com']
        }
      }
    };
  }

  private initializeExternalServices(): ExternalServiceConfig {
    return {
      openai: {
        apiKey: this.getEnvVar('REACT_APP_OPENAI_API_KEY', ''),
        baseUrl: 'https://api.openai.com/v1',
        organization: this.getEnvVar('REACT_APP_OPENAI_ORG_ID', '')
      },
      anthropic: {
        apiKey: this.getEnvVar('REACT_APP_ANTHROPIC_API_KEY', ''),
        baseUrl: 'https://api.anthropic.com/v1'
      },
      google: {
        apiKey: this.getEnvVar('REACT_APP_GOOGLE_AI_API_KEY', ''),
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta'
      },
      azure: {
        apiKey: this.getEnvVar('REACT_APP_AZURE_OPENAI_API_KEY', ''),
        endpoint: this.getEnvVar('REACT_APP_AZURE_OPENAI_ENDPOINT', ''),
        deployment: this.getEnvVar('REACT_APP_AZURE_OPENAI_DEPLOYMENT', '')
      }
    };
  }

  private getEnvVar(key: string, defaultValue: string): string {
    const value = import.meta.env[key];

    if (!value && this.isProduction && defaultValue === '') {
      logger.warn(`Missing required environment variable: ${key}`);
    }

    return value || defaultValue;
  }

  getEnvironment(envName: string): EnvironmentConfig | null {
    return this.environments[envName] || null;
  }

  getAllEnvironments(): Record<string, EnvironmentConfig> {
    return { ...this.environments };
  }

  getExternalService(serviceName: keyof ExternalServiceConfig): unknown {
    return this.externalServices[serviceName];
  }

  getAllExternalServices(): ExternalServiceConfig {
    return { ...this.externalServices };
  }

  validateConfiguration(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check environment configurations
    Object.entries(this.environments).forEach(([envName, config]) => {
      if (!config.apiUrl) {
        errors.push(`Missing API URL for environment: ${envName}`);
      }
      
      if (!config.apiKey && this.isProduction) {
        warnings.push(`Missing API key for environment: ${envName}`);
      }

      if (config.apiUrl && !this.isValidUrl(config.apiUrl)) {
        errors.push(`Invalid API URL for environment ${envName}: ${config.apiUrl}`);
      }
    });

    // Check external service configurations
    if (this.isProduction) {
      if (!this.externalServices.openai.apiKey) {
        warnings.push('Missing OpenAI API key - AI features will be disabled');
      }
      
      if (!this.externalServices.anthropic.apiKey) {
        warnings.push('Missing Anthropic API key - Claude integration will be disabled');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  getFeatureFlags(): Record<string, boolean> {
    return {
      debugMode: this.getEnvVar('REACT_APP_ENABLE_DEBUG_MODE', 'false') === 'true',
      telemetry: this.getEnvVar('REACT_APP_ENABLE_TELEMETRY', 'true') === 'true',
      betaFeatures: this.getEnvVar('REACT_APP_ENABLE_BETA_FEATURES', 'false') === 'true',
      aiFeatures: Boolean(this.externalServices.openai.apiKey || this.externalServices.anthropic.apiKey),
      monitoring: !this.isProduction || this.getEnvVar('REACT_APP_ENABLE_MONITORING', 'true') === 'true'
    };
  }

  updateEnvironmentConfig(envName: string, updates: Partial<EnvironmentConfig>): void {
    if (this.environments[envName]) {
      this.environments[envName] = {
        ...this.environments[envName],
        ...updates
      };
    }
  }

  exportConfiguration(): string {
    return JSON.stringify({
      environments: Object.fromEntries(
        Object.entries(this.environments).map(([key, config]) => [
          key,
          {
            ...config,
            apiKey: config.apiKey ? '***' : ''
          }
        ])
      ),
      featureFlags: this.getFeatureFlags(),
      hasExternalServices: {
        openai: Boolean(this.externalServices.openai.apiKey),
        anthropic: Boolean(this.externalServices.anthropic.apiKey),
        google: Boolean(this.externalServices.google.apiKey),
        azure: Boolean(this.externalServices.azure.apiKey)
      }
    }, null, 2);
  }
}

export const configService = new ConfigService();