/**
 * Policy Store
 *
 * Manages policy storage, versioning, and retrieval.
 *
 * @module PolicyStore
 */

import {
  ZeroTrustPolicy,
  PolicyType,
  PolicyAction,
  PolicyStatistics
} from './types'

/**
 * Policy storage and version management
 */
export class PolicyStore {
  private policies: Map<string, ZeroTrustPolicy> = new Map()
  private policyVersions: Map<string, ZeroTrustPolicy[]> = new Map()
  private onCacheInvalidation?: () => void

  constructor(onCacheInvalidation?: () => void) {
    this.onCacheInvalidation = onCacheInvalidation
  }

  /**
   * Initialize with default policies
   */
  initializeDefaultPolicies(): void {
    // Default deny policy for sensitive resources
    this.createPolicy({
      id: 'policy-default-deny',
      version: 1,
      name: 'Default Deny - Sensitive Resources',
      description: 'Deny access to sensitive resources by default',
      type: PolicyType.ACCESS,
      enabled: true,
      priority: 100,
      conditions: [
        {
          type: 'resource',
          operator: 'equals',
          field: 'classification',
          value: 'restricted'
        }
      ],
      action: PolicyAction.DENY,
      minimumTrustScore: 85,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'system'
    })

    // MFA required for admin access
    this.createPolicy({
      id: 'policy-admin-mfa',
      version: 1,
      name: 'Admin Access Requires MFA',
      description: 'Step-up authentication for admin operations',
      type: PolicyType.ACCESS,
      enabled: true,
      priority: 50,
      conditions: [
        {
          type: 'user',
          operator: 'in',
          field: 'roles',
          value: ['admin', 'super_admin']
        }
      ],
      action: PolicyAction.CHALLENGE,
      stepUpRequired: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'system'
    })

    // Non-compliant devices denied
    this.createPolicy({
      id: 'policy-device-compliance',
      version: 1,
      name: 'Device Compliance Required',
      description: 'Block non-compliant devices',
      type: PolicyType.DEVICE,
      enabled: true,
      priority: 80,
      conditions: [
        {
          type: 'device',
          operator: 'equals',
          field: 'complianceStatus',
          value: 'non_compliant'
        }
      ],
      action: PolicyAction.QUARANTINE,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'system'
    })

    // Suspicious network activity
    this.createPolicy({
      id: 'policy-anomalous-location',
      version: 1,
      name: 'Anomalous Location Detection',
      description: 'Challenge access from impossible travel locations',
      type: PolicyType.NETWORK,
      enabled: true,
      priority: 75,
      conditions: [
        {
          type: 'risk',
          operator: 'greater_than',
          field: 'riskScore',
          value: 0.7
        }
      ],
      action: PolicyAction.CHALLENGE,
      stepUpRequired: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'system'
    })
  }

  /**
   * Create or update a policy
   */
  createPolicy(policy: ZeroTrustPolicy): ZeroTrustPolicy {
    const existingPolicy = this.policies.get(policy.id)

    if (existingPolicy) {
      policy.version = existingPolicy.version + 1
    } else {
      policy.version = 1
    }

    policy.updatedAt = Date.now()

    this.policies.set(policy.id, policy)

    // Store version history
    const versions = this.policyVersions.get(policy.id) || []
    versions.push({ ...policy })
    this.policyVersions.set(policy.id, versions)

    // Invalidate cache
    this.onCacheInvalidation?.()

    return policy
  }

  /**
   * Get a policy by ID
   */
  getPolicy(policyId: string): ZeroTrustPolicy | undefined {
    return this.policies.get(policyId)
  }

  /**
   * List all policies
   */
  listPolicies(type?: PolicyType): ZeroTrustPolicy[] {
    const policies = Array.from(this.policies.values())

    if (type) {
      return policies.filter(p => p.type === type && p.enabled)
    }

    return policies.filter(p => p.enabled)
  }

  /**
   * Delete a policy
   */
  deletePolicy(policyId: string): boolean {
    const deleted = this.policies.delete(policyId)
    if (deleted) {
      this.onCacheInvalidation?.()
    }
    return deleted
  }

  /**
   * Get policy version history
   */
  getPolicyVersionHistory(policyId: string): ZeroTrustPolicy[] {
    return this.policyVersions.get(policyId) || []
  }

  /**
   * Rollback policy to specific version
   */
  rollbackPolicyVersion(policyId: string, version: number): ZeroTrustPolicy | undefined {
    const versions = this.policyVersions.get(policyId)
    if (!versions) return undefined

    const targetVersion = versions.find(v => v.version === version)
    if (!targetVersion) return undefined

    const policy = { ...targetVersion, version: version + 1 }
    return this.createPolicy(policy)
  }

  /**
   * Get statistics about policies
   */
  getStatistics(cacheSize: number): PolicyStatistics {
    const allPolicies = Array.from(this.policies.values())
    const enabledPolicies = allPolicies.filter(p => p.enabled)

    const policyTypes: Record<string, number> = {}
    for (const policy of enabledPolicies) {
      policyTypes[policy.type] = (policyTypes[policy.type] || 0) + 1
    }

    return {
      totalPolicies: allPolicies.length,
      enabledPolicies: enabledPolicies.length,
      policyTypes,
      cacheSize
    }
  }
}

export default PolicyStore
