/**
 * API Dashboard Types
 * Shared types for API dashboard components
 */

import type {
  APIKey,
  APIUsageStats,
  APIEndpoint,
  WebhookEndpoint
} from '../../../types/api';

// Tab types
export type APITabKey = 'keys' | 'docs' | 'cli' | 'webhooks' | 'analytics';

// Environment filter types
export type EnvironmentFilter = 'all' | 'development' | 'staging' | 'production';
export type Environment = 'development' | 'staging' | 'production';

// Common props interface
export interface DarkModeProps {
  darkMode: boolean;
}

// API Keys Tab props
export interface APIKeysTabProps extends DarkModeProps {
  apiKeys: APIKey[];
  searchQuery: string;
  filterEnv: EnvironmentFilter;
  onSearchChange: (query: string) => void;
  onFilterChange: (env: EnvironmentFilter) => void;
  onViewUsage: (key: APIKey) => void;
  onRotateKey: (keyId: string) => void;
  onDeleteKey: (keyId: string) => void;
  onCopy: (text: string) => void;
}

// API Docs Tab props
export interface APIDocsTabProps extends DarkModeProps {
  endpoints: APIEndpoint[];
  onCopy: (text: string) => void;
  onDownloadSpec: () => void;
}

// CLI Tab props
export interface APICLITabProps extends DarkModeProps {
  onCopy: (text: string) => void;
}

// Webhooks Tab props
export interface APIWebhooksTabProps extends DarkModeProps {
  webhooks: WebhookEndpoint[];
}

// Analytics Tab props
export interface APIAnalyticsTabProps extends DarkModeProps {
  usage: APIUsageStats | null;
}

// Modal props
export interface CreateAPIKeyModalProps extends DarkModeProps {
  onClose: () => void;
  onCreate: (options: CreateAPIKeyOptions) => void;
}

export interface NewAPIKeyModalProps extends DarkModeProps {
  apiKey: string;
  onClose: () => void;
  onCopy: (text: string) => void;
}

export interface UsageModalProps extends DarkModeProps {
  apiKey: APIKey;
  usage: APIUsageStats;
  onClose: () => void;
}

// Create API Key options (re-export for convenience)
export interface CreateAPIKeyOptions {
  name: string;
  description?: string;
  environment: Environment;
  permissions: APIPermission[];
  scopes: APIScope[];
  expiresIn?: number;
}

export interface APIPermission {
  resource: APIResource;
  actions: APIAction[];
}

export type APIResource =
  | 'workflow'
  | 'execution'
  | 'node'
  | 'credential'
  | 'variable'
  | 'schedule'
  | 'webhook'
  | 'analytics'
  | 'sharing';

export type APIAction = 'read' | 'write' | 'execute' | 'delete';

export type APIScope =
  | 'workflow:read' | 'workflow:write' | 'workflow:execute' | 'workflow:delete'
  | 'execution:read' | 'execution:write'
  | 'node:read' | 'node:write'
  | 'credential:read' | 'credential:write'
  | 'variable:read' | 'variable:write'
  | 'schedule:read' | 'schedule:write'
  | 'webhook:read' | 'webhook:write'
  | 'analytics:read'
  | 'sharing:read' | 'sharing:write';

// API Dashboard state
export interface APIDashboardState {
  activeTab: APITabKey;
  apiKeys: APIKey[];
  selectedKey: APIKey | null;
  showCreateModal: boolean;
  showKeyModal: boolean;
  showUsageModal: boolean;
  endpoints: APIEndpoint[];
  webhooks: WebhookEndpoint[];
  usage: APIUsageStats | null;
  searchQuery: string;
  filterEnv: EnvironmentFilter;
  newApiKey: string | null;
}

// Utility functions types
export interface APIKeyStatus {
  label: string;
  color: string;
}

// CLI command interface
export interface CLICommand {
  command: string;
  description: string;
}
