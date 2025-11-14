/**
 * Template Manager
 * Manage workflow templates, marketplace, and sharing
 */

import type { WorkflowTemplate } from '../components/TemplateMarketplace';

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  count: number;
}

export interface TemplateCollection {
  id: string;
  name: string;
  description: string;
  templates: string[]; // Template IDs
  curator: string;
  public: boolean;
}

export interface TemplateReview {
  id: string;
  templateId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  helpful: number;
  createdAt: string;
}

class TemplateManager {
  private templates: Map<string, WorkflowTemplate> = new Map();
  private categories: Map<string, TemplateCategory> = new Map();
  private collections: Map<string, TemplateCollection> = new Map();
  private reviews: Map<string, TemplateReview[]> = new Map();
  private favorites: Set<string> = new Set();

  constructor() {
    this.loadFromStorage();
    this.initializeDefaultCategories();
  }

  /**
   * Get all templates
   */
  getAllTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): WorkflowTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Search templates
   */
  searchTemplates(query: string, filters?: {
    category?: string;
    tags?: string[];
    minRating?: number;
    author?: string;
  }): WorkflowTemplate[] {
    let results = this.getAllTemplates();

    // Text search
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(template =>
        template.name.toLowerCase().includes(lowerQuery) ||
        template.description.toLowerCase().includes(lowerQuery) ||
        template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }

    // Category filter
    if (filters?.category && filters.category !== 'All') {
      results = results.filter(template => template.category === filters.category);
    }

    // Tags filter
    if (filters?.tags && filters.tags.length > 0) {
      results = results.filter(template =>
        filters.tags!.some(tag => template.tags.includes(tag))
      );
    }

    // Rating filter
    if (filters?.minRating) {
      results = results.filter(template => template.stats.rating >= filters.minRating!);
    }

    // Author filter
    if (filters?.author) {
      results = results.filter(template => template.author.name === filters.author);
    }

    return results;
  }

  /**
   * Get featured templates
   */
  getFeaturedTemplates(limit?: number): WorkflowTemplate[] {
    const featured = this.getAllTemplates().filter(t => t.featured);
    return limit ? featured.slice(0, limit) : featured;
  }

  /**
   * Get popular templates
   */
  getPopularTemplates(limit: number = 10): WorkflowTemplate[] {
    return this.getAllTemplates()
      .sort((a, b) => b.stats.downloads - a.stats.downloads)
      .slice(0, limit);
  }

  /**
   * Get recent templates
   */
  getRecentTemplates(limit: number = 10): WorkflowTemplate[] {
    return this.getAllTemplates()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): WorkflowTemplate[] {
    return this.getAllTemplates().filter(t => t.category === category);
  }

  /**
   * Create template from workflow
   */
  createTemplate(
    workflow: any,
    metadata: {
      name: string;
      description: string;
      category: string;
      tags: string[];
      author: {
        name: string;
        avatar?: string;
      };
    }
  ): WorkflowTemplate {
    const template: WorkflowTemplate = {
      id: this.generateId(),
      name: metadata.name,
      description: metadata.description,
      category: metadata.category,
      tags: metadata.tags,
      author: metadata.author,
      stats: {
        downloads: 0,
        rating: 0,
        reviews: 0,
        views: 0
      },
      workflow,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    this.templates.set(template.id, template);
    this.saveToStorage();

    return template;
  }

  /**
   * Update template
   */
  updateTemplate(id: string, updates: Partial<WorkflowTemplate>): WorkflowTemplate {
    const template = this.templates.get(id);

    if (!template) {
      throw new Error('Template not found');
    }

    const updated = {
      ...template,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.templates.set(id, updated);
    this.saveToStorage();

    return updated;
  }

  /**
   * Delete template
   */
  deleteTemplate(id: string): void {
    this.templates.delete(id);
    this.reviews.delete(id);
    this.favorites.delete(id);
    this.saveToStorage();
  }

  /**
   * Import template
   */
  importTemplate(template: WorkflowTemplate): WorkflowTemplate {
    // Create a copy with new ID
    const imported: WorkflowTemplate = {
      ...template,
      id: this.generateId(),
      stats: {
        ...template.stats,
        downloads: template.stats.downloads + 1
      }
    };

    // Update download count in original
    const original = this.templates.get(template.id);
    if (original) {
      original.stats.downloads++;
      this.templates.set(template.id, original);
    }

    this.saveToStorage();

    return imported;
  }

  /**
   * Export template
   */
  exportTemplate(id: string): string {
    const template = this.templates.get(id);

    if (!template) {
      throw new Error('Template not found');
    }

    return JSON.stringify(template, null, 2);
  }

  /**
   * Share template (generate shareable link)
   */
  shareTemplate(id: string): string {
    const template = this.templates.get(id);

    if (!template) {
      throw new Error('Template not found');
    }

    // Increment views
    template.stats.views++;
    this.templates.set(id, template);
    this.saveToStorage();

    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:3000';

    return `${baseUrl}/templates/${id}`;
  }

  /**
   * Add review
   */
  addReview(
    templateId: string,
    userId: string,
    userName: string,
    rating: number,
    comment: string
  ): TemplateReview {
    const review: TemplateReview = {
      id: this.generateId(),
      templateId,
      userId,
      userName,
      rating,
      comment,
      helpful: 0,
      createdAt: new Date().toISOString()
    };

    const reviews = this.reviews.get(templateId) || [];
    reviews.push(review);
    this.reviews.set(templateId, reviews);

    // Update template rating
    const template = this.templates.get(templateId);
    if (template) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      template.stats.rating = Math.round(avgRating * 10) / 10;
      template.stats.reviews = reviews.length;
      this.templates.set(templateId, template);
    }

    this.saveToStorage();

    return review;
  }

  /**
   * Get reviews for template
   */
  getReviews(templateId: string): TemplateReview[] {
    return this.reviews.get(templateId) || [];
  }

  /**
   * Add to favorites
   */
  addToFavorites(templateId: string): void {
    this.favorites.add(templateId);
    this.saveToStorage();
  }

  /**
   * Remove from favorites
   */
  removeFromFavorites(templateId: string): void {
    this.favorites.delete(templateId);
    this.saveToStorage();
  }

  /**
   * Get favorites
   */
  getFavorites(): WorkflowTemplate[] {
    return Array.from(this.favorites)
      .map(id => this.templates.get(id))
      .filter(Boolean) as WorkflowTemplate[];
  }

  /**
   * Check if template is favorited
   */
  isFavorite(templateId: string): boolean {
    return this.favorites.has(templateId);
  }

  /**
   * Create collection
   */
  createCollection(
    name: string,
    description: string,
    curator: string,
    isPublic: boolean = false
  ): TemplateCollection {
    const collection: TemplateCollection = {
      id: this.generateId(),
      name,
      description,
      templates: [],
      curator,
      public: isPublic
    };

    this.collections.set(collection.id, collection);
    this.saveToStorage();

    return collection;
  }

  /**
   * Add template to collection
   */
  addToCollection(collectionId: string, templateId: string): void {
    const collection = this.collections.get(collectionId);

    if (!collection) {
      throw new Error('Collection not found');
    }

    if (!collection.templates.includes(templateId)) {
      collection.templates.push(templateId);
      this.collections.set(collectionId, collection);
      this.saveToStorage();
    }
  }

  /**
   * Get collections
   */
  getCollections(publicOnly: boolean = false): TemplateCollection[] {
    let collections = Array.from(this.collections.values());

    if (publicOnly) {
      collections = collections.filter(c => c.public);
    }

    return collections;
  }

  /**
   * Get templates in collection
   */
  getCollectionTemplates(collectionId: string): WorkflowTemplate[] {
    const collection = this.collections.get(collectionId);

    if (!collection) {
      return [];
    }

    return collection.templates
      .map(id => this.templates.get(id))
      .filter(Boolean) as WorkflowTemplate[];
  }

  /**
   * Get all categories
   */
  getCategories(): TemplateCategory[] {
    // Update counts
    const counts = new Map<string, number>();

    for (const template of this.templates.values()) {
      counts.set(template.category, (counts.get(template.category) || 0) + 1);
    }

    const categories = Array.from(this.categories.values());

    return categories.map(cat => ({
      ...cat,
      count: counts.get(cat.name) || 0
    }));
  }

  /**
   * Initialize default categories
   */
  private initializeDefaultCategories(): void {
    const defaultCategories = [
      { id: 'ecommerce', name: 'E-commerce', description: 'Online store automation', icon: '🛒' },
      { id: 'marketing', name: 'Marketing', description: 'Marketing automation', icon: '📢' },
      { id: 'data', name: 'Data Processing', description: 'ETL and data pipelines', icon: '📊' },
      { id: 'api', name: 'API Integration', description: 'Connect external services', icon: '🔌' },
      { id: 'social', name: 'Social Media', description: 'Social media automation', icon: '📱' },
      { id: 'analytics', name: 'Analytics', description: 'Data analysis and reporting', icon: '📈' },
      { id: 'automation', name: 'Automation', description: 'General automation', icon: '⚙️' },
      { id: 'support', name: 'Customer Support', description: 'Help desk automation', icon: '💬' },
      { id: 'finance', name: 'Finance', description: 'Financial workflows', icon: '💰' },
      { id: 'hr', name: 'HR & Recruiting', description: 'HR processes', icon: '👥' },
      { id: 'sales', name: 'Sales', description: 'Sales automation', icon: '💼' },
      { id: 'devops', name: 'DevOps', description: 'Development operations', icon: '🚀' },
      { id: 'content', name: 'Content Creation', description: 'Content workflows', icon: '✍️' }
    ];

    for (const cat of defaultCategories) {
      this.categories.set(cat.id, { ...cat, count: 0 });
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('workflow-templates', JSON.stringify(
          Array.from(this.templates.entries())
        ));
        localStorage.setItem('template-reviews', JSON.stringify(
          Array.from(this.reviews.entries())
        ));
        localStorage.setItem('template-favorites', JSON.stringify(
          Array.from(this.favorites)
        ));
        localStorage.setItem('template-collections', JSON.stringify(
          Array.from(this.collections.entries())
        ));
      } catch (error) {
        console.error('Failed to save templates:', error);
      }
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const templates = localStorage.getItem('workflow-templates');
        if (templates) {
          this.templates = new Map(JSON.parse(templates));
        }

        const reviews = localStorage.getItem('template-reviews');
        if (reviews) {
          this.reviews = new Map(JSON.parse(reviews));
        }

        const favorites = localStorage.getItem('template-favorites');
        if (favorites) {
          this.favorites = new Set(JSON.parse(favorites));
        }

        const collections = localStorage.getItem('template-collections');
        if (collections) {
          this.collections = new Map(JSON.parse(collections));
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    }
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      totalTemplates: this.templates.size,
      totalDownloads: Array.from(this.templates.values())
        .reduce((sum, t) => sum + t.stats.downloads, 0),
      totalReviews: Array.from(this.reviews.values())
        .reduce((sum, reviews) => sum + reviews.length, 0),
      averageRating: Array.from(this.templates.values())
        .reduce((sum, t) => sum + t.stats.rating, 0) / this.templates.size,
      totalFavorites: this.favorites.size,
      totalCollections: this.collections.size,
      categoriesWithTemplates: this.getCategories().filter(c => c.count > 0).length
    };
  }
}

// Singleton instance
export const templateManager = new TemplateManager();

/**
 * Bulk import templates from JSON
 */
export async function bulkImportTemplates(jsonData: string): Promise<number> {
  try {
    const templates = JSON.parse(jsonData);

    if (!Array.isArray(templates)) {
      throw new Error('Invalid format: expected array of templates');
    }

    let imported = 0;

    for (const template of templates) {
      if (template.workflow) {
        templateManager.createTemplate(template.workflow, {
          name: template.name,
          description: template.description,
          category: template.category,
          tags: template.tags || [],
          author: template.author || { name: 'Unknown' }
        });
        imported++;
      }
    }

    return imported;
  } catch (error) {
    throw new Error(`Failed to import templates: ${error}`);
  }
}

/**
 * Export all templates to JSON
 */
export function exportAllTemplates(): string {
  const templates = templateManager.getAllTemplates();
  return JSON.stringify(templates, null, 2);
}
