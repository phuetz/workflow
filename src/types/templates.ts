/**
 * Workflow Templates System Types
 * Pre-built workflow templates for quick deployment
 */

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  subcategory?: string;
  author: string;
  authorType: 'official' | 'community' | 'verified';
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';

  // Template content
  workflow: TemplateWorkflow;

  // Metadata (optional for simplified templates)
  version?: string;
  createdAt?: Date;
  updatedAt?: Date;
  downloads?: number;
  rating?: number;
  reviewCount?: number;
  featured?: boolean;

  // Requirements (optional for simplified templates)
  requiredIntegrations?: string[];
  requiredCredentials?: string[];
  estimatedSetupTime?: number; // minutes

  // Documentation (optional for simplified templates)
  documentation?: TemplateDocumentation;
  screenshots?: string[];
  videoUrl?: string;

  // Customization
  customizableFields?: CustomizableField[];

  // Pricing
  pricing?: 'free' | 'premium' | 'enterprise';
  price?: number;
}

export type TemplateCategory =
  | 'business_automation'
  | 'marketing'
  | 'sales'
  | 'customer_support'
  | 'data_processing'
  | 'notifications'
  | 'social_media'
  | 'ecommerce'
  | 'finance'
  | 'hr'
  | 'development'
  | 'analytics'
  | 'productivity'
  | 'integration'
  | 'monitoring'
  | 'communication'
  | 'devops'
  | 'iot'
  | 'security'
  | 'lead_generation'
  | 'events'
  | 'compliance'
  | 'web3'
  | 'data'
  | 'ai'
  | 'creative'
  | 'chat'
  | 'forms'
  | 'utilities'
  | 'support'
  | 'social';

export interface TemplateWorkflow {
  nodes: TemplateNode[];
  edges: TemplateEdge[];
  variables?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export interface TemplateNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    properties?: Record<string, unknown>;
    config?: Record<string, unknown>;
    credentials?: string[];
    notes?: string;
  };
  // Customization hints
  customizable?: boolean;
  required?: boolean;
  description?: string;
}

export interface TemplateEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  label?: string;
}

export interface CustomizableField {
  nodeId: string;
  propertyPath: string;
  displayName: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'credential';
  required: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: unknown }>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    required?: boolean;
  };
}

export interface TemplateDocumentation {
  overview: string;
  setup: SetupStep[];
  usage: string;
  troubleshooting?: TroubleshootingItem[];
  changelog?: ChangelogEntry[];
  relatedTemplates?: string[];
}

export interface SetupStep {
  step: number;
  title: string;
  description: string;
  screenshot?: string;
  codeExample?: string;
  links?: Array<{ title: string; url: string }>;
}

export interface TroubleshootingItem {
  problem: string;
  solution: string;
  links?: Array<{ title: string; url: string }>;
}

export interface ChangelogEntry {
  version: string;
  date: Date;
  changes: string[];
  breaking?: boolean;
}

export interface TemplateMarketplace {
  featured: WorkflowTemplate[];
  categories: Array<{
    name: TemplateCategory;
    displayName: string;
    icon: string;
    count: number;
    templates: WorkflowTemplate[];
  }>;
  popular: WorkflowTemplate[];
  recent: WorkflowTemplate[];
  trending: WorkflowTemplate[];
  search: (query: string, filters?: TemplateFilters) => WorkflowTemplate[];
}

export interface TemplateFilters {
  category?: TemplateCategory;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  pricing?: 'free' | 'premium' | 'enterprise';
  authorType?: 'official' | 'community' | 'verified';
  minRating?: number;
  maxSetupTime?: number;
  tags?: string[];
  requiredIntegrations?: string[];
}

export interface TemplateInstallation {
  templateId: string;
  workflowId: string;
  customizations: Record<string, unknown>;
  installedAt: Date;
  version: string;
  status: 'installing' | 'configuring' | 'ready' | 'error';
  errors?: string[];
}

// Popular workflow templates to implement
export const POPULAR_TEMPLATES: Array<{
  name: string;
  category: TemplateCategory;
  description: string;
  popularity: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}> = [
  // Business Automation
  {
    name: 'Lead Qualification Pipeline',
    category: 'business_automation',
    description: 'Automatically qualify and route leads based on criteria',
    popularity: 95,
    difficulty: 'intermediate'
  },
  {
    name: 'Invoice Processing Automation',
    category: 'business_automation', 
    description: 'Extract data from invoices and update accounting systems',
    popularity: 85,
    difficulty: 'intermediate'
  },
  {
    name: 'Employee Onboarding Workflow',
    category: 'hr',
    description: 'Automate new employee setup across multiple systems',
    popularity: 80,
    difficulty: 'beginner'
  },

  // Marketing
  {
    name: 'Social Media Cross-Posting',
    category: 'social_media',
    description: 'Post content across multiple social media platforms',
    popularity: 90,
    difficulty: 'beginner'
  },
  {
    name: 'Email Campaign Automation',
    category: 'marketing',
    description: 'Trigger personalized email campaigns based on user actions',
    popularity: 88,
    difficulty: 'intermediate'
  },
  {
    name: 'Lead Nurturing Sequence',
    category: 'marketing',
    description: 'Automated email sequences for lead nurturing',
    popularity: 85,
    difficulty: 'intermediate'
  },

  // Customer Support
  {
    name: 'Ticket Routing System',
    category: 'customer_support',
    description: 'Automatically route support tickets to appropriate teams',
    popularity: 82,
    difficulty: 'beginner'
  },
  {
    name: 'Customer Satisfaction Survey',
    category: 'customer_support',
    description: 'Send surveys after ticket resolution and track responses',
    popularity: 75,
    difficulty: 'beginner'
  },

  // Data Processing
  {
    name: 'Daily Data Sync',
    category: 'data_processing',
    description: 'Sync data between different systems on a schedule',
    popularity: 87,
    difficulty: 'intermediate'
  },
  {
    name: 'Data Validation Pipeline',
    category: 'data_processing',
    description: 'Validate and clean incoming data before storage',
    popularity: 78,
    difficulty: 'advanced'
  },
  {
    name: 'Report Generation Automation',
    category: 'analytics',
    description: 'Generate and distribute reports automatically',
    popularity: 83,
    difficulty: 'intermediate'
  },

  // E-commerce
  {
    name: 'Order Fulfillment Automation',
    category: 'ecommerce',
    description: 'Automate order processing and shipping notifications',
    popularity: 89,
    difficulty: 'intermediate'
  },
  {
    name: 'Inventory Alert System',
    category: 'ecommerce',
    description: 'Monitor inventory levels and send low stock alerts',
    popularity: 76,
    difficulty: 'beginner'
  },
  {
    name: 'Abandoned Cart Recovery',
    category: 'ecommerce',
    description: 'Send personalized emails to recover abandoned carts',
    popularity: 84,
    difficulty: 'intermediate'
  },

  // Development
  {
    name: 'CI/CD Pipeline Integration',
    category: 'development',
    description: 'Integrate with CI/CD pipelines for deployment notifications',
    popularity: 79,
    difficulty: 'advanced'
  },
  {
    name: 'Bug Report Automation',
    category: 'development',
    description: 'Automatically create bug reports from error monitoring',
    popularity: 72,
    difficulty: 'intermediate'
  },

  // Finance
  {
    name: 'Expense Report Processing',
    category: 'finance',
    description: 'Process and approve expense reports automatically',
    popularity: 77,
    difficulty: 'intermediate'
  },
  {
    name: 'Payment Reminder System',
    category: 'finance',
    description: 'Send automated payment reminders for overdue invoices',
    popularity: 81,
    difficulty: 'beginner'
  },

  // Notifications & Monitoring
  {
    name: 'System Health Monitor',
    category: 'monitoring',
    description: 'Monitor system health and send alerts when issues occur',
    popularity: 86,
    difficulty: 'intermediate'
  },
  {
    name: 'Website Uptime Monitor',
    category: 'monitoring',
    description: 'Monitor website uptime and notify team of outages',
    popularity: 80,
    difficulty: 'beginner'
  },

  // Productivity
  {
    name: 'Meeting Scheduler',
    category: 'productivity',
    description: 'Automatically schedule meetings based on availability',
    popularity: 74,
    difficulty: 'intermediate'
  },
  {
    name: 'Task Assignment Automation',
    category: 'productivity',
    description: 'Automatically assign tasks based on team workload',
    popularity: 73,
    difficulty: 'intermediate'
  }
];

export interface TemplateService {
  getAll: () => WorkflowTemplate[];
  getById: (id: string) => WorkflowTemplate | undefined;
  getByCategory: (category: TemplateCategory) => WorkflowTemplate[];
  search: (query: string, filters?: TemplateFilters) => WorkflowTemplate[];
  getFeatured: () => WorkflowTemplate[];
  getPopular: (limit?: number) => WorkflowTemplate[];
  getRecent: (limit?: number) => WorkflowTemplate[];
  install: (templateId: string, customizations?: Record<string, unknown>) => Promise<TemplateInstallation>;
  uninstall: (installationId: string) => Promise<void>;
  getInstallations: () => TemplateInstallation[];
  updateTemplate: (templateId: string, updates: Partial<WorkflowTemplate>) => Promise<void>;
  createTemplate: (workflow: Record<string, unknown>) => Promise<WorkflowTemplate>;
  publishTemplate: (templateId: string) => Promise<void>;
  getMarketplace: (filters?: TemplateFilters) => TemplateMarketplace;
}