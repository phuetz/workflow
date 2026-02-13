/**
 * Template Repository - Storage Layer with Versioning
 * Handles database operations for templates
 */

import {
  WorkflowTemplate,
  TemplateSearchFilters,
  PaginatedResponse,
  TemplateStatus,
  TemplateCategory,
} from '../types/marketplace';

export class TemplateRepository {
  private templates: Map<string, WorkflowTemplate> = new Map();
  private versions: Map<string, WorkflowTemplate[]> = new Map();
  private storage: any; // Database client (Prisma, MongoDB, etc.)

  constructor(storage?: any) {
    this.storage = storage;
  }

  /**
   * Find template by ID
   */
  async findById(id: string): Promise<WorkflowTemplate | null> {
    if (this.storage) {
      return this.storage.template.findUnique({ where: { id } });
    }
    return this.templates.get(id) || null;
  }

  /**
   * Create new template
   */
  async create(template: WorkflowTemplate): Promise<WorkflowTemplate> {
    if (this.storage) {
      return this.storage.template.create({ data: template });
    }

    this.templates.set(template.id, template);
    return template;
  }

  /**
   * Update template
   */
  async update(id: string, updates: Partial<WorkflowTemplate>): Promise<WorkflowTemplate | null> {
    if (this.storage) {
      return this.storage.template.update({
        where: { id },
        data: updates,
      });
    }

    const existing = this.templates.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates };
    this.templates.set(id, updated);
    return updated;
  }

  /**
   * Delete template
   */
  async delete(id: string): Promise<void> {
    if (this.storage) {
      await this.storage.template.delete({ where: { id } });
      return;
    }

    this.templates.delete(id);
    this.versions.delete(id);
  }

  /**
   * Search templates with filters
   */
  async search(
    filters: TemplateSearchFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<WorkflowTemplate>> {
    let results = Array.from(this.templates.values());

    // Apply filters
    if (filters.query) {
      const query = filters.query.toLowerCase();
      results = results.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    if (filters.categories && filters.categories.length > 0) {
      results = results.filter((t) => filters.categories!.includes(t.category));
    }

    if (filters.industries && filters.industries.length > 0) {
      results = results.filter((t) => filters.industries!.includes(t.industry));
    }

    if (filters.difficulty && filters.difficulty.length > 0) {
      results = results.filter((t) => filters.difficulty!.includes(t.metadata.difficulty));
    }

    if (filters.pricing && filters.pricing.length > 0) {
      results = results.filter((t) => filters.pricing!.includes(t.pricing.type));
    }

    if (filters.rating) {
      results = results.filter((t) => t.analytics.averageRating >= filters.rating!);
    }

    if (filters.tags && filters.tags.length > 0) {
      results = results.filter((t) =>
        filters.tags!.some((tag) => t.tags.includes(tag))
      );
    }

    if (filters.author) {
      results = results.filter((t) => t.author.id === filters.author);
    }

    if (filters.verified !== undefined) {
      results = results.filter((t) => t.author.verified === filters.verified);
    }

    // Filter published only
    results = results.filter((t) => t.status === TemplateStatus.PUBLISHED);

    // Sort
    results = this.sortResults(results, filters.sortBy);

    // Paginate
    const total = results.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResults = results.slice(startIndex, endIndex);

    return {
      items: paginatedResults,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Find trending templates
   */
  async findTrending(limit: number = 10): Promise<WorkflowTemplate[]> {
    const templates = Array.from(this.templates.values())
      .filter((t) => t.status === TemplateStatus.PUBLISHED)
      .filter((t) => t.analytics.trending)
      .sort((a, b) => b.analytics.popularityScore - a.analytics.popularityScore)
      .slice(0, limit);

    return templates;
  }

  /**
   * Find popular templates by category
   */
  async findPopularByCategory(
    category: TemplateCategory,
    limit: number = 10
  ): Promise<WorkflowTemplate[]> {
    const templates = Array.from(this.templates.values())
      .filter((t) => t.status === TemplateStatus.PUBLISHED)
      .filter((t) => t.category === category)
      .sort((a, b) => b.analytics.installs - a.analytics.installs)
      .slice(0, limit);

    return templates;
  }

  /**
   * Find featured templates
   */
  async findFeatured(limit: number = 6): Promise<WorkflowTemplate[]> {
    const templates = Array.from(this.templates.values())
      .filter((t) => t.status === TemplateStatus.PUBLISHED)
      .filter((t) => t.author.verified && t.analytics.averageRating >= 4.5)
      .sort((a, b) => b.analytics.popularityScore - a.analytics.popularityScore)
      .slice(0, limit);

    return templates;
  }

  /**
   * Find templates by author
   */
  async findByAuthor(authorId: string): Promise<WorkflowTemplate[]> {
    return Array.from(this.templates.values()).filter((t) => t.author.id === authorId);
  }

  /**
   * Create version entry
   */
  async createVersion(templateId: string, template: WorkflowTemplate): Promise<void> {
    if (!this.versions.has(templateId)) {
      this.versions.set(templateId, []);
    }

    const versions = this.versions.get(templateId)!;
    versions.push({ ...template, createdAt: new Date() });

    // Keep only last 10 versions
    if (versions.length > 10) {
      versions.shift();
    }
  }

  /**
   * Find all versions of a template
   */
  async findVersions(templateId: string): Promise<WorkflowTemplate[]> {
    return this.versions.get(templateId) || [];
  }

  /**
   * Increment view count
   */
  async incrementViews(id: string): Promise<void> {
    const template = await this.findById(id);
    if (!template) return;

    await this.update(id, {
      analytics: {
        ...template.analytics,
        views: template.analytics.views + 1,
      },
    });
  }

  /**
   * Increment install count
   */
  async incrementInstalls(id: string): Promise<void> {
    const template = await this.findById(id);
    if (!template) return;

    await this.update(id, {
      analytics: {
        ...template.analytics,
        installs: template.analytics.installs + 1,
        activeInstalls: template.analytics.activeInstalls + 1,
      },
    });
  }

  /**
   * Bulk import templates
   */
  async bulkImport(templates: WorkflowTemplate[]): Promise<void> {
    if (this.storage) {
      await this.storage.template.createMany({ data: templates });
      return;
    }

    templates.forEach((template) => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Get all templates (for admin/testing)
   */
  async findAll(): Promise<WorkflowTemplate[]> {
    if (this.storage) {
      return this.storage.template.findMany();
    }
    return Array.from(this.templates.values());
  }

  /**
   * Get template count by category
   */
  async countByCategory(): Promise<Record<TemplateCategory, number>> {
    const templates = Array.from(this.templates.values()).filter(
      (t) => t.status === TemplateStatus.PUBLISHED
    );

    const counts: Record<string, number> = {};
    Object.values(TemplateCategory).forEach((category) => {
      counts[category] = templates.filter((t) => t.category === category).length;
    });

    return counts as Record<TemplateCategory, number>;
  }

  /**
   * Sort results by criteria
   */
  private sortResults(
    results: WorkflowTemplate[],
    sortBy?: string
  ): WorkflowTemplate[] {
    switch (sortBy) {
      case 'popularity':
        return results.sort((a, b) => b.analytics.popularityScore - a.analytics.popularityScore);
      case 'rating':
        return results.sort((a, b) => b.analytics.averageRating - a.analytics.averageRating);
      case 'newest':
        return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      case 'installs':
        return results.sort((a, b) => b.analytics.installs - a.analytics.installs);
      case 'trending':
        return results.sort((a, b) => {
          if (a.analytics.trending && !b.analytics.trending) return -1;
          if (!a.analytics.trending && b.analytics.trending) return 1;
          return b.analytics.popularityScore - a.analytics.popularityScore;
        });
      default:
        return results;
    }
  }
}
