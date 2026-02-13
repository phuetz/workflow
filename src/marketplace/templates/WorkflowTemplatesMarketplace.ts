/**
 * WorkflowTemplatesMarketplace - Main facade class
 * Orchestrates all marketplace components
 */

import { EventEmitter } from 'events';
import { logger } from '../../services/SimpleLogger';
import { TemplateRegistry } from './TemplateRegistry';
import {
  TemplateValidator,
  TemplateFilter,
  TemplateSorter,
  TemplatePaginator,
} from './TemplateValidator';
import {
  VersionManager,
  ReviewManager,
  RatingCalculator,
  PaymentProcessor,
  TemplateUpdater,
} from './TemplateVersioning';
import {
  AnalyticsManager,
  TrendingCalculator,
  PopularityRanker,
  SimilarityCalculator,
  BackgroundTaskManager,
  TrackingService,
} from './TemplateCatalog';
import type {
  WorkflowTemplate,
  Workflow,
  TemplateCategory,
  Collection,
  Review,
  Purchase,
  PaymentMethod,
  MarketplaceSearch,
  MarketplaceAnalytics,
  MarketplaceSettings,
  MarketplaceConfig,
  SearchFacets,
  LicenseKey,
  TemplatePublishMetadata,
} from './types';

export class WorkflowTemplatesMarketplace extends EventEmitter {
  private registry: TemplateRegistry;
  private validator: TemplateValidator;
  private filter: TemplateFilter;
  private sorter: TemplateSorter;
  private paginator: TemplatePaginator;
  private versionManager: VersionManager;
  private reviewManager: ReviewManager;
  private ratingCalculator: RatingCalculator;
  private paymentProcessor: PaymentProcessor;
  private templateUpdater: TemplateUpdater;
  private analyticsManager: AnalyticsManager;
  private trendingCalculator: TrendingCalculator;
  private popularityRanker: PopularityRanker;
  private similarityCalculator: SimilarityCalculator;
  private backgroundTasks: BackgroundTaskManager;
  private tracking: TrackingService;
  private settings: MarketplaceSettings;
  private config: MarketplaceConfig;

  constructor(config?: Partial<MarketplaceConfig>) {
    super();
    this.config = {
      enablePayments: true,
      enableReviews: true,
      enableCollections: true,
      enableVersioning: true,
      enableAnalytics: true,
      enableRecommendations: true,
      searchProvider: 'internal',
      paymentProvider: 'stripe',
      storageProvider: 'local',
      cacheTimeout: 3600000,
      ...config,
    };

    this.settings = {
      commission: 0.3,
      minPrice: 0,
      maxPrice: 9999,
      allowFreeTemplates: true,
      requireReview: false,
      requireDocumentation: true,
      autoApprove: false,
      featuredRotation: 24 * 60 * 60 * 1000,
      trendingAlgorithm: 'weighted',
    };

    this.registry = new TemplateRegistry(this.config);
    this.validator = new TemplateValidator(this.settings);
    this.filter = new TemplateFilter();
    this.sorter = new TemplateSorter();
    this.paginator = new TemplatePaginator();
    this.versionManager = new VersionManager();
    this.reviewManager = new ReviewManager();
    this.ratingCalculator = new RatingCalculator();
    this.paymentProcessor = new PaymentProcessor(this.settings.commission);
    this.templateUpdater = new TemplateUpdater(this.versionManager);
    this.analyticsManager = new AnalyticsManager();
    this.trendingCalculator = new TrendingCalculator();
    this.popularityRanker = new PopularityRanker();
    this.similarityCalculator = new SimilarityCalculator();
    this.backgroundTasks = new BackgroundTaskManager(this.settings);
    this.tracking = new TrackingService();

    this.initialize();
  }

  private initialize(): void {
    this.loadFeaturedTemplates();
    this.startBackgroundTasks();
    this.setupEventHandlers();
    logger.debug('Workflow Templates Marketplace initialized');
  }

  async publishTemplate(
    workflow: Workflow,
    metadata: TemplatePublishMetadata,
    authorId: string
  ): Promise<WorkflowTemplate> {
    await this.validator.validate(workflow, metadata, this.registry.getAllTemplates());
    const author = this.registry.getOrCreateAuthor(authorId);

    const template: WorkflowTemplate = {
      id: this.registry.generateTemplateId(),
      name: metadata.name,
      description: metadata.description,
      category: metadata.category,
      workflow,
      author,
      version: '1.0.0',
      tags: metadata.tags || [],
      documentation: metadata.documentation,
      requirements: metadata.requirements,
      pricing: metadata.pricing || { model: 'free' },
      stats: {
        downloads: 0, views: 0, likes: 0, shares: 0, forks: 0,
        activeInstalls: 0, successRate: 100, averageExecutionTime: 0,
      },
      ratings: {
        average: 0, count: 0,
        distribution: { five: 0, four: 0, three: 0, two: 0, one: 0 },
      },
      reviews: [],
      license: metadata.license || {
        type: 'mit', commercial: true, modification: true,
        distribution: true, attribution: true,
      },
      visibility: 'public',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.settings.requireReview) {
      template.visibility = 'private';
      await this.reviewManager.submitForReview(template);
    } else if (this.settings.autoApprove) {
      template.publishedAt = new Date();
      template.verified = true;
    }

    this.registry.setTemplate(template);
    await this.registry.indexTemplate(template);
    this.versionManager.storeVersion(template.id, {
      version: template.version, changelog: 'Initial release',
      workflow, releasedAt: new Date(),
    });

    this.analyticsManager.updateAnalytics('template-published', { template });
    this.emit('template:published', template);
    return template;
  }

  async searchTemplates(search: MarketplaceSearch): Promise<{
    templates: WorkflowTemplate[]; total: number; facets?: SearchFacets;
  }> {
    const startTime = Date.now();
    const cacheKey = this.registry.getCacheKey('search', search);
    const cached = this.registry.getCached<{
      templates: WorkflowTemplate[]; total: number; facets?: SearchFacets;
    }>(cacheKey);
    if (cached) return cached;

    let results = await this.registry.search(search);
    if (search.filters) results = this.filter.apply(results, search.filters);
    if (search.sort) results = this.sorter.sort(results, search.sort);
    const paginated = this.paginator.paginate(results, search.pagination);
    const facets = this.registry.calculateFacets(results);

    const response = { templates: paginated.items, total: results.length, facets };
    this.registry.setCache(cacheKey, response);
    this.tracking.trackSearch(search, results.length, Date.now() - startTime);
    return response;
  }

  async getTemplate(templateId: string): Promise<WorkflowTemplate | null> {
    const template = this.registry.getTemplate(templateId);
    if (!template) return null;
    template.stats.views++;
    this.tracking.trackView(template);
    return template;
  }

  async downloadTemplate(
    templateId: string, userId: string
  ): Promise<{ template: WorkflowTemplate; license?: LicenseKey }> {
    const template = this.registry.getTemplate(templateId);
    if (!template) throw new Error('Template not found');

    if (template.pricing.model !== 'free') {
      const purchase = this.registry.findUserPurchaseForTemplate(userId, templateId);
      if (!purchase) throw new Error('Template requires purchase');
    }

    let license: LicenseKey | undefined;
    if (template.pricing.model !== 'free') {
      license = this.paymentProcessor.generateLicense(template, userId);
    }

    template.stats.downloads++;
    template.stats.activeInstalls++;
    template.stats.lastUsed = new Date();
    this.tracking.trackDownload(template, userId);
    this.emit('template:downloaded', { template, userId });
    return { template, license };
  }

  async rateTemplate(
    templateId: string, userId: string, rating: number,
    review?: { title?: string; content: string }
  ): Promise<Review> {
    const template = this.registry.getTemplate(templateId);
    if (!template) throw new Error('Template not found');

    const existingReview = this.registry.findUserReviewForTemplate(userId, templateId);
    if (existingReview) throw new Error('User already reviewed this template');

    const author = this.registry.getOrCreateAuthor(userId);
    const reviewObj: Review = {
      id: this.registry.generateReviewId(), author, rating,
      title: review?.title, content: review?.content || '',
      helpful: 0, notHelpful: 0,
      verified: this.registry.findUserPurchaseForTemplate(userId, templateId) !== null,
      createdAt: new Date(),
    };

    this.registry.addReview(templateId, reviewObj);
    this.ratingCalculator.updateRatings(template, rating);
    this.emit('notification:author', { author: template.author, type: 'new-review', data: reviewObj });
    this.emit('review:created', reviewObj);
    return reviewObj;
  }

  async createCollection(
    name: string, description: string, ownerId: string, templateIds?: string[]
  ): Promise<Collection> {
    const owner = this.registry.getOrCreateAuthor(ownerId);
    const collection: Collection = {
      id: this.registry.generateCollectionId(), name, description, owner,
      templates: templateIds || [], visibility: 'public', followers: 0,
      createdAt: new Date(), updatedAt: new Date(),
    };
    this.registry.setCollection(collection);
    this.emit('collection:created', collection);
    return collection;
  }

  async getRecommendations(userId: string, options?: {
    type?: 'similar' | 'trending' | 'personalized' | 'popular';
    limit?: number; category?: TemplateCategory;
  }): Promise<WorkflowTemplate[]> {
    const type = options?.type || 'personalized';
    const limit = options?.limit || 10;

    switch (type) {
      case 'similar':
        return this.similarityCalculator.getSimilar(
          this.registry.getAllTemplates(), this.registry.getPurchasesForUser(userId), limit
        );
      case 'trending':
        return this.trendingCalculator.getTrending(
          this.registry.getAllTemplates(), limit, options?.category
        );
      case 'personalized':
        return this.registry.getPersonalizedRecommendations(userId, limit);
      case 'popular':
        return this.popularityRanker.getPopular(
          this.registry.getAllTemplates(), limit, options?.category
        );
      default:
        return [];
    }
  }

  async purchaseTemplate(
    templateId: string, buyerId: string, paymentMethod: PaymentMethod
  ): Promise<Purchase> {
    const template = this.registry.getTemplate(templateId);
    if (!template) throw new Error('Template not found');
    if (template.pricing.model === 'free') throw new Error('Template is free');

    const buyer = this.registry.getOrCreateAuthor(buyerId);
    const paymentResult = await this.paymentProcessor.processPayment(
      template.pricing, buyer, paymentMethod
    );

    const purchase: Purchase = {
      id: this.registry.generatePurchaseId(), buyer, template,
      price: template.pricing.price!, currency: template.pricing.currency || 'USD',
      method: paymentMethod, status: paymentResult.success ? 'completed' : 'failed',
      license: this.paymentProcessor.generateLicense(template, buyerId),
      invoice: this.paymentProcessor.generateInvoice(template, buyer),
      createdAt: new Date(),
    };

    if (paymentResult.success) {
      purchase.activatedAt = new Date();
      if (template.pricing.model === 'subscription') {
        purchase.expiresAt = this.paymentProcessor.calculateExpiration(
          template.pricing.interval || 'monthly'
        );
      }
    }

    this.registry.setPurchase(purchase);
    this.paymentProcessor.updateAuthorEarnings(template.author, purchase);
    this.analyticsManager.updateAnalytics('purchase', { template, purchase });
    this.emit('purchase:completed', purchase);
    return purchase;
  }

  async updateTemplate(
    templateId: string, updates: Partial<WorkflowTemplate>,
    newVersion?: { version: string; changelog: string; workflow?: Workflow }
  ): Promise<WorkflowTemplate> {
    const template = this.registry.getTemplate(templateId);
    if (!template) throw new Error('Template not found');

    this.templateUpdater.applyUpdates(template, updates, newVersion);
    await this.registry.updateSearchIndex(template);

    if (newVersion) {
      for (const subscriber of this.registry.getSubscriptionsForTemplate(templateId)) {
        this.emit('notification:subscriber', { subscriber, type: 'update', data: newVersion });
      }
    }

    this.emit('template:updated', template);
    return template;
  }

  getAnalytics(options?: {
    period?: 'daily' | 'weekly' | 'monthly' | 'all';
    category?: TemplateCategory; authorId?: string;
  }): MarketplaceAnalytics {
    return this.analyticsManager.getAnalytics(options);
  }

  getMetrics(): MarketplaceAnalytics {
    return this.analyticsManager.getMetrics();
  }

  shutdown(): void {
    this.backgroundTasks.stop();
    this.removeAllListeners();
    logger.debug('Workflow Templates Marketplace shut down');
  }

  private loadFeaturedTemplates(): void {}

  private startBackgroundTasks(): void {
    this.backgroundTasks.start({
      onRotateFeatured: () => this.rotateFeaturedTemplates(),
      onUpdateTrending: () => this.updateTrending(),
      onCleanCache: () => this.registry.cleanCache(),
    });
  }

  private rotateFeaturedTemplates(): void {
    const featured = this.registry.getAllTemplates()
      .filter(t => t.verified && t.ratings.average >= 4).slice(0, 10);
    featured.forEach(t => (t.featured = true));
    this.analyticsManager.setFeaturedTemplates(featured);
  }

  private updateTrending(): void {
    this.analyticsManager.setTrendingTemplates(
      this.trendingCalculator.getTrendingWithData(this.registry.getAllTemplates(), 10)
    );
  }

  private setupEventHandlers(): void {
    this.on('template:published', t => logger.debug(`New template published: ${t.name}`));
    this.on('purchase:completed', p => logger.debug(`Purchase completed: ${p.template.name}`));
  }
}

export const workflowMarketplace = new WorkflowTemplatesMarketplace();
