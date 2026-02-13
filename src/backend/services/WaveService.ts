/**
 * Wave Service
 * Handles Wave API operations with GraphQL
 */

import { logger } from '../../services/SimpleLogger';
import axios, { AxiosInstance } from 'axios';

interface WaveCredentials {
  accessToken: string;
  businessId: string;
}

export class WaveService {
  private readonly baseURL = 'https://gql.waveapps.com/graphql/public';
  private axiosInstance: AxiosInstance;
  private credentials: WaveCredentials;

  constructor(credentials: WaveCredentials) {
    this.credentials = credentials;

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Execute GraphQL query
   */
  private async executeQuery(query: string, variables?: any): Promise<any> {
    try {
      const response = await this.axiosInstance.post('', {
        query,
        variables,
      });

      if (response.data.errors) {
        throw new Error(response.data.errors.map((e: any) => e.message).join(', '));
      }

      return response.data.data;
    } catch (error) {
      logger.error('Wave GraphQL query failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * INVOICE OPERATIONS
   */

  /**
   * Create invoice
   */
  async createInvoice(invoice: {
    customerId: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      description?: string;
    }>;
    invoiceDate?: string;
    dueDate?: string;
    invoiceNumber?: string;
    poNumber?: string;
    title?: string;
    subHeading?: string;
    footer?: string;
    memo?: string;
  }): Promise<any> {
    try {
      logger.info('Creating Wave invoice');

      const mutation = `
        mutation InvoiceCreate($input: InvoiceCreateInput!) {
          invoiceCreate(input: $input) {
            didSucceed
            inputErrors {
              message
              path
            }
            invoice {
              id
              invoiceNumber
              total
              status
            }
          }
        }
      `;

      const variables = {
        input: {
          businessId: this.credentials.businessId,
          customerId: invoice.customerId,
          items: invoice.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            description: item.description,
          })),
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          invoiceNumber: invoice.invoiceNumber,
          poNumber: invoice.poNumber,
          title: invoice.title,
          subheading: invoice.subHeading,
          footer: invoice.footer,
          memo: invoice.memo,
        },
      };

      const data = await this.executeQuery(mutation, variables);

      if (!data.invoiceCreate.didSucceed) {
        throw new Error(data.invoiceCreate.inputErrors.map((e: any) => e.message).join(', '));
      }

      logger.info(`Invoice created successfully: ${data.invoiceCreate.invoice.id}`);
      return data.invoiceCreate.invoice;
    } catch (error) {
      logger.error('Failed to create invoice:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get invoice
   */
  async getInvoice(invoiceId: string): Promise<any> {
    try {
      logger.info(`Fetching Wave invoice: ${invoiceId}`);

      const query = `
        query GetInvoice($invoiceId: ID!) {
          invoice(id: $invoiceId) {
            id
            invoiceNumber
            invoiceDate
            dueDate
            amountDue
            amountPaid
            status
            customer {
              id
              name
              email
            }
            items {
              product {
                id
                name
              }
              description
              quantity
              unitPrice
              total
            }
          }
        }
      `;

      const data = await this.executeQuery(query, { invoiceId });

      return data.invoice;
    } catch (error) {
      logger.error(`Failed to fetch invoice ${invoiceId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Send invoice
   */
  async sendInvoice(invoiceId: string, options?: {
    to?: string;
    subject?: string;
    message?: string;
  }): Promise<any> {
    try {
      logger.info(`Sending Wave invoice: ${invoiceId}`);

      const mutation = `
        mutation InvoiceSend($input: InvoiceSendInput!) {
          invoiceSend(input: $input) {
            didSucceed
            inputErrors {
              message
              path
            }
            invoice {
              id
              status
            }
          }
        }
      `;

      const variables = {
        input: {
          invoiceId,
          to: options?.to,
          subject: options?.subject,
          message: options?.message,
        },
      };

      const data = await this.executeQuery(mutation, variables);

      if (!data.invoiceSend.didSucceed) {
        throw new Error(data.invoiceSend.inputErrors.map((e: any) => e.message).join(', '));
      }

      logger.info('Invoice sent successfully');
      return data.invoiceSend.invoice;
    } catch (error) {
      logger.error('Failed to send invoice:', error);
      throw this.handleError(error);
    }
  }

  /**
   * List invoices
   */
  async listInvoices(options?: {
    page?: number;
    pageSize?: number;
    status?: string;
  }): Promise<any> {
    try {
      logger.info('Listing Wave invoices');

      const query = `
        query ListInvoices($businessId: ID!, $page: Int!, $pageSize: Int!) {
          business(id: $businessId) {
            id
            invoices(page: $page, pageSize: $pageSize) {
              pageInfo {
                currentPage
                totalPages
                totalCount
              }
              edges {
                node {
                  id
                  invoiceNumber
                  invoiceDate
                  dueDate
                  total
                  amountDue
                  amountPaid
                  status
                  customer {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      `;

      const variables = {
        businessId: this.credentials.businessId,
        page: options?.page || 1,
        pageSize: options?.pageSize || 20,
      };

      const data = await this.executeQuery(query, variables);

      const invoices = data.business.invoices.edges.map((edge: any) => edge.node);
      logger.info(`Found ${invoices.length} invoices`);

      return {
        invoices,
        pageInfo: data.business.invoices.pageInfo,
      };
    } catch (error) {
      logger.error('Failed to list invoices:', error);
      throw this.handleError(error);
    }
  }

  /**
   * CUSTOMER OPERATIONS
   */

  /**
   * Create customer
   */
  async createCustomer(customer: {
    name: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    website?: string;
    address?: {
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      province?: string;
      postalCode?: string;
      countryCode?: string;
    };
  }): Promise<any> {
    try {
      logger.info('Creating Wave customer');

      const mutation = `
        mutation CustomerCreate($input: CustomerCreateInput!) {
          customerCreate(input: $input) {
            didSucceed
            inputErrors {
              message
              path
            }
            customer {
              id
              name
              email
            }
          }
        }
      `;

      const variables = {
        input: {
          businessId: this.credentials.businessId,
          name: customer.name,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          mobile: customer.mobile,
          phone: customer.phone,
          website: customer.website,
          address: customer.address,
        },
      };

      const data = await this.executeQuery(mutation, variables);

      if (!data.customerCreate.didSucceed) {
        throw new Error(data.customerCreate.inputErrors.map((e: any) => e.message).join(', '));
      }

      logger.info(`Customer created successfully: ${data.customerCreate.customer.id}`);
      return data.customerCreate.customer;
    } catch (error) {
      logger.error('Failed to create customer:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get customer
   */
  async getCustomer(customerId: string): Promise<any> {
    try {
      logger.info(`Fetching Wave customer: ${customerId}`);

      const query = `
        query GetCustomer($customerId: ID!) {
          customer(id: $customerId) {
            id
            name
            firstName
            lastName
            email
            phone
            mobile
            website
            address {
              addressLine1
              addressLine2
              city
              province {
                code
                name
              }
              postalCode
              country {
                code
                name
              }
            }
          }
        }
      `;

      const data = await this.executeQuery(query, { customerId });

      return data.customer;
    } catch (error) {
      logger.error(`Failed to fetch customer ${customerId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * List customers
   */
  async listCustomers(options?: {
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    try {
      logger.info('Listing Wave customers');

      const query = `
        query ListCustomers($businessId: ID!, $page: Int!, $pageSize: Int!) {
          business(id: $businessId) {
            id
            customers(page: $page, pageSize: $pageSize) {
              pageInfo {
                currentPage
                totalPages
                totalCount
              }
              edges {
                node {
                  id
                  name
                  firstName
                  lastName
                  email
                  phone
                }
              }
            }
          }
        }
      `;

      const variables = {
        businessId: this.credentials.businessId,
        page: options?.page || 1,
        pageSize: options?.pageSize || 20,
      };

      const data = await this.executeQuery(query, variables);

      const customers = data.business.customers.edges.map((edge: any) => edge.node);
      logger.info(`Found ${customers.length} customers`);

      return {
        customers,
        pageInfo: data.business.customers.pageInfo,
      };
    } catch (error) {
      logger.error('Failed to list customers:', error);
      throw this.handleError(error);
    }
  }

  /**
   * PRODUCT OPERATIONS
   */

  /**
   * Create product
   */
  async createProduct(product: {
    name: string;
    description?: string;
    unitPrice: number;
    isSold?: boolean;
    isBought?: boolean;
    incomeAccountId?: string;
    expenseAccountId?: string;
  }): Promise<any> {
    try {
      logger.info('Creating Wave product');

      const mutation = `
        mutation ProductCreate($input: ProductCreateInput!) {
          productCreate(input: $input) {
            didSucceed
            inputErrors {
              message
              path
            }
            product {
              id
              name
              description
              unitPrice
              isSold
              isBought
            }
          }
        }
      `;

      const variables = {
        input: {
          businessId: this.credentials.businessId,
          name: product.name,
          description: product.description,
          unitPrice: product.unitPrice,
          isSold: product.isSold !== false,
          isBought: product.isBought || false,
          incomeAccountId: product.incomeAccountId,
          expenseAccountId: product.expenseAccountId,
        },
      };

      const data = await this.executeQuery(mutation, variables);

      if (!data.productCreate.didSucceed) {
        throw new Error(data.productCreate.inputErrors.map((e: any) => e.message).join(', '));
      }

      logger.info(`Product created successfully: ${data.productCreate.product.id}`);
      return data.productCreate.product;
    } catch (error) {
      logger.error('Failed to create product:', error);
      throw this.handleError(error);
    }
  }

  /**
   * List products
   */
  async listProducts(options?: {
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    try {
      logger.info('Listing Wave products');

      const query = `
        query ListProducts($businessId: ID!, $page: Int!, $pageSize: Int!) {
          business(id: $businessId) {
            id
            products(page: $page, pageSize: $pageSize) {
              pageInfo {
                currentPage
                totalPages
                totalCount
              }
              edges {
                node {
                  id
                  name
                  description
                  unitPrice
                  isSold
                  isBought
                }
              }
            }
          }
        }
      `;

      const variables = {
        businessId: this.credentials.businessId,
        page: options?.page || 1,
        pageSize: options?.pageSize || 20,
      };

      const data = await this.executeQuery(query, variables);

      const products = data.business.products.edges.map((edge: any) => edge.node);
      logger.info(`Found ${products.length} products`);

      return {
        products,
        pageInfo: data.business.products.pageInfo,
      };
    } catch (error) {
      logger.error('Failed to list products:', error);
      throw this.handleError(error);
    }
  }

  /**
   * PAYMENT OPERATIONS
   */

  /**
   * Record payment
   */
  async recordPayment(payment: {
    invoiceId: string;
    amount: number;
    date?: string;
    paymentMethod?: string;
    notes?: string;
  }): Promise<any> {
    try {
      logger.info('Recording Wave payment');

      const mutation = `
        mutation MoneyReceivedCreate($input: MoneyReceivedCreateInput!) {
          moneyReceivedCreate(input: $input) {
            didSucceed
            inputErrors {
              message
              path
            }
            transaction {
              id
              amount
              date
            }
          }
        }
      `;

      const variables = {
        input: {
          businessId: this.credentials.businessId,
          invoiceId: payment.invoiceId,
          amount: payment.amount,
          date: payment.date || new Date().toISOString().split('T')[0],
          paymentMethod: payment.paymentMethod || 'CASH',
          notes: payment.notes,
        },
      };

      const data = await this.executeQuery(mutation, variables);

      if (!data.moneyReceivedCreate.didSucceed) {
        throw new Error(data.moneyReceivedCreate.inputErrors.map((e: any) => e.message).join(', '));
      }

      logger.info(`Payment recorded successfully: ${data.moneyReceivedCreate.transaction.id}`);
      return data.moneyReceivedCreate.transaction;
    } catch (error) {
      logger.error('Failed to record payment:', error);
      throw this.handleError(error);
    }
  }

  /**
   * ACCOUNT OPERATIONS
   */

  /**
   * List accounts
   */
  async listAccounts(): Promise<any> {
    try {
      logger.info('Listing Wave accounts');

      const query = `
        query ListAccounts($businessId: ID!) {
          business(id: $businessId) {
            id
            accounts {
              edges {
                node {
                  id
                  name
                  type
                  subtype
                  currency {
                    code
                  }
                }
              }
            }
          }
        }
      `;

      const data = await this.executeQuery(query, { businessId: this.credentials.businessId });

      const accounts = data.business.accounts.edges.map((edge: any) => edge.node);
      logger.info(`Found ${accounts.length} accounts`);

      return { accounts };
    } catch (error) {
      logger.error('Failed to list accounts:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const waveError = error.response?.data;
      if (waveError?.errors) {
        const errorMsg = waveError.errors.map((e: any) => e.message).join(', ');
        return new Error(`Wave API Error: ${errorMsg}`);
      }
      return new Error(`Wave API Error: ${error.message}`);
    }
    return error instanceof Error ? error : new Error('Unknown Wave error');
  }

  /**
   * Get service metrics
   */
  getMetrics(): any {
    return {
      service: 'Wave',
      authenticated: this.credentials.accessToken ? true : false,
      businessId: this.credentials.businessId,
    };
  }
}

// Export factory function
export function createWaveService(credentials: WaveCredentials): WaveService {
  return new WaveService(credentials);
}
