/**
 * Finance Type Definitions
 * Supports ISO 20022, SWIFT, KYC/AML, and payment processing
 */

// ISO 20022 Message Types
export type ISO20022MessageType =
  | 'pacs.008' // Payment Initiation
  | 'pacs.002' // Payment Status Report
  | 'pain.001' // Customer Credit Transfer Initiation
  | 'pain.002' // Customer Payment Status Report
  | 'camt.053' // Bank to Customer Statement
  | 'camt.054' // Bank to Customer Debit/Credit Notification
  | 'acmt.023' // Identification Modification Advice
  | 'acmt.024' // Identification Verification Request
  | 'remt.001'; // Remittance Advice

export interface ISO20022Message {
  messageType: ISO20022MessageType;
  messageId: string;
  creationDateTime: Date;
  numberOfTransactions?: number;
  controlSum?: number;
  initiatingParty?: ISO20022Party;
  xml: string;
  parsed: any;
}

export interface ISO20022Party {
  name: string;
  identification?: {
    organisationId?: string;
    personId?: string;
    lei?: string; // Legal Entity Identifier
    bic?: string; // Business Identifier Code
  };
  postalAddress?: {
    addressType?: string;
    streetName?: string;
    buildingNumber?: string;
    postCode?: string;
    townName?: string;
    countrySubDivision?: string;
    country?: string;
  };
  contactDetails?: {
    name?: string;
    phoneNumber?: string;
    emailAddress?: string;
  };
}

export interface ISO20022Account {
  identification: {
    iban?: string;
    other?: {
      identification: string;
      schemeName?: string;
    };
  };
  type?: 'CACC' | 'CASH' | 'CHAR' | 'CISH' | 'COMM' | 'LOAN' | 'MGLD' | 'MOMA' | 'NREX' | 'ODFT' | 'ONDP' | 'SACC' | 'SVGS' | 'TAXE' | 'TRAN';
  currency?: string;
  name?: string;
  owner?: ISO20022Party;
}

export interface ISO20022Payment {
  paymentId: string;
  instructionId?: string;
  endToEndId: string;
  amount: {
    currency: string;
    value: number;
  };
  debtor?: ISO20022Party;
  debtorAccount?: ISO20022Account;
  debtorAgent?: ISO20022FinancialInstitution;
  creditor?: ISO20022Party;
  creditorAccount?: ISO20022Account;
  creditorAgent?: ISO20022FinancialInstitution;
  remittanceInformation?: {
    unstructured?: string[];
    structured?: any;
  };
  purpose?: string;
  chargeBearer?: 'DEBT' | 'CRED' | 'SHAR' | 'SLEV';
  requestedExecutionDate?: Date;
}

export interface ISO20022FinancialInstitution {
  bic?: string;
  lei?: string;
  name?: string;
  clearingSystemMemberId?: {
    memberId: string;
    clearingSystemId?: string;
  };
  postalAddress?: ISO20022Party['postalAddress'];
}

// SWIFT Message Types
export type SWIFTMessageType =
  | 'MT103' // Single Customer Credit Transfer
  | 'MT202' // General Financial Institution Transfer
  | 'MT940' // Customer Statement Message
  | 'MT950' // Statement Message
  | 'MT101' // Request for Transfer
  | 'MT199' // Free Format Message
  | 'MT210' // Notice to Receive
  | 'MT900' // Confirmation of Debit
  | 'MT910' // Confirmation of Credit
  | 'MX' // ISO 20022 XML format
  ;

export interface SWIFTMessage {
  messageType: SWIFTMessageType;
  sender: string; // BIC
  receiver: string; // BIC
  messageReference: string;
  timestamp: Date;
  priority?: 'U' | 'N' | 'S'; // Urgent, Normal, System
  blocks: SWIFTBlock[];
  raw: string;
}

export interface SWIFTBlock {
  blockId: string;
  content: string;
  fields?: SWIFTField[];
}

export interface SWIFTField {
  tag: string;
  value: string;
  name?: string;
}

export interface SWIFTMT103 {
  messageType: 'MT103';
  senderReference: string; // Field 20
  timeIndication?: string; // Field 13C
  bankOperationCode?: string; // Field 23B
  instructionCode?: string; // Field 23E
  transactionTypeCode?: string; // Field 26T
  valueDate: Date; // Field 32A
  currency: string;
  amount: number;
  orderingCustomer: {
    account?: string;
    name: string;
    address?: string[];
  }; // Field 50
  sendingInstitution?: string; // Field 51A
  orderingInstitution?: string; // Field 52A
  sendersCorrespondent?: string; // Field 53A
  receiversCorrespondent?: string; // Field 54A
  intermediaryInstitution?: string; // Field 56A
  accountWithInstitution: string; // Field 57A
  beneficiaryCustomer: {
    account?: string;
    name: string;
    address?: string[];
  }; // Field 59
  remittanceInformation?: string; // Field 70
  detailsOfCharges?: 'OUR' | 'BEN' | 'SHA'; // Field 71A
  senderToReceiverInfo?: string; // Field 72
}

// KYC/AML Types
export interface KYCVerification {
  customerId: string;
  verificationType: 'individual' | 'business';
  status: 'pending' | 'approved' | 'rejected' | 'needs_review';
  level: 'basic' | 'enhanced' | 'cdd' | 'edd'; // CDD = Customer Due Diligence, EDD = Enhanced Due Diligence
  documents: KYCDocument[];
  checks: KYCCheck[];
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  completedDate?: Date;
  expiryDate?: Date;
  reviewedBy?: string;
  notes?: string;
}

export interface KYCDocument {
  type: 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'bank_statement' | 'articles_of_incorporation' | 'business_license' | 'other';
  number?: string;
  issuingCountry?: string;
  issueDate?: Date;
  expiryDate?: Date;
  fileUrl?: string;
  verified: boolean;
  verifiedDate?: Date;
  verifiedBy?: string;
}

export interface KYCCheck {
  checkType: 'identity' | 'address' | 'sanctions' | 'pep' | 'adverse_media' | 'credit' | 'business_registry';
  provider?: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  details?: any;
  timestamp: Date;
}

export interface AMLScreening {
  customerId: string;
  screeningType: 'sanctions' | 'pep' | 'adverse_media' | 'watchlist';
  lists: string[]; // OFAC, EU, UN, etc.
  matches: AMLMatch[];
  overallStatus: 'clear' | 'potential_match' | 'confirmed_match';
  screenedDate: Date;
  screenedBy?: string;
}

export interface AMLMatch {
  matchType: 'exact' | 'fuzzy' | 'alias';
  confidence: number; // 0-100
  list: string; // Which list (OFAC, EU, UN, etc.)
  listType: 'sanctions' | 'pep' | 'watchlist';
  name: string;
  dateOfBirth?: string;
  nationality?: string;
  identificationNumbers?: string[];
  addresses?: string[];
  additionalInfo?: any;
  status: 'active' | 'removed';
  addedDate?: Date;
  source?: string;
}

export interface SuspiciousActivityReport {
  id: string;
  reportType: 'SAR' | 'STR'; // SAR = Suspicious Activity Report, STR = Suspicious Transaction Report
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'submitted' | 'under_review' | 'closed';
  customerId: string;
  customerName: string;
  transactionIds?: string[];
  suspiciousActivity: {
    type: string[];
    description: string;
    amount?: number;
    currency?: string;
    dates?: Date[];
  };
  indicators: string[]; // Red flags
  investigationNotes?: string;
  filedDate?: Date;
  filedBy?: string;
  regulatoryBody?: string; // FinCEN, FCA, etc.
  caseNumber?: string;
}

export interface TransactionMonitoring {
  transactionId: string;
  customerId: string;
  amount: number;
  currency: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'payment';
  timestamp: Date;
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  alerts: MonitoringAlert[];
  rules: string[]; // Which rules were triggered
  status: 'cleared' | 'flagged' | 'blocked' | 'under_review';
}

export interface MonitoringAlert {
  alertType: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  rule: string;
  threshold?: number;
  actualValue?: number;
  timestamp: Date;
}

// Payment Processing
export type PaymentMethod = 'ach' | 'wire' | 'sepa' | 'card' | 'check' | 'cash';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'reversed';

export interface Payment {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: string;
  sender: {
    customerId: string;
    accountNumber?: string;
    name: string;
  };
  receiver: {
    customerId?: string;
    accountNumber?: string;
    name: string;
    bankCode?: string;
  };
  description?: string;
  reference?: string;
  initiatedDate: Date;
  processedDate?: Date;
  settledDate?: Date;
  failureReason?: string;
  fees?: {
    amount: number;
    currency: string;
    type: string;
  }[];
}

export interface ACHTransaction {
  id: string;
  type: 'debit' | 'credit';
  secCode: 'PPD' | 'CCD' | 'WEB' | 'TEL' | 'POP' | 'ARC' | 'BOC' | 'RCK'; // Standard Entry Class
  amount: number;
  effectiveDate: Date;
  originatorInfo: {
    name: string;
    identification: string;
    routingNumber: string;
    accountNumber: string;
  };
  receiverInfo: {
    name: string;
    identification: string;
    routingNumber: string;
    accountNumber: string;
  };
  traceNumber?: string;
  status: PaymentStatus;
  returnCode?: string;
  addenda?: string;
}

export interface WireTransfer {
  id: string;
  type: 'domestic' | 'international';
  amount: number;
  currency: string;
  valueDate: Date;
  sender: {
    name: string;
    accountNumber: string;
    bankName: string;
    bankCode: string; // ABA routing (US) or SWIFT BIC
    address?: string;
  };
  receiver: {
    name: string;
    accountNumber: string;
    bankName: string;
    bankCode: string;
    address?: string;
  };
  intermediaryBanks?: {
    name: string;
    bankCode: string;
  }[];
  purpose?: string;
  reference?: string;
  charges: 'OUR' | 'BEN' | 'SHA'; // Who pays fees
  status: PaymentStatus;
  fedReference?: string; // Fedwire reference
}

export interface SEPATransaction {
  id: string;
  type: 'SCT' | 'SDD' | 'INST'; // SEPA Credit Transfer, SEPA Direct Debit, Instant
  scheme: 'CORE' | 'B2B' | 'COR1';
  amount: number;
  currency: 'EUR';
  debtor: {
    name: string;
    iban: string;
    bic?: string;
  };
  creditor: {
    name: string;
    iban: string;
    bic?: string;
  };
  mandateId?: string; // For direct debits
  mandateDate?: Date;
  endToEndId: string;
  remittanceInfo?: string;
  executionDate: Date;
  status: PaymentStatus;
}

// Fraud Detection
export interface FraudCheck {
  transactionId: string;
  timestamp: Date;
  riskScore: number; // 0-100
  decision: 'approve' | 'review' | 'decline';
  factors: FraudFactor[];
  deviceFingerprint?: string;
  ipAddress?: string;
  geolocation?: {
    country: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  velocityChecks?: {
    last1Hour: number;
    last24Hours: number;
    last7Days: number;
  };
}

export interface FraudFactor {
  name: string;
  score: number; // Contribution to overall risk score
  severity: 'low' | 'medium' | 'high';
  description: string;
}

// Reconciliation
export interface ReconciliationJob {
  id: string;
  type: 'bank' | 'merchant' | 'internal';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startDate: Date;
  endDate: Date;
  source1: {
    type: string;
    count: number;
    totalAmount: number;
  };
  source2: {
    type: string;
    count: number;
    totalAmount: number;
  };
  matches: number;
  mismatches: ReconciliationMismatch[];
  completedDate?: Date;
}

export interface ReconciliationMismatch {
  type: 'missing' | 'duplicate' | 'amount_mismatch' | 'date_mismatch';
  severity: 'low' | 'medium' | 'high';
  source1Record?: any;
  source2Record?: any;
  difference?: number;
  description: string;
}
