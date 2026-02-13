/**
 * Types for Workflow Templates Marketplace System
 */

import type { WorkflowNode, WorkflowEdge } from '../../types/workflow';

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  version?: string;
  description?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  workflow: Workflow;
  author: Author;
  version: string;
  tags: string[];
  icon?: string;
  banner?: string;
  screenshots?: Screenshot[];
  documentation?: Documentation;
  requirements?: Requirements;
  pricing: Pricing;
  stats: TemplateStats;
  ratings: RatingSystem;
  reviews: Review[];
  license: License;
  visibility: Visibility;
  featured?: boolean;
  verified?: boolean;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export type TemplateCategory =
  | 'marketing'
  | 'sales'
  | 'hr'
  | 'finance'
  | 'operations'
  | 'customer-service'
  | 'data'
  | 'development'
  | 'social-media'
  | 'e-commerce'
  | 'productivity'
  | 'communication'
  | 'analytics'
  | 'automation'
  | 'integration'
  | 'ai-ml'
  | 'iot'
  | 'blockchain'
  | 'custom';

export interface Author {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  website?: string;
  social?: SocialLinks;
  reputation: number;
  badges: Badge[];
  verified: boolean;
  joinedAt: Date;
}

export interface SocialLinks {
  github?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  discord?: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedAt: Date;
}

export interface Screenshot {
  url: string;
  caption?: string;
  order: number;
}

export interface Documentation {
  readme: string;
  changelog?: string;
  installation?: string;
  configuration?: string;
  examples?: Example[];
  faqs?: FAQ[];
  videos?: Video[];
}

export interface Example {
  title: string;
  description: string;
  input: unknown;
  output: unknown;
  code?: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface Video {
  title: string;
  url: string;
  duration: number;
  thumbnail?: string;
}

export interface Requirements {
  minimumVersion?: string;
  dependencies?: Dependency[];
  integrations?: Integration[];
  permissions?: Permission[];
  resources?: ResourceRequirement[];
}

export interface Dependency {
  name: string;
  version: string;
  type: 'node' | 'service' | 'library';
  required: boolean;
}

export interface Integration {
  service: string;
  required: boolean;
  configuration?: unknown;
}

export interface Permission {
  resource: string;
  action: string;
  required: boolean;
}

export interface ResourceRequirement {
  type: 'cpu' | 'memory' | 'storage' | 'network';
  minimum: string;
  recommended: string;
}

export interface Pricing {
  model: PricingModel;
  price?: number;
  currency?: string;
  interval?: BillingInterval;
  trial?: TrialPeriod;
  features?: string[];
  limitations?: string[];
}

export type PricingModel = 'free' | 'paid' | 'freemium' | 'subscription' | 'one-time';
export type BillingInterval = 'monthly' | 'yearly' | 'lifetime';

export interface TrialPeriod {
  duration: number;
  unit: 'days' | 'weeks' | 'months';
  features?: string[];
}

export interface TemplateStats {
  downloads: number;
  views: number;
  likes: number;
  shares: number;
  forks: number;
  activeInstalls: number;
  successRate: number;
  averageExecutionTime: number;
  lastUsed?: Date;
}

export interface RatingSystem {
  average: number;
  count: number;
  distribution: RatingDistribution;
}

export interface RatingDistribution {
  five: number;
  four: number;
  three: number;
  two: number;
  one: number;
}

export interface Review {
  id: string;
  author: Author;
  rating: number;
  title?: string;
  content: string;
  helpful: number;
  notHelpful: number;
  verified: boolean;
  createdAt: Date;
  updatedAt?: Date;
  response?: ReviewResponse;
}

export interface ReviewResponse {
  author: Author;
  content: string;
  createdAt: Date;
}

export interface License {
  type: LicenseType;
  text?: string;
  url?: string;
  commercial: boolean;
  modification: boolean;
  distribution: boolean;
  attribution: boolean;
}

export type LicenseType =
  | 'mit'
  | 'apache-2.0'
  | 'gpl-3.0'
  | 'bsd-3-clause'
  | 'proprietary'
  | 'creative-commons'
  | 'custom';

export type Visibility = 'public' | 'private' | 'unlisted' | 'restricted';

export interface MarketplaceSearch {
  query?: string;
  category?: TemplateCategory[];
  tags?: string[];
  author?: string;
  pricing?: PricingModel[];
  rating?: number;
  sort?: SortOption;
  filters?: SearchFilters;
  pagination?: Pagination;
}

export interface SearchFilters {
  verified?: boolean;
  featured?: boolean;
  hasVideo?: boolean;
  hasDocumentation?: boolean;
  minDownloads?: number;
  maxPrice?: number;
  dateRange?: DateRange;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export type SortOption =
  | 'relevance'
  | 'downloads'
  | 'rating'
  | 'newest'
  | 'oldest'
  | 'price-low'
  | 'price-high'
  | 'trending';

export interface Pagination {
  page: number;
  limit: number;
  total?: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  owner: Author;
  templates: string[];
  visibility: Visibility;
  followers: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  user: Author;
  template?: WorkflowTemplate;
  author?: Author;
  collection?: Collection;
  type: SubscriptionType;
  notifications: NotificationPreferences;
  createdAt: Date;
}

export type SubscriptionType = 'template' | 'author' | 'collection' | 'category';

export interface NotificationPreferences {
  updates: boolean;
  newReleases: boolean;
  reviews: boolean;
  replies: boolean;
  email: boolean;
  inApp: boolean;
}

export interface Purchase {
  id: string;
  buyer: Author;
  template: WorkflowTemplate;
  price: number;
  currency: string;
  method: PaymentMethod;
  status: PurchaseStatus;
  license: LicenseKey;
  invoice?: Invoice;
  createdAt: Date;
  activatedAt?: Date;
  expiresAt?: Date;
}

export type PaymentMethod = 'card' | 'paypal' | 'crypto' | 'bank' | 'credit';
export type PurchaseStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export interface LicenseKey {
  key: string;
  activations: number;
  maxActivations: number;
  devices: string[];
}

export interface Invoice {
  number: string;
  url: string;
  taxRate?: number;
  taxAmount?: number;
  total: number;
}

export interface TemplateVersion {
  version: string;
  changelog: string;
  workflow: Workflow;
  compatibility?: string[];
  breaking?: boolean;
  deprecated?: boolean;
  releasedAt: Date;
}

export interface MarketplaceAnalytics {
  templates: {
    total: number;
    byCategory: Record<TemplateCategory, number>;
    trending: TrendingTemplate[];
    featured: WorkflowTemplate[];
  };
  users: {
    total: number;
    active: number;
    creators: number;
    buyers: number;
  };
  revenue: {
    total: number;
    monthly: number;
    byCategory: Record<TemplateCategory, number>;
    topSellers: SellerRevenue[];
  };
  engagement: {
    downloads: number;
    reviews: number;
    ratings: number;
    shares: number;
  };
}

export interface TrendingTemplate {
  template: WorkflowTemplate;
  score: number;
  growth: number;
  period: 'daily' | 'weekly' | 'monthly';
}

export interface SellerRevenue {
  author: Author;
  revenue: number;
  sales: number;
  templates: number;
}

export interface MarketplaceSettings {
  commission: number;
  minPrice: number;
  maxPrice: number;
  allowFreeTemplates: boolean;
  requireReview: boolean;
  requireDocumentation: boolean;
  autoApprove: boolean;
  featuredRotation: number;
  trendingAlgorithm: string;
}

export interface MarketplaceConfig {
  enablePayments: boolean;
  enableReviews: boolean;
  enableCollections: boolean;
  enableVersioning: boolean;
  enableAnalytics: boolean;
  enableRecommendations: boolean;
  searchProvider: string;
  paymentProvider: string;
  storageProvider: string;
  cacheTimeout: number;
}

export interface SearchFacets {
  categories: Record<string, number>;
  tags: Record<string, number>;
  authors: Record<string, number>;
  pricing: Record<string, number>;
  ratings: Record<string, number>;
}

export interface TemplatePublishMetadata {
  name: string;
  description: string;
  category: TemplateCategory;
  tags?: string[];
  pricing?: Pricing;
  documentation?: Documentation;
  requirements?: Requirements;
  license?: License;
}
