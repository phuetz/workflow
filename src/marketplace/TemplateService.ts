/**
 * Template Service - Template CRUD and Discovery
 * Handles all template-related operations including search, versioning, and analytics
 */

import {
  WorkflowTemplate,
  TemplateSearchFilters,
  TemplateSearchResult,
  TemplateStatus,
  TemplateCategory,
  MarketplaceResponse,
  PaginatedResponse,
  MarketplaceEvent,
  MarketplaceEventType,
} from '../types/marketplace';
import { TemplateRepository } from './TemplateRepository';
import { logger } from '../services/SimpleLogger';

export class TemplateService {
  private repository: TemplateRepository;
  private searchIndex: any; // Algolia/MeiliSearch client
  private eventListeners: Map<MarketplaceEventType, Function[]> = new Map();

  constructor(repository: TemplateRepository, searchClient?: any) {
    this.repository = repository;
    this.searchIndex = searchClient;
  }

  /**
   * Search templates with filters and pagination
   */
  async searchTemplates(
    filters: TemplateSearchFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<TemplateSearchResult> {
    try {
      // Build search query
      const searchQuery = this.buildSearchQuery(filters);

      // Use search index if available (faster), otherwise use repository
      let results: WorkflowTemplate[];
      let total: number;

      if (this.searchIndex) {
        const searchResults = await this.searchWithIndex(searchQuery, page, pageSize);
        results = searchResults.templates;
        total = searchResults.total;
      } else {
        const repoResults = await this.repository.search(filters, page, pageSize);
        results = repoResults.items;
        total = repoResults.total;
      }

      return {
        templates: results,
        total,
        page,
        pageSize,
        filters,
      };
    } catch (error) {
      logger.error('Template search error:', error);
      throw new Error('Failed to search templates');
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<MarketplaceResponse<WorkflowTemplate>> {
    try {
      const template = await this.repository.findById(id);

      if (!template) {
        return {
          success: false,
          error: 'Template not found',
        };
      }

      // Track view event
      await this.trackEvent({
        type: MarketplaceEventType.TEMPLATE_VIEWED,
        resourceId: id,
        resourceType: 'template',
        userId: 'system', // Should be actual user ID
        timestamp: new Date(),
      });

      // Increment view count
      await this.repository.incrementViews(id);

      return {
        success: true,
        data: template,
      };
    } catch (error) {
      logger.error('Get template error:', error);
      return {
        success: false,
        error: 'Failed to retrieve template',
      };
    }
  }

  /**
   * Create new template
   */
  async createTemplate(template: Partial<WorkflowTemplate>): Promise<MarketplaceResponse<WorkflowTemplate>> {
    try {
      // Validate template
      const validation = this.validateTemplate(template);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Create template with defaults
      const newTemplate: WorkflowTemplate = {
        ...template,
        id: this.generateId(),
        version: template.version || '1.0.0',
        status: TemplateStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        analytics: {
          views: 0,
          installs: 0,
          activeInstalls: 0,
          successRate: 0,
          averageRating: 0,
          ratingCount: 0,
          trending: false,
          popularityScore: 0,
        },
        tags: template.tags || [],
      } as WorkflowTemplate;

      // Save to repository
      const saved = await this.repository.create(newTemplate);

      // Index in search engine
      if (this.searchIndex) {
        await this.indexTemplate(saved);
      }

      return {
        success: true,
        data: saved,
        message: 'Template created successfully',
      };
    } catch (error) {
      logger.error('Create template error:', error);
      return {
        success: false,
        error: 'Failed to create template',
      };
    }
  }

  /**
   * Update existing template
   */
  async updateTemplate(
    id: string,
    updates: Partial<WorkflowTemplate>
  ): Promise<MarketplaceResponse<WorkflowTemplate>> {
    try {
      const existing = await this.repository.findById(id);
      if (!existing) {
        return {
          success: false,
          error: 'Template not found',
        };
      }

      // Check version change
      const versionChanged = updates.version && updates.version !== existing.version;

      const updated = await this.repository.update(id, {
        ...updates,
        updatedAt: new Date(),
      });

      // If version changed, create new version entry
      if (versionChanged) {
        await this.repository.createVersion(id, existing);
      }

      // Update search index
      if (this.searchIndex && updated) {
        await this.indexTemplate(updated);
      }

      return {
        success: true,
        data: updated,
        message: 'Template updated successfully',
      };
    } catch (error) {
      logger.error('Update template error:', error);
      return {
        success: false,
        error: 'Failed to update template',
      };
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<MarketplaceResponse<void>> {
    try {
      await this.repository.delete(id);

      // Remove from search index
      if (this.searchIndex) {
        await this.removeFromIndex(id);
      }

      return {
        success: true,
        message: 'Template deleted successfully',
      };
    } catch (error) {
      logger.error('Delete template error:', error);
      return {
        success: false,
        error: 'Failed to delete template',
      };
    }
  }

  /**
   * Publish template
   */
  async publishTemplate(id: string): Promise<MarketplaceResponse<WorkflowTemplate>> {
    try {
      const template = await this.repository.findById(id);
      if (!template) {
        return {
          success: false,
          error: 'Template not found',
        };
      }

      if (template.status !== TemplateStatus.DRAFT && template.status !== TemplateStatus.PENDING_REVIEW) {
        return {
          success: false,
          error: 'Template cannot be published',
        };
      }

      const published = await this.repository.update(id, {
        status: TemplateStatus.PUBLISHED,
        publishedAt: new Date(),
      });

      return {
        success: true,
        data: published,
        message: 'Template published successfully',
      };
    } catch (error) {
      logger.error('Publish template error:', error);
      return {
        success: false,
        error: 'Failed to publish template',
      };
    }
  }

  /**
   * Install template
   */
  async installTemplate(
    templateId: string,
    userId: string
  ): Promise<MarketplaceResponse<any>> {
    try {
      const template = await this.repository.findById(templateId);
      if (!template) {
        return {
          success: false,
          error: 'Template not found',
        };
      }

      // Check dependencies
      const dependenciesCheck = await this.checkDependencies(template);
      if (!dependenciesCheck.satisfied) {
        return {
          success: false,
          error: 'Missing dependencies',
          data: dependenciesCheck.missing,
        };
      }

      // Clone workflow
      const workflow = JSON.parse(JSON.stringify(template.workflow));

      // Track install event
      await this.trackEvent({
        type: MarketplaceEventType.TEMPLATE_INSTALLED,
        resourceId: templateId,
        resourceType: 'template',
        userId,
        timestamp: new Date(),
      });

      // Increment install count
      await this.repository.incrementInstalls(templateId);

      return {
        success: true,
        data: workflow,
        message: 'Template installed successfully',
      };
    } catch (error) {
      logger.error('Install template error:', error);
      return {
        success: false,
        error: 'Failed to install template',
      };
    }
  }

  /**
   * Get trending templates
   */
  async getTrendingTemplates(limit: number = 10): Promise<WorkflowTemplate[]> {
    return this.repository.findTrending(limit);
  }

  /**
   * Get popular templates by category
   */
  async getPopularByCategory(
    category: TemplateCategory,
    limit: number = 10
  ): Promise<WorkflowTemplate[]> {
    return this.repository.findPopularByCategory(category, limit);
  }

  /**
   * Get featured templates
   */
  async getFeaturedTemplates(limit: number = 6): Promise<WorkflowTemplate[]> {
    return this.repository.findFeatured(limit);
  }

  /**
   * Get template versions
   */
  async getTemplateVersions(templateId: string): Promise<WorkflowTemplate[]> {
    return this.repository.findVersions(templateId);
  }

  /**
   * Get templates by author
   */
  async getTemplatesByAuthor(authorId: string): Promise<WorkflowTemplate[]> {
    return this.repository.findByAuthor(authorId);
  }

  /**
   * Calculate popularity score
   */
  async updatePopularityScore(templateId: string): Promise<void> {
    const template = await this.repository.findById(templateId);
    if (!template) return;

    // Popularity algorithm:
    // score = (installs * 10) + (views * 0.1) + (rating * 100) + (trending ? 500 : 0)
    const score =
      template.analytics.installs * 10 +
      template.analytics.views * 0.1 +
      template.analytics.averageRating * 100 +
      (template.analytics.trending ? 500 : 0);

    await this.repository.update(templateId, {
      analytics: {
        ...template.analytics,
        popularityScore: score,
      },
    });
  }

  /**
   * Check template dependencies
   */
  private async checkDependencies(template: WorkflowTemplate): Promise<{
    satisfied: boolean;
    missing?: string[];
  }> {
    // Check if required nodes are available
    const availableNodes = await this.getAvailableNodes();
    const missing = template.dependencies.requiredNodes.filter(
      (node) => !availableNodes.includes(node)
    );

    return {
      satisfied: missing.length === 0,
      missing: missing.length > 0 ? missing : undefined,
    };
  }

  /**
   * Get available nodes (stub - should query actual node registry)
   */
  private async getAvailableNodes(): Promise<string[]> {
    // This would query the actual node registry
    return [];
  }

  /**
   * Build search query from filters
   */
  private buildSearchQuery(filters: TemplateSearchFilters): any {
    const query: any = {
      filters: {},
    };

    if (filters.query) {
      query.query = filters.query;
    }

    if (filters.categories && filters.categories.length > 0) {
      query.filters.category = filters.categories;
    }

    if (filters.industries && filters.industries.length > 0) {
      query.filters.industry = filters.industries;
    }

    if (filters.rating) {
      query.filters['analytics.averageRating'] = { $gte: filters.rating };
    }

    if (filters.verified !== undefined) {
      query.filters['author.verified'] = filters.verified;
    }

    if (filters.tags && filters.tags.length > 0) {
      query.filters.tags = { $in: filters.tags };
    }

    return query;
  }

  /**
   * Search with external index (Algolia/MeiliSearch)
   */
  private async searchWithIndex(
    query: any,
    page: number,
    pageSize: number
  ): Promise<{ templates: WorkflowTemplate[]; total: number }> {
    // Stub - implement actual search index integration
    return { templates: [], total: 0 };
  }

  /**
   * Index template in search engine
   */
  private async indexTemplate(template: WorkflowTemplate): Promise<void> {
    if (!this.searchIndex) return;

    try {
      await this.searchIndex.saveObject({
        objectID: template.id,
        ...template,
      });
    } catch (error) {
      logger.error('Failed to index template:', error);
    }
  }

  /**
   * Remove template from search index
   */
  private async removeFromIndex(templateId: string): Promise<void> {
    if (!this.searchIndex) return;

    try {
      await this.searchIndex.deleteObject(templateId);
    } catch (error) {
      logger.error('Failed to remove template from index:', error);
    }
  }

  /**
   * Validate template data
   */
  private validateTemplate(template: Partial<WorkflowTemplate>): {
    valid: boolean;
    error?: string;
  } {
    if (!template.name || template.name.trim().length === 0) {
      return { valid: false, error: 'Template name is required' };
    }

    if (!template.description || template.description.trim().length === 0) {
      return { valid: false, error: 'Template description is required' };
    }

    if (!template.category) {
      return { valid: false, error: 'Template category is required' };
    }

    if (!template.workflow || !template.workflow.nodes || template.workflow.nodes.length === 0) {
      return { valid: false, error: 'Template must have at least one node' };
    }

    return { valid: true };
  }

  /**
   * Track marketplace event
   */
  private async trackEvent(event: MarketplaceEvent): Promise<void> {
    // Emit to listeners
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach((listener) => listener(event));

    // Store in analytics (stub)
    // await this.analyticsService.trackEvent(event);
  }

  /**
   * Subscribe to marketplace events
   */
  on(eventType: MarketplaceEventType, callback: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
