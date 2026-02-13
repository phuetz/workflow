/**
 * KYC/AML Engine
 * Know Your Customer and Anti-Money Laundering compliance
 */

import { logger } from '../../services/SimpleLogger';
import type {
  KYCVerification,
  KYCDocument,
  KYCCheck,
  AMLScreening,
  AMLMatch,
  SuspiciousActivityReport,
  TransactionMonitoring,
  MonitoringAlert,
} from './types/finance';

export interface KYCAMLConfig {
  sanctionsLists: string[]; // OFAC, EU, UN, etc.
  pepLists: string[]; // PEP databases
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
  };
  autoApproveThreshold: number;
  enhancedDueDiligenceCountries?: string[];
}

export class KYCAMLEngine {
  private config: KYCAMLConfig;
  private verifications: Map<string, KYCVerification> = new Map();
  private screenings: Map<string, AMLScreening> = new Map();
  private sars: Map<string, SuspiciousActivityReport> = new Map();

  // Sanction lists (mock data - in production, load from actual lists)
  private sanctionedEntities: Set<string> = new Set([
    'SANCTIONED PERSON',
    'BLOCKED ENTITY',
    'TERRORIST ORGANIZATION',
  ]);

  private pepEntities: Set<string> = new Set([
    'POLITICALLY EXPOSED PERSON',
    'GOVERNMENT OFFICIAL',
  ]);

  constructor(config: KYCAMLConfig) {
    this.config = config;
  }

  /**
   * Perform KYC verification
   */
  async performKYC(
    customerId: string,
    customerData: any,
    documents: KYCDocument[]
  ): Promise<KYCVerification> {
    const checks: KYCCheck[] = [];

    // Identity verification
    const identityCheck = await this.verifyIdentity(customerData, documents);
    checks.push(identityCheck);

    // Address verification
    const addressCheck = await this.verifyAddress(customerData, documents);
    checks.push(addressCheck);

    // Sanctions screening
    const sanctionsCheck = await this.screenSanctions(customerData);
    checks.push(sanctionsCheck);

    // PEP screening
    const pepCheck = await this.screenPEP(customerData);
    checks.push(pepCheck);

    // Adverse media screening
    const mediaCheck = await this.screenAdverseMedia(customerData);
    checks.push(mediaCheck);

    // Calculate risk score
    const riskScore = this.calculateRiskScore(checks, customerData);
    const riskLevel = this.getRiskLevel(riskScore);

    // Determine verification level needed
    const level = this.determineVerificationLevel(riskLevel, customerData);

    // Determine status
    const status = this.determineKYCStatus(checks, riskScore);

    const verification: KYCVerification = {
      customerId,
      verificationType: customerData.type || 'individual',
      status,
      level,
      documents,
      checks,
      riskScore,
      riskLevel,
      completedDate: status === 'approved' ? new Date() : undefined,
    };

    this.verifications.set(customerId, verification);

    return verification;
  }

  /**
   * Verify identity documents
   */
  private async verifyIdentity(customerData: any, documents: KYCDocument[]): Promise<KYCCheck> {
    const idDocs = documents.filter(d =>
      ['passport', 'drivers_license', 'national_id'].includes(d.type)
    );

    if (idDocs.length === 0) {
      return {
        checkType: 'identity',
        status: 'fail',
        details: { reason: 'No identity documents provided' },
        timestamp: new Date(),
      };
    }

    // Check document validity
    const now = new Date();
    const validDocs = idDocs.filter(d => !d.expiryDate || d.expiryDate > now);

    if (validDocs.length === 0) {
      return {
        checkType: 'identity',
        status: 'fail',
        details: { reason: 'All identity documents are expired' },
        timestamp: new Date(),
      };
    }

    // In production, integrate with identity verification services
    // For now, assume documents are valid
    return {
      checkType: 'identity',
      provider: 'Mock Identity Service',
      status: 'pass',
      details: {
        documentsVerified: validDocs.length,
        documentTypes: validDocs.map(d => d.type),
      },
      timestamp: new Date(),
    };
  }

  /**
   * Verify address
   */
  private async verifyAddress(customerData: any, documents: KYCDocument[]): Promise<KYCCheck> {
    const addressDocs = documents.filter(d =>
      ['utility_bill', 'bank_statement'].includes(d.type)
    );

    if (addressDocs.length === 0) {
      return {
        checkType: 'address',
        status: 'warning',
        details: { reason: 'No address documents provided' },
        timestamp: new Date(),
      };
    }

    // Check if documents are recent (within 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentDocs = addressDocs.filter(
      d => d.issueDate && d.issueDate >= threeMonthsAgo
    );

    if (recentDocs.length === 0) {
      return {
        checkType: 'address',
        status: 'warning',
        details: { reason: 'Address documents are older than 3 months' },
        timestamp: new Date(),
      };
    }

    return {
      checkType: 'address',
      provider: 'Mock Address Service',
      status: 'pass',
      details: {
        documentsVerified: recentDocs.length,
        address: customerData.address,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Screen against sanctions lists
   */
  private async screenSanctions(customerData: any): Promise<KYCCheck> {
    const name = (customerData.name || '').toUpperCase();

    // Simple fuzzy match (in production, use sophisticated name matching)
    const matches = Array.from(this.sanctionedEntities).filter(entity => {
      return this.fuzzyMatch(name, entity) > 0.8;
    });

    if (matches.length > 0) {
      return {
        checkType: 'sanctions',
        provider: 'OFAC/EU/UN Lists',
        status: 'fail',
        details: {
          matches,
          lists: this.config.sanctionsLists,
        },
        timestamp: new Date(),
      };
    }

    return {
      checkType: 'sanctions',
      provider: 'OFAC/EU/UN Lists',
      status: 'pass',
      details: {
        listsScreened: this.config.sanctionsLists,
        noMatches: true,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Screen for Politically Exposed Persons
   */
  private async screenPEP(customerData: any): Promise<KYCCheck> {
    const name = (customerData.name || '').toUpperCase();

    const matches = Array.from(this.pepEntities).filter(entity => {
      return this.fuzzyMatch(name, entity) > 0.8;
    });

    if (matches.length > 0) {
      return {
        checkType: 'pep',
        provider: 'PEP Database',
        status: 'warning',
        details: {
          matches,
          requiresEDD: true,
        },
        timestamp: new Date(),
      };
    }

    return {
      checkType: 'pep',
      provider: 'PEP Database',
      status: 'pass',
      details: { noMatches: true },
      timestamp: new Date(),
    };
  }

  /**
   * Screen for adverse media
   */
  private async screenAdverseMedia(customerData: any): Promise<KYCCheck> {
    // In production, integrate with adverse media screening services
    // For now, return pass
    return {
      checkType: 'adverse_media',
      provider: 'Media Screening Service',
      status: 'pass',
      details: { noAdverseMedia: true },
      timestamp: new Date(),
    };
  }

  /**
   * Calculate overall risk score (0-100)
   */
  private calculateRiskScore(checks: KYCCheck[], customerData: any): number {
    let score = 0;

    // Check failures add to risk
    for (const check of checks) {
      if (check.status === 'fail') {
        score += 40;
      } else if (check.status === 'warning') {
        score += 20;
      }
    }

    // Country risk
    if (
      this.config.enhancedDueDiligenceCountries?.includes(customerData.country)
    ) {
      score += 15;
    }

    // Industry risk (for businesses)
    const highRiskIndustries = ['crypto', 'gambling', 'cannabis', 'money_services'];
    if (highRiskIndustries.includes(customerData.industry)) {
      score += 10;
    }

    // Transaction volume (for existing customers)
    if (customerData.monthlyVolume > 100000) {
      score += 5;
    }

    return Math.min(100, score);
  }

  /**
   * Get risk level from score
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  /**
   * Determine verification level needed
   */
  private determineVerificationLevel(
    riskLevel: string,
    customerData: any
  ): KYCVerification['level'] {
    if (riskLevel === 'critical' || riskLevel === 'high') {
      return 'edd'; // Enhanced Due Diligence
    }

    if (riskLevel === 'medium') {
      return 'cdd'; // Customer Due Diligence
    }

    if (customerData.type === 'business') {
      return 'enhanced';
    }

    return 'basic';
  }

  /**
   * Determine KYC status
   */
  private determineKYCStatus(
    checks: KYCCheck[],
    riskScore: number
  ): KYCVerification['status'] {
    // Auto-reject if sanctions fail
    if (checks.some(c => c.checkType === 'sanctions' && c.status === 'fail')) {
      return 'rejected';
    }

    // Auto-approve if low risk and all checks pass
    if (
      riskScore < this.config.autoApproveThreshold &&
      checks.every(c => c.status === 'pass')
    ) {
      return 'approved';
    }

    // Needs review otherwise
    if (checks.some(c => c.status === 'fail')) {
      return 'needs_review';
    }

    return 'pending';
  }

  /**
   * Perform comprehensive AML screening
   */
  async performAMLScreening(customerId: string, customerData: any): Promise<AMLScreening> {
    const matches: AMLMatch[] = [];

    // Screen against sanctions lists
    const sanctionsMatches = await this.findSanctionsMatches(customerData);
    matches.push(...sanctionsMatches);

    // Screen against PEP lists
    const pepMatches = await this.findPEPMatches(customerData);
    matches.push(...pepMatches);

    const overallStatus =
      matches.some(m => m.matchType === 'exact') ? 'confirmed_match'
        : matches.length > 0 ? 'potential_match'
          : 'clear';

    const screening: AMLScreening = {
      customerId,
      screeningType: 'sanctions',
      lists: [...this.config.sanctionsLists, ...this.config.pepLists],
      matches,
      overallStatus,
      screenedDate: new Date(),
    };

    this.screenings.set(customerId, screening);

    return screening;
  }

  /**
   * Find sanctions matches
   */
  private async findSanctionsMatches(customerData: any): Promise<AMLMatch[]> {
    const matches: AMLMatch[] = [];
    const name = (customerData.name || '').toUpperCase();

    for (const entity of this.sanctionedEntities) {
      const confidence = this.fuzzyMatch(name, entity) * 100;

      if (confidence > 70) {
        matches.push({
          matchType: confidence > 95 ? 'exact' : 'fuzzy',
          confidence,
          list: 'OFAC SDN',
          listType: 'sanctions',
          name: entity,
          status: 'active',
          source: 'US Treasury OFAC',
        });
      }
    }

    return matches;
  }

  /**
   * Find PEP matches
   */
  private async findPEPMatches(customerData: any): Promise<AMLMatch[]> {
    const matches: AMLMatch[] = [];
    const name = (customerData.name || '').toUpperCase();

    for (const entity of this.pepEntities) {
      const confidence = this.fuzzyMatch(name, entity) * 100;

      if (confidence > 70) {
        matches.push({
          matchType: confidence > 95 ? 'exact' : 'fuzzy',
          confidence,
          list: 'PEP Database',
          listType: 'pep',
          name: entity,
          status: 'active',
          source: 'World-Check',
        });
      }
    }

    return matches;
  }

  /**
   * Fuzzy name matching (Jaro-Winkler similarity)
   */
  private fuzzyMatch(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0 || len2 === 0) return 0;

    const matchWindow = Math.max(Math.floor(Math.max(len1, len2) / 2) - 1, 0);

    const matches1 = new Array(len1).fill(false);
    const matches2 = new Array(len2).fill(false);

    let matches = 0;
    let transpositions = 0;

    // Find matches
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, len2);

      for (let j = start; j < end; j++) {
        if (matches2[j] || str1[i] !== str2[j]) continue;
        matches1[i] = matches2[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0;

    // Count transpositions
    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (!matches1[i]) continue;
      while (!matches2[k]) k++;
      if (str1[i] !== str2[k]) transpositions++;
      k++;
    }

    return (
      (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3
    );
  }

  /**
   * Monitor transaction for suspicious activity
   */
  async monitorTransaction(transaction: any): Promise<TransactionMonitoring> {
    const alerts: MonitoringAlert[] = [];

    // Large transaction alert
    if (transaction.amount > 10000) {
      alerts.push({
        alertType: 'large_transaction',
        severity: 'warning',
        description: 'Transaction exceeds $10,000 threshold',
        rule: 'LARGE_TRANSACTION',
        threshold: 10000,
        actualValue: transaction.amount,
        timestamp: new Date(),
      });
    }

    // Rapid succession alert
    if (transaction.metadata?.recentTransactionCount > 5) {
      alerts.push({
        alertType: 'rapid_succession',
        severity: 'warning',
        description: 'Multiple transactions in short time period',
        rule: 'RAPID_SUCCESSION',
        threshold: 5,
        actualValue: transaction.metadata.recentTransactionCount,
        timestamp: new Date(),
      });
    }

    // Unusual pattern alert
    if (transaction.amount > transaction.metadata?.averageAmount * 5) {
      alerts.push({
        alertType: 'unusual_pattern',
        severity: 'critical',
        description: 'Transaction amount significantly exceeds average',
        rule: 'UNUSUAL_PATTERN',
        threshold: transaction.metadata?.averageAmount * 5,
        actualValue: transaction.amount,
        timestamp: new Date(),
      });
    }

    // High-risk country alert
    if (
      this.config.enhancedDueDiligenceCountries?.includes(transaction.destinationCountry)
    ) {
      alerts.push({
        alertType: 'high_risk_country',
        severity: 'warning',
        description: 'Transaction to high-risk jurisdiction',
        rule: 'HIGH_RISK_COUNTRY',
        timestamp: new Date(),
      });
    }

    // Calculate risk score
    const riskScore = alerts.reduce((sum, alert) => {
      return sum + (alert.severity === 'critical' ? 30 : alert.severity === 'warning' ? 15 : 5);
    }, 0);

    const riskLevel = this.getRiskLevel(riskScore);

    // Determine status
    let status: TransactionMonitoring['status'] = 'cleared';
    if (riskScore > 70) {
      status = 'blocked';
    } else if (riskScore > 40) {
      status = 'under_review';
    } else if (alerts.length > 0) {
      status = 'flagged';
    }

    return {
      transactionId: transaction.id,
      customerId: transaction.customerId,
      amount: transaction.amount,
      currency: transaction.currency,
      type: transaction.type,
      timestamp: new Date(transaction.timestamp),
      riskScore,
      riskLevel,
      alerts,
      rules: alerts.map(a => a.rule),
      status,
    };
  }

  /**
   * File Suspicious Activity Report
   */
  async fileSAR(data: Omit<SuspiciousActivityReport, 'id' | 'filedDate'>): Promise<string> {
    const id = `SAR-${Date.now()}`;

    const sar: SuspiciousActivityReport = {
      ...data,
      id,
      filedDate: data.status === 'submitted' ? new Date() : undefined,
    };

    this.sars.set(id, sar);

    // In production, submit to FinCEN or appropriate regulatory body
    logger.debug('[SAR Filed]', sar);

    return id;
  }

  /**
   * Get KYC verification
   */
  getKYCVerification(customerId: string): KYCVerification | undefined {
    return this.verifications.get(customerId);
  }

  /**
   * Get AML screening
   */
  getAMLScreening(customerId: string): AMLScreening | undefined {
    return this.screenings.get(customerId);
  }

  /**
   * Get all SARs
   */
  getSARs(): SuspiciousActivityReport[] {
    return Array.from(this.sars.values());
  }
}

export default KYCAMLEngine;
