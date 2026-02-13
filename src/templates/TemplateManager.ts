/**
 * Template Manager
 * Manages workflow templates
 * PROJET SAUVÉ - Phase 5.4: Workflow Templates
 */

import { logger } from '../services/SimpleLogger';
import type {
  WorkflowTemplate,
  TemplateCategory,
  TemplateFilters,
  TemplateInstallation,
  TemplateMarketplace
} from '../types/templates';

export class TemplateManager {
  private templates: Map<string, WorkflowTemplate>;
  private installations: Map<string, TemplateInstallation>;

  constructor() {
    this.templates = new Map();
    this.installations = new Map();
    this.loadTemplates();
    logger.info('TemplateManager initialized');
  }

  /**
   * Load templates
   */
  private loadTemplates(): void {
    // Templates will be loaded from template files
    logger.info('Templates loaded');
  }

  /**
   * Register template
   */
  registerTemplate(template: WorkflowTemplate): void {
    this.templates.set(template.id, template);
    logger.info(`Template registered: ${template.name}`);
  }

  /**
   * Get all templates
   */
  getAll(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  getById(id: string): WorkflowTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get templates by category
   */
  getByCategory(category: TemplateCategory): WorkflowTemplate[] {
    return this.getAll().filter(t => t.category === category);
  }

  /**
   * Search templates
   */
  search(query: string, filters?: TemplateFilters): WorkflowTemplate[] {
    let results = this.getAll();

    // Apply filters
    if (filters) {
      if (filters.category) {
        results = results.filter(t => t.category === filters.category);
      }
      if (filters.difficulty) {
        results = results.filter(t => t.difficulty === filters.difficulty);
      }
      if (filters.pricing) {
        results = results.filter(t => t.pricing === filters.pricing);
      }
      if (filters.authorType) {
        results = results.filter(t => t.authorType === filters.authorType);
      }
      if (filters.minRating) {
        results = results.filter(t => t.rating >= filters.minRating!);
      }
      if (filters.maxSetupTime) {
        results = results.filter(t => t.estimatedSetupTime <= filters.maxSetupTime!);
      }
      if (filters.tags && filters.tags.length > 0) {
        results = results.filter(t =>
          filters.tags!.some(tag => t.tags.includes(tag))
        );
      }
      if (filters.requiredIntegrations && filters.requiredIntegrations.length > 0) {
        results = results.filter(t =>
          filters.requiredIntegrations!.every(integration =>
            t.requiredIntegrations.includes(integration)
          )
        );
      }
    }

    // Search query
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }

    return results;
  }

  /**
   * Get featured templates
   */
  getFeatured(): WorkflowTemplate[] {
    return this.getAll()
      .filter(t => t.featured)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);
  }

  /**
   * Get popular templates
   */
  getPopular(limit: number = 10): WorkflowTemplate[] {
    return this.getAll()
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
  }

  /**
   * Get recent templates
   */
  getRecent(limit: number = 10): WorkflowTemplate[] {
    return this.getAll()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Install template
   */
  async install(
    templateId: string,
    customizations?: Record<string, unknown>
  ): Promise<TemplateInstallation> {
    const template = this.getById(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const installation: TemplateInstallation = {
      templateId,
      workflowId: this.generateWorkflowId(),
      customizations: customizations || {},
      installedAt: new Date(),
      version: template.version,
      status: 'installing'
    };

    this.installations.set(installation.workflowId, installation);

    try {
      // Simulate installation process
      installation.status = 'configuring';

      // Apply customizations
      // ...

      installation.status = 'ready';

      // Increment download count
      template.downloads++;

      logger.info(`Template installed: ${template.name} -> ${installation.workflowId}`);

      return installation;
    } catch (error) {
      installation.status = 'error';
      installation.errors = [error instanceof Error ? error.message : String(error)];
      logger.error(`Template installation failed: ${templateId}`, error);
      throw error;
    }
  }

  /**
   * Uninstall template
   */
  async uninstall(installationId: string): Promise<void> {
    if (!this.installations.has(installationId)) {
      throw new Error(`Installation not found: ${installationId}`);
    }

    this.installations.delete(installationId);
    logger.info(`Template uninstalled: ${installationId}`);
  }

  /**
   * Get installations
   */
  getInstallations(): TemplateInstallation[] {
    return Array.from(this.installations.values());
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<WorkflowTemplate>
  ): Promise<void> {
    const template = this.getById(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    Object.assign(template, updates, {
      updatedAt: new Date()
    });

    logger.info(`Template updated: ${templateId}`);
  }

  /**
   * Create template from workflow
   */
  async createTemplate(workflow: Record<string, unknown>): Promise<WorkflowTemplate> {
    const template: WorkflowTemplate = {
      id: this.generateTemplateId(),
      name: (workflow.name as string) || 'Untitled Template',
      description: (workflow.description as string) || '',
      category: 'business_automation',
      author: 'User',
      authorType: 'community',
      tags: [],
      difficulty: 'beginner',
      workflow: {
        nodes: (workflow.nodes as any[]) || [],
        edges: (workflow.edges as any[]) || [],
        variables: workflow.variables as Record<string, unknown>,
        settings: workflow.settings as Record<string, unknown>
      },
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      downloads: 0,
      rating: 0,
      reviewCount: 0,
      featured: false,
      requiredIntegrations: [],
      requiredCredentials: [],
      estimatedSetupTime: 15,
      documentation: {
        overview: '',
        setup: [],
        usage: ''
      },
      screenshots: [],
      customizableFields: [],
      pricing: 'free'
    };

    this.registerTemplate(template);

    logger.info(`Template created: ${template.id}`);

    return template;
  }

  /**
   * Publish template
   */
  async publishTemplate(templateId: string): Promise<void> {
    const template = this.getById(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Validate template
    // ...

    logger.info(`Template published: ${templateId}`);
  }

  /**
   * Get marketplace
   */
  getMarketplace(filters?: TemplateFilters): TemplateMarketplace {
    const categories = this.getCategoryStats();

    return {
      featured: this.getFeatured(),
      categories: categories.map(cat => ({
        name: cat.category,
        displayName: this.getCategoryDisplayName(cat.category),
        icon: this.getCategoryIcon(cat.category),
        count: cat.count,
        templates: this.getByCategory(cat.category).slice(0, 5)
      })),
      popular: this.getPopular(10),
      recent: this.getRecent(10),
      trending: this.getTrending(10),
      search: (query: string, searchFilters?: TemplateFilters) =>
        this.search(query, searchFilters || filters)
    };
  }

  /**
   * Get category statistics
   */
  private getCategoryStats(): Array<{ category: TemplateCategory; count: number }> {
    const stats = new Map<TemplateCategory, number>();

    for (const template of this.getAll()) {
      stats.set(template.category, (stats.get(template.category) || 0) + 1);
    }

    return Array.from(stats.entries()).map(([category, count]) => ({ category, count }));
  }

  /**
   * Get trending templates
   */
  private getTrending(limit: number): WorkflowTemplate[] {
    // Simple trending algorithm: recent downloads + high rating
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    return this.getAll()
      .filter(t => t.updatedAt.getTime() > sevenDaysAgo)
      .sort((a, b) => {
        const scoreA = a.downloads * 0.7 + a.rating * 0.3;
        const scoreB = b.downloads * 0.7 + b.rating * 0.3;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Get category display name
   */
  private getCategoryDisplayName(category: TemplateCategory): string {
    const names: Record<TemplateCategory, string> = {
      business_automation: 'Business Automation',
      marketing: 'Marketing',
      sales: 'Sales',
      customer_support: 'Customer Support',
      data_processing: 'Data Processing',
      notifications: 'Notifications',
      social_media: 'Social Media',
      ecommerce: 'E-commerce',
      finance: 'Finance',
      hr: 'Human Resources',
      development: 'Development',
      analytics: 'Analytics',
      productivity: 'Productivity',
      integration: 'Integration',
      monitoring: 'Monitoring',
      communication: 'Communication',
      devops: 'DevOps',
      iot: 'IoT',
      security: 'Security',
      lead_generation: 'Lead Generation',
      events: 'Events',
      compliance: 'Compliance',
      web3: 'Web3',
      data: 'Data',
      ai: 'AI',
      creative: 'Creative',
      chat: 'Chat',
      forms: 'Forms',
      utilities: 'Utilities',
      support: 'Support',
      social: 'Social'
    };

    return names[category] || category;
  }

  /**
   * Get category icon
   */
  private getCategoryIcon(category: TemplateCategory): string {
    const icons: Record<TemplateCategory, string> = {
      business_automation: '⚙️',
      marketing: '📢',
      sales: '💰',
      customer_support: '🎧',
      data_processing: '📊',
      notifications: '🔔',
      social_media: '📱',
      ecommerce: '🛒',
      finance: '💳',
      hr: '👥',
      development: '💻',
      analytics: '📈',
      productivity: '✅',
      integration: '🔗',
      monitoring: '👁️',
      communication: '💬',
      devops: '🚀',
      iot: '🌐',
      security: '🔒',
      lead_generation: '🎯',
      events: '📅',
      compliance: '📋',
      web3: '⛓️',
      data: '💾',
      ai: '🤖',
      creative: '🎨',
      chat: '💭',
      forms: '📝',
      utilities: '🔧',
      support: '🆘',
      social: '👋'
    };

    return icons[category] || '📦';
  }

  /**
   * Generate template ID
   */
  private generateTemplateId(): string {
    return `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate workflow ID
   */
  private generateWorkflowId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
let managerInstance: TemplateManager | null = null;

export function getTemplateManager(): TemplateManager {
  if (!managerInstance) {
    managerInstance = new TemplateManager();
  }
  return managerInstance;
}

export function resetTemplateManager(): void {
  managerInstance = null;
}
