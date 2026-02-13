/**
 * Partner Service - Partner Lifecycle & Revenue Management
 * Handles partner registration, tier management, and revenue tracking
 */

import {
  Partner,
  PartnerTier,
  PartnerStatus,
  PartnerDashboardData,
  PartnerAnalytics,
  RevenueAnalytics,
  MarketplaceResponse,
  WorkflowTemplate,
  CommunityNode,
} from '../types/marketplace';
import { RevenueSharing } from './RevenueSharing';
import { logger } from '../services/SimpleLogger';

export class PartnerService {
  private partners: Map<string, Partner> = new Map();
  private revenueSharing: RevenueSharing;

  constructor() {
    this.revenueSharing = new RevenueSharing();
  }

  /**
   * Register new partner
   */
  async registerPartner(partnerData: Partial<Partner>): Promise<MarketplaceResponse<Partner>> {
    try {
      // Validate data
      const validation = this.validatePartnerData(partnerData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const partner: Partner = {
        ...partnerData,
        id: this.generateId(),
        tier: PartnerTier.BRONZE,
        status: PartnerStatus.PENDING,
        verification: {
          verified: false,
          companyVerified: false,
          taxFormsCompleted: false,
          identityVerified: false,
        },
        statistics: {
          templateCount: 0,
          nodeCount: 0,
          totalInstalls: 0,
          totalViews: 0,
          averageRating: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
        },
        revenue: {
          revenueShare: 60, // Bronze tier starts at 60%
          totalEarnings: 0,
          pendingPayout: 0,
          lifetimeEarnings: 0,
        },
        joinedAt: new Date(),
        lastActivityAt: new Date(),
      } as Partner;

      this.partners.set(partner.id, partner);

      return {
        success: true,
        data: partner,
        message: 'Partner registration successful. Please complete verification.',
      };
    } catch (error) {
      logger.error('Register partner error:', error);
      return {
        success: false,
        error: 'Failed to register partner',
      };
    }
  }

  /**
   * Verify partner
   */
  async verifyPartner(partnerId: string): Promise<MarketplaceResponse<Partner>> {
    try {
      const partner = this.partners.get(partnerId);
      if (!partner) {
        return {
          success: false,
          error: 'Partner not found',
        };
      }

      partner.verification.verified = true;
      partner.verification.verifiedAt = new Date();
      partner.status = PartnerStatus.ACTIVE;

      return {
        success: true,
        data: partner,
        message: 'Partner verified successfully',
      };
    } catch (error) {
      logger.error('Verify partner error:', error);
      return {
        success: false,
        error: 'Failed to verify partner',
      };
    }
  }

  /**
   * Update partner tier based on performance
   */
  async updatePartnerTier(partnerId: string): Promise<MarketplaceResponse<Partner>> {
    try {
      const partner = this.partners.get(partnerId);
      if (!partner) {
        return {
          success: false,
          error: 'Partner not found',
        };
      }

      const newTier = this.calculateTier(partner);
      const revenueShare = this.getRevenueShareForTier(newTier);

      if (newTier !== partner.tier) {
        partner.tier = newTier;
        partner.revenue.revenueShare = revenueShare;

        return {
          success: true,
          data: partner,
          message: `Partner tier updated to ${newTier}`,
        };
      }

      return {
        success: true,
        data: partner,
        message: 'Partner tier unchanged',
      };
    } catch (error) {
      logger.error('Update partner tier error:', error);
      return {
        success: false,
        error: 'Failed to update partner tier',
      };
    }
  }

  /**
   * Get partner dashboard data
   */
  async getPartnerDashboard(partnerId: string): Promise<MarketplaceResponse<PartnerDashboardData>> {
    try {
      const partner = this.partners.get(partnerId);
      if (!partner) {
        return {
          success: false,
          error: 'Partner not found',
        };
      }

      // Get partner's templates and nodes (stub - would query repositories)
      const templates: WorkflowTemplate[] = [];
      const nodes: CommunityNode[] = [];

      // Calculate analytics
      const analytics = await this.calculatePartnerAnalytics(partner, templates, nodes);
      const revenue = await this.calculateRevenueAnalytics(partner, templates, nodes);
      const reviews = await this.getPartnerReviews(partner);

      const dashboardData: PartnerDashboardData = {
        partner,
        templates,
        nodes,
        analytics,
        revenue,
        reviews,
      };

      return {
        success: true,
        data: dashboardData,
      };
    } catch (error) {
      logger.error('Get partner dashboard error:', error);
      return {
        success: false,
        error: 'Failed to retrieve dashboard data',
      };
    }
  }

  /**
   * Process partner payout
   */
  async processPayout(partnerId: string): Promise<MarketplaceResponse<any>> {
    try {
      const partner = this.partners.get(partnerId);
      if (!partner) {
        return {
          success: false,
          error: 'Partner not found',
        };
      }

      if (partner.revenue.pendingPayout < partner.payout.minimumPayout) {
        return {
          success: false,
          error: `Minimum payout amount is ${partner.payout.currency} ${partner.payout.minimumPayout}`,
        };
      }

      // Process payout via payment provider
      const payoutResult = await this.revenueSharing.processPayout(
        partnerId,
        partner.revenue.pendingPayout,
        partner.payout
      );

      if (payoutResult.success) {
        // Update partner revenue
        partner.revenue.pendingPayout = 0;
        partner.revenue.lastPayoutDate = new Date();
        partner.revenue.nextPayoutDate = this.calculateNextPayoutDate(partner.payout.frequency);

        return {
          success: true,
          data: payoutResult.data,
          message: 'Payout processed successfully',
        };
      }

      return payoutResult;
    } catch (error) {
      logger.error('Process payout error:', error);
      return {
        success: false,
        error: 'Failed to process payout',
      };
    }
  }

  /**
   * Track revenue for partner
   */
  async trackRevenue(
    partnerId: string,
    amount: number,
    resourceId: string,
    resourceType: 'template' | 'node'
  ): Promise<void> {
    const partner = this.partners.get(partnerId);
    if (!partner) return;

    const partnerEarnings = amount * (partner.revenue.revenueShare / 100);

    partner.revenue.totalEarnings += partnerEarnings;
    partner.revenue.pendingPayout += partnerEarnings;
    partner.revenue.lifetimeEarnings += partnerEarnings;
    partner.statistics.totalRevenue += partnerEarnings;

    // Update monthly revenue (simplified)
    partner.statistics.monthlyRevenue += partnerEarnings;
  }

  /**
   * Calculate partner tier based on performance
   */
  private calculateTier(partner: Partner): PartnerTier {
    const templateCount = partner.statistics.templateCount;

    if (templateCount >= 51) {
      return partner.verification.companyVerified ? PartnerTier.PLATINUM : PartnerTier.GOLD;
    } else if (templateCount >= 11) {
      return PartnerTier.SILVER;
    } else {
      return PartnerTier.BRONZE;
    }
  }

  /**
   * Get revenue share percentage for tier
   */
  private getRevenueShareForTier(tier: PartnerTier): number {
    switch (tier) {
      case PartnerTier.PLATINUM:
        return 75;
      case PartnerTier.GOLD:
        return 70;
      case PartnerTier.SILVER:
        return 65;
      case PartnerTier.BRONZE:
      default:
        return 60;
    }
  }

  /**
   * Calculate partner analytics
   */
  private async calculatePartnerAnalytics(
    partner: Partner,
    templates: WorkflowTemplate[],
    nodes: CommunityNode[]
  ): Promise<PartnerAnalytics> {
    // Generate mock analytics for demonstration
    return {
      period: 'monthly',
      metrics: this.generateMetrics(30),
      topTemplates: templates.slice(0, 5).map((t) => ({
        template: t,
        installs: t.analytics.installs,
        revenue: t.analytics.installs * (t.pricing.price || 0),
      })),
      topNodes: nodes.slice(0, 5).map((n) => ({
        node: n,
        downloads: n.analytics.downloads,
        revenue: n.analytics.downloads * (n.pricing.price || 0),
      })),
    };
  }

  /**
   * Generate metrics for analytics
   */
  private generateMetrics(days: number): PartnerAnalytics['metrics'] {
    const metrics = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      metrics.push({
        date,
        views: Math.floor(Math.random() * 100) + 50,
        installs: Math.floor(Math.random() * 20) + 5,
        revenue: Math.floor(Math.random() * 500) + 100,
        rating: 4 + Math.random(),
      });
    }

    return metrics;
  }

  /**
   * Calculate revenue analytics
   */
  private async calculateRevenueAnalytics(
    partner: Partner,
    templates: WorkflowTemplate[],
    nodes: CommunityNode[]
  ): Promise<RevenueAnalytics> {
    return {
      totalRevenue: partner.statistics.totalRevenue,
      monthlyRevenue: partner.statistics.monthlyRevenue,
      yearlyRevenue: partner.statistics.monthlyRevenue * 12, // Simplified projection
      revenueByTemplate: new Map(),
      revenueByNode: new Map(),
      projectedRevenue: partner.statistics.monthlyRevenue * 1.2, // 20% growth projection
    };
  }

  /**
   * Get partner reviews
   */
  private async getPartnerReviews(partner: Partner): Promise<any> {
    return {
      averageRating: partner.statistics.averageRating,
      totalReviews: 0,
      recentReviews: [],
      ratingDistribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },
    };
  }

  /**
   * Calculate next payout date
   */
  private calculateNextPayoutDate(frequency: string): Date {
    const now = new Date();

    switch (frequency) {
      case 'weekly':
        now.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        now.setMonth(now.getMonth() + 1);
        break;
      case 'quarterly':
        now.setMonth(now.getMonth() + 3);
        break;
    }

    return now;
  }

  /**
   * Validate partner data
   */
  private validatePartnerData(data: Partial<Partner>): { valid: boolean; error?: string } {
    if (!data.name || data.name.trim().length === 0) {
      return { valid: false, error: 'Partner name is required' };
    }

    if (!data.email || !this.isValidEmail(data.email)) {
      return { valid: false, error: 'Valid email is required' };
    }

    if (!data.companyName || data.companyName.trim().length === 0) {
      return { valid: false, error: 'Company name is required' };
    }

    return { valid: true };
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `partner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get partner by ID
   */
  async getPartner(partnerId: string): Promise<MarketplaceResponse<Partner>> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      return {
        success: false,
        error: 'Partner not found',
      };
    }

    return {
      success: true,
      data: partner,
    };
  }

  /**
   * Get all partners (admin)
   */
  async getAllPartners(): Promise<Partner[]> {
    return Array.from(this.partners.values());
  }

  /**
   * Bulk import partners
   */
  async bulkImport(partners: Partner[]): Promise<void> {
    partners.forEach((partner) => {
      this.partners.set(partner.id, partner);
    });
  }
}
