/**
 * Node Registry Module
 * Barrel export for all registry components
 */

// Types
export type {
  IntegrationNode,
  IntegrationCategory,
  INodeRegistry,
  ValidationResult,
  IntegrationMarketplace,
  MarketplaceFilters,
  CategoryMetadata
} from './types';

export {
  CATEGORY_DISPLAY_NAMES,
  CATEGORY_ICONS
} from './types';

// Category Management
export { CategoryManager } from './CategoryManager';

// Marketplace Management
export { MarketplaceManager } from './MarketplaceManager';

// Node Validation
export { NodeValidator, validateNode } from './NodeValidator';

// Built-in Nodes
export {
  createHttpRequestNode,
  createCodeJavaScriptNode,
  createWebhookTriggerNode,
  createSlackNode,
  createGoogleSheetsNode,
  createGitHubNode,
  getUtilityNodes,
  getPriorityIntegrationNodes,
  getAllBuiltInNodes
} from './BuiltInNodes';
