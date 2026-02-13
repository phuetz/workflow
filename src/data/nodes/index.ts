// Auto-generated index file for node types
// This file combines all category-based node definitions

import { AI_NODES } from './ai';
import { ANALYTICS_NODES } from './analytics';
import { CLOUD_NODES } from './cloud';
import { COMMUNICATION_NODES } from './communication';
import { CRM_NODES } from './crm';
import { DATA_NODES } from './data';
import { DATABASE_NODES } from './database';
import { DEVOPS_NODES } from './devops';
import { ECOMMERCE_NODES } from './ecommerce';
import { FINANCE_NODES } from './finance';
import { FLOW_NODES } from './flow';
import { GOOGLE_NODES } from './google';
import { HR_NODES } from './hr';
import { IOT_NODES } from './iot';
import { MARKETING_NODES } from './marketing';
import { MICROSOFT_NODES } from './microsoft';
import { PRODUCTIVITY_NODES } from './productivity';
import { TRIGGERS_NODES } from './triggers';

import { NodeType } from '../../types/workflow';

// Re-export individual category constants
export { AI_NODES };
export { ANALYTICS_NODES };
export { CLOUD_NODES };
export { COMMUNICATION_NODES };
export { CRM_NODES };
export { DATA_NODES };
export { DATABASE_NODES };
export { DEVOPS_NODES };
export { ECOMMERCE_NODES };
export { FINANCE_NODES };
export { FLOW_NODES };
export { GOOGLE_NODES };
export { HR_NODES };
export { IOT_NODES };
export { MARKETING_NODES };
export { MICROSOFT_NODES };
export { PRODUCTIVITY_NODES };
export { TRIGGERS_NODES };

// Node categories for UI display
export const nodeCategories = {
  trigger: { name: 'Triggers', icon: '⚡' },
  core: { name: 'Core', icon: '🔧' },
  communication: { name: 'Communication', icon: '💬' },
  database: { name: 'Database', icon: '🗄️' },
  google: { name: 'Google', icon: '🔷' },
  microsoft: { name: 'Microsoft', icon: '🪟' },
  cloud: { name: 'Cloud', icon: '☁️' },
  development: { name: 'Development', icon: '👨‍💻' },
  devops: { name: 'DevOps', icon: '🔧' },
  ecommerce: { name: 'E-commerce', icon: '🛒' },
  ai: { name: 'AI & ML', icon: '🤖' },
  productivity: { name: 'Productivity', icon: '📊' },
  flow: { name: 'Flow Control', icon: '🔀' },
  data: { name: 'Data Processing', icon: '📊' },
  saas: { name: 'SaaS Platforms', icon: '🏢' },
  social: { name: 'Social Media', icon: '📱' },
  marketing: { name: 'Marketing', icon: '📧' },
  storage: { name: 'File Storage', icon: '💾' },
  support: { name: 'Customer Support', icon: '🎧' },
  analytics: { name: 'Analytics', icon: '📈' },
  crypto: { name: 'Cryptocurrency', icon: '₿' },
  finance: { name: 'Finance', icon: '💸' },
  crm: { name: 'CRM', icon: '👥' },
  accounting: { name: 'Accounting', icon: '📊' },
  signature: { name: 'E-Signature', icon: '✍️' },
  forms: { name: 'Forms & Surveys', icon: '📝' },
  scheduling: { name: 'Scheduling', icon: '📅' },
  baas: { name: 'Backend as Service', icon: '🔥' },
  langchain: { name: 'LangChain AI', icon: '🔗' },
  vectordb: { name: 'Vector Databases', icon: '🧠' },
  hr: { name: 'Human Resources', icon: '👥' },
  media: { name: 'Video & Media', icon: '🎬' },
  iot: { name: 'IoT & Hardware', icon: '🔌' },
};

// Combined nodeTypes object for backward compatibility
export const nodeTypes: Record<string, NodeType> = {
  ...AI_NODES,
  ...ANALYTICS_NODES,
  ...CLOUD_NODES,
  ...COMMUNICATION_NODES,
  ...CRM_NODES,
  ...DATA_NODES,
  ...DATABASE_NODES,
  ...DEVOPS_NODES,
  ...ECOMMERCE_NODES,
  ...FINANCE_NODES,
  ...FLOW_NODES,
  ...GOOGLE_NODES,
  ...HR_NODES,
  ...IOT_NODES,
  ...MARKETING_NODES,
  ...MICROSOFT_NODES,
  ...PRODUCTIVITY_NODES,
  ...TRIGGERS_NODES,
};
