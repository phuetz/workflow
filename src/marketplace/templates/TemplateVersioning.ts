/**
 * Template Versioning - Handles version management and review workflows
 */

import * as crypto from 'crypto';
import { logger } from '../../services/SimpleLogger';
import type {
  WorkflowTemplate,
  Author,
  Workflow,
  TemplateVersion,
  Pricing,
  BillingInterval,
  PaymentMethod,
  Purchase,
  LicenseKey,
  Invoice,
  RatingDistribution,
} from './types';

/**
 * Version Manager - Manages template versions
 */
export class VersionManager {
  private versions: Map<string, TemplateVersion[]> = new Map();

  /**
   * Store a new version for a template
   */
  storeVersion(templateId: string, version: TemplateVersion): void {
    if (!this.versions.has(templateId)) {
      this.versions.set(templateId, []);
    }
    this.versions.get(templateId)!.push(version);
  }

  /**
   * Get all versions for a template
   */
  getVersions(templateId: string): TemplateVersion[] {
    return this.versions.get(templateId) || [];
  }

  /**
   * Get latest version for a template
   */
  getLatestVersion(templateId: string): TemplateVersion | undefined {
    const versions = this.versions.get(templateId);
    return versions?.[versions.length - 1];
  }

  /**
   * Get a specific version
   */
  getVersion(templateId: string, versionString: string): TemplateVersion | undefined {
    return this.versions.get(templateId)?.find(v => v.version === versionString);
  }

  /**
   * Clear versions for a template
   */
  clearVersions(templateId: string): void {
    this.versions.delete(templateId);
  }
}

/**
 * Review Manager - Handles review workflow for template submissions
 */
export class ReviewManager {
  /**
   * Submit template for review
   */
  async submitForReview(template: WorkflowTemplate): Promise<void> {
    // In production, would notify moderators
    logger.debug(`Template ${template.name} submitted for review`);

    // Auto-approve after delay for demo
    setTimeout(() => {
      template.visibility = 'public';
      template.publishedAt = new Date();
      template.verified = true;
      logger.debug(`Template ${template.name} auto-approved`);
    }, 5000);
  }
}

/**
 * Rating Calculator - Handles rating calculations
 */
export class RatingCalculator {
  /**
   * Update ratings with a new rating
   */
  updateRatings(template: WorkflowTemplate, rating: number): void {
    const ratings = template.ratings;

    // Update distribution
    const key = ['one', 'two', 'three', 'four', 'five'][
      rating - 1
    ] as keyof RatingDistribution;
    ratings.distribution[key]++;

    // Update average
    ratings.count++;
    ratings.average = (ratings.average * (ratings.count - 1) + rating) / ratings.count;
  }
}

/**
 * Payment Processor - Handles payment processing
 */
export class PaymentProcessor {
  private commission: number;

  constructor(commission: number = 0.3) {
    this.commission = commission;
  }

  /**
   * Process payment for template purchase
   */
  async processPayment(
    _pricing: Pricing,
    _buyer: Author,
    _method: PaymentMethod
  ): Promise<{ success: boolean; transactionId?: string }> {
    // Simulate payment processing
    return {
      success: true,
      transactionId: crypto.randomBytes(16).toString('hex'),
    };
  }

  /**
   * Generate license key for purchased template
   */
  generateLicense(template: WorkflowTemplate, _userId: string): LicenseKey {
    return {
      key: crypto.randomBytes(32).toString('hex'),
      activations: 1,
      maxActivations: template.pricing.model === 'subscription' ? 999 : 1,
      devices: [],
    };
  }

  /**
   * Generate invoice for purchase
   */
  generateInvoice(template: WorkflowTemplate, _buyer: Author): Invoice {
    return {
      number: `INV-${Date.now()}`,
      url: `/invoices/INV-${Date.now()}.pdf`,
      total: template.pricing.price || 0,
    };
  }

  /**
   * Calculate expiration date based on billing interval
   */
  calculateExpiration(interval: BillingInterval): Date {
    const now = new Date();

    switch (interval) {
      case 'monthly':
        return new Date(now.setMonth(now.getMonth() + 1));
      case 'yearly':
        return new Date(now.setFullYear(now.getFullYear() + 1));
      case 'lifetime':
        return new Date(now.setFullYear(now.getFullYear() + 100));
      default:
        return new Date(now.setMonth(now.getMonth() + 1));
    }
  }

  /**
   * Calculate author earnings after commission
   */
  calculateAuthorEarnings(purchase: Purchase): number {
    return purchase.price * (1 - this.commission);
  }

  /**
   * Update author earnings
   */
  updateAuthorEarnings(author: Author, purchase: Purchase): void {
    const earnings = this.calculateAuthorEarnings(purchase);
    // In production, would update database
    logger.debug(`Author ${author.username} earned ${earnings}`);
  }

  /**
   * Set commission rate
   */
  setCommission(commission: number): void {
    this.commission = commission;
  }
}

/**
 * Template Updater - Handles template updates
 */
export class TemplateUpdater {
  private versionManager: VersionManager;

  constructor(versionManager: VersionManager) {
    this.versionManager = versionManager;
  }

  /**
   * Apply updates to a template
   */
  applyUpdates(
    template: WorkflowTemplate,
    updates: Partial<WorkflowTemplate>,
    newVersion?: {
      version: string;
      changelog: string;
      workflow?: Workflow;
    }
  ): void {
    // Update template fields
    Object.assign(template, updates);
    template.updatedAt = new Date();

    // Handle versioning
    if (newVersion) {
      template.version = newVersion.version;

      if (newVersion.workflow) {
        template.workflow = newVersion.workflow;
      }

      this.versionManager.storeVersion(template.id, {
        version: newVersion.version,
        changelog: newVersion.changelog,
        workflow: newVersion.workflow || template.workflow,
        releasedAt: new Date(),
      });
    }
  }
}
