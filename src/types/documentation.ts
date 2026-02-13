/**
 * Documentation System Types
 * Comprehensive documentation for workflows, nodes, and platform features
 */

export interface DocumentationSection {
  id: string;
  title: string;
  description: string;
  type: DocumentationType;
  category: DocumentationCategory;
  content: DocumentationContent;
  metadata: DocumentationMetadata;
  searchTerms: string[];
  relatedSections: string[];
  lastUpdated: Date;
  version: string;
}

export type DocumentationType = 
  | 'guide'
  | 'tutorial' 
  | 'reference'
  | 'api'
  | 'troubleshooting'
  | 'faq'
  | 'examples'
  | 'changelog';

export type DocumentationCategory =
  | 'getting_started'
  | 'workflow_building'
  | 'node_reference'
  | 'integrations'
  | 'api_reference'
  | 'troubleshooting'
  | 'advanced'
  | 'security'
  | 'deployment'
  | 'community';

export interface DocumentationContent {
  markdown: string;
  sections: ContentSection[];
  codeExamples?: CodeExample[];
  screenshots?: string[];
  videos?: VideoContent[];
  interactiveDemo?: string; // URL or component reference
}

export interface ContentSection {
  id: string;
  title: string;
  level: number; // Heading level (1-6)
  content: string;
  anchor: string;
  subSections?: ContentSection[];
}

export interface CodeExample {
  id: string;
  title: string;
  description: string;
  language: 'javascript' | 'python' | 'json' | 'yaml' | 'bash' | 'sql';
  code: string;
  runnable?: boolean;
  expectedOutput?: string;
  context?: 'workflow' | 'node' | 'api' | 'configuration';
}

export interface VideoContent {
  id: string;
  title: string;
  description: string;
  url: string;
  duration: number; // seconds
  thumbnail: string;
  transcript?: string;
  chapters?: VideoChapter[];
}

export interface VideoChapter {
  title: string;
  startTime: number; // seconds
  description?: string;
}

export interface DocumentationMetadata {
  author: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number; // minutes
  tags: string[];
  prerequisites?: string[];
  targetAudience: ('developer' | 'business_user' | 'admin' | 'analyst')[];
  featured: boolean;
  popular: boolean;
}

export interface DocumentationSearchResult {
  section: DocumentationSection;
  relevanceScore: number;
  matchedTerms: string[];
  matchedContent: string[];
  highlights: SearchHighlight[];
}

export interface SearchHighlight {
  text: string;
  startIndex: number;
  endIndex: number;
  type: 'title' | 'content' | 'code' | 'tag';
}

export interface DocumentationNavigation {
  sections: NavigationSection[];
  quickLinks: QuickLink[];
  searchSuggestions: string[];
}

export interface NavigationSection {
  id: string;
  title: string;
  icon: string;
  category: DocumentationCategory;
  items: NavigationItem[];
  collapsed?: boolean;
}

export interface NavigationItem {
  id: string;
  title: string;
  path: string;
  type: DocumentationType;
  badge?: string; // 'new', 'updated', 'popular'
  subItems?: NavigationItem[];
}

export interface QuickLink {
  title: string;
  description: string;
  path: string;
  icon: string;
  category: 'popular' | 'new' | 'essential';
}

export interface DocumentationConfig {
  searchEnabled: boolean;
  feedbackEnabled: boolean;
  printEnabled: boolean;
  offlineEnabled: boolean;
  analytics: {
    trackPageViews: boolean;
    trackSearchQueries: boolean;
    trackFeedback: boolean;
  };
  customization: {
    primaryColor: string;
    logoUrl: string;
    favicon: string;
    customCSS?: string;
  };
}

export interface DocumentationFeedback {
  sectionId: string;
  type: 'helpful' | 'not_helpful' | 'suggestion' | 'error';
  rating?: number; // 1-5
  comment?: string;
  userInfo?: {
    role: string;
    experience: string;
  };
  timestamp: Date;
}

export interface DocumentationAnalytics {
  pageViews: Record<string, number>;
  searchQueries: SearchQuery[];
  popularSections: string[];
  feedbackSummary: FeedbackSummary;
  userEngagement: EngagementMetrics;
}

export interface SearchQuery {
  query: string;
  timestamp: Date;
  resultsCount: number;
  clickedResult?: string;
}

export interface FeedbackSummary {
  totalFeedback: number;
  averageRating: number;
  helpfulPercentage: number;
  commonSuggestions: string[];
}

export interface EngagementMetrics {
  averageTimeOnPage: Record<string, number>; // seconds
  bounceRate: Record<string, number>; // percentage
  scrollDepth: Record<string, number>; // percentage
}

// Pre-defined documentation structure
export const DOCUMENTATION_STRUCTURE: NavigationSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: 'rocket',
    category: 'getting_started',
    items: [
      { id: 'welcome', title: 'Welcome to Workflow Automation', path: '/docs/welcome', type: 'guide', badge: 'essential' },
      { id: 'quick-start', title: 'Quick Start Guide', path: '/docs/quick-start', type: 'tutorial', badge: 'essential' },
      { id: 'first-workflow', title: 'Your First Workflow', path: '/docs/first-workflow', type: 'tutorial', badge: 'essential' },
      { id: 'concepts', title: 'Core Concepts', path: '/docs/concepts', type: 'guide' },
      { id: 'installation', title: 'Installation & Setup', path: '/docs/installation', type: 'guide' }
    ]
  },
  {
    id: 'workflow-building',
    title: 'Building Workflows',
    icon: 'workflow',
    category: 'workflow_building',
    items: [
      { id: 'workflow-editor', title: 'Workflow Editor', path: '/docs/workflow-editor', type: 'guide' },
      { id: 'nodes-overview', title: 'Working with Nodes', path: '/docs/nodes-overview', type: 'guide' },
      { id: 'connections', title: 'Connecting Nodes', path: '/docs/connections', type: 'guide' },
      { id: 'data-flow', title: 'Understanding Data Flow', path: '/docs/data-flow', type: 'guide' },
      { id: 'expressions', title: 'Expressions & Variables', path: '/docs/expressions', type: 'reference' },
      { id: 'conditional-logic', title: 'Conditional Logic', path: '/docs/conditional-logic', type: 'guide' },
      { id: 'loops', title: 'Loops & Iterations', path: '/docs/loops', type: 'guide' },
      { id: 'error-handling', title: 'Error Handling', path: '/docs/error-handling', type: 'guide' },
      { id: 'testing', title: 'Testing Workflows', path: '/docs/testing', type: 'guide', badge: 'popular' },
      { id: 'debugging', title: 'Debugging', path: '/docs/debugging', type: 'guide' }
    ]
  },
  {
    id: 'node-reference',
    title: 'Node Reference',
    icon: 'puzzle',
    category: 'node_reference',
    items: [
      { id: 'core-nodes', title: 'Core Nodes', path: '/docs/core-nodes', type: 'reference' },
      { id: 'trigger-nodes', title: 'Trigger Nodes', path: '/docs/trigger-nodes', type: 'reference' },
      { id: 'action-nodes', title: 'Action Nodes', path: '/docs/action-nodes', type: 'reference' },
      { id: 'utility-nodes', title: 'Utility Nodes', path: '/docs/utility-nodes', type: 'reference' },
      { id: 'custom-nodes', title: 'Creating Custom Nodes', path: '/docs/custom-nodes', type: 'guide' }
    ]
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: 'plug',
    category: 'integrations',
    items: [
      { id: 'integration-overview', title: 'Integration Overview', path: '/docs/integrations', type: 'guide' },
      { id: 'popular-integrations', title: 'Popular Integrations', path: '/docs/popular-integrations', type: 'reference' },
      { id: 'authentication', title: 'Authentication & Credentials', path: '/docs/authentication', type: 'guide' },
      { id: 'api-integrations', title: 'API Integrations', path: '/docs/api-integrations', type: 'guide' },
      { id: 'webhook-integrations', title: 'Webhook Integrations', path: '/docs/webhook-integrations', type: 'guide' },
      { id: 'database-integrations', title: 'Database Integrations', path: '/docs/database-integrations', type: 'guide' }
    ]
  },
  {
    id: 'templates',
    title: 'Templates',
    icon: 'template',
    category: 'workflow_building',
    items: [
      { id: 'template-overview', title: 'Using Templates', path: '/docs/templates', type: 'guide', badge: 'popular' },
      { id: 'template-categories', title: 'Template Categories', path: '/docs/template-categories', type: 'reference' },
      { id: 'customizing-templates', title: 'Customizing Templates', path: '/docs/customizing-templates', type: 'guide' },
      { id: 'creating-templates', title: 'Creating Templates', path: '/docs/creating-templates', type: 'guide' },
      { id: 'sharing-templates', title: 'Sharing Templates', path: '/docs/sharing-templates', type: 'guide' }
    ]
  },
  {
    id: 'api-reference',
    title: 'API Reference',
    icon: 'code',
    category: 'api_reference',
    items: [
      { id: 'rest-api', title: 'REST API', path: '/docs/rest-api', type: 'api' },
      { id: 'webhooks-api', title: 'Webhooks API', path: '/docs/webhooks-api', type: 'api' },
      { id: 'sdk', title: 'SDK Reference', path: '/docs/sdk', type: 'api' },
      { id: 'graphql', title: 'GraphQL API', path: '/docs/graphql', type: 'api' }
    ]
  },
  {
    id: 'deployment',
    title: 'Deployment',
    icon: 'server',
    category: 'deployment',
    items: [
      { id: 'cloud-deployment', title: 'Cloud Deployment', path: '/docs/cloud-deployment', type: 'guide' },
      { id: 'self-hosting', title: 'Self Hosting', path: '/docs/self-hosting', type: 'guide' },
      { id: 'docker', title: 'Docker Setup', path: '/docs/docker', type: 'guide' },
      { id: 'kubernetes', title: 'Kubernetes', path: '/docs/kubernetes', type: 'guide' },
      { id: 'scaling', title: 'Scaling & Performance', path: '/docs/scaling', type: 'guide' },
      { id: 'monitoring', title: 'Monitoring & Logging', path: '/docs/monitoring', type: 'guide' }
    ]
  },
  {
    id: 'security',
    title: 'Security',
    icon: 'shield',
    category: 'security',
    items: [
      { id: 'security-overview', title: 'Security Overview', path: '/docs/security', type: 'guide' },
      { id: 'authentication-security', title: 'Authentication & Authorization', path: '/docs/auth-security', type: 'guide' },
      { id: 'data-encryption', title: 'Data Encryption', path: '/docs/encryption', type: 'guide' },
      { id: 'network-security', title: 'Network Security', path: '/docs/network-security', type: 'guide' },
      { id: 'compliance', title: 'Compliance', path: '/docs/compliance', type: 'guide' }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: 'help-circle',
    category: 'troubleshooting',
    items: [
      { id: 'common-issues', title: 'Common Issues', path: '/docs/common-issues', type: 'troubleshooting', badge: 'popular' },
      { id: 'error-codes', title: 'Error Codes', path: '/docs/error-codes', type: 'reference' },
      { id: 'performance-issues', title: 'Performance Issues', path: '/docs/performance-issues', type: 'troubleshooting' },
      { id: 'connection-issues', title: 'Connection Issues', path: '/docs/connection-issues', type: 'troubleshooting' },
      { id: 'debug-logs', title: 'Debug Logs', path: '/docs/debug-logs', type: 'guide' }
    ]
  },
  {
    id: 'community',
    title: 'Community',
    icon: 'users',
    category: 'community',
    items: [
      { id: 'contributing', title: 'Contributing', path: '/docs/contributing', type: 'guide' },
      { id: 'community-guidelines', title: 'Community Guidelines', path: '/docs/community-guidelines', type: 'guide' },
      { id: 'feature-requests', title: 'Feature Requests', path: '/docs/feature-requests', type: 'guide' },
      { id: 'bug-reports', title: 'Bug Reports', path: '/docs/bug-reports', type: 'guide' },
      { id: 'changelog', title: 'Changelog', path: '/docs/changelog', type: 'changelog', badge: 'updated' }
    ]
  }
];

export interface DocumentationService {
  getSection: (id: string) => DocumentationSection | undefined;
  getSectionsByCategory: (category: DocumentationCategory) => DocumentationSection[];
  search: (query: string, filters?: DocumentationSearchFilters) => DocumentationSearchResult[];
  getNavigation: () => DocumentationNavigation;
  submitFeedback: (feedback: DocumentationFeedback) => Promise<void>;
  getAnalytics: () => DocumentationAnalytics;
  generatePDF: (sectionId: string) => Promise<Blob>;
  getOfflineContent: () => Promise<DocumentationSection[]>;
}

export interface DocumentationSearchFilters {
  category?: DocumentationCategory;
  type?: DocumentationType;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  includeCode?: boolean;
}