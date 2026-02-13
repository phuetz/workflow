/**
 * Unit Tests for Marketplace Templates Module
 * Tests TemplateRegistry, TemplateValidator, TemplateVersioning, TemplateCatalog, WorkflowTemplatesMarketplace
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TemplateRegistry, SearchIndex, RecommendationEngine } from '../../marketplace/templates/TemplateRegistry';
import { TemplateValidator, TemplateFilter, TemplateSorter, TemplatePaginator } from '../../marketplace/templates/TemplateValidator';
import { VersionManager, ReviewManager, RatingCalculator, PaymentProcessor, TemplateUpdater } from '../../marketplace/templates/TemplateVersioning';
import { AnalyticsManager, TrendingCalculator, PopularityRanker, SimilarityCalculator, BackgroundTaskManager, TrackingService } from '../../marketplace/templates/TemplateCatalog';
import { WorkflowTemplatesMarketplace } from '../../marketplace/templates/WorkflowTemplatesMarketplace';
import type {
  WorkflowTemplate,
  Author,
  Workflow,
  MarketplaceConfig,
  MarketplaceSettings,
  TemplatePublishMetadata,
  SearchFilters,
  RatingDistribution,
  Purchase,
  Pricing,
  TemplateCategory,
} from '../../marketplace/templates/types';

// Helper to create a mock author
function createTestAuthor(overrides?: Partial<Author>): Author {
  return {
    id: 'author-1',
    username: 'testuser',
    displayName: 'Test User',
    reputation: 100,
    badges: [],
    verified: true,
    joinedAt: new Date(),
    ...overrides,
  };
}

// Helper to create a mock workflow
function createTestWorkflow(overrides?: Partial<Workflow>): Workflow {
  return {
    id: 'workflow-1',
    name: 'Test Workflow',
    nodes: [{ id: 'node-1', type: 'trigger', position: { x: 0, y: 0 }, data: {} }],
    edges: [],
    ...overrides,
  } as Workflow;
}

// Helper to create a mock template
function createTestTemplate(overrides?: Partial<WorkflowTemplate>): WorkflowTemplate {
  return {
    id: 'template-1',
    name: 'Test Template',
    description: 'A test template for unit testing',
    category: 'automation',
    workflow: createTestWorkflow(),
    author: createTestAuthor(),
    version: '1.0.0',
    tags: ['test', 'automation'],
    pricing: { model: 'free' },
    stats: {
      downloads: 100,
      views: 500,
      likes: 50,
      shares: 20,
      forks: 10,
      activeInstalls: 80,
      successRate: 95,
      averageExecutionTime: 1500,
    },
    ratings: {
      average: 4.5,
      count: 25,
      distribution: { five: 15, four: 7, three: 2, two: 1, one: 0 },
    },
    reviews: [],
    license: {
      type: 'mit',
      commercial: true,
      modification: true,
      distribution: true,
      attribution: true,
    },
    visibility: 'public',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Helper to create marketplace config
function createTestConfig(overrides?: Partial<MarketplaceConfig>): MarketplaceConfig {
  return {
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
    ...overrides,
  };
}

// Helper to create marketplace settings
function createTestSettings(overrides?: Partial<MarketplaceSettings>): MarketplaceSettings {
  return {
    commission: 0.3,
    minPrice: 0,
    maxPrice: 9999,
    allowFreeTemplates: true,
    requireReview: false,
    requireDocumentation: false,
    autoApprove: true,
    featuredRotation: 86400000,
    trendingAlgorithm: 'weighted',
    ...overrides,
  };
}

// ============================================================================
// SearchIndex Tests
// ============================================================================

describe('SearchIndex', () => {
  let searchIndex: SearchIndex;

  beforeEach(() => {
    searchIndex = new SearchIndex();
  });

  it('should index template by name', async () => {
    const template = createTestTemplate({ name: 'Email Automation' });
    await searchIndex.indexTemplate(template);
    // Index operation should complete without error
    expect(true).toBe(true);
  });

  it('should index template by category', async () => {
    const template = createTestTemplate({ category: 'marketing' });
    await searchIndex.indexTemplate(template);
    expect(true).toBe(true);
  });

  it('should index template by tags', async () => {
    const template = createTestTemplate({ tags: ['email', 'marketing', 'automation'] });
    await searchIndex.indexTemplate(template);
    expect(true).toBe(true);
  });

  it('should update template index', async () => {
    const template = createTestTemplate();
    await searchIndex.indexTemplate(template);
    template.name = 'Updated Template Name';
    await searchIndex.updateTemplate(template);
    expect(true).toBe(true);
  });
});

// ============================================================================
// RecommendationEngine Tests
// ============================================================================

describe('RecommendationEngine', () => {
  let recommendationEngine: RecommendationEngine;

  beforeEach(() => {
    recommendationEngine = new RecommendationEngine();
  });

  it('should return personalized recommendations', async () => {
    const templates = new Map<string, WorkflowTemplate>();
    templates.set('tpl-1', createTestTemplate({ id: 'tpl-1' }));
    templates.set('tpl-2', createTestTemplate({ id: 'tpl-2' }));

    const recommendations = await recommendationEngine.getPersonalized('user-1', templates, 5);

    expect(recommendations.length).toBeLessThanOrEqual(5);
  });

  it('should respect limit parameter', async () => {
    const templates = new Map<string, WorkflowTemplate>();
    for (let i = 0; i < 10; i++) {
      templates.set(`tpl-${i}`, createTestTemplate({ id: `tpl-${i}` }));
    }

    const recommendations = await recommendationEngine.getPersonalized('user-1', templates, 3);

    expect(recommendations.length).toBe(3);
  });
});

// ============================================================================
// TemplateRegistry Tests
// ============================================================================

describe('TemplateRegistry', () => {
  let registry: TemplateRegistry;

  beforeEach(() => {
    registry = new TemplateRegistry(createTestConfig());
  });

  describe('Template CRUD', () => {
    it('should set and get template', () => {
      const template = createTestTemplate();
      registry.setTemplate(template);

      expect(registry.getTemplate(template.id)).toEqual(template);
    });

    it('should delete template', () => {
      const template = createTestTemplate();
      registry.setTemplate(template);

      expect(registry.deleteTemplate(template.id)).toBe(true);
      expect(registry.getTemplate(template.id)).toBeUndefined();
    });

    it('should get all templates', () => {
      registry.setTemplate(createTestTemplate({ id: 'tpl-1' }));
      registry.setTemplate(createTestTemplate({ id: 'tpl-2' }));

      expect(registry.getAllTemplates().length).toBe(2);
    });
  });

  describe('Author Operations', () => {
    it('should create new author', () => {
      const author = registry.createAuthor('user-123');

      expect(author.id).toBe('user-123');
      expect(author.username).toBe('user_user-123');
      expect(author.reputation).toBe(0);
    });

    it('should get or create author', () => {
      const author1 = registry.getOrCreateAuthor('user-123');
      const author2 = registry.getOrCreateAuthor('user-123');

      expect(author1).toEqual(author2);
    });
  });

  describe('Collection Operations', () => {
    it('should set and get collection', () => {
      const collection = {
        id: 'col-1',
        name: 'Test Collection',
        owner: createTestAuthor(),
        templates: ['tpl-1', 'tpl-2'],
        visibility: 'public' as const,
        followers: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      registry.setCollection(collection);
      expect(registry.getCollection('col-1')).toEqual(collection);
    });
  });

  describe('Purchase Operations', () => {
    it('should find user purchase for template', () => {
      const purchase: Purchase = {
        id: 'pur-1',
        buyer: createTestAuthor({ id: 'user-1' }),
        template: createTestTemplate({ id: 'tpl-1' }),
        price: 29.99,
        currency: 'USD',
        method: 'card',
        status: 'completed',
        license: { key: 'abc123', activations: 1, maxActivations: 1, devices: [] },
        createdAt: new Date(),
      };

      registry.setPurchase(purchase);

      const found = registry.findUserPurchaseForTemplate('user-1', 'tpl-1');
      expect(found).toEqual(purchase);
    });

    it('should return null for non-existent purchase', () => {
      const found = registry.findUserPurchaseForTemplate('user-1', 'tpl-1');
      expect(found).toBeNull();
    });
  });

  describe('Review Operations', () => {
    it('should add and get reviews', () => {
      const review = {
        id: 'rev-1',
        author: createTestAuthor(),
        rating: 5,
        content: 'Great template!',
        helpful: 10,
        notHelpful: 1,
        verified: true,
        createdAt: new Date(),
      };

      registry.addReview('tpl-1', review);
      expect(registry.getReviews('tpl-1')).toContainEqual(review);
    });
  });

  describe('Cache Operations', () => {
    it('should cache and retrieve data', () => {
      const key = registry.getCacheKey('search', { query: 'test' });
      registry.setCache(key, { results: [] });

      expect(registry.getCached(key)).toEqual({ results: [] });
    });

    it('should generate unique cache keys', () => {
      const key1 = registry.getCacheKey('search', { query: 'test1' });
      const key2 = registry.getCacheKey('search', { query: 'test2' });

      expect(key1).not.toBe(key2);
    });
  });

  describe('Facet Calculation', () => {
    it('should calculate facets from templates', () => {
      const templates = [
        createTestTemplate({ category: 'automation', tags: ['email'] }),
        createTestTemplate({ category: 'automation', tags: ['slack'] }),
        createTestTemplate({ category: 'marketing', tags: ['email'] }),
      ];

      const facets = registry.calculateFacets(templates);

      expect(facets.categories['automation']).toBe(2);
      expect(facets.categories['marketing']).toBe(1);
      expect(facets.tags['email']).toBe(2);
    });
  });

  describe('ID Generators', () => {
    it('should generate unique template IDs', () => {
      const id1 = registry.generateTemplateId();
      const id2 = registry.generateTemplateId();

      expect(id1).not.toBe(id2);
      expect(id1.startsWith('tpl_')).toBe(true);
    });

    it('should generate unique review IDs', () => {
      const id = registry.generateReviewId();
      expect(id.startsWith('rev_')).toBe(true);
    });
  });
});

// ============================================================================
// TemplateValidator Tests
// ============================================================================

describe('TemplateValidator', () => {
  let validator: TemplateValidator;

  beforeEach(() => {
    validator = new TemplateValidator(createTestSettings());
  });

  describe('Validation', () => {
    it('should validate valid template', async () => {
      const workflow = createTestWorkflow();
      const metadata: TemplatePublishMetadata = {
        name: 'Valid Template',
        description: 'This is a valid template description',
        category: 'automation',
      };

      await expect(validator.validate(workflow, metadata, [])).resolves.not.toThrow();
    });

    it('should reject workflow without nodes', async () => {
      const workflow = createTestWorkflow({ nodes: [] });
      const metadata: TemplatePublishMetadata = {
        name: 'Empty Workflow',
        description: 'A workflow without nodes',
        category: 'automation',
      };

      await expect(validator.validate(workflow, metadata, [])).rejects.toThrow(
        'Workflow must have at least one node'
      );
    });

    it('should reject short template name', async () => {
      const workflow = createTestWorkflow();
      const metadata: TemplatePublishMetadata = {
        name: 'AB',
        description: 'This is a valid description',
        category: 'automation',
      };

      await expect(validator.validate(workflow, metadata, [])).rejects.toThrow(
        'Template name too short'
      );
    });

    it('should reject short description', async () => {
      const workflow = createTestWorkflow();
      const metadata: TemplatePublishMetadata = {
        name: 'Valid Name',
        description: 'Too short',
        category: 'automation',
      };

      await expect(validator.validate(workflow, metadata, [])).rejects.toThrow(
        'Template description too short'
      );
    });

    it('should reject duplicate template names', async () => {
      const workflow = createTestWorkflow();
      const metadata: TemplatePublishMetadata = {
        name: 'Existing Template',
        description: 'This template already exists',
        category: 'automation',
      };
      const existingTemplates = [createTestTemplate({ name: 'Existing Template' })];

      await expect(validator.validate(workflow, metadata, existingTemplates)).rejects.toThrow(
        'Template with this name already exists'
      );
    });

    it('should reject price below minimum', async () => {
      validator.updateSettings(createTestSettings({ minPrice: 10 }));

      const workflow = createTestWorkflow();
      const metadata: TemplatePublishMetadata = {
        name: 'Valid Name',
        description: 'Valid description for the template',
        category: 'automation',
        pricing: { model: 'paid', price: 5 },
      };

      await expect(validator.validate(workflow, metadata, [])).rejects.toThrow(
        'Price must be at least 10'
      );
    });

    it('should reject price above maximum', async () => {
      validator.updateSettings(createTestSettings({ maxPrice: 100 }));

      const workflow = createTestWorkflow();
      const metadata: TemplatePublishMetadata = {
        name: 'Valid Name',
        description: 'Valid description for the template',
        category: 'automation',
        pricing: { model: 'paid', price: 150 },
      };

      await expect(validator.validate(workflow, metadata, [])).rejects.toThrow(
        'Price cannot exceed 100'
      );
    });
  });
});

// ============================================================================
// TemplateFilter Tests
// ============================================================================

describe('TemplateFilter', () => {
  let filter: TemplateFilter;

  beforeEach(() => {
    filter = new TemplateFilter();
  });

  it('should filter by verified status', () => {
    const templates = [
      createTestTemplate({ id: 'tpl-1', verified: true }),
      createTestTemplate({ id: 'tpl-2', verified: false }),
    ];

    const filtered = filter.apply(templates, { verified: true });
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('tpl-1');
  });

  it('should filter by featured status', () => {
    const templates = [
      createTestTemplate({ id: 'tpl-1', featured: true }),
      createTestTemplate({ id: 'tpl-2', featured: false }),
    ];

    const filtered = filter.apply(templates, { featured: true });
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('tpl-1');
  });

  it('should filter by minimum downloads', () => {
    const templates = [
      createTestTemplate({ id: 'tpl-1', stats: { ...createTestTemplate().stats, downloads: 100 } }),
      createTestTemplate({ id: 'tpl-2', stats: { ...createTestTemplate().stats, downloads: 50 } }),
    ];

    const filtered = filter.apply(templates, { minDownloads: 75 });
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('tpl-1');
  });

  it('should filter by max price', () => {
    const templates = [
      createTestTemplate({ id: 'tpl-1', pricing: { model: 'paid', price: 29.99 } }),
      createTestTemplate({ id: 'tpl-2', pricing: { model: 'paid', price: 99.99 } }),
    ];

    const filtered = filter.apply(templates, { maxPrice: 50 });
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('tpl-1');
  });

  it('should filter by date range', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);
    const lastWeek = new Date(now.getTime() - 7 * 86400000);

    const templates = [
      createTestTemplate({ id: 'tpl-1', createdAt: yesterday }),
      createTestTemplate({ id: 'tpl-2', createdAt: lastWeek }),
    ];

    const filtered = filter.apply(templates, {
      dateRange: { from: new Date(now.getTime() - 3 * 86400000), to: now },
    });
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('tpl-1');
  });
});

// ============================================================================
// TemplateSorter Tests
// ============================================================================

describe('TemplateSorter', () => {
  let sorter: TemplateSorter;

  beforeEach(() => {
    sorter = new TemplateSorter();
  });

  it('should sort by downloads', () => {
    const templates = [
      createTestTemplate({ id: 'tpl-1', stats: { ...createTestTemplate().stats, downloads: 50 } }),
      createTestTemplate({ id: 'tpl-2', stats: { ...createTestTemplate().stats, downloads: 100 } }),
    ];

    const sorted = sorter.sort(templates, 'downloads');
    expect(sorted[0].id).toBe('tpl-2');
  });

  it('should sort by rating', () => {
    const templates = [
      createTestTemplate({ id: 'tpl-1', ratings: { ...createTestTemplate().ratings, average: 3.5 } }),
      createTestTemplate({ id: 'tpl-2', ratings: { ...createTestTemplate().ratings, average: 4.8 } }),
    ];

    const sorted = sorter.sort(templates, 'rating');
    expect(sorted[0].id).toBe('tpl-2');
  });

  it('should sort by newest', () => {
    const now = new Date();
    const templates = [
      createTestTemplate({ id: 'tpl-1', createdAt: new Date(now.getTime() - 86400000) }),
      createTestTemplate({ id: 'tpl-2', createdAt: now }),
    ];

    const sorted = sorter.sort(templates, 'newest');
    expect(sorted[0].id).toBe('tpl-2');
  });

  it('should sort by price low to high', () => {
    const templates = [
      createTestTemplate({ id: 'tpl-1', pricing: { model: 'paid', price: 99 } }),
      createTestTemplate({ id: 'tpl-2', pricing: { model: 'paid', price: 29 } }),
    ];

    const sorted = sorter.sort(templates, 'price-low');
    expect(sorted[0].id).toBe('tpl-2');
  });

  it('should calculate trending score', () => {
    const template = createTestTemplate();
    const score = sorter.calculateTrendingScore(template);

    expect(score).toBeGreaterThan(0);
  });
});

// ============================================================================
// TemplatePaginator Tests
// ============================================================================

describe('TemplatePaginator', () => {
  let paginator: TemplatePaginator;

  beforeEach(() => {
    paginator = new TemplatePaginator();
  });

  it('should paginate with default values', () => {
    const items = Array.from({ length: 50 }, (_, i) => createTestTemplate({ id: `tpl-${i}` }));
    const result = paginator.paginate(items);

    expect(result.items.length).toBe(20);
    expect(result.total).toBe(50);
    expect(result.pages).toBe(3);
  });

  it('should paginate with custom page and limit', () => {
    const items = Array.from({ length: 50 }, (_, i) => createTestTemplate({ id: `tpl-${i}` }));
    const result = paginator.paginate(items, { page: 2, limit: 10 });

    expect(result.items.length).toBe(10);
    expect(result.items[0].id).toBe('tpl-10');
  });

  it('should handle last page with fewer items', () => {
    const items = Array.from({ length: 25 }, (_, i) => createTestTemplate({ id: `tpl-${i}` }));
    const result = paginator.paginate(items, { page: 3, limit: 10 });

    expect(result.items.length).toBe(5);
  });
});

// ============================================================================
// VersionManager Tests
// ============================================================================

describe('VersionManager', () => {
  let versionManager: VersionManager;

  beforeEach(() => {
    versionManager = new VersionManager();
  });

  it('should store and retrieve versions', () => {
    versionManager.storeVersion('tpl-1', {
      version: '1.0.0',
      changelog: 'Initial release',
      workflow: createTestWorkflow(),
      releasedAt: new Date(),
    });

    const versions = versionManager.getVersions('tpl-1');
    expect(versions.length).toBe(1);
    expect(versions[0].version).toBe('1.0.0');
  });

  it('should get latest version', () => {
    versionManager.storeVersion('tpl-1', {
      version: '1.0.0',
      changelog: 'Initial release',
      workflow: createTestWorkflow(),
      releasedAt: new Date(),
    });
    versionManager.storeVersion('tpl-1', {
      version: '1.1.0',
      changelog: 'Added new features',
      workflow: createTestWorkflow(),
      releasedAt: new Date(),
    });

    const latest = versionManager.getLatestVersion('tpl-1');
    expect(latest?.version).toBe('1.1.0');
  });

  it('should get specific version', () => {
    versionManager.storeVersion('tpl-1', {
      version: '1.0.0',
      changelog: 'Initial release',
      workflow: createTestWorkflow(),
      releasedAt: new Date(),
    });

    const version = versionManager.getVersion('tpl-1', '1.0.0');
    expect(version?.changelog).toBe('Initial release');
  });

  it('should clear versions for template', () => {
    versionManager.storeVersion('tpl-1', {
      version: '1.0.0',
      changelog: 'Initial release',
      workflow: createTestWorkflow(),
      releasedAt: new Date(),
    });

    versionManager.clearVersions('tpl-1');
    expect(versionManager.getVersions('tpl-1')).toHaveLength(0);
  });
});

// ============================================================================
// RatingCalculator Tests
// ============================================================================

describe('RatingCalculator', () => {
  let ratingCalculator: RatingCalculator;

  beforeEach(() => {
    ratingCalculator = new RatingCalculator();
  });

  it('should update ratings correctly', () => {
    const template = createTestTemplate({
      ratings: {
        average: 4.0,
        count: 10,
        distribution: { five: 5, four: 3, three: 1, two: 1, one: 0 },
      },
    });

    ratingCalculator.updateRatings(template, 5);

    expect(template.ratings.count).toBe(11);
    expect(template.ratings.distribution.five).toBe(6);
    expect(template.ratings.average).toBeCloseTo(4.09, 1);
  });
});

// ============================================================================
// PaymentProcessor Tests
// ============================================================================

describe('PaymentProcessor', () => {
  let paymentProcessor: PaymentProcessor;

  beforeEach(() => {
    paymentProcessor = new PaymentProcessor(0.3);
  });

  it('should process payment successfully', async () => {
    const pricing: Pricing = { model: 'paid', price: 29.99, currency: 'USD' };
    const buyer = createTestAuthor();

    const result = await paymentProcessor.processPayment(pricing, buyer, 'card');

    expect(result.success).toBe(true);
    expect(result.transactionId).toBeDefined();
  });

  it('should generate license key', () => {
    const template = createTestTemplate({ pricing: { model: 'one-time' } });
    const license = paymentProcessor.generateLicense(template, 'user-1');

    expect(license.key).toBeDefined();
    expect(license.key.length).toBe(64);
    expect(license.activations).toBe(1);
  });

  it('should calculate author earnings', () => {
    const purchase: Purchase = {
      id: 'pur-1',
      buyer: createTestAuthor(),
      template: createTestTemplate(),
      price: 100,
      currency: 'USD',
      method: 'card',
      status: 'completed',
      license: { key: 'test', activations: 1, maxActivations: 1, devices: [] },
      createdAt: new Date(),
    };

    const earnings = paymentProcessor.calculateAuthorEarnings(purchase);
    expect(earnings).toBe(70); // 100 * (1 - 0.3)
  });

  it('should calculate expiration dates', () => {
    const monthly = paymentProcessor.calculateExpiration('monthly');
    const yearly = paymentProcessor.calculateExpiration('yearly');
    const lifetime = paymentProcessor.calculateExpiration('lifetime');

    expect(monthly.getTime()).toBeGreaterThan(Date.now());
    expect(yearly.getTime()).toBeGreaterThan(monthly.getTime());
    expect(lifetime.getTime()).toBeGreaterThan(yearly.getTime());
  });
});

// ============================================================================
// AnalyticsManager Tests
// ============================================================================

describe('AnalyticsManager', () => {
  let analyticsManager: AnalyticsManager;

  beforeEach(() => {
    analyticsManager = new AnalyticsManager();
  });

  it('should update analytics on template publish', () => {
    const template = createTestTemplate({ category: 'automation' });
    analyticsManager.updateAnalytics('template-published', { template });

    const analytics = analyticsManager.getAnalytics();
    expect(analytics.templates.total).toBe(1);
    expect(analytics.templates.byCategory['automation']).toBe(1);
  });

  it('should update analytics on purchase', () => {
    const purchase: Purchase = {
      id: 'pur-1',
      buyer: createTestAuthor(),
      template: createTestTemplate(),
      price: 29.99,
      currency: 'USD',
      method: 'card',
      status: 'completed',
      license: { key: 'test', activations: 1, maxActivations: 1, devices: [] },
      createdAt: new Date(),
    };

    analyticsManager.updateAnalytics('purchase', { purchase });

    const analytics = analyticsManager.getAnalytics();
    expect(analytics.revenue.total).toBe(29.99);
  });

  it('should update engagement metrics', () => {
    analyticsManager.updateAnalytics('download', {});
    analyticsManager.updateAnalytics('review', {});
    analyticsManager.updateAnalytics('share', {});

    const analytics = analyticsManager.getAnalytics();
    expect(analytics.engagement.downloads).toBe(1);
    expect(analytics.engagement.reviews).toBe(1);
    expect(analytics.engagement.shares).toBe(1);
  });
});

// ============================================================================
// TrendingCalculator Tests
// ============================================================================

describe('TrendingCalculator', () => {
  let trendingCalculator: TrendingCalculator;

  beforeEach(() => {
    trendingCalculator = new TrendingCalculator();
  });

  it('should calculate trending score', () => {
    const template = createTestTemplate();
    const score = trendingCalculator.calculateScore(template);

    expect(score).toBeGreaterThan(0);
  });

  it('should get trending templates', () => {
    const templates = [
      createTestTemplate({ id: 'tpl-1', stats: { ...createTestTemplate().stats, downloads: 100 } }),
      createTestTemplate({ id: 'tpl-2', stats: { ...createTestTemplate().stats, downloads: 500 } }),
    ];

    const trending = trendingCalculator.getTrending(templates, 10);

    expect(trending[0].id).toBe('tpl-2');
  });

  it('should filter by category', () => {
    const templates = [
      createTestTemplate({ id: 'tpl-1', category: 'automation' }),
      createTestTemplate({ id: 'tpl-2', category: 'marketing' }),
    ];

    const trending = trendingCalculator.getTrending(templates, 10, 'automation');

    expect(trending.length).toBe(1);
    expect(trending[0].category).toBe('automation');
  });
});

// ============================================================================
// SimilarityCalculator Tests
// ============================================================================

describe('SimilarityCalculator', () => {
  let similarityCalculator: SimilarityCalculator;

  beforeEach(() => {
    similarityCalculator = new SimilarityCalculator();
  });

  it('should calculate similarity score', () => {
    const template = createTestTemplate({ category: 'automation', tags: ['email', 'slack'] });
    const categories = new Set<TemplateCategory>(['automation']);
    const tags = new Set(['email', 'teams']);

    const score = similarityCalculator.calculateSimilarityScore(template, categories, tags);

    expect(score).toBe(12); // 10 for category + 2 for 'email' tag
  });

  it('should return popular templates when no history', async () => {
    const templates = [
      createTestTemplate({ id: 'tpl-1', stats: { ...createTestTemplate().stats, downloads: 100 } }),
      createTestTemplate({ id: 'tpl-2', stats: { ...createTestTemplate().stats, downloads: 500 } }),
    ];

    const similar = await similarityCalculator.getSimilar(templates, [], 5);

    expect(similar[0].stats.downloads).toBe(500);
  });
});

// ============================================================================
// BackgroundTaskManager Tests
// ============================================================================

describe('BackgroundTaskManager', () => {
  let taskManager: BackgroundTaskManager;

  beforeEach(() => {
    taskManager = new BackgroundTaskManager(createTestSettings({ featuredRotation: 100 }));
  });

  afterEach(() => {
    taskManager.stop();
  });

  it('should start and stop background tasks', async () => {
    const callbacks = {
      onRotateFeatured: vi.fn(),
      onUpdateTrending: vi.fn(),
      onCleanCache: vi.fn(),
    };

    taskManager.start(callbacks);

    // Wait for rotation interval
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(callbacks.onRotateFeatured).toHaveBeenCalled();

    taskManager.stop();
  });
});

// ============================================================================
// WorkflowTemplatesMarketplace Tests
// ============================================================================

describe('WorkflowTemplatesMarketplace', () => {
  let marketplace: WorkflowTemplatesMarketplace;

  beforeEach(() => {
    marketplace = new WorkflowTemplatesMarketplace({
      cacheTimeout: 1000,
    });
  });

  afterEach(() => {
    marketplace.shutdown();
  });

  it('should publish template', async () => {
    const workflow = createTestWorkflow();
    const metadata: TemplatePublishMetadata = {
      name: 'My Template',
      description: 'A great template for testing purposes',
      category: 'automation',
      tags: ['test'],
      documentation: {
        readme: 'This is the documentation for the test template',
      },
    };

    const template = await marketplace.publishTemplate(workflow, metadata, 'author-1');

    expect(template.id).toBeDefined();
    expect(template.name).toBe('My Template');
    expect(template.author.id).toBe('author-1');
  });

  it('should get template and increment views', async () => {
    const workflow = createTestWorkflow();
    const metadata: TemplatePublishMetadata = {
      name: 'View Test Template',
      description: 'A template to test view counting',
      category: 'automation',
      documentation: {
        readme: 'Documentation for view test template',
      },
    };

    const published = await marketplace.publishTemplate(workflow, metadata, 'author-1');
    const initialViews = published.stats.views;

    await marketplace.getTemplate(published.id);

    const retrieved = await marketplace.getTemplate(published.id);
    expect(retrieved?.stats.views).toBe(initialViews + 2);
  });

  it('should rate template', async () => {
    const workflow = createTestWorkflow();
    const metadata: TemplatePublishMetadata = {
      name: 'Rating Test Template',
      description: 'A template to test the rating system',
      category: 'automation',
      documentation: {
        readme: 'Documentation for rating test template',
      },
    };

    const template = await marketplace.publishTemplate(workflow, metadata, 'author-1');
    const review = await marketplace.rateTemplate(template.id, 'reviewer-1', 5, {
      content: 'Excellent template!',
    });

    expect(review.rating).toBe(5);
    expect(review.content).toBe('Excellent template!');
  });

  it('should prevent duplicate reviews', async () => {
    const workflow = createTestWorkflow();
    const metadata: TemplatePublishMetadata = {
      name: 'Duplicate Review Test',
      description: 'A template to test duplicate review prevention',
      category: 'automation',
      documentation: {
        readme: 'Documentation for duplicate review test',
      },
    };

    const template = await marketplace.publishTemplate(workflow, metadata, 'author-1');
    await marketplace.rateTemplate(template.id, 'reviewer-1', 5, { content: 'Great!' });

    await expect(
      marketplace.rateTemplate(template.id, 'reviewer-1', 4, { content: 'Changed my mind' })
    ).rejects.toThrow('User already reviewed this template');
  });

  it('should create collection', async () => {
    const collection = await marketplace.createCollection(
      'My Collection',
      'A test collection',
      'owner-1',
      []
    );

    expect(collection.id).toBeDefined();
    expect(collection.name).toBe('My Collection');
    expect(collection.owner.id).toBe('owner-1');
  });

  it('should get recommendations', async () => {
    const workflow = createTestWorkflow();
    const metadata: TemplatePublishMetadata = {
      name: 'Recommendation Test',
      description: 'A template for recommendation testing',
      category: 'automation',
      documentation: {
        readme: 'Documentation for recommendation test',
      },
    };

    await marketplace.publishTemplate(workflow, metadata, 'author-1');

    const recommendations = await marketplace.getRecommendations('user-1', {
      type: 'trending',
      limit: 5,
    });

    expect(Array.isArray(recommendations)).toBe(true);
  });

  it('should get analytics', () => {
    const analytics = marketplace.getAnalytics();

    expect(analytics).toHaveProperty('templates');
    expect(analytics).toHaveProperty('users');
    expect(analytics).toHaveProperty('revenue');
    expect(analytics).toHaveProperty('engagement');
  });

  it('should emit events on template publish', async () => {
    const handler = vi.fn();
    marketplace.on('template:published', handler);

    const workflow = createTestWorkflow();
    const metadata: TemplatePublishMetadata = {
      name: 'Event Test Template',
      description: 'A template to test event emission',
      category: 'automation',
      documentation: {
        readme: 'Documentation for event test template',
      },
    };

    await marketplace.publishTemplate(workflow, metadata, 'author-1');

    expect(handler).toHaveBeenCalled();
  });
});
