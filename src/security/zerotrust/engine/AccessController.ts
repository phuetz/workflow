/**
 * Access Controller
 *
 * Handles access decisions and policy evaluation orchestration.
 *
 * @module AccessController
 */

import * as crypto from 'crypto'
import {
  EvaluationContext,
  ZeroTrustPolicy,
  PolicyAction,
  PolicyEvaluationResult,
  TrustScoreComponents
} from './types'
import { PolicyEvaluator } from './PolicyEvaluator'
import { TrustScorer } from './TrustScorer'

/**
 * Access control decision maker
 */
export class AccessController {
  private policyCache: Map<string, PolicyEvaluationResult> = new Map()
  private cacheTimeout: number = 60000 // 1 minute
  private policyEvaluator: PolicyEvaluator
  private trustScorer: TrustScorer

  constructor(policyEvaluator: PolicyEvaluator, trustScorer: TrustScorer) {
    this.policyEvaluator = policyEvaluator
    this.trustScorer = trustScorer
  }

  /**
   * Evaluate policies for access decision (with caching)
   */
  evaluateAccess(
    context: EvaluationContext,
    policies: ZeroTrustPolicy[],
    getPolicy: (id: string) => ZeroTrustPolicy | undefined
  ): PolicyEvaluationResult {
    // Check cache first
    const cacheKey = this.generateCacheKey(context)
    const cached = this.policyCache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached
    }

    const result = this.evaluateAccessInternal(context, policies, getPolicy, false)

    // Cache result
    this.policyCache.set(cacheKey, result)

    return result
  }

  /**
   * Simulate policy evaluation (dry-run, no caching)
   */
  simulateAccess(
    context: EvaluationContext,
    policies: ZeroTrustPolicy[],
    getPolicy: (id: string) => ZeroTrustPolicy | undefined
  ): PolicyEvaluationResult {
    return this.evaluateAccessInternal(context, policies, getPolicy, true)
  }

  /**
   * Set cache timeout
   */
  setCacheTimeout(ms: number): void {
    this.cacheTimeout = ms
  }

  /**
   * Clear policy cache
   */
  clearCache(): void {
    this.policyCache.clear()
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.policyCache.size
  }

  /**
   * Internal policy evaluation logic
   */
  private evaluateAccessInternal(
    context: EvaluationContext,
    policies: ZeroTrustPolicy[],
    getPolicy: (id: string) => ZeroTrustPolicy | undefined,
    _isDryRun: boolean
  ): PolicyEvaluationResult {
    const trustScores = this.trustScorer.calculateTrustScores(context)
    const compositeTrust = this.trustScorer.calculateCompositeTrustScore(trustScores)
    const riskLevel = this.trustScorer.assessRiskLevel(trustScores)

    const matchedPolicies: string[] = []
    let decision = PolicyAction.ALLOW
    let requiresStepUp = false
    let requiresMfa = false
    let sessionTimeout: number | undefined

    // Evaluate policies in priority order
    const sortedPolicies = [...policies].sort((a, b) => a.priority - b.priority)

    for (const policy of sortedPolicies) {
      if (this.policyEvaluator.evaluateConditions(
        policy.conditions,
        context,
        trustScores,
        (scores) => this.trustScorer.calculateCompositeTrustScore(scores)
      )) {
        matchedPolicies.push(policy.id)

        // Stop at first deny
        if (policy.action === PolicyAction.DENY) {
          decision = PolicyAction.DENY
          break
        }

        // Accumulate other actions
        if (policy.action === PolicyAction.CHALLENGE) {
          decision = PolicyAction.CHALLENGE
          if (policy.stepUpRequired) {
            requiresStepUp = true
          }
        }

        if (policy.action === PolicyAction.QUARANTINE) {
          decision = PolicyAction.QUARANTINE
          break
        }

        if (policy.action === PolicyAction.AUDIT) {
          // Continue to allow but log
          this.auditPolicyMatch(context, policy)
        }
      }
    }

    // Determine if MFA is required
    requiresMfa = requiresStepUp || (compositeTrust < 60)

    // Calculate session timeout based on risk
    sessionTimeout = this.trustScorer.calculateSessionTimeout(riskLevel)

    return {
      requestId: context.requestId,
      decision,
      matchedPolicies,
      trustScores,
      compositeTrustScore: compositeTrust,
      trustLevel: this.trustScorer.calculateTrustLevel(compositeTrust),
      riskLevel,
      requiresStepUp,
      requiresMfa,
      sessionTimeout,
      reasoning: this.generateReasoning(context, decision, matchedPolicies, compositeTrust, getPolicy),
      timestamp: Date.now()
    }
  }

  /**
   * Generate reasoning for policy decision
   */
  private generateReasoning(
    context: EvaluationContext,
    decision: PolicyAction,
    matchedPolicies: string[],
    trustScore: number,
    getPolicy: (id: string) => ZeroTrustPolicy | undefined
  ): string {
    const policies = matchedPolicies.map(id => getPolicy(id)?.name || id).join(', ')
    return `Decision: ${decision}. Matched policies: ${policies || 'none'}. Trust score: ${trustScore.toFixed(1)}/100. User: ${context.user.userId}`
  }

  /**
   * Audit policy match
   */
  private auditPolicyMatch(context: EvaluationContext, policy: ZeroTrustPolicy): void {
    // Would implement audit logging
    console.debug(`[AUDIT] Policy "${policy.name}" matched for user ${context.user.userId}`)
  }

  /**
   * Generate cache key for context
   */
  private generateCacheKey(context: EvaluationContext): string {
    const key = `${context.user.userId}:${context.device.deviceId}:${context.network.ipAddress}:${context.resource.resourceId}`
    return crypto.createHash('sha256').update(key).digest('hex')
  }
}

export default AccessController
