// This file now re-exports from the modularized node definitions
// Node types have been split into category-based files in ./nodes/
// See ./nodes/index.ts for the combined export

export { nodeTypes, nodeCategories } from './nodes';

// Re-export individual category constants for direct imports
export {
  TRIGGERS_NODES,
  FLOW_NODES,
  DATA_NODES,
  DATABASE_NODES,
  COMMUNICATION_NODES,
  AI_NODES,
  ANALYTICS_NODES,
  CLOUD_NODES,
  CRM_NODES,
  ECOMMERCE_NODES,
  FINANCE_NODES,
  HR_NODES,
  MARKETING_NODES,
  DEVOPS_NODES,
  PRODUCTIVITY_NODES,
  GOOGLE_NODES,
  MICROSOFT_NODES,
  IOT_NODES
} from './nodes';
