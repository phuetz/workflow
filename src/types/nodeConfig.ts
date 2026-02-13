// Types for node configuration system

export interface FieldConfig {
  label: string;
  field: string;
  type: 'text' | 'password' | 'number' | 'email' | 'select' | 'checkbox' | 'expression' | 'json' | 'textarea' | 'boolean' | 'credentials' | 'datetime' | 'datetime-local' | 'url' | 'multiselect';
  placeholder?: string;
  options?: Array<{ value: string; label: string }> | ((config?: Record<string, unknown>) => Array<{ value: string; label: string }>);
  required?: boolean | ((config?: Record<string, unknown>) => boolean);
  validation?: (value: unknown, config?: Record<string, unknown>) => string | null;
  description?: string;
  defaultValue?: unknown;
  tooltip?: string;
  showWhen?: boolean | ((config?: Record<string, unknown>) => boolean);
  visible?: boolean | ((config?: Record<string, unknown>) => boolean);
  min?: number;
  max?: number;
  credentialTypes?: string[];
}

export interface NodeConfigDefinition {
  fields: FieldConfig[];
  validate?: (config: Record<string, unknown>) => Record<string, string>;
  validation?: Record<string, (value: unknown, config?: Record<string, unknown>) => string | null>;
  transform?: (config: Record<string, unknown>) => Record<string, unknown>;
  examples?: Array<{
    name?: string;
    label?: string;
    description?: string;
    config: Record<string, unknown>;
  }>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Common validation functions
export const validators = {
  required: (label: string) => (value: unknown) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return `${label} is required`;
    }
    return null;
  },

  url: (value: unknown) => {
    if (!value) return null;
    if (typeof value !== 'string') return 'URL must be a string';
    try {
      new URL(value);
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  },

  email: (value: unknown) => {
    if (!value) return null;
    if (typeof value !== 'string') return 'Email must be a string';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : 'Please enter a valid email';
  },

  json: (value: unknown) => {
    if (!value) return null;
    if (typeof value !== 'string') return 'JSON must be a string';
    try {
      JSON.parse(value);
      return null;
    } catch {
      return 'Please enter valid JSON';
    }
  },

  cronExpression: (value: unknown) => {
    if (!value) return null;
    if (typeof value !== 'string') return 'Cron expression must be a string';
    // Basic cron validation
    const parts = value.trim().split(/\s+/);
    if (parts.length < 5) {
      return 'Cron expression must have at least 5 parts';
    }
    return null;
  },

  apiKey: (label: string) => (value: unknown) => {
    if (!value) return `${label} is required`;
    if (typeof value !== 'string') return `${label} must be a string`;
    if (value.length < 10) return `${label} seems too short`;
    return null;
  },

  port: (value: unknown) => {
    if (value === null || value === undefined) return null;
    const port = typeof value === 'string' ? parseInt(value, 10) : typeof value === 'number' ? value : NaN;
    if (isNaN(port) || port < 1 || port > 65535) {
      return 'Port must be between 1 and 65535';
    }
    return null;
  },

  positiveNumber: (value: unknown) => {
    if (value === null || value === undefined) return null;
    const num = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : NaN;
    if (isNaN(num) || num <= 0) {
      return 'Must be a positive number';
    }
    return null;
  }
};

// Common field templates
export const commonFields = {
  apiKey: (label = 'API Key'): FieldConfig => ({
    label,
    field: 'apiKey',
    type: 'password',
    placeholder: 'Enter your API key',
    required: true,
    validation: validators.apiKey(label)
  }),

  url: (label = 'URL', field = 'url'): FieldConfig => ({
    label,
    field,
    type: 'text',
    placeholder: 'https://example.com',
    validation: validators.url
  }),

  email: (label = 'Email', field = 'email'): FieldConfig => ({
    label,
    field,
    type: 'email',
    placeholder: 'user@example.com',
    validation: validators.email
  }),

  database: (): FieldConfig[] => [
    {
      label: 'Host',
      field: 'host',
      type: 'text',
      placeholder: 'localhost',
      required: true,
      validation: validators.required('Host')
    },
    {
      label: 'Port',
      field: 'port',
      type: 'number',
      placeholder: '5432',
      validation: validators.port
    },
    {
      label: 'Database',
      field: 'database',
      type: 'text',
      placeholder: 'my_database',
      required: true,
      validation: validators.required('Database')
    },
    {
      label: 'Username',
      field: 'username',
      type: 'text',
      placeholder: 'postgres',
      required: true,
      validation: validators.required('Username')
    },
    {
      label: 'Password',
      field: 'password',
      type: 'password',
      required: true,
      validation: validators.required('Password')
    }
  ]
};