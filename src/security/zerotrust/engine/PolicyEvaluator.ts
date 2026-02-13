/**
 * Policy Evaluator
 *
 * Handles evaluation of policy conditions against request context.
 *
 * @module PolicyEvaluator
 */

import {
  PolicyCondition,
  EvaluationContext,
  UserContext,
  DeviceContext,
  NetworkContext,
  ResourceContext,
  TrustScoreComponents
} from './types'

/**
 * Policy condition evaluator
 */
export class PolicyEvaluator {
  /**
   * Evaluate all conditions against context
   */
  evaluateConditions(
    conditions: PolicyCondition[],
    context: EvaluationContext,
    trustScores: TrustScoreComponents,
    calculateCompositeTrustScore: (scores: TrustScoreComponents) => number
  ): boolean {
    return conditions.every(condition =>
      this.evaluateCondition(condition, context, trustScores, calculateCompositeTrustScore)
    )
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(
    condition: PolicyCondition,
    context: EvaluationContext,
    trustScores: TrustScoreComponents,
    calculateCompositeTrustScore: (scores: TrustScoreComponents) => number
  ): boolean {
    let result = false

    switch (condition.type) {
      case 'user':
        result = this.evaluateUserCondition(condition, context.user)
        break
      case 'device':
        result = this.evaluateDeviceCondition(condition, context.device)
        break
      case 'network':
        result = this.evaluateNetworkCondition(condition, context.network)
        break
      case 'resource':
        result = this.evaluateResourceCondition(condition, context.resource)
        break
      case 'risk':
        result = this.evaluateRiskCondition(condition, trustScores, calculateCompositeTrustScore)
        break
      case 'time':
        result = this.evaluateTimeCondition(condition)
        break
      case 'custom':
        result = true // Implement custom logic as needed
        break
    }

    return condition.negate ? !result : result
  }

  /**
   * Evaluate user conditions
   */
  private evaluateUserCondition(condition: PolicyCondition, user: UserContext): boolean {
    const { field, operator, value } = condition

    switch (field) {
      case 'roles':
        return this.evaluateArrayMatch(user.roles, value as string[], operator)
      case 'groups':
        return this.evaluateArrayMatch(user.groups, value as string[], operator)
      case 'department':
        return this.evaluateStringMatch(user.department || '', value as string, operator)
      case 'mfaEnabled':
        return user.mfaEnabled === value
      case 'riskProfile':
        return this.evaluateStringMatch(user.riskProfile || 'low', value as string, operator)
      default:
        return false
    }
  }

  /**
   * Evaluate device conditions
   */
  private evaluateDeviceCondition(condition: PolicyCondition, device: DeviceContext): boolean {
    const { field, operator, value } = condition

    switch (field) {
      case 'complianceStatus':
        return this.evaluateStringMatch(device.complianceStatus, value as string, operator)
      case 'encryptionEnabled':
        return device.encryptionEnabled === value
      case 'antivirusStatus':
        return this.evaluateStringMatch(device.antivirusStatus, value as string, operator)
      case 'vpnConnected':
        return device.vpnConnected === value
      case 'isJailbroken':
        return device.isJailbroken === value
      default:
        return false
    }
  }

  /**
   * Evaluate network conditions
   */
  private evaluateNetworkCondition(condition: PolicyCondition, network: NetworkContext): boolean {
    const { field, operator, value } = condition

    switch (field) {
      case 'isVPN':
        return network.isVPN === value
      case 'isProxy':
        return network.isProxy === value
      case 'country':
        return this.evaluateStringMatch(network.geolocation?.country || '', value as string, operator)
      default:
        return false
    }
  }

  /**
   * Evaluate resource conditions
   */
  private evaluateResourceCondition(condition: PolicyCondition, resource: ResourceContext): boolean {
    const { field, operator, value } = condition

    switch (field) {
      case 'classification':
        return this.evaluateStringMatch(resource.classification, value as string, operator)
      case 'accessLevel':
        return this.evaluateStringMatch(resource.accessLevel, value as string, operator)
      default:
        return false
    }
  }

  /**
   * Evaluate risk conditions
   */
  private evaluateRiskCondition(
    condition: PolicyCondition,
    trustScores: TrustScoreComponents,
    calculateCompositeTrustScore: (scores: TrustScoreComponents) => number
  ): boolean {
    const { field, operator, value } = condition
    const compositeTrustScore = calculateCompositeTrustScore(trustScores)
    const riskScore = 100 - compositeTrustScore

    if (field === 'riskScore') {
      return this.evaluateNumericComparison(riskScore, value as number, operator)
    }

    return false
  }

  /**
   * Evaluate time conditions
   */
  private evaluateTimeCondition(_condition: PolicyCondition): boolean {
    // Implement time-based conditions (business hours, specific times, etc.)
    return true
  }

  /**
   * Helper: Array matching
   */
  private evaluateArrayMatch(actual: string[], expected: string[], operator: string): boolean {
    switch (operator) {
      case 'in':
        return actual.some(a => expected.includes(a))
      case 'not_in':
        return !actual.some(a => expected.includes(a))
      case 'equals':
        return JSON.stringify(actual.sort()) === JSON.stringify(expected.sort())
      case 'not_equals':
        return JSON.stringify(actual.sort()) !== JSON.stringify(expected.sort())
      default:
        return false
    }
  }

  /**
   * Helper: String matching
   */
  private evaluateStringMatch(actual: string, expected: string, operator: string): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected
      case 'not_equals':
        return actual !== expected
      case 'contains':
        return actual.includes(expected)
      case 'matches':
        return new RegExp(expected).test(actual)
      default:
        return false
    }
  }

  /**
   * Helper: Numeric comparison
   */
  private evaluateNumericComparison(actual: number, expected: number, operator: string): boolean {
    switch (operator) {
      case 'greater_than':
        return actual > expected
      case 'less_than':
        return actual < expected
      case 'equals':
        return actual === expected
      default:
        return false
    }
  }
}

export default PolicyEvaluator
