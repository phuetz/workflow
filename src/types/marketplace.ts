export interface IntegrationPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  category: IntegrationCategory;
  author: string;
  icon: string;
  tags: string[];
  rating: number;
  downloads: number;
  verified: boolean;
  premium: boolean;
  price?: number;
  
  // Technical specs
  supportedMethods: HttpMethod[];
  authTypes: AuthType[];
  endpoints: EndpointConfig[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  changelog: ChangelogEntry[];
  documentation: string;
  examples: ExampleConfig[];
  
  // Dependencies
  dependencies: string[];
  minVersion: string;
  maxVersion: string;
}

export interface PluginManifest {
  manifest_version: string;
  name: string;
  version: string;
  description: string;
  author: string;
  main: string;
  
  permissions: Permission[];
  background?: {
    scripts: string[];
    persistent: boolean;
  };
  
  content_scripts?: {
    matches: string[];
    js: string[];
    css: string[];
  }[];
  
  web_accessible_resources?: string[];
  icons: {
    [size: string]: string;
  };
}

export interface IntegrationCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  popular: boolean;
}

export interface EndpointConfig {
  id: string;
  name: string;
  method: HttpMethod;
  path: string;
  description: string;
  parameters: ParameterConfig[];
  headers: HeaderConfig[];
  body?: BodyConfig;
  response: ResponseConfig;
  examples: EndpointExample[];
}

export interface ParameterConfig {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  default?: unknown;
  validation?: ValidationRule[];
}

export interface HeaderConfig {
  name: string;
  value: string;
  required: boolean;
  description: string;
}

export interface BodyConfig {
  type: 'json' | 'form' | 'raw';
  schema?: unknown;
  examples: unknown[];
}

export interface ResponseConfig {
  type: 'json' | 'xml' | 'text' | 'binary';
  schema?: unknown;
  examples: unknown[];
}

export interface EndpointExample {
  name: string;
  description: string;
  request: {
    parameters?: unknown;
    headers?: unknown;
    body?: unknown;
  };
  response: {
    status: number;
    headers?: unknown;
    body: unknown;
  };
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'email' | 'url';
  value?: unknown;
  message: string;
}

export interface AuthType {
  type: 'oauth2' | 'apikey' | 'basic' | 'bearer' | 'custom';
  name: string;
  description: string;
  config: AuthConfig;
}

export interface AuthConfig {
  [key: string]: unknown;
  // OAuth2 specific
  clientId?: string;
  clientSecret?: string;
  authUrl?: string;
  tokenUrl?: string;
  scopes?: string[];
  redirectUri?: string;
  
  // API Key specific
  keyLocation?: 'header' | 'query' | 'body';
  keyName?: string;
  
  // Basic Auth specific
  username?: string;
  password?: string;
  
  // Bearer specific
  token?: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
  breaking?: boolean;
}

export interface ExampleConfig {
  name: string;
  description: string;
  workflow: unknown;
  inputs: unknown;
  outputs: unknown;
}

export interface Permission {
  type: 'network' | 'storage' | 'credentials' | 'files' | 'notifications';
  description: string;
  justification: string;
}

export interface MarketplaceFilter {
  category?: string;
  verified?: boolean;
  premium?: boolean;
  rating?: number;
  price?: 'free' | 'paid' | 'all';
  search?: string;
  sort?: 'popular' | 'newest' | 'rating' | 'name';
}

export interface PluginInstallation {
  pluginId: string;
  version: string;
  installedAt: string;
  enabled: boolean;
  config?: unknown;
  lastUpdated?: string;
}

export interface PluginDependency {
  name: string;
  version: string;
  optional: boolean;
  reason: string;
}

export interface MarketplaceStats {
  totalPlugins: number;
  totalDownloads: number;
  averageRating: number;
  categoriesCount: number;
  featuredPlugins: IntegrationPlugin[];
  popularCategories: IntegrationCategory[];
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface PluginError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
}

export interface PluginEvent {
  type: 'install' | 'uninstall' | 'enable' | 'disable' | 'update' | 'error';
  pluginId: string;
  timestamp: string;
  data?: unknown;
}

export interface MarketplaceConfiguration {
  repositoryUrl: string;
  updateInterval: number;
  autoUpdate: boolean;
  allowBeta: boolean;
  maxConcurrentDownloads: number;
  cacheSize: number;
}

// ============================================================================
// COMMUNITY MARKETPLACE PLATFORM - Extended Types
// ============================================================================

// Workflow Templates
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  industry: TemplateIndustry;
  useCases: string[];
  version: string;
  author: TemplateAuthor;
  workflow: {
    nodes: any[];
    edges: any[];
  };
  metadata: TemplateMetadata;
  analytics: TemplateAnalytics;
  dependencies: TemplateDependencies;
  media: TemplateMedia;
  pricing: TemplatePricing;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  status: TemplateStatus;
  tags: string[];
}

export enum TemplateCategory {
  MARKETING = 'marketing',
  SALES = 'sales',
  IT_OPERATIONS = 'it_operations',
  HR = 'hr',
  FINANCE = 'finance',
  CUSTOMER_SUPPORT = 'customer_support',
  DATA_PROCESSING = 'data_processing',
  ECOMMERCE = 'ecommerce',
  PRODUCTIVITY = 'productivity',
  DEVELOPMENT = 'development',
  ANALYTICS = 'analytics',
  SECURITY = 'security',
}

export enum TemplateIndustry {
  SAAS = 'saas',
  ECOMMERCE = 'ecommerce',
  HEALTHCARE = 'healthcare',
  FINANCE = 'finance',
  EDUCATION = 'education',
  MANUFACTURING = 'manufacturing',
  REAL_ESTATE = 'real_estate',
  RETAIL = 'retail',
  MEDIA = 'media',
  TECHNOLOGY = 'technology',
  GENERAL = 'general',
}

export enum TemplateStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  REJECTED = 'rejected',
}

export interface TemplateAuthor {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isPartner: boolean;
  partnerTier?: PartnerTier;
  verified: boolean;
  reputation: number;
}

export interface TemplateMetadata {
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedSetupTime: number; // in minutes
  requiredSkills: string[];
  language: string;
  nodeCount: number;
  complexity: number;
  maintenanceLevel: 'low' | 'medium' | 'high';
}

export interface TemplateAnalytics {
  views: number;
  installs: number;
  activeInstalls: number;
  successRate: number;
  averageRating: number;
  ratingCount: number;
  trending: boolean;
  popularityScore: number;
  lastUsed?: Date;
}

export interface TemplateDependencies {
  requiredNodes: string[];
  requiredCredentials: string[];
  requiredIntegrations: string[];
  optionalNodes?: string[];
  minimumVersion?: string;
}

export interface TemplateMedia {
  thumbnailUrl: string;
  screenshots: string[];
  demoVideoUrl?: string;
  diagramUrl?: string;
}

export interface TemplatePricing {
  type: 'free' | 'premium' | 'freemium';
  price?: number;
  currency: string;
  billingPeriod?: 'one_time' | 'monthly' | 'yearly';
  trialAvailable: boolean;
}

export interface TemplateSearchFilters {
  query?: string;
  categories?: TemplateCategory[];
  industries?: TemplateIndustry[];
  difficulty?: string[];
  pricing?: string[];
  rating?: number;
  tags?: string[];
  sortBy?: 'popularity' | 'rating' | 'newest' | 'installs' | 'trending';
  author?: string;
  verified?: boolean;
}

export interface TemplateSearchResult {
  templates: WorkflowTemplate[];
  total: number;
  page: number;
  pageSize: number;
  filters: TemplateSearchFilters;
}

// Community Nodes
export interface CommunityNode {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  author: NodeAuthor;
  category: string;
  icon: string;
  codeUrl: string;
  documentationUrl: string;
  verification: NodeVerification;
  analytics: NodeAnalytics;
  dependencies: NodeDependencies;
  permissions: NodePermissions;
  pricing: NodePricing;
  createdAt: Date;
  updatedAt: Date;
  status: NodeStatus;
  tags: string[];
}

export enum NodeStatus {
  SUBMITTED = 'submitted',
  SCANNING = 'scanning',
  PENDING_REVIEW = 'pending_review',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

export interface NodeAuthor {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  verified: boolean;
  reputation: number;
  nodeCount: number;
}

export interface NodeVerification {
  status: NodeStatus;
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  securityScan: SecurityScanResult;
  manualReview?: ManualReviewResult;
  badge?: 'verified' | 'community' | 'partner' | 'official';
}

export interface SecurityScanResult {
  passed: boolean;
  scannedAt: Date;
  findings: SecurityFinding[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  score: number;
}

export interface SecurityFinding {
  type: 'vulnerability' | 'pattern' | 'dependency' | 'permission';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  location?: string;
  recommendation?: string;
}

export interface ManualReviewResult {
  approved: boolean;
  reviewedAt: Date;
  reviewedBy: string;
  comments?: string;
  checklist: ReviewChecklist;
}

export interface ReviewChecklist {
  codeQuality: boolean;
  documentation: boolean;
  errorHandling: boolean;
  security: boolean;
  performance: boolean;
  compatibility: boolean;
}

export interface NodeAnalytics {
  downloads: number;
  activeInstallations: number;
  averageRating: number;
  ratingCount: number;
  successRate: number;
  reportCount: number;
}

export interface NodeDependencies {
  npm?: string[];
  python?: string[];
  system?: string[];
  minimumVersion?: string;
}

export interface NodePermissions {
  network: boolean;
  filesystem: boolean;
  credentials: boolean;
  subprocess: boolean;
  environment: boolean;
}

export interface NodePricing {
  type: 'free' | 'paid' | 'freemium';
  price?: number;
  currency: string;
}

// Partner Program
export interface Partner {
  id: string;
  name: string;
  companyName: string;
  email: string;
  avatarUrl?: string;
  tier: PartnerTier;
  status: PartnerStatus;
  verification: PartnerVerification;
  statistics: PartnerStatistics;
  revenue: PartnerRevenue;
  payout: PayoutSettings;
  support: SupportSettings;
  joinedAt: Date;
  lastActivityAt: Date;
}

export enum PartnerTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

export enum PartnerStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
}

export interface PartnerVerification {
  verified: boolean;
  verifiedAt?: Date;
  companyVerified: boolean;
  taxFormsCompleted: boolean;
  identityVerified: boolean;
}

export interface PartnerStatistics {
  templateCount: number;
  nodeCount: number;
  totalInstalls: number;
  totalViews: number;
  averageRating: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export interface PartnerRevenue {
  revenueShare: number; // percentage
  totalEarnings: number;
  pendingPayout: number;
  lifetimeEarnings: number;
  lastPayoutDate?: Date;
  nextPayoutDate?: Date;
}

export interface PayoutSettings {
  method: 'stripe' | 'paypal' | 'bank_transfer';
  accountId: string;
  minimumPayout: number;
  frequency: 'weekly' | 'monthly' | 'quarterly';
  currency: string;
}

export interface SupportSettings {
  dedicatedChannel: boolean;
  prioritySupport: boolean;
  accountManager?: string;
  contactEmail: string;
}

export interface PartnerDashboardData {
  partner: Partner;
  templates: WorkflowTemplate[];
  nodes: CommunityNode[];
  analytics: PartnerAnalytics;
  revenue: RevenueAnalytics;
  reviews: PartnerReviews;
}

export interface PartnerAnalytics {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  metrics: {
    date: Date;
    views: number;
    installs: number;
    revenue: number;
    rating: number;
  }[];
  topTemplates: {
    template: WorkflowTemplate;
    installs: number;
    revenue: number;
  }[];
  topNodes: {
    node: CommunityNode;
    downloads: number;
    revenue: number;
  }[];
}

export interface RevenueAnalytics {
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  revenueByTemplate: Map<string, number>;
  revenueByNode: Map<string, number>;
  projectedRevenue: number;
}

export interface PartnerReviews {
  averageRating: number;
  totalReviews: number;
  recentReviews: Review[];
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

// Rating & Review System
export interface Review {
  id: string;
  resourceId: string; // template or node ID
  resourceType: 'template' | 'node';
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5
  title?: string;
  comment: string;
  helpful: number;
  notHelpful: number;
  verifiedPurchase: boolean;
  response?: ReviewResponse;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
  reportCount: number;
}

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  FLAGGED = 'flagged',
  REMOVED = 'removed',
}

export interface ReviewResponse {
  authorId: string;
  authorName: string;
  comment: string;
  createdAt: Date;
}

export interface ReviewFilters {
  rating?: number;
  sortBy?: 'newest' | 'oldest' | 'helpful' | 'rating_high' | 'rating_low';
  verifiedOnly?: boolean;
  withComment?: boolean;
}

export interface RatingSummary {
  averageRating: number;
  totalReviews: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  percentageRecommend: number;
  recentTrend: 'up' | 'down' | 'stable';
}

// API Response Types
export interface MarketplaceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Events
export interface MarketplaceEvent {
  type: MarketplaceEventType;
  resourceId: string;
  resourceType: 'template' | 'node' | 'partner';
  userId: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export enum MarketplaceEventType {
  TEMPLATE_VIEWED = 'template_viewed',
  TEMPLATE_INSTALLED = 'template_installed',
  TEMPLATE_UNINSTALLED = 'template_uninstalled',
  NODE_DOWNLOADED = 'node_downloaded',
  NODE_INSTALLED = 'node_installed',
  REVIEW_SUBMITTED = 'review_submitted',
  REVIEW_HELPFUL = 'review_helpful',
  PURCHASE_COMPLETED = 'purchase_completed',
  PARTNER_JOINED = 'partner_joined',
  PAYOUT_COMPLETED = 'payout_completed',
}

// Configuration
export interface MarketplaceConfig {
  search: {
    provider: 'algolia' | 'meilisearch' | 'elasticsearch';
    apiKey: string;
    indexName: string;
  };
  cdn: {
    baseUrl: string;
    provider: 'cloudflare' | 'cloudinary' | 's3';
  };
  payments: {
    provider: 'stripe' | 'paypal';
    publishableKey: string;
    webhookSecret: string;
  };
  moderation: {
    autoModeration: boolean;
    manualReview: boolean;
    spamDetection: boolean;
  };
  rateLimit: {
    searchRequestsPerMinute: number;
    downloadRequestsPerHour: number;
    reviewRequestsPerDay: number;
  };
}