/**
 * FreshBooks Service
 * Handles FreshBooks API operations with OAuth 2.0 authentication
 */

import { logger } from '../../services/LoggingService';
import axios, { AxiosInstance } from 'axios';

interface FreshBooksCredentials {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  accountId: string;
  tokenExpiry?: number;
}

interface FreshBooksLineItem {
  name: string;
  description: string;
  unitCost: number;
  quantity: number;
  taxName1?: string;
  taxAmount1?: number;
}

interface FreshBooksInvoice {
  customerid: number;
  create_date?: string;
  due_date?: string;
  invoice_number?: string;
  currency_code?: string;
  notes?: string;
  lines: FreshBooksLineItem[];
}

export class FreshBooksService {
  private readonly baseURL = 'https://api.freshbooks.com';
  private readonly authURL = 'https://api.freshbooks.com/auth/oauth/token';
  private axiosInstance: AxiosInstance;
  private credentials: FreshBooksCredentials;

  constructor(credentials: FreshBooksCredentials) {
    this.credentials = credentials;

    this.axiosInstance = axios.create({
      baseURL: `${this.baseURL}/accounting/account/${credentials.accountId}`,
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for automatic token refresh
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        await this.ensureValidToken();
        config.headers['Authorization'] = `Bearer ${this.credentials.accessToken}`;
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  /**
   * Ensure access token is valid, refresh if needed
   */
  private async ensureValidToken(): Promise<void> {
    const now = Date.now();
    const expiry = this.credentials.tokenExpiry || 0;

    // Refresh if token expires in less than 5 minutes
    if (!this.credentials.accessToken || now >= expiry - 300000) {
      await this.refreshAccessToken();
    }
  }

  /**
   * Refresh OAuth access token
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      logger.info('Refreshing FreshBooks access token');

      const response = await axios.post(this.authURL, {
        grant_type: 'refresh_token',
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        refresh_token: this.credentials.refreshToken,
      });

      this.credentials.accessToken = response.data.access_token;
      this.credentials.refreshToken = response.data.refresh_token;
      this.credentials.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      logger.info('FreshBooks access token refreshed successfully');
    } catch (error) {
      logger.error('Failed to refresh FreshBooks access token:', error);
      throw new Error('Token refresh failed');
    }
  }

  /**
   * INVOICE OPERATIONS
   */

  /**
   * Create invoice
   */
  async createInvoice(invoice: FreshBooksInvoice): Promise<any> {
    try {
      logger.info('Creating FreshBooks invoice');

      const response = await this.axiosInstance.post('/invoices/invoices', {
        invoice,
      });

      logger.info(`Invoice created successfully: ${response.data.response.result.invoice.id}`);
      return response.data.response.result.invoice;
    } catch (error) {
      logger.error('Failed to create invoice:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<any> {
    try {
      logger.info(`Fetching FreshBooks invoice: ${invoiceId}`);

      const response = await this.axiosInstance.get(`/invoices/invoices/${invoiceId}`);

      return response.data.response.result.invoice;
    } catch (error) {
      logger.error(`Failed to fetch invoice ${invoiceId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Update invoice
   */
  async updateInvoice(invoiceId: string, invoice: Partial<FreshBooksInvoice>): Promise<any> {
    try {
      logger.info(`Updating FreshBooks invoice: ${invoiceId}`);

      const response = await this.axiosInstance.put(`/invoices/invoices/${invoiceId}`, {
        invoice,
      });

      logger.info('Invoice updated successfully');
      return response.data.response.result.invoice;
    } catch (error) {
      logger.error('Failed to update invoice:', error);
      throw this.handleError(error);
    }
  }

  /**
   * List invoices
   */
  async listInvoices(options?: {
    page?: number;
    per_page?: number;
    search?: string;
  }): Promise<any> {
    try {
      logger.info('Listing FreshBooks invoices');

      const params: any = {
        page: options?.page || 1,
        per_page: options?.per_page || 15,
      };

      if (options?.search) {
        params.search = options.search;
      }

      const response = await this.axiosInstance.get('/invoices/invoices', { params });

      const invoices = response.data.response.result.invoices || [];
      logger.info(`Found ${invoices.length} invoices`);

      return {
        invoices,
        total: response.data.response.result.total,
        page: response.data.response.result.page,
        per_page: response.data.response.result.per_page,
      };
    } catch (error) {
      logger.error('Failed to list invoices:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete invoice
   */
  async deleteInvoice(invoiceId: string): Promise<void> {
    try {
      logger.info(`Deleting FreshBooks invoice: ${invoiceId}`);

      await this.axiosInstance.delete(`/invoices/invoices/${invoiceId}`);

      logger.info('Invoice deleted successfully');
    } catch (error) {
      logger.error('Failed to delete invoice:', error);
      throw this.handleError(error);
    }
  }

  /**
   * CLIENT OPERATIONS
   */

  /**
   * Create client
   */
  async createClient(client: {
    organization?: string;
    fname?: string;
    lname?: string;
    email?: string;
    phone?: string;
  }): Promise<any> {
    try {
      logger.info('Creating FreshBooks client');

      const response = await this.axiosInstance.post('/users/clients', {
        client,
      });

      logger.info(`Client created successfully: ${response.data.response.result.client.id}`);
      return response.data.response.result.client;
    } catch (error) {
      logger.error('Failed to create client:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get client by ID
   */
  async getClient(clientId: string): Promise<any> {
    try {
      logger.info(`Fetching FreshBooks client: ${clientId}`);

      const response = await this.axiosInstance.get(`/users/clients/${clientId}`);

      return response.data.response.result.client;
    } catch (error) {
      logger.error(`Failed to fetch client ${clientId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Update client
   */
  async updateClient(clientId: string, client: any): Promise<any> {
    try {
      logger.info(`Updating FreshBooks client: ${clientId}`);

      const response = await this.axiosInstance.put(`/users/clients/${clientId}`, {
        client,
      });

      logger.info('Client updated successfully');
      return response.data.response.result.client;
    } catch (error) {
      logger.error('Failed to update client:', error);
      throw this.handleError(error);
    }
  }

  /**
   * List clients
   */
  async listClients(options?: {
    page?: number;
    per_page?: number;
    search?: string;
  }): Promise<any> {
    try {
      logger.info('Listing FreshBooks clients');

      const params: any = {
        page: options?.page || 1,
        per_page: options?.per_page || 15,
      };

      if (options?.search) {
        params.search = options.search;
      }

      const response = await this.axiosInstance.get('/users/clients', { params });

      const clients = response.data.response.result.clients || [];
      logger.info(`Found ${clients.length} clients`);

      return {
        clients,
        total: response.data.response.result.total,
      };
    } catch (error) {
      logger.error('Failed to list clients:', error);
      throw this.handleError(error);
    }
  }

  /**
   * EXPENSE OPERATIONS
   */

  /**
   * Create expense
   */
  async createExpense(expense: {
    category_id: number;
    amount: {
      amount: string;
      code: string;
    };
    vendor?: string;
    date?: string;
  }): Promise<any> {
    try {
      logger.info('Creating FreshBooks expense');

      const response = await this.axiosInstance.post('/expenses/expenses', {
        expense,
      });

      logger.info(`Expense created successfully: ${response.data.response.result.expense.id}`);
      return response.data.response.result.expense;
    } catch (error) {
      logger.error('Failed to create expense:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get expense
   */
  async getExpense(expenseId: string): Promise<any> {
    try {
      logger.info(`Fetching FreshBooks expense: ${expenseId}`);

      const response = await this.axiosInstance.get(`/expenses/expenses/${expenseId}`);

      return response.data.response.result.expense;
    } catch (error) {
      logger.error(`Failed to fetch expense ${expenseId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * List expenses
   */
  async listExpenses(options?: {
    page?: number;
    per_page?: number;
  }): Promise<any> {
    try {
      logger.info('Listing FreshBooks expenses');

      const params: any = {
        page: options?.page || 1,
        per_page: options?.per_page || 15,
      };

      const response = await this.axiosInstance.get('/expenses/expenses', { params });

      const expenses = response.data.response.result.expenses || [];
      logger.info(`Found ${expenses.length} expenses`);

      return {
        expenses,
        total: response.data.response.result.total,
      };
    } catch (error) {
      logger.error('Failed to list expenses:', error);
      throw this.handleError(error);
    }
  }

  /**
   * TIME TRACKING OPERATIONS
   */

  /**
   * Create time entry
   */
  async createTimeEntry(timeEntry: {
    is_logged: boolean;
    duration: number;
    note?: string;
    started_at?: string;
    client_id?: number;
    project_id?: number;
  }): Promise<any> {
    try {
      logger.info('Creating FreshBooks time entry');

      const response = await this.axiosInstance.post('/timetracking/time_entries', {
        time_entry: timeEntry,
      });

      logger.info(`Time entry created successfully: ${response.data.response.result.time_entry.id}`);
      return response.data.response.result.time_entry;
    } catch (error) {
      logger.error('Failed to create time entry:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get time entry
   */
  async getTimeEntry(timeEntryId: string): Promise<any> {
    try {
      logger.info(`Fetching FreshBooks time entry: ${timeEntryId}`);

      const response = await this.axiosInstance.get(`/timetracking/time_entries/${timeEntryId}`);

      return response.data.response.result.time_entry;
    } catch (error) {
      logger.error(`Failed to fetch time entry ${timeEntryId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * List time entries
   */
  async listTimeEntries(options?: {
    page?: number;
    per_page?: number;
  }): Promise<any> {
    try {
      logger.info('Listing FreshBooks time entries');

      const params: any = {
        page: options?.page || 1,
        per_page: options?.per_page || 15,
      };

      const response = await this.axiosInstance.get('/timetracking/time_entries', { params });

      const timeEntries = response.data.response.result.time_entries || [];
      logger.info(`Found ${timeEntries.length} time entries`);

      return {
        time_entries: timeEntries,
        total: response.data.response.result.total,
      };
    } catch (error) {
      logger.error('Failed to list time entries:', error);
      throw this.handleError(error);
    }
  }

  /**
   * PAYMENT OPERATIONS
   */

  /**
   * Create payment
   */
  async createPayment(payment: {
    invoiceid: number;
    amount: {
      amount: string;
      code: string;
    };
    date?: string;
    type?: string;
    note?: string;
  }): Promise<any> {
    try {
      logger.info('Creating FreshBooks payment');

      const response = await this.axiosInstance.post('/payments/payments', {
        payment,
      });

      logger.info(`Payment created successfully: ${response.data.response.result.payment.id}`);
      return response.data.response.result.payment;
    } catch (error) {
      logger.error('Failed to create payment:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get payment
   */
  async getPayment(paymentId: string): Promise<any> {
    try {
      logger.info(`Fetching FreshBooks payment: ${paymentId}`);

      const response = await this.axiosInstance.get(`/payments/payments/${paymentId}`);

      return response.data.response.result.payment;
    } catch (error) {
      logger.error(`Failed to fetch payment ${paymentId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * List payments
   */
  async listPayments(options?: {
    page?: number;
    per_page?: number;
  }): Promise<any> {
    try {
      logger.info('Listing FreshBooks payments');

      const params: any = {
        page: options?.page || 1,
        per_page: options?.per_page || 15,
      };

      const response = await this.axiosInstance.get('/payments/payments', { params });

      const payments = response.data.response.result.payments || [];
      logger.info(`Found ${payments.length} payments`);

      return {
        payments,
        total: response.data.response.result.total,
      };
    } catch (error) {
      logger.error('Failed to list payments:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const fbError = error.response?.data;
      if (fbError?.response?.errors) {
        const errorMsg = fbError.response.errors.map((e: any) => e.message).join(', ');
        return new Error(`FreshBooks API Error: ${errorMsg}`);
      }
      return new Error(`FreshBooks API Error: ${error.message}`);
    }
    return error instanceof Error ? error : new Error('Unknown FreshBooks error');
  }

  /**
   * Get service metrics
   */
  getMetrics(): any {
    return {
      service: 'FreshBooks',
      authenticated: this.credentials.accessToken ? true : false,
      accountId: this.credentials.accountId,
    };
  }
}

// Export factory function
export function createFreshBooksService(credentials: FreshBooksCredentials): FreshBooksService {
  return new FreshBooksService(credentials);
}
