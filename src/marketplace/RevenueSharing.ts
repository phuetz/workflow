/**
 * Revenue Sharing - Revenue Calculation and Distribution
 * Handles revenue split calculations and payment processing
 */

import { logger } from '../services/SimpleLogger';
import {
  PayoutSettings,
  MarketplaceResponse,
} from '../types/marketplace';

export interface RevenueTransaction {
  id: string;
  partnerId: string;
  amount: number;
  partnerShare: number;
  platformShare: number;
  resourceId: string;
  resourceType: 'template' | 'node';
  timestamp: Date;
}

export interface PayoutRecord {
  id: string;
  partnerId: string;
  amount: number;
  method: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: Date;
  transactionId?: string;
  error?: string;
}

export class RevenueSharing {
  private transactions: Map<string, RevenueTransaction> = new Map();
  private payouts: Map<string, PayoutRecord> = new Map();

  /**
   * Calculate revenue split
   */
  calculateSplit(
    totalAmount: number,
    partnerSharePercentage: number
  ): {
    partnerShare: number;
    platformShare: number;
  } {
    const partnerShare = totalAmount * (partnerSharePercentage / 100);
    const platformShare = totalAmount - partnerShare;

    return {
      partnerShare: this.roundToCents(partnerShare),
      platformShare: this.roundToCents(platformShare),
    };
  }

  /**
   * Record revenue transaction
   */
  async recordTransaction(
    partnerId: string,
    totalAmount: number,
    partnerSharePercentage: number,
    resourceId: string,
    resourceType: 'template' | 'node'
  ): Promise<RevenueTransaction> {
    const { partnerShare, platformShare } = this.calculateSplit(totalAmount, partnerSharePercentage);

    const transaction: RevenueTransaction = {
      id: this.generateId('txn'),
      partnerId,
      amount: totalAmount,
      partnerShare,
      platformShare,
      resourceId,
      resourceType,
      timestamp: new Date(),
    };

    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  /**
   * Process payout to partner
   */
  async processPayout(
    partnerId: string,
    amount: number,
    settings: PayoutSettings
  ): Promise<MarketplaceResponse<PayoutRecord>> {
    try {
      const payoutRecord: PayoutRecord = {
        id: this.generateId('payout'),
        partnerId,
        amount,
        method: settings.method,
        status: 'pending',
      };

      this.payouts.set(payoutRecord.id, payoutRecord);

      // Process based on payment method
      let result: MarketplaceResponse<any>;

      switch (settings.method) {
        case 'stripe':
          result = await this.processStripePayout(partnerId, amount, settings);
          break;
        case 'paypal':
          result = await this.processPayPalPayout(partnerId, amount, settings);
          break;
        case 'bank_transfer':
          result = await this.processBankTransfer(partnerId, amount, settings);
          break;
        default:
          result = {
            success: false,
            error: 'Unsupported payment method',
          };
      }

      if (result.success) {
        payoutRecord.status = 'completed';
        payoutRecord.processedAt = new Date();
        payoutRecord.transactionId = result.data?.transactionId;
      } else {
        payoutRecord.status = 'failed';
        payoutRecord.error = result.error;
      }

      return {
        success: result.success,
        data: payoutRecord,
        error: result.error,
      };
    } catch (error) {
      logger.error('Process payout error:', error);
      return {
        success: false,
        error: 'Failed to process payout',
      };
    }
  }

  /**
   * Process Stripe payout
   */
  private async processStripePayout(
    partnerId: string,
    amount: number,
    settings: PayoutSettings
  ): Promise<MarketplaceResponse<any>> {
    try {
      // Integrate with Stripe Connect
      // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      // const transfer = await stripe.transfers.create({
      //   amount: Math.round(amount * 100), // Convert to cents
      //   currency: settings.currency.toLowerCase(),
      //   destination: settings.accountId,
      // });

      // Simulated response
      return {
        success: true,
        data: {
          transactionId: `stripe_${Date.now()}`,
          method: 'stripe',
        },
        message: 'Stripe payout initiated',
      };
    } catch (error) {
      logger.error('Stripe payout error:', error);
      return {
        success: false,
        error: 'Stripe payout failed',
      };
    }
  }

  /**
   * Process PayPal payout
   */
  private async processPayPalPayout(
    partnerId: string,
    amount: number,
    settings: PayoutSettings
  ): Promise<MarketplaceResponse<any>> {
    try {
      // Integrate with PayPal Payouts API
      // Simulated response
      return {
        success: true,
        data: {
          transactionId: `paypal_${Date.now()}`,
          method: 'paypal',
        },
        message: 'PayPal payout initiated',
      };
    } catch (error) {
      logger.error('PayPal payout error:', error);
      return {
        success: false,
        error: 'PayPal payout failed',
      };
    }
  }

  /**
   * Process bank transfer
   */
  private async processBankTransfer(
    partnerId: string,
    amount: number,
    settings: PayoutSettings
  ): Promise<MarketplaceResponse<any>> {
    try {
      // Integrate with banking API or create manual transfer record
      return {
        success: true,
        data: {
          transactionId: `bank_${Date.now()}`,
          method: 'bank_transfer',
        },
        message: 'Bank transfer initiated - processing may take 3-5 business days',
      };
    } catch (error) {
      logger.error('Bank transfer error:', error);
      return {
        success: false,
        error: 'Bank transfer failed',
      };
    }
  }

  /**
   * Get partner transactions
   */
  async getPartnerTransactions(partnerId: string): Promise<RevenueTransaction[]> {
    return Array.from(this.transactions.values()).filter((t) => t.partnerId === partnerId);
  }

  /**
   * Get partner payouts
   */
  async getPartnerPayouts(partnerId: string): Promise<PayoutRecord[]> {
    return Array.from(this.payouts.values()).filter((p) => p.partnerId === partnerId);
  }

  /**
   * Calculate partner earnings summary
   */
  async calculateEarningsSummary(partnerId: string): Promise<{
    totalEarnings: number;
    pendingPayouts: number;
    completedPayouts: number;
    transactionCount: number;
  }> {
    const transactions = await this.getPartnerTransactions(partnerId);
    const payouts = await this.getPartnerPayouts(partnerId);

    const totalEarnings = transactions.reduce((sum, t) => sum + t.partnerShare, 0);
    const completedPayouts = payouts
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingPayouts = payouts
      .filter((p) => p.status === 'pending' || p.status === 'processing')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalEarnings,
      pendingPayouts,
      completedPayouts,
      transactionCount: transactions.length,
    };
  }

  /**
   * Get revenue report
   */
  async getRevenueReport(
    partnerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRevenue: number;
    transactionCount: number;
    averageTransaction: number;
    byResourceType: Record<string, number>;
  }> {
    const transactions = (await this.getPartnerTransactions(partnerId)).filter(
      (t) => t.timestamp >= startDate && t.timestamp <= endDate
    );

    const totalRevenue = transactions.reduce((sum, t) => sum + t.partnerShare, 0);
    const byResourceType: Record<string, number> = {
      template: 0,
      node: 0,
    };

    transactions.forEach((t) => {
      byResourceType[t.resourceType] += t.partnerShare;
    });

    return {
      totalRevenue,
      transactionCount: transactions.length,
      averageTransaction: transactions.length > 0 ? totalRevenue / transactions.length : 0,
      byResourceType,
    };
  }

  /**
   * Round amount to cents
   */
  private roundToCents(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Bulk import transactions (for testing)
   */
  async bulkImportTransactions(transactions: RevenueTransaction[]): Promise<void> {
    transactions.forEach((t) => {
      this.transactions.set(t.id, t);
    });
  }

  /**
   * Get all transactions (admin)
   */
  async getAllTransactions(): Promise<RevenueTransaction[]> {
    return Array.from(this.transactions.values());
  }

  /**
   * Get platform revenue summary
   */
  async getPlatformRevenueSummary(): Promise<{
    totalRevenue: number;
    partnerRevenue: number;
    platformRevenue: number;
    transactionCount: number;
  }> {
    const transactions = Array.from(this.transactions.values());

    return {
      totalRevenue: transactions.reduce((sum, t) => sum + t.amount, 0),
      partnerRevenue: transactions.reduce((sum, t) => sum + t.partnerShare, 0),
      platformRevenue: transactions.reduce((sum, t) => sum + t.platformShare, 0),
      transactionCount: transactions.length,
    };
  }
}
