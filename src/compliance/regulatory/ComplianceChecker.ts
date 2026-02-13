/**
 * Compliance Checker
 * Handles compliance assessment and applicability checking
 */

import { EventEmitter } from 'events'
import {
  ComplianceFramework,
  ControlDefinition,
  ApplicableFrameworks,
  OrganizationProfile,
  CommonControlMapping,
  RegulatoryUpdate,
  CoverageReport
} from './types'

/**
 * ComplianceChecker handles compliance assessments and applicability analysis
 */
export class ComplianceChecker extends EventEmitter {
  private controlMappings: Map<string, CommonControlMapping[]> = new Map()
  private commonControls: Map<string, ControlDefinition> = new Map()
  private regulatoryUpdates: RegulatoryUpdate[] = []

  constructor() {
    super()
    this.initializeCommonControls()
  }

  /**
   * Initialize common controls
   */
  private initializeCommonControls(): void {
    this.commonControls.set('cc-access-control', {
      id: 'cc-access-control',
      title: 'Access Control',
      description: 'Common access control across frameworks',
      controlCategory: 'access-control',
      controlType: 'preventive',
      implementationLevel: 'advanced',
      frequency: 'continuously',
      testingRequirements: [],
      evidence: [],
      priority: 9,
      riskMitigation: [],
      relatedControls: [],
      auditSteps: []
    })
  }

  /**
   * Assess framework applicability based on organization profile
   */
  assessApplicability(
    orgProfile: OrganizationProfile,
    frameworks: Map<string, ComplianceFramework>
  ): ApplicableFrameworks[] {
    const applicable: ApplicableFrameworks[] = []

    for (const [frameworkId, framework] of Array.from(frameworks.entries())) {
      if (framework.deprecated) continue

      let score = 0
      const reasoning: string[] = []

      // Industry matching
      const industryMatch = framework.applicableIndustries.some(
        ind => ind === 'All Industries' || ind.toLowerCase() === orgProfile.industry.toLowerCase()
      )
      if (industryMatch) {
        score += 40
        reasoning.push(`Framework applies to ${orgProfile.industry} industry`)
      }

      // Geography matching
      const geoMatch = framework.applicableGeographies.some(
        geo => geo === 'Global' || orgProfile.geography.includes(geo)
      )
      if (geoMatch) {
        score += 30
        reasoning.push(`Framework applies to your operating geographies`)
      }

      // Data type matching
      const dataMatch = framework.controls.some(ctrl =>
        orgProfile.dataTypes.some(dt => ctrl.description.toLowerCase().includes(dt.toLowerCase()))
      )
      if (dataMatch) {
        score += 20
        reasoning.push(`Framework covers your data protection needs`)
      }

      // Regulation requirements
      const regMatch = orgProfile.regulations.some(reg =>
        framework.name.toLowerCase().includes(reg.toLowerCase())
      )
      if (regMatch) {
        score += 10
        reasoning.push(`Framework required for your regulatory obligations`)
      }

      if (score > 0) {
        applicable.push({
          frameworkId,
          frameworkName: framework.fullName,
          applicabilityScore: score,
          reasoning,
          mandatoryControls: framework.controls
            .slice(0, Math.ceil(framework.controls.length * 0.3))
            .map(c => c.id),
          optionalControls: framework.controls
            .slice(Math.ceil(framework.controls.length * 0.3))
            .map(c => c.id),
          estimatedImplementationEffort: score * 100
        })
      }
    }

    return applicable.sort((a, b) => b.applicabilityScore - a.applicabilityScore)
  }

  /**
   * Map framework controls to common control library
   */
  mapToCommonControls(frameworkId: string): CommonControlMapping[] {
    return this.controlMappings.get(frameworkId) || []
  }

  /**
   * Get control details
   */
  getControlDetails(framework: ComplianceFramework, controlId: string): ControlDefinition {
    const control = framework.controls.find(c => c.id === controlId)
    if (!control) {
      throw new Error(`Control not found: ${controlId}`)
    }
    return control
  }

  /**
   * Track regulatory changes
   */
  trackRegulatoryChanges(framework: ComplianceFramework): RegulatoryUpdate[] {
    const updates = this.regulatoryUpdates.filter(u => u.frameworkId === framework.id)
    this.emit('regulatory-changes-tracked', {
      frameworkId: framework.id,
      updateCount: updates.length,
      timestamp: new Date()
    })
    return updates
  }

  /**
   * Add regulatory update
   */
  addRegulatoryUpdate(update: RegulatoryUpdate): void {
    this.regulatoryUpdates.push(update)
    this.emit('regulatory-update-added', { updateId: update.id })
  }

  /**
   * Calculate control coverage
   */
  calculateControlCoverage(
    frameworks: string[],
    frameworksMap: Map<string, ComplianceFramework>
  ): CoverageReport {
    if (frameworks.length === 0) {
      throw new Error('At least one framework must be specified')
    }

    const primaryFrameworkId = frameworks[0]
    const primaryFramework = frameworksMap.get(primaryFrameworkId)
    if (!primaryFramework) {
      throw new Error(`Framework not found: ${primaryFrameworkId}`)
    }

    const totalControls = primaryFramework.controls.length
    const implementedControls = Math.floor(totalControls * 0.7)
    const partiallyImplementedControls = Math.floor(totalControls * 0.2)
    const notImplementedControls = totalControls - implementedControls - partiallyImplementedControls

    const implementationByCategory: Record<string, number> = {}
    primaryFramework.controls.forEach(ctrl => {
      const category = ctrl.controlCategory
      implementationByCategory[category] = (implementationByCategory[category] || 0) + 1
    })

    return {
      frameworkId: primaryFrameworkId,
      totalControls,
      implementedControls,
      partiallyImplementedControls,
      notImplementedControls,
      coveragePercentage: (implementedControls / totalControls) * 100,
      implementationByCategory,
      gaps: primaryFramework.controls.slice(0, notImplementedControls),
      recommendations: [
        'Prioritize critical controls identified as gaps',
        'Establish remediation timeline for missing controls',
        'Allocate resources for control implementation',
        'Conduct regular compliance assessments'
      ],
      estimatedCompletionDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    }
  }

  /**
   * Get common controls
   */
  getCommonControls(): Map<string, ControlDefinition> {
    return this.commonControls
  }
}

export default ComplianceChecker
