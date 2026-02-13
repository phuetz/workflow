/**
 * QuickBooks Online Service
 * Handles QuickBooks API operations with OAuth 2.0 authentication
 */

import { logger } from '../../services/SimpleLogger';
import axios, { AxiosInstance } from 'axios';

interface QuickBooksCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  realmId: string;
  accessToken?: string;
  tokenExpiry?: number;
}

interface QuickBooksLineItem {
  description: string;
  amount: number;
  quantity?: number;
  unitPrice?: number;
  accountRef?: string;
  itemRef?: string;
}

interface QuickBooksInvoice {
  id?: string;
  customerId: string;
  customerName?: string;
  lineItems: QuickBooksLineItem[];
  dueDate?: string;
  txnDate?: string;
  docNumber?: string;
  privateNote?: string;
  customerMemo?: string;
}

interface QuickBooksCustomer {
  id?: string;
  displayName: string;
  givenName?: string;
  familyName?: string;
  companyName?: string;
  primaryEmailAddr?: string;
  primaryPhone?: string;
  billAddr?: {
    line1?: string;
    city?: string;
    countrySubDivisionCode?: string;
    postalCode?: string;
  };
}

interface QuickBooksPayment {
  id?: string;
  customerId: string;
  totalAmt: number;
  txnDate?: string;
  privateNote?: string;
  paymentMethodRef?: string;
  depositToAccountRef?: string;
  linkedInvoices?: Array<{
    invoiceId: string;
    amount: number;
  }>;
}

// Whitelist of allowed entity types for search queries
const ALLOWED_ENTITY_TYPES = ['Customer', 'Vendor', 'Invoice', 'Bill', 'Payment', 'Item', 'Account', 'Employee'];

export class QuickBooksService {
  private readonly baseURL = 'https://quickbooks.api.intuit.com/v3/company';
  private readonly authURL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
  private readonly sandboxURL = 'https://sandbox-quickbooks.api.intuit.com/v3/company';

  private axiosInstance: AxiosInstance;
  private credentials: QuickBooksCredentials;
  private useSandbox: boolean;

  constructor(credentials: QuickBooksCredentials, useSandbox = false) {
    this.credentials = credentials;
    this.useSandbox = useSandbox;

    this.axiosInstance = axios.create({
      baseURL: useSandbox ? this.sandboxURL : this.baseURL,
      headers: {
        'Accept': 'application/json',
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

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, refresh and retry
          await this.refreshAccessToken();
          error.config.headers['Authorization'] = `Bearer ${this.credentials.accessToken}`;
          return this.axiosInstance.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Ensure we have a valid access token
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
   * Refresh OAuth 2.0 access token
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      logger.info('Refreshing QuickBooks access token');

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.credentials.refreshToken,
      });

      const response = await axios.post(this.authURL, params.toString(), {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.credentials.clientId}:${this.credentials.clientSecret}`).toString('base64')}`,
        },
      });

      this.credentials.accessToken = response.data.access_token;
      this.credentials.refreshToken = response.data.refresh_token; // New refresh token
      this.credentials.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      logger.info('QuickBooks access token refreshed successfully');
    } catch (error) {
      logger.error('Failed to refresh QuickBooks access token:', error);
      throw new Error('QuickBooks authentication failed');
    }
  }

  /**
   * Create Invoice
   */
  async createInvoice(invoice: QuickBooksInvoice): Promise<any> {
    try {
      logger.info(`Creating QuickBooks invoice for customer ${invoice.customerId}`);

      const payload = {
        CustomerRef: {
          value: invoice.customerId,
        },
        Line: invoice.lineItems.map((item, index) => ({
          DetailType: 'SalesItemLineDetail',
          Amount: item.amount,
          Description: item.description,
          SalesItemLineDetail: {
            Qty: item.quantity || 1,
            UnitPrice: item.unitPrice || item.amount,
            ItemRef: item.itemRef ? { value: item.itemRef } : undefined,
          },
          LineNum: index + 1,
        })),
        DueDate: invoice.dueDate,
        TxnDate: invoice.txnDate || new Date().toISOString().split('T')[0],
        DocNumber: invoice.docNumber,
        PrivateNote: invoice.privateNote,
        CustomerMemo: invoice.customerMemo ? {
          value: invoice.customerMemo,
        } : undefined,
      };

      const response = await this.axiosInstance.post(
        `/${this.credentials.realmId}/invoice`,
        payload,
        {
          params: { minorversion: 65 },
        }
      );

      logger.info(`Invoice created successfully: ${response.data.Invoice?.Id}`);
      return response.data.Invoice;
    } catch (error) {
      logger.error('Failed to create QuickBooks invoice:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get Invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<any> {
    try {
      logger.info(`Fetching QuickBooks invoice ${invoiceId}`);

      const response = await this.axiosInstance.get(
        `/${this.credentials.realmId}/invoice/${invoiceId}`,
        {
          params: { minorversion: 65 },
        }
      );

      return response.data.Invoice;
    } catch (error) {
      logger.error(`Failed to fetch invoice ${invoiceId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Query Invoices
   */
  async queryInvoices(query?: string, maxResults = 100): Promise<any[]> {
    try {
      const sql = query || `SELECT * FROM Invoice MAXRESULTS ${maxResults}`;
      logger.info(`Querying QuickBooks invoices: ${sql}`);

      const response = await this.axiosInstance.get(
        `/${this.credentials.realmId}/query`,
        {
          params: {
            query: sql,
            minorversion: 65,
          },
        }
      );

      const invoices = response.data.QueryResponse?.Invoice || [];
      logger.info(`Found ${invoices.length} invoices`);
      return invoices;
    } catch (error) {
      logger.error('Failed to query invoices:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create Customer
   */
  async createCustomer(customer: QuickBooksCustomer): Promise<any> {
    try {
      logger.info(`Creating QuickBooks customer: ${customer.displayName}`);

      const payload = {
        DisplayName: customer.displayName,
        GivenName: customer.givenName,
        FamilyName: customer.familyName,
        CompanyName: customer.companyName,
        PrimaryEmailAddr: customer.primaryEmailAddr ? {
          Address: customer.primaryEmailAddr,
        } : undefined,
        PrimaryPhone: customer.primaryPhone ? {
          FreeFormNumber: customer.primaryPhone,
        } : undefined,
        BillAddr: customer.billAddr,
      };

      const response = await this.axiosInstance.post(
        `/${this.credentials.realmId}/customer`,
        payload,
        {
          params: { minorversion: 65 },
        }
      );

      logger.info(`Customer created successfully: ${response.data.Customer?.Id}`);
      return response.data.Customer;
    } catch (error) {
      logger.error('Failed to create QuickBooks customer:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get Customer by ID
   */
  async getCustomer(customerId: string): Promise<any> {
    try {
      logger.info(`Fetching QuickBooks customer ${customerId}`);

      const response = await this.axiosInstance.get(
        `/${this.credentials.realmId}/customer/${customerId}`,
        {
          params: { minorversion: 65 },
        }
      );

      return response.data.Customer;
    } catch (error) {
      logger.error(`Failed to fetch customer ${customerId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Query Customers
   */
  async queryCustomers(query?: string, maxResults = 100): Promise<any[]> {
    try {
      const sql = query || `SELECT * FROM Customer MAXRESULTS ${maxResults}`;
      logger.info(`Querying QuickBooks customers: ${sql}`);

      const response = await this.axiosInstance.get(
        `/${this.credentials.realmId}/query`,
        {
          params: {
            query: sql,
            minorversion: 65,
          },
        }
      );

      const customers = response.data.QueryResponse?.Customer || [];
      logger.info(`Found ${customers.length} customers`);
      return customers;
    } catch (error) {
      logger.error('Failed to query customers:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create Payment
   */
  async createPayment(payment: QuickBooksPayment): Promise<any> {
    try {
      logger.info(`Creating QuickBooks payment for customer ${payment.customerId}`);

      const payload = {
        CustomerRef: {
          value: payment.customerId,
        },
        TotalAmt: payment.totalAmt,
        TxnDate: payment.txnDate || new Date().toISOString().split('T')[0],
        PrivateNote: payment.privateNote,
        PaymentMethodRef: payment.paymentMethodRef ? {
          value: payment.paymentMethodRef,
        } : undefined,
        DepositToAccountRef: payment.depositToAccountRef ? {
          value: payment.depositToAccountRef,
        } : undefined,
        Line: payment.linkedInvoices?.map(link => ({
          Amount: link.amount,
          LinkedTxn: [{
            TxnId: link.invoiceId,
            TxnType: 'Invoice',
          }],
        })),
      };

      const response = await this.axiosInstance.post(
        `/${this.credentials.realmId}/payment`,
        payload,
        {
          params: { minorversion: 65 },
        }
      );

      logger.info(`Payment created successfully: ${response.data.Payment?.Id}`);
      return response.data.Payment;
    } catch (error) {
      logger.error('Failed to create QuickBooks payment:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get Chart of Accounts
   */
  async getAccounts(query?: string): Promise<any[]> {
    try {
      const sql = query || 'SELECT * FROM Account MAXRESULTS 100';
      logger.info('Fetching QuickBooks accounts');

      const response = await this.axiosInstance.get(
        `/${this.credentials.realmId}/query`,
        {
          params: {
            query: sql,
            minorversion: 65,
          },
        }
      );

      const accounts = response.data.QueryResponse?.Account || [];
      logger.info(`Found ${accounts.length} accounts`);
      return accounts;
    } catch (error) {
      logger.error('Failed to fetch accounts:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Search entities (customers, invoices, etc.)
   */
  async search(entityType: string, searchTerm: string): Promise<any[]> {
    // Validate entity type against whitelist
    if (!ALLOWED_ENTITY_TYPES.includes(entityType)) {
      throw new Error(`Invalid entity type: ${entityType}. Allowed types: ${ALLOWED_ENTITY_TYPES.join(', ')}`);
    }

    // Validate search term - only allow alphanumeric characters and safe symbols
    const sanitizedSearchTerm = this.sanitizeSearchTerm(searchTerm);

    if (sanitizedSearchTerm.length === 0) {
      throw new Error('Search term is required and must contain valid characters');
    }

    try {
      logger.info(`Searching ${entityType} with sanitized term`);

      // Build query safely - entityType is validated against whitelist above
      // searchTerm is strictly sanitized to only allow safe characters
      const sql = `SELECT * FROM ${entityType} WHERE DisplayName LIKE '%${sanitizedSearchTerm}%' MAXRESULTS 50`;

      const response = await this.axiosInstance.get(
        `/${this.credentials.realmId}/query`,
        {
          params: {
            query: sql,
            minorversion: 65,
          },
        }
      );

      const results = response.data.QueryResponse?.[entityType] || [];
      logger.info(`Found ${results.length} ${entityType} results`);
      return results;
    } catch (error) {
      logger.error(`Failed to search ${entityType}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Sanitize search term to prevent injection attacks
   * Uses a whitelist approach - only allows safe characters
   */
  private sanitizeSearchTerm(term: string): string {
    if (!term || typeof term !== 'string') {
      return '';
    }

    // Whitelist approach: only allow alphanumeric, spaces, and common safe punctuation
    // This is much safer than trying to escape dangerous characters
    const sanitized = term
      .substring(0, 100)                           // Limit length first
      .replace(/[^a-zA-Z0-9\s\-_.@]/g, '')         // Only allow safe characters
      .trim();                                      // Remove leading/trailing whitespace

    return sanitized;
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const qbError = error.response?.data?.Fault?.Error?.[0];
      if (qbError) {
        return new Error(`QuickBooks API Error: ${qbError.Message} (${qbError.code})`);
      }
      return new Error(`QuickBooks API Error: ${error.message}`);
    }
    return error instanceof Error ? error : new Error('Unknown QuickBooks error');
  }

  /**
   * Get service metrics
   */
  getMetrics(): any {
    return {
      service: 'QuickBooks',
      realmId: this.credentials.realmId,
      tokenValid: this.credentials.accessToken ? true : false,
      tokenExpiry: this.credentials.tokenExpiry ? new Date(this.credentials.tokenExpiry).toISOString() : null,
      sandbox: this.useSandbox,
    };
  }
}

// Export factory function
export function createQuickBooksService(
  credentials: QuickBooksCredentials,
  useSandbox = false
): QuickBooksService {
  return new QuickBooksService(credentials, useSandbox);
}
