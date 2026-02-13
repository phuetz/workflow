/**
 * Template Registry - Manages template storage, search indexing, and author management
 */

import * as crypto from 'crypto';
import { logger } from '../../services/SimpleLogger';
import type {
  WorkflowTemplate,
  Author,
  Collection,
  Subscription,
  Purchase,
  Review,
  MarketplaceSearch,
  SearchFacets,
  MarketplaceConfig,
} from './types';

/**
 * Search Index for template discovery
 */
export class SearchIndex {
  private index: Map<string, Set<string>> = new Map();

  async indexTemplate(template: WorkflowTemplate): Promise<void> {
    // Index by name
    this.addToIndex('name', template.name.toLowerCase(), template.id);

    // Index by description
    const descWords = template.description.toLowerCase().split(' ');
    for (const word of descWords) {
      this.addToIndex('desc', word, template.id);
    }

    // Index by category
    this.addToIndex('category', template.category, template.id);

    // Index by tags
    for (const tag of template.tags) {
      this.addToIndex('tag', tag.toLowerCase(), template.id);
    }

    // Index by author
    this.addToIndex('author', template.author.username.toLowerCase(), template.id);
  }

  async updateTemplate(template: WorkflowTemplate): Promise<void> {
    await this.indexTemplate(template);
  }

  async search(_query: MarketplaceSearch): Promise<WorkflowTemplate[]> {
    // Simple search implementation
    // In production, would use Elasticsearch or similar
    return [];
  }

  private addToIndex(type: string, term: string, id: string): void {
    const key = `${type}:${term}`;

    if (!this.index.has(key)) {
      this.index.set(key, new Set());
    }

    this.index.get(key)!.add(id);
  }
}

/**
 * Recommendation Engine for personalized suggestions
 */
export class RecommendationEngine {
  async getPersonalized(
    _userId: string,
    templates: Map<string, WorkflowTemplate>,
    limit: number
  ): Promise<WorkflowTemplate[]> {
    // Simple recommendation algorithm
    // In production, would use ML models
    const all = Array.from(templates.values());
    return all.slice(0, limit);
  }
}

/**
 * Template Registry - Central storage for templates, authors, collections
 */
export class TemplateRegistry {
  private templates: Map<string, WorkflowTemplate> = new Map();
  private collections: Map<string, Collection> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private purchases: Map<string, Purchase> = new Map();
  private reviews: Map<string, Review[]> = new Map();
  private authors: Map<string, Author> = new Map();
  private searchIndex: SearchIndex;
  private recommendationEngine: RecommendationEngine;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private config: MarketplaceConfig;

  constructor(config: MarketplaceConfig) {
    this.config = config;
    this.searchIndex = new SearchIndex();
    this.recommendationEngine = new RecommendationEngine();
  }

  // Template CRUD operations
  getTemplate(id: string): WorkflowTemplate | undefined {
    return this.templates.get(id);
  }

  setTemplate(template: WorkflowTemplate): void {
    this.templates.set(template.id, template);
  }

  deleteTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  getAllTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  // Author operations
  getAuthor(id: string): Author | undefined {
    return this.authors.get(id);
  }

  setAuthor(author: Author): void {
    this.authors.set(author.id, author);
  }

  createAuthor(userId: string): Author {
    const author: Author = {
      id: userId,
      username: `user_${userId}`,
      displayName: `User ${userId}`,
      reputation: 0,
      badges: [],
      verified: false,
      joinedAt: new Date(),
    };
    this.authors.set(userId, author);
    return author;
  }

  getOrCreateAuthor(userId: string): Author {
    return this.authors.get(userId) || this.createAuthor(userId);
  }

  // Collection operations
  getCollection(id: string): Collection | undefined {
    return this.collections.get(id);
  }

  setCollection(collection: Collection): void {
    this.collections.set(collection.id, collection);
  }

  // Subscription operations
  getSubscription(id: string): Subscription | undefined {
    return this.subscriptions.get(id);
  }

  setSubscription(subscription: Subscription): void {
    this.subscriptions.set(subscription.id, subscription);
  }

  getSubscriptionsForTemplate(templateId: string): Subscription[] {
    return Array.from(this.subscriptions.values()).filter(
      s => s.template?.id === templateId
    );
  }

  // Purchase operations
  getPurchase(id: string): Purchase | undefined {
    return this.purchases.get(id);
  }

  setPurchase(purchase: Purchase): void {
    this.purchases.set(purchase.id, purchase);
  }

  getPurchasesForUser(userId: string): Purchase[] {
    return Array.from(this.purchases.values()).filter(
      p => p.buyer.id === userId
    );
  }

  findUserPurchaseForTemplate(userId: string, templateId: string): Purchase | null {
    return (
      Array.from(this.purchases.values()).find(
        p => p.buyer.id === userId && p.template.id === templateId && p.status === 'completed'
      ) || null
    );
  }

  // Review operations
  getReviews(templateId: string): Review[] {
    return this.reviews.get(templateId) || [];
  }

  addReview(templateId: string, review: Review): void {
    if (!this.reviews.has(templateId)) {
      this.reviews.set(templateId, []);
    }
    this.reviews.get(templateId)!.push(review);
  }

  findUserReviewForTemplate(userId: string, templateId: string): Review | undefined {
    return this.reviews.get(templateId)?.find(r => r.author.id === userId);
  }

  // Search operations
  async indexTemplate(template: WorkflowTemplate): Promise<void> {
    await this.searchIndex.indexTemplate(template);
  }

  async updateSearchIndex(template: WorkflowTemplate): Promise<void> {
    await this.searchIndex.updateTemplate(template);
  }

  async search(query: MarketplaceSearch): Promise<WorkflowTemplate[]> {
    return this.searchIndex.search(query);
  }

  // Recommendation operations
  async getPersonalizedRecommendations(
    userId: string,
    limit: number
  ): Promise<WorkflowTemplate[]> {
    return this.recommendationEngine.getPersonalized(userId, this.templates, limit);
  }

  // Cache operations
  getCacheKey(type: string, params: unknown): string {
    return `${type}_${JSON.stringify(params)}`;
  }

  getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return cached.data as T;
    }
    return null;
  }

  setCache(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.config.cacheTimeout) {
        this.cache.delete(key);
      }
    }
    logger.debug('Template registry cache cleaned');
  }

  // Facet calculation
  calculateFacets(templates: WorkflowTemplate[]): SearchFacets {
    const facets: SearchFacets = {
      categories: {},
      tags: {},
      authors: {},
      pricing: {},
      ratings: {},
    };

    for (const template of templates) {
      // Categories
      facets.categories[template.category] =
        (facets.categories[template.category] || 0) + 1;

      // Tags
      for (const tag of template.tags) {
        facets.tags[tag] = (facets.tags[tag] || 0) + 1;
      }

      // Authors
      facets.authors[template.author.username] =
        (facets.authors[template.author.username] || 0) + 1;

      // Pricing
      facets.pricing[template.pricing.model] =
        (facets.pricing[template.pricing.model] || 0) + 1;

      // Ratings
      const rating = Math.floor(template.ratings.average);
      facets.ratings[rating] = (facets.ratings[rating] || 0) + 1;
    }

    return facets;
  }

  // ID generators
  generateTemplateId(): string {
    return `tpl_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  generateReviewId(): string {
    return `rev_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  generateCollectionId(): string {
    return `col_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  generatePurchaseId(): string {
    return `pur_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }
}
