/**
 * QuickBooks Integration System - Main orchestrator for QuickBooks Online integration
 */
import { EventEmitter } from 'events';
import type { QuickBooksConfig, QuickBooksError, IntegrationStats, SyncStatus, QueryOptions,
  BatchOperation, WebhookConfig, Customer, Invoice, Payment, Bill, Expense, Item,
  Account, Vendor, Employee, JournalEntry, Report } from './quickbooks/types';
import { AuthManager } from './quickbooks/AuthClient';
import { APIClient, RateLimiter } from './quickbooks/APIClient';
import { CustomerService } from './quickbooks/CustomerService';
import { InvoiceService } from './quickbooks/InvoiceService';
import { PaymentService } from './quickbooks/PaymentService';
import { ReportService } from './quickbooks/ReportService';
import { BillService, ExpenseService, ItemService, AccountService, VendorService,
  EmployeeService, JournalEntryService } from './quickbooks/EntityServices';
import { SyncManager } from './quickbooks/SyncManager';
import { WebhookManager } from './quickbooks/WebhookManager';

export * from './quickbooks/types';

export class QuickBooksIntegration extends EventEmitter {
  private static instance: QuickBooksIntegration;
  private config: QuickBooksConfig;
  private authManager: AuthManager;
  private apiClient: APIClient;
  private rateLimiter: RateLimiter;
  private cache: Map<string, { data: any; expiry: Date }>;
  private stats: IntegrationStats;
  private syncIntervals: Map<string, NodeJS.Timeout>;
  private syncManager: SyncManager;
  private webhookManager: WebhookManager;
  private customerService: CustomerService;
  private invoiceService: InvoiceService;
  private paymentService: PaymentService;
  private reportService: ReportService;
  private billService: BillService;
  private expenseService: ExpenseService;
  private itemService: ItemService;
  private accountService: AccountService;
  private vendorService: VendorService;
  private employeeService: EmployeeService;
  private journalEntryService: JournalEntryService;

  private constructor() {
    super();
    this.cache = new Map();
    this.syncIntervals = new Map();
    this.stats = this.createDefaultStats();
    this.config = this.getDefaultConfig();
    this.initializeServices();
  }

  public static getInstance(): QuickBooksIntegration {
    if (!QuickBooksIntegration.instance) QuickBooksIntegration.instance = new QuickBooksIntegration();
    return QuickBooksIntegration.instance;
  }

  private initializeServices(): void {
    this.authManager = new AuthManager(this.config.auth);
    this.apiClient = new APIClient(this.authManager, this.config);
    this.rateLimiter = new RateLimiter(this.config.rateLimit);
    this.syncManager = new SyncManager(this.apiClient, this.config);
    this.webhookManager = new WebhookManager(this.config);
    const q = this.buildQuery.bind(this);
    this.customerService = new CustomerService(this.apiClient, this, this.cache, q);
    this.invoiceService = new InvoiceService(this.apiClient, this, this.cache, q);
    this.paymentService = new PaymentService(this.apiClient, this, this.cache, q);
    this.reportService = new ReportService(this.apiClient);
    this.billService = new BillService(this.apiClient, this, this.cache, q);
    this.expenseService = new ExpenseService(this.apiClient, this, this.cache, q);
    this.itemService = new ItemService(this.apiClient, this, this.cache, q);
    this.accountService = new AccountService(this.apiClient, this, this.cache, q);
    this.vendorService = new VendorService(this.apiClient, this, this.cache, q);
    this.employeeService = new EmployeeService(this.apiClient, this, this.cache, q);
    this.journalEntryService = new JournalEntryService(this.apiClient, this, this.cache, q);
  }

  private getDefaultConfig(): QuickBooksConfig {
    return {
      auth: { clientId: '', clientSecret: '', redirectUri: '', environment: 'sandbox' },
      syncEnabled: false, syncInterval: 300000, webhooksEnabled: false, batchSize: 30,
      retryAttempts: 3, retryDelay: 1000, timeout: 30000,
      rateLimit: { maxRequests: 500, windowMs: 60000 },
      entities: { customers: true, invoices: true, payments: true, bills: true, expenses: true,
        items: true, accounts: true, vendors: true, employees: true, journalEntries: true }
    };
  }

  public configure(config: Partial<QuickBooksConfig>): void {
    this.config = { ...this.config, ...config };
    this.authManager.updateAuth(this.config.auth);
    this.emit('configured', this.config);
  }

  // Authentication
  public async getAuthorizationUrl(state?: string): Promise<string> { return this.authManager.getAuthorizationUrl(state); }
  public async exchangeAuthorizationCode(code: string, realmId: string): Promise<void> {
    await this.authManager.exchangeAuthorizationCode(code, realmId);
    this.emit('authenticated', { realmId });
  }
  public async refreshAccessToken(): Promise<void> { await this.authManager.refreshAccessToken(); this.emit('tokenRefreshed'); }
  public async revokeToken(): Promise<void> { await this.authManager.revokeToken(); this.emit('tokenRevoked'); }

  // Customer Operations
  public async createCustomer(c: Customer): Promise<Customer> { return this.executeWithRetry(() => this.customerService.create(c)); }
  public async getCustomer(id: string): Promise<Customer> { return this.executeWithRetry(() => this.customerService.get(id)); }
  public async updateCustomer(c: Customer): Promise<Customer> { return this.executeWithRetry(() => this.customerService.update(c)); }
  public async deleteCustomer(id: string): Promise<void> { return this.executeWithRetry(() => this.customerService.delete(id)); }
  public async queryCustomers(o?: QueryOptions): Promise<Customer[]> { return this.executeWithRetry(() => this.customerService.query(o)); }

  // Invoice Operations
  public async createInvoice(i: Invoice): Promise<Invoice> { return this.executeWithRetry(() => this.invoiceService.create(i)); }
  public async getInvoice(id: string): Promise<Invoice> { return this.executeWithRetry(() => this.invoiceService.get(id)); }
  public async updateInvoice(i: Invoice): Promise<Invoice> { return this.executeWithRetry(() => this.invoiceService.update(i)); }
  public async deleteInvoice(id: string): Promise<void> { return this.executeWithRetry(() => this.invoiceService.delete(id)); }
  public async sendInvoice(id: string, email?: string): Promise<void> { return this.executeWithRetry(() => this.invoiceService.send(id, email)); }
  public async queryInvoices(o?: QueryOptions): Promise<Invoice[]> { return this.executeWithRetry(() => this.invoiceService.query(o)); }

  // Payment Operations
  public async createPayment(p: Payment): Promise<Payment> { return this.executeWithRetry(() => this.paymentService.create(p)); }
  public async getPayment(id: string): Promise<Payment> { return this.executeWithRetry(() => this.paymentService.get(id)); }
  public async updatePayment(p: Payment): Promise<Payment> { return this.executeWithRetry(() => this.paymentService.update(p)); }
  public async deletePayment(id: string): Promise<void> { return this.executeWithRetry(() => this.paymentService.delete(id)); }
  public async queryPayments(o?: QueryOptions): Promise<Payment[]> { return this.executeWithRetry(() => this.paymentService.query(o)); }

  // Bill Operations
  public async createBill(b: Bill): Promise<Bill> { return this.executeWithRetry(() => this.billService.create(b)); }
  public async getBill(id: string): Promise<Bill> { return this.executeWithRetry(() => this.billService.get(id)); }
  public async updateBill(b: Bill): Promise<Bill> { return this.executeWithRetry(() => this.billService.update(b)); }
  public async deleteBill(id: string): Promise<void> { return this.executeWithRetry(() => this.billService.delete(id)); }
  public async queryBills(o?: QueryOptions): Promise<Bill[]> { return this.executeWithRetry(() => this.billService.query(o)); }

  // Expense Operations
  public async createExpense(e: Expense): Promise<Expense> { return this.executeWithRetry(() => this.expenseService.create(e)); }
  public async getExpense(id: string): Promise<Expense> { return this.executeWithRetry(() => this.expenseService.get(id)); }
  public async updateExpense(e: Expense): Promise<Expense> { return this.executeWithRetry(() => this.expenseService.update(e)); }
  public async deleteExpense(id: string): Promise<void> { return this.executeWithRetry(() => this.expenseService.delete(id)); }
  public async queryExpenses(o?: QueryOptions): Promise<Expense[]> { return this.executeWithRetry(() => this.expenseService.query(o)); }

  // Item Operations
  public async createItem(i: Item): Promise<Item> { return this.executeWithRetry(() => this.itemService.create(i)); }
  public async getItem(id: string): Promise<Item> { return this.executeWithRetry(() => this.itemService.get(id)); }
  public async updateItem(i: Item): Promise<Item> { return this.executeWithRetry(() => this.itemService.update(i)); }
  public async deleteItem(id: string): Promise<void> { return this.executeWithRetry(() => this.itemService.delete(id)); }
  public async queryItems(o?: QueryOptions): Promise<Item[]> { return this.executeWithRetry(() => this.itemService.query(o)); }

  // Account Operations
  public async createAccount(a: Account): Promise<Account> { return this.executeWithRetry(() => this.accountService.create(a)); }
  public async getAccount(id: string): Promise<Account> { return this.executeWithRetry(() => this.accountService.get(id)); }
  public async updateAccount(a: Account): Promise<Account> { return this.executeWithRetry(() => this.accountService.update(a)); }
  public async queryAccounts(o?: QueryOptions): Promise<Account[]> { return this.executeWithRetry(() => this.accountService.query(o)); }

  // Vendor Operations
  public async createVendor(v: Vendor): Promise<Vendor> { return this.executeWithRetry(() => this.vendorService.create(v)); }
  public async getVendor(id: string): Promise<Vendor> { return this.executeWithRetry(() => this.vendorService.get(id)); }
  public async updateVendor(v: Vendor): Promise<Vendor> { return this.executeWithRetry(() => this.vendorService.update(v)); }
  public async deleteVendor(id: string): Promise<void> { return this.executeWithRetry(() => this.vendorService.delete(id)); }
  public async queryVendors(o?: QueryOptions): Promise<Vendor[]> { return this.executeWithRetry(() => this.vendorService.query(o)); }

  // Employee Operations
  public async createEmployee(e: Employee): Promise<Employee> { return this.executeWithRetry(() => this.employeeService.create(e)); }
  public async getEmployee(id: string): Promise<Employee> { return this.executeWithRetry(() => this.employeeService.get(id)); }
  public async updateEmployee(e: Employee): Promise<Employee> { return this.executeWithRetry(() => this.employeeService.update(e)); }
  public async queryEmployees(o?: QueryOptions): Promise<Employee[]> { return this.executeWithRetry(() => this.employeeService.query(o)); }

  // Journal Entry Operations
  public async createJournalEntry(j: JournalEntry): Promise<JournalEntry> { return this.executeWithRetry(() => this.journalEntryService.create(j)); }
  public async getJournalEntry(id: string): Promise<JournalEntry> { return this.executeWithRetry(() => this.journalEntryService.get(id)); }
  public async updateJournalEntry(j: JournalEntry): Promise<JournalEntry> { return this.executeWithRetry(() => this.journalEntryService.update(j)); }
  public async deleteJournalEntry(id: string): Promise<void> { return this.executeWithRetry(() => this.journalEntryService.delete(id)); }
  public async queryJournalEntries(o?: QueryOptions): Promise<JournalEntry[]> { return this.executeWithRetry(() => this.journalEntryService.query(o)); }

  // Report Operations
  public async getProfitAndLoss(s?: string, e?: string, o?: Record<string, string>): Promise<Report> {
    return this.executeWithRetry(() => this.reportService.getProfitAndLoss(s, e, o));
  }
  public async getBalanceSheet(d?: string, o?: Record<string, string>): Promise<Report> {
    return this.executeWithRetry(() => this.reportService.getBalanceSheet(d, o));
  }
  public async getCashFlow(s?: string, e?: string, o?: Record<string, string>): Promise<Report> {
    return this.executeWithRetry(() => this.reportService.getCashFlow(s, e, o));
  }
  public async getAccountList(s?: string, e?: string, o?: Record<string, string>): Promise<Report> {
    return this.executeWithRetry(() => this.reportService.getAccountList(s, e, o));
  }
  public async getCustomerSales(s?: string, e?: string, o?: Record<string, string>): Promise<Report> {
    return this.executeWithRetry(() => this.reportService.getCustomerSales(s, e, o));
  }
  public async getVendorExpenses(s?: string, e?: string, o?: Record<string, string>): Promise<Report> {
    return this.executeWithRetry(() => this.reportService.getVendorExpenses(s, e, o));
  }

  // Batch Operations
  public async executeBatch(ops: BatchOperation[]): Promise<any[]> {
    return this.executeWithRetry(async () => {
      const response = await this.apiClient.batch(ops);
      this.emit('batchExecuted', { operations: ops.length });
      return response.data;
    });
  }

  // Sync Operations
  public async startSync(entity?: string): Promise<void> {
    if (entity) await this.syncManager.syncEntity(entity);
    else await this.syncManager.syncAll();
  }
  public async stopSync(entity?: string): Promise<void> {
    if (entity) {
      const interval = this.syncIntervals.get(entity);
      if (interval) { clearInterval(interval); this.syncIntervals.delete(entity); }
    } else {
      this.syncIntervals.forEach(i => clearInterval(i));
      this.syncIntervals.clear();
    }
  }
  public enableAutoSync(entity?: string): void {
    const entities = entity ? [entity] : Object.keys(this.config.entities);
    entities.forEach(ent => {
      if (this.syncIntervals.has(ent)) return;
      const interval = setInterval(async () => {
        try { await this.syncManager.syncEntity(ent); }
        catch (err) { this.emit('syncError', { entity: ent, error: err }); }
      }, this.config.syncInterval);
      this.syncIntervals.set(ent, interval);
    });
  }
  public getSyncStatus(entity?: string): SyncStatus | Map<string, SyncStatus> {
    if (entity) return this.stats.syncStats.get(entity) || this.createDefaultSyncStatus(entity);
    return this.stats.syncStats;
  }

  // Webhook Operations
  public async registerWebhook(cfg: WebhookConfig): Promise<WebhookConfig> {
    const webhook = await this.webhookManager.register(cfg);
    this.emit('webhookRegistered', webhook);
    return webhook;
  }
  public async unregisterWebhook(id: string): Promise<void> {
    await this.webhookManager.unregister(id);
    this.emit('webhookUnregistered', { id });
  }
  public async listWebhooks(): Promise<WebhookConfig[]> { return this.webhookManager.list(); }
  public async processWebhookEvent(payload: any): Promise<void> {
    await this.webhookManager.processEvent(payload);
    this.stats.webhookStats.received++;
  }

  // Utility Methods
  private buildQuery(entity: string, options?: QueryOptions): string {
    let query = `SELECT * FROM ${entity}`;
    if (!options) return query;
    if (options.select?.length) query = `SELECT ${options.select.join(', ')} FROM ${entity}`;
    if (options.where?.length) {
      const cond = options.where.map(f => f.operator === 'IN'
        ? `${f.field} IN (${f.value.join(', ')})` : `${f.field} ${f.operator} '${f.value}'`).join(' AND ');
      query += ` WHERE ${cond}`;
    }
    if (options.orderBy?.length) query += ` ORDER BY ${options.orderBy.map(o => `${o.field} ${o.direction}`).join(', ')}`;
    if (options.limit) query += ` MAXRESULTS ${options.limit}`;
    if (options.offset) query += ` STARTPOSITION ${options.offset}`;
    return query;
  }

  private async executeWithRetry<T>(op: () => Promise<T>): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        await this.rateLimiter.checkLimit();
        const start = Date.now();
        const result = await op();
        this.updateStats(true, Date.now() - start);
        return result;
      } catch (err) {
        lastError = err;
        this.updateStats(false, 0, err as QuickBooksError);
        if (attempt < this.config.retryAttempts) await this.delay(this.config.retryDelay * attempt);
      }
    }
    throw lastError;
  }

  private updateStats(success: boolean, time: number, error?: QuickBooksError): void {
    this.stats.totalRequests++;
    if (success) {
      this.stats.successfulRequests++;
      const avg = this.stats.averageResponseTime;
      this.stats.averageResponseTime = ((avg * (this.stats.successfulRequests - 1)) + time) / this.stats.successfulRequests;
    } else {
      this.stats.failedRequests++;
      if (error) this.stats.lastError = error;
    }
  }

  private createDefaultStats(): IntegrationStats {
    return { totalRequests: 0, successfulRequests: 0, failedRequests: 0, averageResponseTime: 0,
      syncStats: new Map(), webhookStats: { received: 0, processed: 0, failed: 0 } };
  }
  private createDefaultSyncStatus(entity: string): SyncStatus {
    return { entity, syncDirection: 'two-way', recordsProcessed: 0, recordsFailed: 0, errors: [], status: 'idle' };
  }
  private delay(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }

  public getStatistics(): IntegrationStats { return { ...this.stats }; }
  public resetStatistics(): void { this.stats = this.createDefaultStats(); }
}

export const quickBooksIntegration = QuickBooksIntegration.getInstance();
