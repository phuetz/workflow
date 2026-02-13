/**
 * Enhanced Marketplace Types
 * Extended types for ratings, reviews, and community features
 */

import { WorkflowTemplate, TemplateCategory } from './templates';

// ========== Reviews & Ratings ==========

export interface TemplateReview {
  id: string;
  templateId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5
  title: string;
  body: string;
  pros: string[];
  cons: string[];

  // Verification
  verifiedInstall: boolean; // User actually installed and used the template
  installDate?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;

  // Community interaction
  helpfulVotes: number;
  unhelpfulVotes: number;
  reportCount: number;

  // Moderation
  moderationStatus: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderationReason?: string;
}

export interface ReviewFilters {
  rating?: number;
  verified?: boolean;
  sortBy?: 'recent' | 'helpful' | 'rating';
  sentiment?: 'positive' | 'negative' | 'all';
}

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  average: number;
  total: number;
}

// ========== User Profiles & Social ==========

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;

  // Stats
  templatesPublished: number;
  totalDownloads: number;
  averageRating: number;
  reviewsWritten: number;

  // Social
  followers: number;
  following: number;

  // Badges
  badges: UserBadge[];

  // Metadata
  joinedAt: Date;
  website?: string;
  social?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
  };
}

export interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  earnedAt: Date;
}

export interface UserFollow {
  userId: string;
  followingId: string;
  followedAt: Date;
}

// ========== Template Collections ==========

export interface TemplateCollection {
  id: string;
  name: string;
  description: string;
  curator: string;
  curatorName: string;
  curatorAvatar?: string;

  // Templates
  templates: string[]; // Template IDs
  templateCount: number;

  // Metadata
  category?: TemplateCategory;
  tags: string[];
  icon?: string;
  coverImage?: string;

  // Stats
  followers: number;
  views: number;

  // Settings
  isPublic: boolean;
  isFeatured: boolean;

  // Dates
  createdAt: Date;
  updatedAt: Date;
}

// ========== Trending & Analytics ==========

export interface TrendingTemplate extends WorkflowTemplate {
  trendScore: number;
  installTrend: 'up' | 'down' | 'stable';
  installGrowth: number; // Percentage
  installsThisWeek: number;
  installsLastWeek: number;
}

export interface TemplateAnalytics {
  templateId: string;

  // Install metrics
  totalInstalls: number;
  installsByDay: Array<{ date: string; count: number }>;
  installsByCountry: Array<{ country: string; count: number }>;

  // Rating metrics
  ratingDistribution: RatingDistribution;
  ratingTrend: Array<{ date: string; average: number }>;

  // Usage metrics
  activeInstalls: number;
  avgSetupTime: number;
  completionRate: number; // % of users who completed setup

  // Engagement
  views: number;
  detailViews: number;
  favorites: number;
  shares: number;

  // Time periods
  lastUpdated: Date;
  periodStart: Date;
  periodEnd: Date;
}

// ========== Search & Discovery ==========

export interface SearchSuggestion {
  query: string;
  type: 'template' | 'category' | 'tag' | 'author';
  count: number;
}

export interface RecentSearch {
  query: string;
  timestamp: Date;
  resultsCount: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: EnhancedTemplateFilters;
  createdAt: Date;
}

export interface EnhancedTemplateFilters {
  // Basic filters
  category?: TemplateCategory;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  pricing?: 'free' | 'premium' | 'enterprise';
  authorType?: 'official' | 'community' | 'verified';

  // Advanced filters
  minRating?: number;
  maxRating?: number;
  minInstalls?: number;
  maxSetupTime?: number;
  tags?: string[];
  requiredIntegrations?: string[];

  // Author filters
  author?: string;
  verified?: boolean;

  // Date filters
  dateFrom?: Date;
  dateTo?: Date;

  // Feature flags
  hasTutorial?: boolean;
  hasVideo?: boolean;
  recentlyUpdated?: boolean;
}

export interface SearchResult {
  templates: WorkflowTemplate[];
  total: number;
  page: number;
  pageSize: number;
  facets: SearchFacets;
  suggestions: SearchSuggestion[];
}

export interface SearchFacets {
  categories: Array<{ category: TemplateCategory; count: number }>;
  tags: Array<{ tag: string; count: number }>;
  authors: Array<{ author: string; count: number }>;
  ratings: Array<{ rating: number; count: number }>;
}

// ========== Template Submission ==========

export interface TemplateSubmission {
  id: string;
  templateId?: string; // If updating existing

  // Template data
  name: string;
  description: string;
  category: TemplateCategory;
  subcategory?: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';

  // Content
  workflow: {
    nodes: unknown[];
    edges: unknown[];
  };
  screenshots: string[];
  videoUrl?: string;

  // Documentation
  overview: string;
  setupInstructions: string;
  usageGuide: string;
  troubleshooting?: string;

  // Requirements
  requiredIntegrations: string[];
  requiredCredentials: string[];
  estimatedSetupTime: number;

  // Customization
  customizableFields: Array<{
    nodeId: string;
    field: string;
    label: string;
    description: string;
  }>;

  // Pricing
  pricing: 'free' | 'premium' | 'enterprise';
  price?: number;

  // Status
  status: 'draft' | 'submitted' | 'review' | 'approved' | 'rejected' | 'published';
  submittedBy: string;
  reviewedBy?: string;
  rejectionReason?: string;

  // Dates
  createdAt: Date;
  submittedAt?: Date;
  reviewedAt?: Date;
  publishedAt?: Date;
}

// ========== Social Sharing ==========

export interface ShareOptions {
  platform: 'twitter' | 'facebook' | 'linkedin' | 'email' | 'copy';
  templateId: string;
  templateName: string;
  description?: string;
}

export interface ShareStats {
  templateId: string;
  totalShares: number;
  sharesByPlatform: Record<string, number>;
  sharesByDate: Array<{ date: string; count: number }>;
}

// ========== Notifications ==========

export interface MarketplaceNotification {
  id: string;
  userId: string;
  type: 'new_review' | 'new_follower' | 'template_featured' | 'template_approved' | 'milestone';

  title: string;
  message: string;
  icon?: string;

  // Related entities
  templateId?: string;
  reviewId?: string;
  followerId?: string;

  // State
  read: boolean;
  archived: boolean;

  // Dates
  createdAt: Date;
  readAt?: Date;
}

// ========== Featured & Editor's Choice ==========

export interface FeaturedTemplate extends WorkflowTemplate {
  featuredReason: string;
  featuredBy: string;
  featuredAt: Date;
  featuredUntil?: Date;
  displayOrder: number;
}

export interface EditorsChoice {
  id: string;
  template: WorkflowTemplate;
  editorNote: string;
  editorName: string;
  editorAvatar?: string;
  selectedAt: Date;
  validUntil: Date;
}

// ========== Template Statistics ==========

export interface TemplateStats {
  templateId: string;

  // Current period (last 30 days)
  installs: number;
  views: number;
  favorites: number;

  // All-time
  totalInstalls: number;
  totalViews: number;
  totalFavorites: number;

  // Engagement
  averageRating: number;
  reviewCount: number;
  completionRate: number;

  // Performance
  avgSetupTime: number;
  successRate: number;

  // Rankings
  categoryRank?: number;
  overallRank?: number;
  trendingRank?: number;
}

// ========== Marketplace Configuration ==========

export interface MarketplaceSettings {
  // Display
  defaultView: 'grid' | 'list';
  itemsPerPage: number;
  enableInfiniteScroll: boolean;

  // Filters
  defaultSort: 'popular' | 'recent' | 'rating' | 'installs';
  enabledCategories: TemplateCategory[];

  // Features
  enableReviews: boolean;
  enableRatings: boolean;
  enableSocialFeatures: boolean;
  enableCollections: boolean;

  // Moderation
  autoApproveOfficialTemplates: boolean;
  requireVerifiedInstallForReview: boolean;
  minRatingForDisplay: number;
}

// ========== API Response Types ==========

export interface TemplateResponse {
  success: boolean;
  template?: WorkflowTemplate;
  error?: string;
  message?: string;
}

export interface TemplatesResponse {
  success: boolean;
  templates: WorkflowTemplate[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
}

export interface ReviewResponse {
  success: boolean;
  review?: TemplateReview;
  error?: string;
  message?: string;
}

export interface ReviewsResponse {
  success: boolean;
  reviews: TemplateReview[];
  total: number;
  distribution: RatingDistribution;
  error?: string;
}

export interface UserResponse {
  success: boolean;
  user?: UserProfile;
  error?: string;
}

export interface CollectionResponse {
  success: boolean;
  collection?: TemplateCollection;
  error?: string;
}

export interface AnalyticsResponse {
  success: boolean;
  analytics?: TemplateAnalytics;
  error?: string;
}
