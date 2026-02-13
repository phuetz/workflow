/**
 * Node Registry Types
 * Re-exports types from integrations and defines internal types
 */

export type {
  IntegrationNode,
  IntegrationCategory,
  NodeRegistry as INodeRegistry,
  ValidationResult,
  IntegrationMarketplace,
  MarketplaceFilters,
} from '../../types/integrations';

/**
 * Category metadata for display purposes
 */
export interface CategoryMetadata {
  name: string;
  displayName: string;
  icon: string;
  count: number;
}

/**
 * Category display name mapping
 */
export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  communication: 'Communication',
  crm: 'CRM',
  productivity: 'Productivity',
  ecommerce: 'E-commerce',
  social: 'Social Media',
  storage: 'Storage',
  databases: 'Databases',
  analytics: 'Analytics',
  development: 'Development',
  marketing: 'Marketing',
  ai: 'AI & ML',
  finance: 'Finance',
  utilities: 'Utilities',
  triggers: 'Triggers',
  custom: 'Custom'
};

/**
 * Category icon mapping
 */
export const CATEGORY_ICONS: Record<string, string> = {
  communication: 'message-square',
  crm: 'users',
  productivity: 'briefcase',
  ecommerce: 'shopping-cart',
  social: 'share-2',
  storage: 'hard-drive',
  databases: 'database',
  analytics: 'bar-chart',
  development: 'code',
  marketing: 'megaphone',
  ai: 'brain',
  finance: 'dollar-sign',
  utilities: 'tool',
  triggers: 'zap',
  custom: 'puzzle'
};
