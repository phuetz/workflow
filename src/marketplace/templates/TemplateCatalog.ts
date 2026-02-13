/**
 * Template Catalog - Manages analytics, trending, recommendations, and background tasks
 */

import { logger } from '../../services/SimpleLogger';
import type {
  WorkflowTemplate,
  TemplateCategory,
  MarketplaceAnalytics,
  TrendingTemplate,
  MarketplaceSettings,
  Purchase,
} from './types';

/**
 * Analytics Manager - Tracks marketplace analytics
 */
export class AnalyticsManager {
  private analytics: MarketplaceAnalytics;

  constructor() {
    this.analytics = this.createEmptyAnalytics();
  }

  /**
   * Create empty analytics object
   */
  private createEmptyAnalytics(): MarketplaceAnalytics {
    return {
      templates: {
        total: 0,
        byCategory: {} as Record<TemplateCategory, number>,
        trending: [],
        featured: [],
      },
      users: {
        total: 0,
        active: 0,
        creators: 0,
        buyers: 0,
      },
      revenue: {
        total: 0,
        monthly: 0,
        byCategory: {} as Record<TemplateCategory, number>,
        topSellers: [],
      },
      engagement: {
        downloads: 0,
        reviews: 0,
        ratings: 0,
        shares: 0,
      },
    };
  }

  /**
   * Update analytics based on event
   */
  updateAnalytics(
    event: string,
    data: { template?: WorkflowTemplate; purchase?: Purchase }
  ): void {
    switch (event) {
      case 'template-published':
        this.analytics.templates.total++;
        if (data.template) {
          const category = data.template.category;
          this.analytics.templates.byCategory[category] =
            (this.analytics.templates.byCategory[category] || 0) + 1;
        }
        break;

      case 'purchase':
        if (data.purchase) {
          this.analytics.revenue.total += data.purchase.price;
          this.analytics.revenue.monthly += data.purchase.price;
        }
        break;

      case 'download':
        this.analytics.engagement.downloads++;
        break;

      case 'review':
        this.analytics.engagement.reviews++;
        this.analytics.engagement.ratings++;
        break;

      case 'share':
        this.analytics.engagement.shares++;
        break;
    }
  }

  /**
   * Get current analytics
   */
  getAnalytics(options?: {
    period?: 'daily' | 'weekly' | 'monthly' | 'all';
    category?: TemplateCategory;
    authorId?: string;
  }): MarketplaceAnalytics {
    // Filter analytics based on options
    const analytics = { ...this.analytics };

    if (options?.category) {
      analytics.templates.trending = analytics.templates.trending.filter(
        t => t.template.category === options.category
      );
    }

    if (options?.authorId) {
      analytics.revenue.topSellers = analytics.revenue.topSellers.filter(
        s => s.author.id === options.authorId
      );
    }

    return analytics;
  }

  /**
   * Update trending templates
   */
  setTrendingTemplates(trending: TrendingTemplate[]): void {
    this.analytics.templates.trending = trending;
  }

  /**
   * Update featured templates
   */
  setFeaturedTemplates(featured: WorkflowTemplate[]): void {
    this.analytics.templates.featured = featured;
  }

  /**
   * Get metrics
   */
  getMetrics(): MarketplaceAnalytics {
    return { ...this.analytics };
  }
}

/**
 * Trending Calculator - Calculates trending templates
 */
export class TrendingCalculator {
  /**
   * Calculate trending score for a template
   */
  calculateScore(template: WorkflowTemplate): number {
    const recency = Date.now() - template.createdAt.getTime();
    const recencyScore = Math.max(0, 100 - recency / (24 * 60 * 60 * 1000));

    const engagementScore =
      template.stats.downloads * 2 +
      template.stats.views * 0.1 +
      template.stats.likes * 3 +
      template.stats.shares * 5;

    const ratingScore = template.ratings.average * template.ratings.count;

    return recencyScore + engagementScore + ratingScore;
  }

  /**
   * Get trending templates
   */
  getTrending(
    templates: WorkflowTemplate[],
    limit: number,
    category?: TemplateCategory
  ): WorkflowTemplate[] {
    let filtered = templates;

    if (category) {
      filtered = filtered.filter(t => t.category === category);
    }

    // Calculate trending score
    const scored = filtered.map(t => ({
      template: t,
      score: this.calculateScore(t),
    }));

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(s => s.template);
  }

  /**
   * Get trending with full data
   */
  getTrendingWithData(
    templates: WorkflowTemplate[],
    limit: number
  ): TrendingTemplate[] {
    return templates
      .map(t => ({
        template: t,
        score: this.calculateScore(t),
        growth: Math.random() * 100,
        period: 'daily' as const,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

/**
 * Popularity Ranker - Ranks templates by popularity
 */
export class PopularityRanker {
  /**
   * Get popular templates
   */
  getPopular(
    templates: WorkflowTemplate[],
    limit: number,
    category?: TemplateCategory
  ): WorkflowTemplate[] {
    let filtered = templates;

    if (category) {
      filtered = filtered.filter(t => t.category === category);
    }

    filtered.sort((a, b) => b.stats.downloads - a.stats.downloads);
    return filtered.slice(0, limit);
  }
}

/**
 * Similarity Calculator - Calculates similar templates
 */
export class SimilarityCalculator {
  /**
   * Calculate similarity score
   */
  calculateSimilarityScore(
    template: WorkflowTemplate,
    categories: Set<TemplateCategory>,
    tags: Set<string>
  ): number {
    let score = 0;

    if (categories.has(template.category)) {
      score += 10;
    }

    for (const tag of template.tags) {
      if (tags.has(tag)) {
        score += 2;
      }
    }

    return score;
  }

  /**
   * Get similar templates based on user history
   */
  async getSimilar(
    allTemplates: WorkflowTemplate[],
    userPurchases: { template: WorkflowTemplate }[],
    limit: number
  ): Promise<WorkflowTemplate[]> {
    if (userPurchases.length === 0) {
      // Return popular templates if no history
      return allTemplates
        .sort((a, b) => b.stats.downloads - a.stats.downloads)
        .slice(0, limit);
    }

    // Find similar based on categories and tags
    const userCategories = new Set(userPurchases.map(p => p.template.category));
    const userTags = new Set(userPurchases.flatMap(p => p.template.tags));

    const templates = allTemplates.filter(
      t => !userPurchases.some(p => p.template.id === t.id)
    );

    const scored = templates.map(t => ({
      template: t,
      score: this.calculateSimilarityScore(t, userCategories, userTags),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.template);
  }
}

/**
 * Background Task Manager - Manages periodic background tasks
 */
export class BackgroundTaskManager {
  private settings: MarketplaceSettings;
  private rotationInterval: NodeJS.Timeout | null = null;
  private trendingInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(settings: MarketplaceSettings) {
    this.settings = settings;
  }

  /**
   * Start all background tasks
   */
  start(callbacks: {
    onRotateFeatured: () => void;
    onUpdateTrending: () => void;
    onCleanCache: () => void;
  }): void {
    // Rotate featured templates
    this.rotationInterval = setInterval(() => {
      callbacks.onRotateFeatured();
    }, this.settings.featuredRotation);

    // Update trending
    this.trendingInterval = setInterval(() => {
      callbacks.onUpdateTrending();
    }, 60 * 60 * 1000); // Every hour

    // Clean cache
    this.cleanupInterval = setInterval(() => {
      callbacks.onCleanCache();
    }, 30 * 60 * 1000); // Every 30 minutes

    logger.debug('Background tasks started');
  }

  /**
   * Stop all background tasks
   */
  stop(): void {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.rotationInterval = null;
    }
    if (this.trendingInterval) {
      clearInterval(this.trendingInterval);
      this.trendingInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    logger.debug('Background tasks stopped');
  }

  /**
   * Update settings
   */
  updateSettings(settings: MarketplaceSettings): void {
    this.settings = settings;
  }
}

/**
 * Tracking Service - Tracks user actions
 */
export class TrackingService {
  /**
   * Track search action
   */
  trackSearch(
    query: unknown,
    resultsCount: number,
    duration: number
  ): void {
    logger.debug(
      `Search completed: ${resultsCount} results in ${duration}ms`
    );
  }

  /**
   * Track template view
   */
  trackView(template: WorkflowTemplate): void {
    logger.debug(`Template viewed: ${template.name}`);
  }

  /**
   * Track template download
   */
  trackDownload(template: WorkflowTemplate, userId: string): void {
    logger.debug(`Template downloaded: ${template.name} by ${userId}`);
  }
}
