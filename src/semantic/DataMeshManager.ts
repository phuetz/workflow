/**
 * Data Mesh Manager - Domain-oriented data ownership
 *
 * Implements data mesh architecture principles:
 * - Domain-oriented decentralized data ownership
 * - Data as a product
 * - Self-serve data infrastructure
 * - Federated computational governance
 *
 * @module semantic/DataMeshManager
 */

import {
  DataDomain,
  DataProduct,
  DataAPI,
  ServiceLevelAgreement,
  Team,
  TeamMember,
  DomainStatus,
  QualityGuarantee,
  DataPolicy,
  PolicyRule,
  RateLimit,
  APIExample,
  ChangelogEntry
} from './types/semantic';

/**
 * DataMeshManager orchestrates data mesh architecture
 */
export class DataMeshManager {
  private domains: Map<string, DataDomain> = new Map();
  private dataProducts: Map<string, DataProduct> = new Map();
  private policies: Map<string, DataPolicy> = new Map();
  private slaMonitor: SLAMonitor = new SLAMonitor();

  constructor() {
    this.initializeDefaultDomains();
  }

  // ============================================================================
  // DOMAIN MANAGEMENT
  // ============================================================================

  /**
   * Register a new data domain
   */
  async registerDomain(domain: DataDomain): Promise<void> {
    this.validateDomain(domain);

    // Set defaults
    if (!domain.status) {
      domain.status = DomainStatus.ACTIVE;
    }

    if (!domain.createdAt) {
      domain.createdAt = new Date();
    }

    domain.updatedAt = new Date();

    // Store domain
    this.domains.set(domain.id, domain);

    // Register domain's data products
    for (const product of domain.dataProducts) {
      await this.registerDataProduct(domain.id, product);
    }

    // Set up SLA monitoring
    this.slaMonitor.monitorDomain(domain.id, domain.sla);
  }

  /**
   * Get domain by ID
   */
  getDomain(id: string): DataDomain | undefined {
    return this.domains.get(id);
  }

  /**
   * Get all domains
   */
  getAllDomains(): DataDomain[] {
    return Array.from(this.domains.values());
  }

  /**
   * Get active domains
   */
  getActiveDomains(): DataDomain[] {
    return this.getAllDomains().filter(d => d.status === DomainStatus.ACTIVE);
  }

  /**
   * Update domain
   */
  async updateDomain(id: string, updates: Partial<DataDomain>): Promise<void> {
    const domain = this.domains.get(id);
    if (!domain) {
      throw new Error(`Domain not found: ${id}`);
    }

    const updated = { ...domain, ...updates, updatedAt: new Date() };
    this.domains.set(id, updated);

    // Update SLA monitoring if SLA changed
    if (updates.sla) {
      this.slaMonitor.updateDomain(id, updates.sla);
    }
  }

  /**
   * Deprecate domain
   */
  async deprecateDomain(id: string, reason: string): Promise<void> {
    const domain = this.domains.get(id);
    if (!domain) {
      throw new Error(`Domain not found: ${id}`);
    }

    domain.status = DomainStatus.DEPRECATED;
    domain.updatedAt = new Date();

    // Deprecate all data products
    for (const product of domain.dataProducts) {
      if (product.status !== 'deprecated') {
        product.status = 'deprecated';
        product.changelog.push({
          version: product.version,
          date: new Date(),
          changes: [`Domain deprecated: ${reason}`],
          breaking: true
        });
      }
    }

    this.domains.set(id, domain);
  }

  /**
   * Validate domain definition
   */
  private validateDomain(domain: DataDomain): void {
    if (!domain.id || !domain.name) {
      throw new Error('Domain must have id and name');
    }

    if (!domain.owner || !domain.owner.id) {
      throw new Error('Domain must have an owner');
    }

    if (!domain.sla) {
      throw new Error('Domain must have SLA definition');
    }

    this.validateSLA(domain.sla);
  }

  /**
   * Validate SLA definition
   */
  private validateSLA(sla: ServiceLevelAgreement): void {
    if (sla.availability < 0 || sla.availability > 1) {
      throw new Error('Availability must be between 0 and 1');
    }

    if (sla.latencyP50 < 0 || sla.latencyP95 < 0 || sla.latencyP99 < 0) {
      throw new Error('Latency values must be non-negative');
    }

    if (sla.errorRate < 0 || sla.errorRate > 1) {
      throw new Error('Error rate must be between 0 and 1');
    }
  }

  // ============================================================================
  // DATA PRODUCT MANAGEMENT
  // ============================================================================

  /**
   * Register a new data product
   */
  async registerDataProduct(domainId: string, product: DataProduct): Promise<void> {
    const domain = this.domains.get(domainId);
    if (!domain) {
      throw new Error(`Domain not found: ${domainId}`);
    }

    this.validateDataProduct(product);

    // Set defaults
    if (!product.status) {
      product.status = 'production';
    }

    if (!product.version) {
      product.version = '1.0.0';
    }

    if (!product.changelog) {
      product.changelog = [];
    }

    // Store product
    this.dataProducts.set(product.id, product);

    // Set up SLA monitoring
    this.slaMonitor.monitorProduct(product.id, product.sla);
  }

  /**
   * Get data product by ID
   */
  getDataProduct(id: string): DataProduct | undefined {
    return this.dataProducts.get(id);
  }

  /**
   * Get all data products for a domain
   */
  getDomainProducts(domainId: string): DataProduct[] {
    const domain = this.domains.get(domainId);
    if (!domain) {
      return [];
    }

    return domain.dataProducts;
  }

  /**
   * Update data product
   */
  async updateDataProduct(
    productId: string,
    updates: Partial<DataProduct>,
    changeDescription?: string
  ): Promise<void> {
    const product = this.dataProducts.get(productId);
    if (!product) {
      throw new Error(`Data product not found: ${productId}`);
    }

    // Check if breaking change
    const isBreaking = this.isBreakingChange(product, updates);

    // Increment version if needed
    let newVersion = product.version;
    if (updates.version) {
      newVersion = updates.version;
    } else if (isBreaking) {
      newVersion = this.incrementMajorVersion(product.version);
    } else if (changeDescription) {
      newVersion = this.incrementMinorVersion(product.version);
    }

    // Add changelog entry
    const changelog = [...product.changelog];
    if (changeDescription) {
      changelog.push({
        version: newVersion,
        date: new Date(),
        changes: [changeDescription],
        breaking: isBreaking
      });
    }

    // Update product
    const updated = { ...product, ...updates, version: newVersion, changelog };
    this.dataProducts.set(productId, updated);

    // Update SLA monitoring if SLA changed
    if (updates.sla) {
      this.slaMonitor.updateProduct(productId, updates.sla);
    }
  }

  /**
   * Check if update is a breaking change
   */
  private isBreakingChange(product: DataProduct, updates: Partial<DataProduct>): boolean {
    // Schema changes are breaking
    if (updates.schema && JSON.stringify(updates.schema) !== JSON.stringify(product.schema)) {
      return true;
    }

    // SLA downgrades are breaking
    if (updates.sla && this.isSLADowngrade(product.sla, updates.sla)) {
      return true;
    }

    return false;
  }

  /**
   * Check if SLA is downgraded
   */
  private isSLADowngrade(oldSLA: ServiceLevelAgreement, newSLA: ServiceLevelAgreement): boolean {
    return (
      newSLA.availability < oldSLA.availability ||
      newSLA.latencyP95 > oldSLA.latencyP95 ||
      newSLA.errorRate > oldSLA.errorRate
    );
  }

  /**
   * Increment major version (breaking change)
   */
  private incrementMajorVersion(version: string): string {
    const [major] = version.split('.');
    return `${parseInt(major) + 1}.0.0`;
  }

  /**
   * Increment minor version (non-breaking change)
   */
  private incrementMinorVersion(version: string): string {
    const [major, minor] = version.split('.');
    return `${major}.${parseInt(minor) + 1}.0`;
  }

  /**
   * Validate data product definition
   */
  private validateDataProduct(product: DataProduct): void {
    if (!product.id || !product.name) {
      throw new Error('Data product must have id and name');
    }

    if (!product.datasets || product.datasets.length === 0) {
      throw new Error('Data product must have at least one dataset');
    }

    if (!product.sla) {
      throw new Error('Data product must have SLA definition');
    }

    this.validateSLA(product.sla);
  }

  // ============================================================================
  // POLICY MANAGEMENT
  // ============================================================================

  /**
   * Register a data policy
   */
  registerPolicy(policy: DataPolicy): void {
    this.validatePolicy(policy);
    this.policies.set(policy.id, policy);
  }

  /**
   * Get policy by ID
   */
  getPolicy(id: string): DataPolicy | undefined {
    return this.policies.get(id);
  }

  /**
   * Get all policies
   */
  getAllPolicies(): DataPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get policies for domain
   */
  getDomainPolicies(domainId: string): DataPolicy[] {
    const domain = this.domains.get(domainId);
    if (!domain) {
      return [];
    }

    return domain.policies;
  }

  /**
   * Enforce policies on data access
   */
  async enforcePolicies(
    userId: string,
    domainId: string,
    action: string
  ): Promise<PolicyEnforcementResult> {
    const domain = this.domains.get(domainId);
    if (!domain) {
      return {
        allowed: false,
        reason: 'Domain not found',
        violations: []
      };
    }

    const violations: PolicyViolation[] = [];

    // Check all domain policies
    for (const policy of domain.policies) {
      const result = await this.evaluatePolicy(policy, userId, action);
      if (!result.allowed) {
        violations.push({
          policyId: policy.id,
          policyName: policy.name,
          reason: result.reason
        });
      }
    }

    return {
      allowed: violations.length === 0,
      reason: violations.length > 0 ? 'Policy violations detected' : undefined,
      violations
    };
  }

  /**
   * Evaluate a single policy
   */
  private async evaluatePolicy(
    policy: DataPolicy,
    userId: string,
    action: string
  ): Promise<PolicyEvaluationResult> {
    // Evaluate all rules
    for (const rule of policy.rules) {
      if (!rule.enforced) continue;

      const allowed = await this.evaluateRule(rule, userId, action);
      if (!allowed) {
        return {
          allowed: false,
          reason: `Rule violated: ${rule.action}`
        };
      }
    }

    return {
      allowed: true
    };
  }

  /**
   * Evaluate a single rule
   */
  private async evaluateRule(rule: PolicyRule, userId: string, action: string): Promise<boolean> {
    // Simple rule evaluation
    // In production, this would use a proper policy engine
    return true;
  }

  /**
   * Validate policy definition
   */
  private validatePolicy(policy: DataPolicy): void {
    if (!policy.id || !policy.name) {
      throw new Error('Policy must have id and name');
    }

    if (!policy.rules || policy.rules.length === 0) {
      throw new Error('Policy must have at least one rule');
    }
  }

  // ============================================================================
  // SLA MONITORING
  // ============================================================================

  /**
   * Check SLA compliance for domain
   */
  async checkDomainSLA(domainId: string): Promise<SLAComplianceReport> {
    const domain = this.domains.get(domainId);
    if (!domain) {
      throw new Error(`Domain not found: ${domainId}`);
    }

    return this.slaMonitor.checkCompliance(domainId, domain.sla);
  }

  /**
   * Check SLA compliance for data product
   */
  async checkProductSLA(productId: string): Promise<SLAComplianceReport> {
    const product = this.dataProducts.get(productId);
    if (!product) {
      throw new Error(`Data product not found: ${productId}`);
    }

    return this.slaMonitor.checkCompliance(productId, product.sla);
  }

  /**
   * Get SLA compliance summary
   */
  getSLAComplianceSummary(): SLAComplianceSummary {
    const domains = this.getAllDomains();
    const products = Array.from(this.dataProducts.values());

    let compliantDomains = 0;
    let compliantProducts = 0;

    // This would check actual metrics in production
    compliantDomains = domains.length;
    compliantProducts = products.length;

    return {
      totalDomains: domains.length,
      compliantDomains,
      domainComplianceRate: domains.length > 0 ? compliantDomains / domains.length : 0,
      totalProducts: products.length,
      compliantProducts,
      productComplianceRate: products.length > 0 ? compliantProducts / products.length : 0
    };
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get data mesh statistics
   */
  getStatistics(): DataMeshStatistics {
    const domains = this.getAllDomains();
    const products = Array.from(this.dataProducts.values());

    const domainsByStatus: Record<string, number> = {};
    for (const domain of domains) {
      domainsByStatus[domain.status] = (domainsByStatus[domain.status] || 0) + 1;
    }

    const productsByStatus: Record<string, number> = {};
    for (const product of products) {
      productsByStatus[product.status] = (productsByStatus[product.status] || 0) + 1;
    }

    return {
      totalDomains: domains.length,
      activeDomains: domains.filter(d => d.status === DomainStatus.ACTIVE).length,
      domainsByStatus,
      totalProducts: products.length,
      productionProducts: products.filter(p => p.status === 'production').length,
      productsByStatus,
      totalPolicies: this.policies.size,
      avgProductsPerDomain: domains.length > 0 ? products.length / domains.length : 0
    };
  }

  /**
   * Initialize default domains
   */
  private initializeDefaultDomains(): void {
    // Default domains will be initialized here
  }
}

// ============================================================================
// SLA MONITOR
// ============================================================================

class SLAMonitor {
  private domainMetrics: Map<string, SLAMetrics> = new Map();
  private productMetrics: Map<string, SLAMetrics> = new Map();

  /**
   * Start monitoring domain SLA
   */
  monitorDomain(domainId: string, sla: ServiceLevelAgreement): void {
    this.domainMetrics.set(domainId, {
      sla,
      actualAvailability: 1.0,
      actualLatencyP50: 0,
      actualLatencyP95: 0,
      actualLatencyP99: 0,
      actualErrorRate: 0,
      actualFreshnessMinutes: 0,
      violations: []
    });
  }

  /**
   * Start monitoring product SLA
   */
  monitorProduct(productId: string, sla: ServiceLevelAgreement): void {
    this.productMetrics.set(productId, {
      sla,
      actualAvailability: 1.0,
      actualLatencyP50: 0,
      actualLatencyP95: 0,
      actualLatencyP99: 0,
      actualErrorRate: 0,
      actualFreshnessMinutes: 0,
      violations: []
    });
  }

  /**
   * Update domain SLA
   */
  updateDomain(domainId: string, sla: ServiceLevelAgreement): void {
    const metrics = this.domainMetrics.get(domainId);
    if (metrics) {
      metrics.sla = sla;
    }
  }

  /**
   * Update product SLA
   */
  updateProduct(productId: string, sla: ServiceLevelAgreement): void {
    const metrics = this.productMetrics.get(productId);
    if (metrics) {
      metrics.sla = sla;
    }
  }

  /**
   * Check SLA compliance
   */
  async checkCompliance(id: string, sla: ServiceLevelAgreement): Promise<SLAComplianceReport> {
    const metrics = this.domainMetrics.get(id) || this.productMetrics.get(id);
    if (!metrics) {
      return {
        compliant: false,
        violations: ['No metrics available'],
        metrics: {} as any
      };
    }

    const violations: string[] = [];

    if (metrics.actualAvailability < sla.availability) {
      violations.push(`Availability: ${metrics.actualAvailability} < ${sla.availability}`);
    }

    if (metrics.actualLatencyP95 > sla.latencyP95) {
      violations.push(`Latency P95: ${metrics.actualLatencyP95} > ${sla.latencyP95}`);
    }

    if (metrics.actualErrorRate > sla.errorRate) {
      violations.push(`Error rate: ${metrics.actualErrorRate} > ${sla.errorRate}`);
    }

    return {
      compliant: violations.length === 0,
      violations,
      metrics
    };
  }
}

// ============================================================================
// HELPER TYPES
// ============================================================================

interface SLAMetrics {
  sla: ServiceLevelAgreement;
  actualAvailability: number;
  actualLatencyP50: number;
  actualLatencyP95: number;
  actualLatencyP99: number;
  actualErrorRate: number;
  actualFreshnessMinutes: number;
  violations: string[];
}

interface SLAComplianceReport {
  compliant: boolean;
  violations: string[];
  metrics: SLAMetrics;
}

interface SLAComplianceSummary {
  totalDomains: number;
  compliantDomains: number;
  domainComplianceRate: number;
  totalProducts: number;
  compliantProducts: number;
  productComplianceRate: number;
}

interface PolicyEnforcementResult {
  allowed: boolean;
  reason?: string;
  violations: PolicyViolation[];
}

interface PolicyViolation {
  policyId: string;
  policyName: string;
  reason: string;
}

interface PolicyEvaluationResult {
  allowed: boolean;
  reason?: string;
}

interface DataMeshStatistics {
  totalDomains: number;
  activeDomains: number;
  domainsByStatus: Record<string, number>;
  totalProducts: number;
  productionProducts: number;
  productsByStatus: Record<string, number>;
  totalPolicies: number;
  avgProductsPerDomain: number;
}

// Singleton instance
let meshManagerInstance: DataMeshManager | null = null;

export function getDataMeshManager(): DataMeshManager {
  if (!meshManagerInstance) {
    meshManagerInstance = new DataMeshManager();
  }
  return meshManagerInstance;
}
