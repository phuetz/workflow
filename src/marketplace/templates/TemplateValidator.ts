/**
 * Template Validator - Handles validation, filtering, sorting, and pagination
 */

import type {
  Workflow,
  WorkflowTemplate,
  TemplatePublishMetadata,
  SearchFilters,
  SortOption,
  Pagination,
  MarketplaceSettings,
} from './types';

/**
 * Template Validator - Validates templates before publishing
 */
export class TemplateValidator {
  private settings: MarketplaceSettings;

  constructor(settings: MarketplaceSettings) {
    this.settings = settings;
  }

  /**
   * Validate template workflow and metadata
   */
  async validate(
    workflow: Workflow,
    metadata: TemplatePublishMetadata,
    existingTemplates: WorkflowTemplate[]
  ): Promise<void> {
    // Validate workflow
    if (!workflow.nodes || workflow.nodes.length === 0) {
      throw new Error('Workflow must have at least one node');
    }

    // Validate metadata
    if (!metadata.name || metadata.name.length < 3) {
      throw new Error('Template name too short');
    }

    if (!metadata.description || metadata.description.length < 10) {
      throw new Error('Template description too short');
    }

    // Validate documentation if required
    if (this.settings.requireDocumentation && !metadata.documentation) {
      throw new Error('Documentation is required');
    }

    // Check for duplicates
    const existing = existingTemplates.find(
      t => t.name === metadata.name
    );

    if (existing) {
      throw new Error('Template with this name already exists');
    }

    // Validate pricing if set
    if (metadata.pricing) {
      this.validatePricing(metadata.pricing);
    }
  }

  /**
   * Validate pricing configuration
   */
  private validatePricing(pricing: { model: string; price?: number }): void {
    if (pricing.model !== 'free' && !this.settings.allowFreeTemplates === false) {
      // Free templates allowed
    }

    if (pricing.price !== undefined) {
      if (pricing.price < this.settings.minPrice) {
        throw new Error(`Price must be at least ${this.settings.minPrice}`);
      }
      if (pricing.price > this.settings.maxPrice) {
        throw new Error(`Price cannot exceed ${this.settings.maxPrice}`);
      }
    }
  }

  /**
   * Update settings
   */
  updateSettings(settings: MarketplaceSettings): void {
    this.settings = settings;
  }
}

/**
 * Template Filter - Applies search filters to template lists
 */
export class TemplateFilter {
  /**
   * Apply filters to template list
   */
  apply(templates: WorkflowTemplate[], filters: SearchFilters): WorkflowTemplate[] {
    let filtered = templates;

    if (filters.verified !== undefined) {
      filtered = filtered.filter(t => t.verified === filters.verified);
    }

    if (filters.featured !== undefined) {
      filtered = filtered.filter(t => t.featured === filters.featured);
    }

    if (filters.minDownloads !== undefined) {
      filtered = filtered.filter(t => t.stats.downloads >= filters.minDownloads!);
    }

    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter(
        t => !t.pricing.price || t.pricing.price <= filters.maxPrice!
      );
    }

    if (filters.hasDocumentation !== undefined && filters.hasDocumentation) {
      filtered = filtered.filter(t => t.documentation !== undefined);
    }

    if (filters.hasVideo !== undefined && filters.hasVideo) {
      filtered = filtered.filter(
        t => t.documentation?.videos && t.documentation.videos.length > 0
      );
    }

    if (filters.dateRange) {
      const { from, to } = filters.dateRange;
      filtered = filtered.filter(
        t => t.createdAt >= from && t.createdAt <= to
      );
    }

    return filtered;
  }
}

/**
 * Template Sorter - Sorts templates by various criteria
 */
export class TemplateSorter {
  /**
   * Sort templates by specified option
   */
  sort(templates: WorkflowTemplate[], sortOption: SortOption): WorkflowTemplate[] {
    const sorted = [...templates];

    switch (sortOption) {
      case 'downloads':
        sorted.sort((a, b) => b.stats.downloads - a.stats.downloads);
        break;

      case 'rating':
        sorted.sort((a, b) => b.ratings.average - a.ratings.average);
        break;

      case 'newest':
        sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;

      case 'oldest':
        sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;

      case 'price-low':
        sorted.sort((a, b) => (a.pricing.price || 0) - (b.pricing.price || 0));
        break;

      case 'price-high':
        sorted.sort((a, b) => (b.pricing.price || 0) - (a.pricing.price || 0));
        break;

      case 'trending':
        sorted.sort(
          (a, b) => this.calculateTrendingScore(b) - this.calculateTrendingScore(a)
        );
        break;

      case 'relevance':
      default:
        // Keep original order for relevance (from search)
        break;
    }

    return sorted;
  }

  /**
   * Calculate trending score for a template
   */
  calculateTrendingScore(template: WorkflowTemplate): number {
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
}

/**
 * Template Paginator - Handles pagination of template lists
 */
export class TemplatePaginator {
  /**
   * Paginate template list
   */
  paginate<T>(
    items: T[],
    pagination?: Pagination
  ): { items: T[]; total: number; pages: number } {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      items: items.slice(start, end),
      total: items.length,
      pages: Math.ceil(items.length / limit),
    };
  }
}
