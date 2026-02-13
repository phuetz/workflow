/**
 * Zero Trust Policy Engine
 *
 * Implements zero trust security principles with:
 * - Real-time policy evaluation
 * - Trust scoring system
 * - Adaptive access control
 * - Continuous verification
 * - Micro-segmentation support
 *
 * @module ZeroTrustPolicyEngine
 */

// Re-export all types for backwards compatibility
export {
  PolicyAction,
  PolicyType,
  TrustLevel,
  RiskLevel,
  UserContext,
  DeviceContext,
  NetworkContext,
  ResourceContext,
  EvaluationContext,
  PolicyCondition,
  ZeroTrustPolicy,
  TrustScoreComponents,
  PolicyEvaluationResult,
  TrustScoreWeights,
  RiskThresholds,
  PolicyStatistics
} from './engine/types'

import {
  EvaluationContext,
  ZeroTrustPolicy,
  PolicyType,
  PolicyEvaluationResult,
  TrustScoreWeights,
  PolicyStatistics
} from './engine/types'
import { PolicyEvaluator } from './engine/PolicyEvaluator'
import { TrustScorer } from './engine/TrustScorer'
import { AccessController } from './engine/AccessController'
import { PolicyStore } from './engine/PolicyStore'

/**
 * Zero Trust Policy Engine
 *
 * Enterprise-grade policy evaluation engine implementing zero trust principles.
 * Acts as the main orchestrator for policy evaluation, trust scoring, and access control.
 */
export class ZeroTrustPolicyEngine {
  private policyStore: PolicyStore
  private policyEvaluator: PolicyEvaluator
  private trustScorer: TrustScorer
  private accessController: AccessController

  constructor() {
    // Initialize trust scorer with default weights
    this.trustScorer = new TrustScorer()

    // Initialize policy evaluator
    this.policyEvaluator = new PolicyEvaluator()

    // Initialize access controller with dependencies
    this.accessController = new AccessController(this.policyEvaluator, this.trustScorer)

    // Initialize policy store with cache invalidation callback
    this.policyStore = new PolicyStore(() => this.accessController.clearCache())

    // Initialize default policies
    this.policyStore.initializeDefaultPolicies()
  }

  /**
   * Create or update a policy
   * @param policy Policy to create or update
   * @returns Created/updated policy
   */
  createPolicy(policy: ZeroTrustPolicy): ZeroTrustPolicy {
    return this.policyStore.createPolicy(policy)
  }

  /**
   * Get a policy by ID
   * @param policyId Policy ID
   * @returns Policy or undefined
   */
  getPolicy(policyId: string): ZeroTrustPolicy | undefined {
    return this.policyStore.getPolicy(policyId)
  }

  /**
   * List all policies
   * @param type Optional filter by type
   * @returns Array of policies
   */
  listPolicies(type?: PolicyType): ZeroTrustPolicy[] {
    return this.policyStore.listPolicies(type)
  }

  /**
   * Delete a policy
   * @param policyId Policy ID to delete
   * @returns Success status
   */
  deletePolicy(policyId: string): boolean {
    return this.policyStore.deletePolicy(policyId)
  }

  /**
   * Get policy version history
   * @param policyId Policy ID
   * @returns Array of policy versions
   */
  getPolicyVersionHistory(policyId: string): ZeroTrustPolicy[] {
    return this.policyStore.getPolicyVersionHistory(policyId)
  }

  /**
   * Rollback policy to specific version
   * @param policyId Policy ID
   * @param version Version number to rollback to
   * @returns Rolled back policy or undefined
   */
  rollbackPolicyVersion(policyId: string, version: number): ZeroTrustPolicy | undefined {
    return this.policyStore.rollbackPolicyVersion(policyId, version)
  }

  /**
   * Simulate policy evaluation (dry-run)
   * @param context Evaluation context
   * @param policies Policies to test (uses all if undefined)
   * @returns Detailed evaluation result without applying decision
   */
  simulatePolicies(context: EvaluationContext, policies?: ZeroTrustPolicy[]): PolicyEvaluationResult {
    const policiesToEvaluate = policies || this.listPolicies()
    return this.accessController.simulateAccess(
      context,
      policiesToEvaluate,
      (id) => this.policyStore.getPolicy(id)
    )
  }

  /**
   * Evaluate policies for access decision
   * @param context Evaluation context
   * @returns Policy evaluation result
   */
  evaluatePolicies(context: EvaluationContext): PolicyEvaluationResult {
    return this.accessController.evaluateAccess(
      context,
      this.listPolicies(),
      (id) => this.policyStore.getPolicy(id)
    )
  }

  /**
   * Set cache timeout
   */
  setCacheTimeout(ms: number): void {
    this.accessController.setCacheTimeout(ms)
  }

  /**
   * Set trust score weights
   */
  setTrustScoreWeights(weights: Partial<TrustScoreWeights>): void {
    this.trustScorer.setWeights(weights)
  }

  /**
   * Get statistics about policies
   */
  getStatistics(): PolicyStatistics {
    return this.policyStore.getStatistics(this.accessController.getCacheSize())
  }
}

export default ZeroTrustPolicyEngine
