/**
 * QuickBooks Integration Types
 * All interfaces and type definitions for QuickBooks API integration
 */

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * QuickBooks OAuth2 Configuration
 */
export interface QuickBooksAuth {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: 'sandbox' | 'production';
  accessToken?: string;
  refreshToken?: string;
  realmId?: string;
  tokenExpiry?: Date;
}

/**
 * QuickBooks API Response
 */
export interface QuickBooksResponse<T = any> {
  data: T;
  time: string;
  status: number;
  headers: Record<string, string>;
}

/**
 * QuickBooks Error
 */
export interface QuickBooksError {
  code: string;
  message: string;
  detail?: string;
  type: 'AUTHENTICATION' | 'VALIDATION' | 'BUSINESS_LOGIC' | 'SYSTEM' | 'REQUEST';
  element?: string;
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

export interface EntityRef {
  value: string;
  name?: string;
  type?: string;
}

export interface CurrencyRef {
  value: string;
  name?: string;
}

export interface Address {
  id?: string;
  line1?: string;
  line2?: string;
  line3?: string;
  line4?: string;
  line5?: string;
  city?: string;
  country?: string;
  countrySubDivisionCode?: string;
  postalCode?: string;
  lat?: string;
  long?: string;
}

export interface EmailAddress {
  address?: string;
}

export interface MetaData {
  createTime?: string;
  lastUpdatedTime?: string;
  lastModifiedByRef?: EntityRef;
}

export interface LinkedTxn {
  txnId: string;
  txnType: string;
  txnLineId?: string;
}

export interface MarkupInfo {
  percentBased?: boolean;
  value?: number;
  percent?: number;
  markUpIncomeAccountRef?: EntityRef;
}

export interface TxnTaxDetail {
  defaultTaxCodeRef?: EntityRef;
  txnTaxCodeRef?: EntityRef;
  totalTax?: number;
  taxLine?: TaxLine[];
}

export interface TaxLine {
  amount?: number;
  detailType?: string;
  taxLineDetail?: TaxLineDetail;
}

export interface TaxLineDetail {
  taxRateRef?: EntityRef;
  percentBased?: boolean;
  taxPercent?: number;
  netAmountTaxable?: number;
  taxInclusiveAmount?: number;
  overrideDeltaAmount?: number;
}

export interface Entity {
  type: 'Customer' | 'Vendor' | 'Employee';
  entityRef: EntityRef;
}

// ============================================================================
// CUSTOMER TYPES
// ============================================================================

export interface Customer {
  id?: string;
  displayName: string;
  givenName?: string;
  familyName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  fax?: string;
  website?: string;
  active?: boolean;
  balance?: number;
  balanceWithJobs?: number;
  currencyRef?: CurrencyRef;
  taxable?: boolean;
  notes?: string;
  billAddr?: Address;
  shipAddr?: Address;
  preferredDeliveryMethod?: 'Print' | 'Email' | 'None';
  resaleNum?: string;
  syncToken?: string;
  metaData?: MetaData;
}

// ============================================================================
// INVOICE TYPES
// ============================================================================

export interface Invoice {
  id?: string;
  docNumber?: string;
  txnDate: string;
  dueDate?: string;
  customerRef: EntityRef;
  currencyRef?: CurrencyRef;
  exchangeRate?: number;
  billEmail?: EmailAddress;
  billAddr?: Address;
  shipAddr?: Address;
  shipDate?: string;
  trackingNum?: string;
  line: InvoiceLine[];
  txnTaxDetail?: TxnTaxDetail;
  totalAmt?: number;
  balance?: number;
  deposit?: number;
  depositToAccountRef?: EntityRef;
  applyTaxAfterDiscount?: boolean;
  printStatus?: 'NotSet' | 'NeedToPrint' | 'PrintComplete';
  emailStatus?: 'NotSet' | 'NeedToSend' | 'EmailSent';
  privateNote?: string;
  customerMemo?: string;
  salesTermRef?: EntityRef;
  linkedTxn?: LinkedTxn[];
  globalTaxCalculation?: 'TaxExcluded' | 'TaxInclusive' | 'NotApplicable';
  syncToken?: string;
  metaData?: MetaData;
}

export interface InvoiceLine {
  id?: string;
  lineNum?: number;
  description?: string;
  amount: number;
  detailType: 'SalesItemLineDetail' | 'GroupLineDetail' | 'DescriptionOnly' | 'DiscountLineDetail' | 'SubTotalLineDetail';
  salesItemLineDetail?: SalesItemLineDetail;
  groupLineDetail?: GroupLineDetail;
  discountLineDetail?: DiscountLineDetail;
}

export interface SalesItemLineDetail {
  itemRef?: EntityRef;
  classRef?: EntityRef;
  unitPrice?: number;
  ratePercent?: number;
  qty?: number;
  itemAccountRef?: EntityRef;
  taxCodeRef?: EntityRef;
  taxClassificationRef?: EntityRef;
  markupInfo?: MarkupInfo;
}

export interface GroupLineDetail {
  groupItemRef?: EntityRef;
  quantity?: number;
  line?: InvoiceLine[];
}

export interface DiscountLineDetail {
  discountRef?: EntityRef;
  percentBased?: boolean;
  discountPercent?: number;
  discountAccountRef?: EntityRef;
  classRef?: EntityRef;
  taxCodeRef?: EntityRef;
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export interface Payment {
  id?: string;
  txnDate: string;
  customerRef: EntityRef;
  depositToAccountRef?: EntityRef;
  paymentMethodRef?: EntityRef;
  paymentRefNum?: string;
  totalAmt: number;
  unappliedAmt?: number;
  processPayment?: boolean;
  currencyRef?: CurrencyRef;
  exchangeRate?: number;
  line?: PaymentLine[];
  privateNote?: string;
  linkedTxn?: LinkedTxn[];
  syncToken?: string;
  metaData?: MetaData;
}

export interface PaymentLine {
  amount: number;
  linkedTxn: LinkedTxn[];
}

// ============================================================================
// BILL TYPES
// ============================================================================

export interface Bill {
  id?: string;
  vendorRef: EntityRef;
  line: BillLine[];
  currencyRef?: CurrencyRef;
  exchangeRate?: number;
  docNumber?: string;
  txnDate: string;
  departmentRef?: EntityRef;
  dueDate?: string;
  salesTermRef?: EntityRef;
  linkedTxn?: LinkedTxn[];
  globalTaxCalculation?: 'TaxExcluded' | 'TaxInclusive' | 'NotApplicable';
  totalAmt?: number;
  balance?: number;
  apAccountRef?: EntityRef;
  syncToken?: string;
  metaData?: MetaData;
}

export interface BillLine {
  id?: string;
  lineNum?: number;
  description?: string;
  amount: number;
  detailType: 'AccountBasedExpenseLineDetail' | 'ItemBasedExpenseLineDetail';
  accountBasedExpenseLineDetail?: AccountBasedExpenseLineDetail;
  itemBasedExpenseLineDetail?: ItemBasedExpenseLineDetail;
}

export interface AccountBasedExpenseLineDetail {
  accountRef: EntityRef;
  billableStatus?: 'Billable' | 'NotBillable' | 'HasBeenBilled';
  markupInfo?: MarkupInfo;
  taxAmount?: number;
  taxCodeRef?: EntityRef;
  taxRateRef?: EntityRef;
  classRef?: EntityRef;
  customerRef?: EntityRef;
}

export interface ItemBasedExpenseLineDetail {
  itemRef?: EntityRef;
  classRef?: EntityRef;
  unitPrice?: number;
  ratePercent?: number;
  qty?: number;
  taxCodeRef?: EntityRef;
  customerRef?: EntityRef;
  billableStatus?: 'Billable' | 'NotBillable' | 'HasBeenBilled';
  markupInfo?: MarkupInfo;
}

// ============================================================================
// EXPENSE TYPES
// ============================================================================

export interface Expense {
  id?: string;
  paymentType: 'Cash' | 'Check' | 'CreditCard';
  accountRef: EntityRef;
  entityRef?: EntityRef;
  credit?: boolean;
  totalAmt?: number;
  txnDate: string;
  currencyRef?: CurrencyRef;
  exchangeRate?: number;
  line: ExpenseLine[];
  privateNote?: string;
  txnTaxDetail?: TxnTaxDetail;
  paymentMethodRef?: EntityRef;
  checkPayment?: CheckPayment;
  creditCardPayment?: CreditCardPayment;
  syncToken?: string;
  metaData?: MetaData;
}

export interface ExpenseLine {
  id?: string;
  lineNum?: number;
  description?: string;
  amount: number;
  detailType: 'AccountBasedExpenseLineDetail' | 'ItemBasedExpenseLineDetail';
  accountBasedExpenseLineDetail?: AccountBasedExpenseLineDetail;
  itemBasedExpenseLineDetail?: ItemBasedExpenseLineDetail;
}

export interface CheckPayment {
  checkNum?: string;
  status?: string;
  nameOnAcct?: string;
  acctNum?: string;
  bankName?: string;
}

export interface CreditCardPayment {
  creditCardChargeInfo?: CreditCardChargeInfo;
}

export interface CreditCardChargeInfo {
  ccTxnMode?: string;
  ccTxnType?: string;
  commercialCardType?: string;
  creditCardChargeResponse?: CreditCardChargeResponse;
  billAddrStreet?: string;
  nameOnAcct?: string;
  ccExpiryMonth?: number;
  ccExpiryYear?: number;
  type?: string;
  billAddrPostalCode?: string;
}

export interface CreditCardChargeResponse {
  status?: string;
  authCode?: string;
  txnAuthorizationTime?: string;
  ccTransId?: string;
}

// ============================================================================
// ITEM TYPES
// ============================================================================

export interface Item {
  id?: string;
  name: string;
  sku?: string;
  active?: boolean;
  type: 'Inventory' | 'NonInventory' | 'Service' | 'Bundle' | 'Group';
  unitPrice?: number;
  purchaseCost?: number;
  qtyOnHand?: number;
  description?: string;
  purchaseDesc?: string;
  taxable?: boolean;
  salesTaxIncluded?: boolean;
  purchaseTaxIncluded?: boolean;
  incomeAccountRef?: EntityRef;
  expenseAccountRef?: EntityRef;
  assetAccountRef?: EntityRef;
  prefVendorRef?: EntityRef;
  reorderPoint?: number;
  qtyOnPurchaseOrder?: number;
  qtyOnSalesOrder?: number;
  syncToken?: string;
  metaData?: MetaData;
}

// ============================================================================
// ACCOUNT TYPES
// ============================================================================

export interface Account {
  id?: string;
  name: string;
  accountType: AccountType;
  accountSubType?: string;
  acctNum?: string;
  description?: string;
  active?: boolean;
  classification?: 'Asset' | 'Equity' | 'Expense' | 'Liability' | 'Revenue';
  currentBalance?: number;
  currentBalanceWithSubAccounts?: number;
  currencyRef?: CurrencyRef;
  parentRef?: EntityRef;
  subAccount?: boolean;
  syncToken?: string;
  metaData?: MetaData;
}

export type AccountType =
  | 'Bank' | 'Accounts Receivable' | 'Other Current Asset' | 'Fixed Asset' | 'Other Asset'
  | 'Accounts Payable' | 'Credit Card' | 'Other Current Liability' | 'Long Term Liability'
  | 'Equity' | 'Income' | 'Cost of Goods Sold' | 'Expense' | 'Other Income' | 'Other Expense';

// ============================================================================
// VENDOR TYPES
// ============================================================================

export interface Vendor {
  id?: string;
  displayName: string;
  givenName?: string;
  familyName?: string;
  companyName?: string;
  printOnCheckName?: string;
  active?: boolean;
  email?: string;
  phone?: string;
  mobile?: string;
  fax?: string;
  website?: string;
  billAddr?: Address;
  shipAddr?: Address;
  taxIdentifier?: string;
  acctNum?: string;
  vendor1099?: boolean;
  currencyRef?: CurrencyRef;
  balance?: number;
  syncToken?: string;
  metaData?: MetaData;
}

// ============================================================================
// EMPLOYEE TYPES
// ============================================================================

export interface Employee {
  id?: string;
  displayName?: string;
  givenName?: string;
  middleName?: string;
  familyName?: string;
  suffix?: string;
  printOnCheckName?: string;
  active?: boolean;
  primaryPhone?: string;
  mobile?: string;
  primaryEmailAddr?: EmailAddress;
  employeeNumber?: string;
  ssn?: string;
  primaryAddr?: Address;
  billableTime?: boolean;
  billRate?: number;
  birthDate?: string;
  gender?: 'Male' | 'Female';
  hiredDate?: string;
  releasedDate?: string;
  syncToken?: string;
  metaData?: MetaData;
}

// ============================================================================
// JOURNAL ENTRY TYPES
// ============================================================================

export interface JournalEntry {
  id?: string;
  docNumber?: string;
  txnDate: string;
  currencyRef?: CurrencyRef;
  exchangeRate?: number;
  privateNote?: string;
  line: JournalEntryLine[];
  txnTaxDetail?: TxnTaxDetail;
  totalAmt?: number;
  adjustment?: boolean;
  syncToken?: string;
  metaData?: MetaData;
}

export interface JournalEntryLine {
  id?: string;
  description?: string;
  amount: number;
  detailType: 'JournalEntryLineDetail';
  journalEntryLineDetail: JournalEntryLineDetail;
}

export interface JournalEntryLineDetail {
  postingType: 'Debit' | 'Credit';
  accountRef: EntityRef;
  entity?: Entity;
  classRef?: EntityRef;
  departmentRef?: EntityRef;
  taxCodeRef?: EntityRef;
  taxRateRef?: EntityRef;
  taxAmount?: number;
  billableStatus?: 'Billable' | 'NotBillable' | 'HasBeenBilled';
}

// ============================================================================
// REPORT TYPES
// ============================================================================

export interface Report {
  header: ReportHeader;
  columns: ReportColumn[];
  rows: ReportRow[];
}

export interface ReportHeader {
  reportName: string;
  reportBasis?: 'Accrual' | 'Cash';
  startPeriod?: string;
  endPeriod?: string;
  summarizeColumnsBy?: string;
  currency?: string;
  customer?: string;
  vendor?: string;
  employee?: string;
  item?: string;
  class?: string;
  department?: string;
  reportDate?: string;
  option?: ReportOption[];
}

export interface ReportColumn {
  colTitle?: string;
  colType?: string;
  metaData?: ReportColumnMetaData[];
}

export interface ReportRow {
  type?: 'Section' | 'Data' | 'Total';
  group?: string;
  summary?: boolean;
  colData?: ReportCell[];
  rows?: ReportRow[];
}

export interface ReportCell {
  value?: string;
  id?: string;
  href?: string;
}

export interface ReportOption {
  name?: string;
  value?: string;
}

export interface ReportColumnMetaData {
  name?: string;
  value?: string;
}

// ============================================================================
// QUERY & BATCH TYPES
// ============================================================================

export interface QueryFilter {
  field: string;
  operator: '=' | '!=' | '<' | '>' | '<=' | '>=' | 'IN' | 'LIKE';
  value: any;
}

export interface QueryOptions {
  select?: string[];
  where?: QueryFilter[];
  orderBy?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
  limit?: number;
  offset?: number;
}

export interface BatchOperation {
  bId: string;
  operation: 'create' | 'update' | 'delete' | 'query';
  entity: string;
  data?: any;
  query?: string;
}

// ============================================================================
// WEBHOOK & SYNC TYPES
// ============================================================================

export interface WebhookConfig {
  id?: string;
  name: string;
  entityType: string;
  eventTypes: string[];
  webhookUri: string;
  isActive: boolean;
  realm?: string;
}

export interface SyncStatus {
  entity: string;
  lastSyncTime?: Date;
  syncDirection: 'one-way' | 'two-way';
  recordsProcessed: number;
  recordsFailed: number;
  errors: QuickBooksError[];
  status: 'idle' | 'syncing' | 'completed' | 'failed';
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface QuickBooksConfig {
  auth: QuickBooksAuth;
  syncEnabled: boolean;
  syncInterval: number;
  webhooksEnabled: boolean;
  batchSize: number;
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
  entities: {
    customers: boolean;
    invoices: boolean;
    payments: boolean;
    bills: boolean;
    expenses: boolean;
    items: boolean;
    accounts: boolean;
    vendors: boolean;
    employees: boolean;
    journalEntries: boolean;
  };
}

export interface IntegrationStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastError?: QuickBooksError;
  syncStats: Map<string, SyncStatus>;
  webhookStats: {
    received: number;
    processed: number;
    failed: number;
  };
}
