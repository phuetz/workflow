/**
 * QuickBooks Report Service
 * Handles all financial reporting operations
 */

import type { APIClient } from './APIClient';
import type { Report } from './types';

/**
 * Report Service for QuickBooks financial reports
 */
export class ReportService {
  private apiClient: APIClient;

  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
  }

  public async getProfitAndLoss(
    startDate?: string,
    endDate?: string,
    options?: Record<string, string>
  ): Promise<Report> {
    const params = {
      start_date: startDate,
      end_date: endDate,
      ...options
    };
    const response = await this.apiClient.getReport('ProfitAndLoss', params);
    return response.data;
  }

  public async getBalanceSheet(
    asOfDate?: string,
    options?: Record<string, string>
  ): Promise<Report> {
    const params = {
      as_of_date: asOfDate,
      ...options
    };
    const response = await this.apiClient.getReport('BalanceSheet', params);
    return response.data;
  }

  public async getCashFlow(
    startDate?: string,
    endDate?: string,
    options?: Record<string, string>
  ): Promise<Report> {
    const params = {
      start_date: startDate,
      end_date: endDate,
      ...options
    };
    const response = await this.apiClient.getReport('CashFlow', params);
    return response.data;
  }

  public async getAccountList(
    startDate?: string,
    endDate?: string,
    options?: Record<string, string>
  ): Promise<Report> {
    const params = {
      start_date: startDate,
      end_date: endDate,
      ...options
    };
    const response = await this.apiClient.getReport('AccountList', params);
    return response.data;
  }

  public async getCustomerSales(
    startDate?: string,
    endDate?: string,
    options?: Record<string, string>
  ): Promise<Report> {
    const params = {
      start_date: startDate,
      end_date: endDate,
      ...options
    };
    const response = await this.apiClient.getReport('CustomerSales', params);
    return response.data;
  }

  public async getVendorExpenses(
    startDate?: string,
    endDate?: string,
    options?: Record<string, string>
  ): Promise<Report> {
    const params = {
      start_date: startDate,
      end_date: endDate,
      ...options
    };
    const response = await this.apiClient.getReport('VendorExpenses', params);
    return response.data;
  }
}
