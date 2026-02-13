/**
 * FrameworkManager - Framework initialization and control management
 */

import { EventEmitter } from 'events';
import {
  AutomationControl,
  AssessmentType,
  ComplianceFrameworkType,
  ControlMapping,
  ControlStatus,
  RemediationStep,
  UnifiedControl,
  GRCIntegrationConfig,
  GRCPlatform,
  ControlFrequency,
} from './types';

export class FrameworkManager extends EventEmitter {
  private controls: Map<string, AutomationControl>;
  private unifiedControls: Map<string, UnifiedControl>;
  private controlMappings: ControlMapping[];
  private grcIntegrations: Map<GRCPlatform, GRCIntegrationConfig>;

  constructor(
    controls: Map<string, AutomationControl>,
    unifiedControls: Map<string, UnifiedControl>,
    controlMappings: ControlMapping[],
    grcIntegrations: Map<GRCPlatform, GRCIntegrationConfig>
  ) {
    super();
    this.controls = controls;
    this.unifiedControls = unifiedControls;
    this.controlMappings = controlMappings;
    this.grcIntegrations = grcIntegrations;
  }

  /**
   * Initialize all compliance frameworks
   */
  initializeFrameworks(): void {
    const frameworks = Object.values(ComplianceFrameworkType);

    for (const framework of frameworks) {
      this.initializeFrameworkControls(framework);
    }
  }

  /**
   * Initialize controls for a specific framework
   */
  private initializeFrameworkControls(framework: ComplianceFrameworkType): void {
    const controlDefinitions = this.getFrameworkControlDefinitions(framework);

    for (const def of controlDefinitions) {
      const control: AutomationControl = {
        id: `${framework.toLowerCase()}_${def.id}`,
        framework,
        name: def.name,
        description: def.description,
        category: def.category,
        requirements: def.requirements,
        assessmentType: def.assessmentType,
        automationScript: def.automationScript,
        evidenceRequirements: def.evidenceRequirements,
        frequency: def.frequency,
        weight: def.weight,
        status: ControlStatus.NOT_ASSESSED,
        relatedControls: [],
        remediationSteps: def.remediationSteps,
      };

      this.controls.set(control.id, control);
    }
  }

  /**
   * Get control definitions for a framework
   */
  private getFrameworkControlDefinitions(framework: ComplianceFrameworkType): Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    requirements: string[];
    assessmentType: AssessmentType;
    automationScript?: string;
    evidenceRequirements: string[];
    frequency: ControlFrequency;
    weight: number;
    remediationSteps: RemediationStep[];
  }> {
    const definitions = [];
    const controlCount = this.getFrameworkControlCount(framework);

    for (let i = 1; i <= controlCount; i++) {
      definitions.push({
        id: `ctrl_${i}`,
        name: `${framework} Control ${i}`,
        description: `Control ${i} for ${framework} compliance`,
        category: this.getControlCategory(framework, i),
        requirements: [
          `Implement ${framework} control requirement ${i}`,
          'Document implementation evidence',
          'Conduct periodic reviews',
        ],
        assessmentType: i % 3 === 0 ? AssessmentType.AUTOMATED : AssessmentType.HYBRID,
        automationScript: i % 3 === 0 ? `check_${framework.toLowerCase()}_${i}` : undefined,
        evidenceRequirements: [
          'Configuration documentation',
          'Audit logs',
          'Test results',
        ],
        frequency: this.getControlFrequency(framework),
        weight: this.getControlWeight(framework, i),
        remediationSteps: [],
      });
    }

    return definitions;
  }

  /**
   * Get control count per framework
   */
  private getFrameworkControlCount(framework: ComplianceFrameworkType): number {
    const counts: Record<ComplianceFrameworkType, number> = {
      [ComplianceFrameworkType.SOC2]: 64,
      [ComplianceFrameworkType.ISO27001]: 114,
      [ComplianceFrameworkType.HIPAA]: 45,
      [ComplianceFrameworkType.GDPR]: 99,
      [ComplianceFrameworkType.PCI_DSS]: 12,
      [ComplianceFrameworkType.NIST]: 80,
      [ComplianceFrameworkType.FEDRAMP]: 325,
      [ComplianceFrameworkType.CCPA]: 6,
      [ComplianceFrameworkType.SOX]: 6,
      [ComplianceFrameworkType.GLBA]: 9,
    };
    return counts[framework] || 20;
  }

  /**
   * Build unified control library mapping controls across frameworks
   */
  buildUnifiedControlLibrary(): void {
    const commonControlCategories = [
      'Access Control',
      'Data Protection',
      'Encryption',
      'Audit Logging',
      'Incident Response',
      'Business Continuity',
      'Change Management',
      'Risk Assessment',
      'Vendor Management',
      'Training',
      'Physical Security',
      'Network Security',
      'Application Security',
    ];

    for (const category of commonControlCategories) {
      const unifiedControl: UnifiedControl = {
        id: `uc_${category.toLowerCase().replace(/\s+/g, '_')}`,
        name: category,
        description: `Unified control for ${category} across all frameworks`,
        category,
        frameworkMappings: new Map(),
        commonRequirements: this.getCommonRequirements(category),
        assessmentCriteria: this.getCommonAssessmentCriteria(category),
      };

      // Map controls from each framework
      for (const framework of Object.values(ComplianceFrameworkType)) {
        const frameworkControls = this.getControlsByFramework(framework)
          .filter(c => c.category.toLowerCase().includes(category.toLowerCase().split(' ')[0]))
          .map(c => c.id);

        if (frameworkControls.length > 0) {
          unifiedControl.frameworkMappings.set(framework, frameworkControls);
        }
      }

      this.unifiedControls.set(unifiedControl.id, unifiedControl);
    }

    // Build cross-framework mappings
    this.buildCrossFrameworkMappings();
  }

  /**
   * Build cross-framework control mappings
   */
  private buildCrossFrameworkMappings(): void {
    const mappingDefinitions: Array<{
      source: ComplianceFrameworkType;
      sourcePattern: string;
      target: ComplianceFrameworkType;
      targetPattern: string;
      strength: 'exact' | 'strong' | 'partial' | 'weak';
    }> = [
      { source: ComplianceFrameworkType.SOC2, sourcePattern: 'access', target: ComplianceFrameworkType.ISO27001, targetPattern: 'access', strength: 'strong' },
      { source: ComplianceFrameworkType.SOC2, sourcePattern: 'encrypt', target: ComplianceFrameworkType.HIPAA, targetPattern: 'encrypt', strength: 'exact' },
      { source: ComplianceFrameworkType.GDPR, sourcePattern: 'data_protection', target: ComplianceFrameworkType.CCPA, targetPattern: 'data_protection', strength: 'partial' },
      { source: ComplianceFrameworkType.PCI_DSS, sourcePattern: 'encryption', target: ComplianceFrameworkType.SOC2, targetPattern: 'encrypt', strength: 'strong' },
      { source: ComplianceFrameworkType.NIST, sourcePattern: 'access', target: ComplianceFrameworkType.FEDRAMP, targetPattern: 'access', strength: 'exact' },
    ];

    for (const def of mappingDefinitions) {
      const sourceControls = this.getControlsByFramework(def.source)
        .filter(c => c.category.toLowerCase().includes(def.sourcePattern));
      const targetControls = this.getControlsByFramework(def.target)
        .filter(c => c.category.toLowerCase().includes(def.targetPattern));

      for (const sourceControl of sourceControls.slice(0, 3)) {
        for (const targetControl of targetControls.slice(0, 3)) {
          this.controlMappings.push({
            sourceFramework: def.source,
            sourceControlId: sourceControl.id,
            targetFramework: def.target,
            targetControlId: targetControl.id,
            mappingStrength: def.strength,
          });
        }
      }
    }
  }

  /**
   * Map controls across multiple frameworks to unified control library
   */
  mapControlsAcrossFrameworks(): Map<string, UnifiedControl> {
    return new Map(this.unifiedControls);
  }

  /**
   * Get control mappings between two frameworks
   */
  getControlMappings(
    sourceFramework: ComplianceFrameworkType,
    targetFramework: ComplianceFrameworkType
  ): ControlMapping[] {
    return this.controlMappings.filter(
      m => m.sourceFramework === sourceFramework && m.targetFramework === targetFramework
    );
  }

  /**
   * Add control mapping
   */
  addControlMapping(mapping: ControlMapping): void {
    const sourceControl = this.controls.get(mapping.sourceControlId);
    const targetControl = this.controls.get(mapping.targetControlId);

    if (!sourceControl || !targetControl) {
      throw new Error('Source or target control not found');
    }

    const exists = this.controlMappings.some(
      m => m.sourceControlId === mapping.sourceControlId &&
           m.targetControlId === mapping.targetControlId
    );

    if (!exists) {
      this.controlMappings.push(mapping);

      sourceControl.relatedControls.push(mapping);
      targetControl.relatedControls.push({
        ...mapping,
        sourceFramework: mapping.targetFramework,
        targetFramework: mapping.sourceFramework,
        sourceControlId: mapping.targetControlId,
        targetControlId: mapping.sourceControlId,
      });

      this.emit('mapping:added', { mapping });
    }
  }

  /**
   * Configure GRC platform integration
   */
  configureGRCIntegration(config: GRCIntegrationConfig): void {
    this.grcIntegrations.set(config.platform, config);
    this.emit('grc:configured', { platform: config.platform });
  }

  /**
   * Sync with GRC platform
   */
  async syncWithGRCPlatform(
    platform: GRCPlatform,
    logAuditEntry: (entry: {
      eventType: string;
      actor: string;
      action: string;
      resourceType: string;
      resourceId: string;
      afterState?: Record<string, unknown>;
      result: 'success' | 'failure';
    }) => Promise<void>
  ): Promise<{
    platform: GRCPlatform;
    success: boolean;
    syncedItems: number;
    errors: string[];
  }> {
    const config = this.grcIntegrations.get(platform);
    if (!config || !config.enabled) {
      return { platform, success: false, syncedItems: 0, errors: ['Platform not configured or disabled'] };
    }

    const errors: string[] = [];
    let syncedItems = 0;

    try {
      switch (platform) {
        case GRCPlatform.SERVICENOW_GRC:
          syncedItems = await this.syncWithServiceNow(config);
          break;
        case GRCPlatform.RSA_ARCHER:
          syncedItems = await this.syncWithRSAArcher(config);
          break;
        case GRCPlatform.METRICSTREAM:
          syncedItems = await this.syncWithMetricStream(config);
          break;
        default:
          errors.push(`Unsupported platform: ${platform}`);
      }

      config.lastSyncAt = new Date();
      config.lastSyncStatus = errors.length === 0 ? 'success' : 'partial';
      this.grcIntegrations.set(platform, config);

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown sync error');
      config.lastSyncStatus = 'failure';
      this.grcIntegrations.set(platform, config);
    }

    await logAuditEntry({
      eventType: 'grc_sync',
      actor: 'system',
      action: 'sync_grc_platform',
      resourceType: 'grc_platform',
      resourceId: platform,
      afterState: { syncedItems, errors },
      result: errors.length === 0 ? 'success' : 'failure',
    });

    this.emit('grc:synced', { platform, syncedItems, errors });

    return { platform, success: errors.length === 0, syncedItems, errors };
  }

  /**
   * Get controls by framework
   */
  getControlsByFramework(framework: ComplianceFrameworkType): AutomationControl[] {
    return Array.from(this.controls.values()).filter(c => c.framework === framework);
  }

  /**
   * Get control by ID
   */
  getControl(controlId: string): AutomationControl | undefined {
    return this.controls.get(controlId);
  }

  // Private helper methods

  private async syncWithServiceNow(_config: GRCIntegrationConfig): Promise<number> {
    const controlsList = Array.from(this.controls.values());
    return controlsList.length;
  }

  private async syncWithRSAArcher(_config: GRCIntegrationConfig): Promise<number> {
    const controlsList = Array.from(this.controls.values());
    return controlsList.length;
  }

  private async syncWithMetricStream(_config: GRCIntegrationConfig): Promise<number> {
    const controlsList = Array.from(this.controls.values());
    return controlsList.length;
  }

  private getControlCategory(framework: ComplianceFrameworkType, index: number): string {
    const categories: Record<ComplianceFrameworkType, string[]> = {
      [ComplianceFrameworkType.SOC2]: ['access_control', 'change_management', 'risk_assessment', 'data_protection', 'monitoring'],
      [ComplianceFrameworkType.ISO27001]: ['governance', 'asset_management', 'access_control', 'cryptography', 'physical_security', 'operations', 'communications'],
      [ComplianceFrameworkType.HIPAA]: ['administrative', 'physical', 'technical', 'organizational'],
      [ComplianceFrameworkType.GDPR]: ['lawfulness', 'rights', 'security', 'accountability', 'transfers'],
      [ComplianceFrameworkType.PCI_DSS]: ['network', 'data_protection', 'access_control', 'monitoring', 'policy'],
      [ComplianceFrameworkType.NIST]: ['identify', 'protect', 'detect', 'respond', 'recover'],
      [ComplianceFrameworkType.FEDRAMP]: ['access_control', 'audit', 'security_assessment', 'configuration', 'contingency'],
      [ComplianceFrameworkType.CCPA]: ['consumer_rights', 'disclosure', 'opt_out', 'data_minimization'],
      [ComplianceFrameworkType.SOX]: ['financial_reporting', 'internal_controls', 'audit', 'disclosure'],
      [ComplianceFrameworkType.GLBA]: ['safeguards', 'privacy', 'pretexting', 'data_security'],
    };

    const frameworkCategories = categories[framework] || ['general'];
    return frameworkCategories[index % frameworkCategories.length];
  }

  private getControlFrequency(framework: ComplianceFrameworkType): ControlFrequency {
    const frequencies: Record<ComplianceFrameworkType, ControlFrequency> = {
      [ComplianceFrameworkType.SOC2]: 'quarterly',
      [ComplianceFrameworkType.ISO27001]: 'quarterly',
      [ComplianceFrameworkType.HIPAA]: 'quarterly',
      [ComplianceFrameworkType.GDPR]: 'continuous',
      [ComplianceFrameworkType.PCI_DSS]: 'quarterly',
      [ComplianceFrameworkType.NIST]: 'quarterly',
      [ComplianceFrameworkType.FEDRAMP]: 'continuous',
      [ComplianceFrameworkType.CCPA]: 'continuous',
      [ComplianceFrameworkType.SOX]: 'annual',
      [ComplianceFrameworkType.GLBA]: 'annual',
    };
    return frequencies[framework] || 'quarterly';
  }

  private getControlWeight(_framework: ComplianceFrameworkType, index: number): number {
    const baseWeight = 10 - Math.min(9, Math.floor(index / 10));
    return Math.max(1, baseWeight);
  }

  private getCommonRequirements(category: string): string[] {
    const requirements: Record<string, string[]> = {
      'Access Control': [
        'Implement role-based access control',
        'Enforce principle of least privilege',
        'Implement multi-factor authentication',
        'Regular access reviews',
      ],
      'Data Protection': [
        'Classify data by sensitivity',
        'Implement data encryption',
        'Control data retention',
        'Secure data disposal',
      ],
      'Encryption': [
        'Encrypt data at rest',
        'Encrypt data in transit',
        'Manage encryption keys securely',
        'Use approved algorithms',
      ],
      'Audit Logging': [
        'Log all security events',
        'Protect log integrity',
        'Retain logs per policy',
        'Regular log reviews',
      ],
    };
    return requirements[category] || ['Implement control requirements', 'Document evidence', 'Conduct reviews'];
  }

  private getCommonAssessmentCriteria(category: string): string[] {
    const criteria: Record<string, string[]> = {
      'Access Control': [
        'RBAC implementation verified',
        'MFA enabled for all users',
        'Access reviews conducted quarterly',
        'Inactive accounts disabled',
      ],
      'Data Protection': [
        'Data classification scheme implemented',
        'Encryption enabled for sensitive data',
        'Retention policies enforced',
        'Disposal procedures documented',
      ],
    };
    return criteria[category] || ['Control implemented', 'Evidence documented', 'Testing completed'];
  }
}
