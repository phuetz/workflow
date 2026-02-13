/**
 * Xero Service
 * Handles Xero Accounting API operations with OAuth 2.0 authentication
 */

import { logger } from '../../services/SimpleLogger';
import axios, { AxiosInstance } from 'axios';

interface XeroCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  tenantId: string;
  accessToken?: string;
  tokenExpiry?: number;
}

interface XeroLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  accountCode?: string;
  taxType?: string;
  itemCode?: string;
}

interface XeroInvoice {
  type: 'ACCREC' | 'ACCPAY';
  contact: {
    contactID?: string;
    name?: string;
  };
  lineItems: XeroLineItem[];
  date?: string;
  dueDate?: string;
  reference?: string;
  status?: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED';
}

interface XeroContact {
  name: string;
  emailAddress?: string;
  phoneNumber?: string;
  addresses?: Array<{
    addressType: 'POBOX' | 'STREET';
    addressLine1?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  }>;
}

interface XeroPayment {
  invoice: {
    invoiceID: string;
  };
  account: {
    code: string;
  };
  amount: number;
  date?: string;
  reference?: string;
}

export class XeroService {
  private readonly baseURL = 'https://api.xero.com/api.xro/2.0';
  private readonly authURL = 'https://identity.xero.com/connect/token';
  private readonly connectionsURL = 'https://api.xero.com/connections';

  private axiosInstance: AxiosInstance;
  private credentials: XeroCredentials;

  constructor(credentials: XeroCredentials) {
    this.credentials = credentials;

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
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
        config.headers['xero-tenant-id'] = this.credentials.tenantId;
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
      logger.info('Refreshing Xero access token');

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.credentials.refreshToken,
      });

      const response = await axios.post(this.authURL, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.credentials.clientId}:${this.credentials.clientSecret}`).toString('base64')}`,
        },
      });

      this.credentials.accessToken = response.data.access_token;
      this.credentials.refreshToken = response.data.refresh_token;
      this.credentials.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      logger.info('Xero access token refreshed successfully');
    } catch (error) {
      logger.error('Failed to refresh Xero access token:', error);
      throw new Error('Xero authentication failed');
    }
  }

  /**
   * Get connections (organisations)
   */
  async getConnections(): Promise<any[]> {
    try {
      logger.info('Fetching Xero connections');

      const response = await axios.get(this.connectionsURL, {
        headers: {
          'Authorization': `Bearer ${this.credentials.accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch connections:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create Invoice
   */
  async createInvoice(invoice: XeroInvoice): Promise<any> {
    try {
      logger.info(`Creating Xero invoice`);

      const payload = {
        Type: invoice.type,
        Contact: invoice.contact,
        LineItems: invoice.lineItems.map(item => ({
          Description: item.description,
          Quantity: item.quantity,
          UnitAmount: item.unitAmount,
          AccountCode: item.accountCode,
          TaxType: item.taxType || 'NONE',
          ItemCode: item.itemCode,
        })),
        Date: invoice.date,
        DueDate: invoice.dueDate,
        Reference: invoice.reference,
        Status: invoice.status || 'DRAFT',
      };

      const response = await this.axiosInstance.post('/Invoices', {
        Invoices: [payload],
      });

      const createdInvoice = response.data.Invoices?.[0];
      logger.info(`Invoice created successfully: ${createdInvoice?.InvoiceID}`);
      return createdInvoice;
    } catch (error) {
      logger.error('Failed to create Xero invoice:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get Invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<any> {
    try {
      logger.info(`Fetching Xero invoice ${invoiceId}`);

      const response = await this.axiosInstance.get(`/Invoices/${invoiceId}`);

      return response.data.Invoices?.[0];
    } catch (error) {
      logger.error(`Failed to fetch invoice ${invoiceId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Get Invoices with filters
   */
  async getInvoices(options?: {
    where?: string;
    orderBy?: string;
    page?: number;
    status?: string;
  }): Promise<any[]> {
    try {
      logger.info('Fetching Xero invoices');

      const params: any = {};

      if (options?.where) params.where = options.where;
      if (options?.orderBy) params.order = options.orderBy;
      if (options?.page) params.page = options.page;

      const response = await this.axiosInstance.get('/Invoices', { params });

      const invoices = response.data.Invoices || [];
      logger.info(`Found ${invoices.length} invoices`);
      return invoices;
    } catch (error) {
      logger.error('Failed to fetch invoices:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update Invoice
   */
  async updateInvoice(invoiceId: string, updates: Partial<XeroInvoice>): Promise<any> {
    try {
      logger.info(`Updating Xero invoice ${invoiceId}`);

      const response = await this.axiosInstance.post(`/Invoices/${invoiceId}`, {
        Invoices: [updates],
      });

      logger.info('Invoice updated successfully');
      return response.data.Invoices?.[0];
    } catch (error) {
      logger.error('Failed to update invoice:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create Contact
   */
  async createContact(contact: XeroContact): Promise<any> {
    try {
      logger.info(`Creating Xero contact: ${contact.name}`);

      const payload = {
        Name: contact.name,
        EmailAddress: contact.emailAddress,
        Phones: contact.phoneNumber ? [{
          PhoneType: 'DEFAULT',
          PhoneNumber: contact.phoneNumber,
        }] : undefined,
        Addresses: contact.addresses,
      };

      const response = await this.axiosInstance.post('/Contacts', {
        Contacts: [payload],
      });

      const createdContact = response.data.Contacts?.[0];
      logger.info(`Contact created successfully: ${createdContact?.ContactID}`);
      return createdContact;
    } catch (error) {
      logger.error('Failed to create Xero contact:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get Contact by ID
   */
  async getContact(contactId: string): Promise<any> {
    try {
      logger.info(`Fetching Xero contact ${contactId}`);

      const response = await this.axiosInstance.get(`/Contacts/${contactId}`);

      return response.data.Contacts?.[0];
    } catch (error) {
      logger.error(`Failed to fetch contact ${contactId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Get Contacts with filters
   */
  async getContacts(options?: {
    where?: string;
    orderBy?: string;
    page?: number;
  }): Promise<any[]> {
    try {
      logger.info('Fetching Xero contacts');

      const params: any = {};

      if (options?.where) params.where = options.where;
      if (options?.orderBy) params.order = options.orderBy;
      if (options?.page) params.page = options.page;

      const response = await this.axiosInstance.get('/Contacts', { params });

      const contacts = response.data.Contacts || [];
      logger.info(`Found ${contacts.length} contacts`);
      return contacts;
    } catch (error) {
      logger.error('Failed to fetch contacts:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create Payment
   */
  async createPayment(payment: XeroPayment): Promise<any> {
    try {
      logger.info(`Creating Xero payment`);

      const payload = {
        Invoice: payment.invoice,
        Account: payment.account,
        Amount: payment.amount,
        Date: payment.date || new Date().toISOString().split('T')[0],
        Reference: payment.reference,
      };

      const response = await this.axiosInstance.post('/Payments', {
        Payments: [payload],
      });

      const createdPayment = response.data.Payments?.[0];
      logger.info(`Payment created successfully: ${createdPayment?.PaymentID}`);
      return createdPayment;
    } catch (error) {
      logger.error('Failed to create Xero payment:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get Accounts (Chart of Accounts)
   */
  async getAccounts(options?: {
    where?: string;
    orderBy?: string;
  }): Promise<any[]> {
    try {
      logger.info('Fetching Xero accounts');

      const params: any = {};

      if (options?.where) params.where = options.where;
      if (options?.orderBy) params.order = options.orderBy;

      const response = await this.axiosInstance.get('/Accounts', { params });

      const accounts = response.data.Accounts || [];
      logger.info(`Found ${accounts.length} accounts`);
      return accounts;
    } catch (error) {
      logger.error('Failed to fetch accounts:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get Organisation details
   */
  async getOrganisation(): Promise<any> {
    try {
      logger.info('Fetching Xero organisation details');

      const response = await this.axiosInstance.get('/Organisation');

      return response.data.Organisations?.[0];
    } catch (error) {
      logger.error('Failed to fetch organisation:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get Tax Rates
   */
  async getTaxRates(options?: {
    where?: string;
    orderBy?: string;
  }): Promise<any[]> {
    try {
      logger.info('Fetching Xero tax rates');

      const params: any = {};

      if (options?.where) params.where = options.where;
      if (options?.orderBy) params.order = options.orderBy;

      const response = await this.axiosInstance.get('/TaxRates', { params });

      const taxRates = response.data.TaxRates || [];
      logger.info(`Found ${taxRates.length} tax rates`);
      return taxRates;
    } catch (error) {
      logger.error('Failed to fetch tax rates:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get Bank Transactions
   */
  async getBankTransactions(options?: {
    where?: string;
    orderBy?: string;
    page?: number;
  }): Promise<any[]> {
    try {
      logger.info('Fetching Xero bank transactions');

      const params: any = {};

      if (options?.where) params.where = options.where;
      if (options?.orderBy) params.order = options.orderBy;
      if (options?.page) params.page = options.page;

      const response = await this.axiosInstance.get('/BankTransactions', { params });

      const transactions = response.data.BankTransactions || [];
      logger.info(`Found ${transactions.length} bank transactions`);
      return transactions;
    } catch (error) {
      logger.error('Failed to fetch bank transactions:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const xeroError = error.response?.data;
      if (xeroError?.Elements) {
        const errorElement = xeroError.Elements[0];
        if (errorElement?.ValidationErrors) {
          const validationError = errorElement.ValidationErrors[0];
          return new Error(`Xero API Error: ${validationError.Message}`);
        }
      }
      if (xeroError?.Message) {
        return new Error(`Xero API Error: ${xeroError.Message}`);
      }
      return new Error(`Xero API Error: ${error.message}`);
    }
    return error instanceof Error ? error : new Error('Unknown Xero error');
  }

  /**
   * Get service metrics
   */
  getMetrics(): any {
    return {
      service: 'Xero',
      tenantId: this.credentials.tenantId,
      tokenValid: this.credentials.accessToken ? true : false,
      tokenExpiry: this.credentials.tokenExpiry ? new Date(this.credentials.tokenExpiry).toISOString() : null,
    };
  }
}

// Export factory function
export function createXeroService(credentials: XeroCredentials): XeroService {
  return new XeroService(credentials);
}
