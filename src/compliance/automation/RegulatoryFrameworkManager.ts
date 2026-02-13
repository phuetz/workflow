/**
 * RegulatoryFrameworkManager
 * Facade that manages regulatory compliance frameworks and controls
 * Delegates to modular components in /src/compliance/regulatory/
 *
 * @module RegulatoryFrameworkManager
 */

import { EventEmitter } from 'events'

// Re-export types from regulatory module
export {
  ControlDefinition,
  ComplianceFramework,
  Principle,
  FrameworkSection,
  ControlHierarchy,
  FrameworkUpdate,
  ControlChange,
  ImpactAssessment,
  TestingRequirement,
  CommonControlMapping,
  ApplicableFrameworks,
  RegulatoryUpdate,
  CustomFramework,
  CertificationStatus,
  ControlCertification,
  AuditResult,
  AuditFinding,
  CoverageReport,
  OrganizationProfile,
  CustomFrameworkDefinition
} from '../regulatory/types'

// Import modules
import { FrameworkRegistry } from '../regulatory/FrameworkRegistry'
import { ComplianceChecker } from '../regulatory/ComplianceChecker'
import { ReportGenerator } from '../regulatory/ReportGenerator'
import { AuditTrail } from '../regulatory/AuditTrail'

import type {
  ComplianceFramework,
  ControlDefinition,
  CommonControlMapping,
  ApplicableFrameworks,
  RegulatoryUpdate,
  CustomFramework,
  CertificationStatus,
  CoverageReport,
  OrganizationProfile,
  CustomFrameworkDefinition
} from '../regulatory/types'

/**
 * RegulatoryFrameworkManager
 * Manages regulatory compliance frameworks and controls across the platform
 * Provides comprehensive support for SOC2, ISO27001, HIPAA, GDPR, PCI-DSS, NIST CSF, FedRAMP, CCPA, SOX, GLBA
 */
export class RegulatoryFrameworkManager extends EventEmitter {
  private static instance: RegulatoryFrameworkManager
  private registry: FrameworkRegistry
  private checker: ComplianceChecker
  private reporter: ReportGenerator
  private auditTrail: AuditTrail

  private constructor() {
    super()
    this.registry = new FrameworkRegistry()
    this.checker = new ComplianceChecker()
    this.reporter = new ReportGenerator()
    this.auditTrail = new AuditTrail(this.registry)
    this.initializeFrameworks()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): RegulatoryFrameworkManager {
    if (!RegulatoryFrameworkManager.instance) {
      RegulatoryFrameworkManager.instance = new RegulatoryFrameworkManager()
    }
    return RegulatoryFrameworkManager.instance
  }

  /**
   * Initialize all regulatory frameworks
   */
  private initializeFrameworks(): void {
    this.createSOC2Framework()
    this.createISO27001Framework()
    this.createHIPAAFramework()
    this.createGDPRFramework()
    this.createPCIDSSFramework()
    this.createNISTCSFFramework()
    this.createFedRAMPFramework()
    this.createCCPAFramework()
    this.createSOXFramework()
    this.createGLBAFramework()
  }

  private createSOC2Framework(): void {
    const controls = this.auditTrail.generateSOC2Controls()
    this.registry.registerFramework({
      id: 'soc2',
      name: 'SOC2',
      fullName: 'Service Organization Control 2 (Type II)',
      version: '2.1',
      lastUpdated: new Date('2024-01-01'),
      releaseDate: new Date('2023-06-15'),
      applicableIndustries: ['SaaS', 'Cloud Services', 'Financial', 'Healthcare', 'Technology'],
      applicableGeographies: ['Global'],
      controls,
      principles: [
        { id: 'soc2_cc', name: 'CC - Common Criteria', description: 'Core criteria for system trust', controlIds: this.auditTrail.getSOC2CCControlIds(), trustComponent: 'common' },
        { id: 'soc2_a', name: 'A - Availability', description: 'System availability and operational performance', controlIds: this.auditTrail.getSOC2AvailabilityControlIds(), trustComponent: 'availability' },
        { id: 'soc2_c', name: 'C - Confidentiality', description: 'Protection of confidential information', controlIds: this.auditTrail.getSOC2ConfidentialityControlIds(), trustComponent: 'confidentiality' },
        { id: 'soc2_i', name: 'I - Integrity', description: 'System and data integrity', controlIds: this.auditTrail.getSOC2IntegrityControlIds(), trustComponent: 'integrity' },
        { id: 'soc2_p', name: 'P - Privacy', description: 'Personal information privacy', controlIds: this.auditTrail.getSOC2PrivacyControlIds(), trustComponent: 'privacy' }
      ],
      controlHierarchy: this.registry.buildControlHierarchy(controls, 3),
      updateHistory: [{ version: '2.1', releaseDate: new Date('2023-06-15'), changes: [], impactAssessment: { affectedControlCount: 3, implementationEffort: 'low', backwardCompatibility: true, estimatedComplianceCost: 50000, riskLevel: 'low' } }],
      deprecated: false
    })
  }

  private createISO27001Framework(): void {
    const controls = this.auditTrail.generateISO27001Controls()
    this.registry.registerFramework({
      id: 'iso27001', name: 'ISO/IEC 27001:2022', fullName: 'Information Security Management System',
      version: '2022', lastUpdated: new Date('2024-01-01'), releaseDate: new Date('2022-10-15'),
      applicableIndustries: ['All Industries'], applicableGeographies: ['Global'], controls,
      sections: [
        { id: 'iso_a5', name: 'A.5 - Organizational Controls', description: 'Governance and organizational controls', controlIds: controls.slice(0, 15).map(c => c.id) },
        { id: 'iso_a6', name: 'A.6 - People Controls', description: 'Personnel and training controls', controlIds: controls.slice(15, 30).map(c => c.id) },
        { id: 'iso_a7', name: 'A.7 - Physical Controls', description: 'Physical and environmental controls', controlIds: controls.slice(30, 45).map(c => c.id) },
        { id: 'iso_a8', name: 'A.8 - Technical Controls', description: 'Technical and cryptographic controls', controlIds: controls.slice(45, 75).map(c => c.id) }
      ],
      controlHierarchy: this.registry.buildControlHierarchy(controls), updateHistory: [], deprecated: false
    })
  }

  private createHIPAAFramework(): void {
    const controls = this.auditTrail.generateHIPAAControls()
    this.registry.registerFramework({
      id: 'hipaa', name: 'HIPAA', fullName: 'Health Insurance Portability and Accountability Act',
      version: '2024', lastUpdated: new Date('2024-01-01'), releaseDate: new Date('2023-01-01'),
      applicableIndustries: ['Healthcare', 'Health Insurance', 'Medical Devices', 'Pharmaceuticals'],
      applicableGeographies: ['United States'], controls,
      sections: [
        { id: 'hipaa_admin', name: 'Administrative Safeguards', description: 'Administrative controls for PHI', controlIds: controls.slice(0, 15).map(c => c.id) },
        { id: 'hipaa_phys', name: 'Physical Safeguards', description: 'Physical controls for PHI', controlIds: controls.slice(15, 30).map(c => c.id) },
        { id: 'hipaa_tech', name: 'Technical Safeguards', description: 'Technical controls for PHI', controlIds: controls.slice(30, 45).map(c => c.id) }
      ],
      controlHierarchy: this.registry.buildControlHierarchy(controls, 3), updateHistory: [], deprecated: false
    })
  }

  private createGDPRFramework(): void {
    const controls = this.auditTrail.generateGDPRControls()
    this.registry.registerFramework({
      id: 'gdpr', name: 'GDPR', fullName: 'General Data Protection Regulation',
      version: '2024', lastUpdated: new Date('2024-01-01'), releaseDate: new Date('2018-05-25'),
      applicableIndustries: ['All Industries'], applicableGeographies: ['EU', 'EEA', 'UK'], controls,
      sections: [
        { id: 'gdpr_ch1', name: 'Chapter 1 - General Provisions', description: 'General provisions', controlIds: controls.slice(0, 15).map(c => c.id) },
        { id: 'gdpr_ch2', name: 'Chapter 2 - Principles', description: 'Data protection principles', controlIds: controls.slice(15, 35).map(c => c.id) },
        { id: 'gdpr_ch3', name: 'Chapter 3 - Rights of Data Subject', description: 'Individual rights', controlIds: controls.slice(35, 55).map(c => c.id) },
        { id: 'gdpr_ch4', name: 'Chapter 4 - Controller and Processor', description: 'Responsibilities and liability', controlIds: controls.slice(55, 75).map(c => c.id) }
      ],
      controlHierarchy: this.registry.buildControlHierarchy(controls, 10), updateHistory: [], deprecated: false
    })
  }

  private createPCIDSSFramework(): void {
    const controls = this.auditTrail.generatePCIDSSControls()
    this.registry.registerFramework({
      id: 'pci-dss', name: 'PCI-DSS', fullName: 'Payment Card Industry Data Security Standard',
      version: '4.0', lastUpdated: new Date('2024-01-01'), releaseDate: new Date('2023-03-31'),
      applicableIndustries: ['Financial', 'Retail', 'Any organization handling cards'],
      applicableGeographies: ['Global'], controls,
      sections: [
        { id: 'pci_network', name: 'Network Security', description: 'Network security controls', controlIds: controls.slice(0, 3).map(c => c.id) },
        { id: 'pci_cardholder', name: 'Cardholder Data Protection', description: 'Data protection controls', controlIds: controls.slice(3, 6).map(c => c.id) },
        { id: 'pci_access', name: 'Access Control', description: 'Access control measures', controlIds: controls.slice(6, 9).map(c => c.id) },
        { id: 'pci_monitoring', name: 'Monitoring and Testing', description: 'Monitoring controls', controlIds: controls.slice(9, 12).map(c => c.id) }
      ],
      controlHierarchy: this.registry.buildControlHierarchy(controls, controls.length), updateHistory: [], deprecated: false
    })
  }

  private createNISTCSFFramework(): void {
    const controls = this.auditTrail.generateNISTCSFControls()
    const functions = ['Identify', 'Protect', 'Detect', 'Respond', 'Recover']
    this.registry.registerFramework({
      id: 'nist-csf', name: 'NIST CSF', fullName: 'NIST Cybersecurity Framework',
      version: '2.0', lastUpdated: new Date('2024-02-26'), releaseDate: new Date('2024-02-26'),
      applicableIndustries: ['All Industries', 'Critical Infrastructure'],
      applicableGeographies: ['United States', 'Global'], controls,
      sections: functions.map((func, idx) => ({ id: `nist_${func}`, name: `${func} Function`, description: `NIST CSF ${func} controls`, controlIds: controls.slice(idx * 16, (idx + 1) * 16).map(c => c.id) })),
      controlHierarchy: this.registry.buildControlHierarchy(controls), updateHistory: [], deprecated: false
    })
  }

  private createFedRAMPFramework(): void {
    const controls = this.auditTrail.generateFedRAMPControls()
    this.registry.registerFramework({
      id: 'fedramp', name: 'FedRAMP', fullName: 'Federal Risk and Authorization Management Program',
      version: '2024', lastUpdated: new Date('2024-01-01'), releaseDate: new Date('2011-12-01'),
      applicableIndustries: ['Government', 'Defense', 'Federal Agencies'],
      applicableGeographies: ['United States'], controls,
      controlHierarchy: this.registry.buildControlHierarchy(controls, 10), updateHistory: [], deprecated: false
    })
  }

  private createCCPAFramework(): void {
    const controls = this.auditTrail.generateCCPAControls()
    this.registry.registerFramework({
      id: 'ccpa', name: 'CCPA', fullName: 'California Consumer Privacy Act',
      version: '2024', lastUpdated: new Date('2024-01-01'), releaseDate: new Date('2020-01-01'),
      applicableIndustries: ['All Industries'], applicableGeographies: ['California'], controls,
      controlHierarchy: this.registry.buildControlHierarchy(controls, controls.length), updateHistory: [], deprecated: false
    })
  }

  private createSOXFramework(): void {
    const controls = this.auditTrail.generateSOXControls()
    this.registry.registerFramework({
      id: 'sox', name: 'SOX', fullName: 'Sarbanes-Oxley Act',
      version: '2024', lastUpdated: new Date('2024-01-01'), releaseDate: new Date('2002-07-30'),
      applicableIndustries: ['Public Companies', 'Financial Services'],
      applicableGeographies: ['United States'], controls,
      controlHierarchy: this.registry.buildControlHierarchy(controls, controls.length), updateHistory: [], deprecated: false
    })
  }

  private createGLBAFramework(): void {
    const controls = this.auditTrail.generateGLBAControls()
    this.registry.registerFramework({
      id: 'glba', name: 'GLBA', fullName: 'Gramm-Leach-Bliley Act',
      version: '2024', lastUpdated: new Date('2024-01-01'), releaseDate: new Date('1999-11-18'),
      applicableIndustries: ['Financial Institutions', 'Insurance', 'Securities'],
      applicableGeographies: ['United States'], controls,
      controlHierarchy: this.registry.buildControlHierarchy(controls, 3), updateHistory: [], deprecated: false
    })
  }

  // Public API - Delegating to modules
  async loadFramework(frameworkId: string): Promise<ComplianceFramework> {
    const framework = this.registry.getFramework(frameworkId)
    if (!framework) throw new Error(`Framework not found: ${frameworkId}`)
    this.emit('framework-loaded', { frameworkId, timestamp: new Date() })
    return framework
  }

  getControlDetails(frameworkId: string, controlId: string): ControlDefinition {
    const framework = this.registry.getFramework(frameworkId)
    if (!framework) throw new Error(`Framework not found: ${frameworkId}`)
    return this.checker.getControlDetails(framework, controlId)
  }

  mapToCommonControls(frameworkId: string): CommonControlMapping[] {
    return this.checker.mapToCommonControls(frameworkId)
  }

  assessApplicability(orgProfile: OrganizationProfile): ApplicableFrameworks[] {
    const frameworks = new Map(this.registry.getAllFrameworks().map(f => [f.id, f]))
    return this.checker.assessApplicability(orgProfile, frameworks)
  }

  trackRegulatoryChanges(framework: ComplianceFramework): RegulatoryUpdate[] {
    return this.checker.trackRegulatoryChanges(framework)
  }

  createCustomFramework(definition: CustomFrameworkDefinition): CustomFramework {
    const customFramework = this.reporter.createCustomFramework(definition)
    this.registry.registerCustomFramework(customFramework)
    return customFramework
  }

  getCertificationStatus(framework: ComplianceFramework): CertificationStatus {
    return this.reporter.getCertificationStatus(framework)
  }

  calculateControlCoverage(frameworks: string[]): CoverageReport {
    const frameworksMap = new Map(this.registry.getAllFrameworks().map(f => [f.id, f]))
    return this.checker.calculateControlCoverage(frameworks, frameworksMap)
  }

  getAllFrameworks(): ComplianceFramework[] { return this.registry.getAllFrameworks() }
  addRegulatoryUpdate(update: RegulatoryUpdate): void { this.checker.addRegulatoryUpdate(update) }
  getFramework(frameworkId: string): ComplianceFramework | undefined { return this.registry.getFramework(frameworkId) }
  registerCustomFramework(framework: CustomFramework): void { this.registry.registerCustomFramework(framework) }
}

export default RegulatoryFrameworkManager.getInstance()
