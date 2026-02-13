/**
 * Risk Evaluator - Automated Risk Scoring (0-100)
 * Real-time risk assessment with trend analysis and predictive modeling
 */

import { EventEmitter } from 'events';
import type {
  RiskScore,
  RiskFactors,
  RiskEvaluationHistory,
  PolicyContext,
  DataAccessInfo,
  APICallInfo,
} from './types/governance';

/**
 * Risk evaluation configuration
 */
interface RiskEvaluatorConfig {
  enableTrendAnalysis: boolean;
  historyRetentionDays: number;
  riskThresholds: {
    low: number;      // < 25
    medium: number;   // 25-50
    high: number;     // 50-75
    critical: number; // > 75
  };
  weights: {
    dataAccess: number;
    externalAPIs: number;
    userPermissions: number;
    executionHistory: number;
    complexity: number;
    piiExposure: number;
    complianceRisk: number;
    costRisk: number;
    performanceRisk: number;
    ethicalRisk: number;
  };
}

/**
 * Execution history entry
 */
interface ExecutionHistory {
  agentId: string;
  timestamp: Date;
  success: boolean;
  duration: number;
  errorType?: string;
}

/**
 * Risk Evaluator - Automated risk scoring engine
 */
export class RiskEvaluator extends EventEmitter {
  private config: RiskEvaluatorConfig;
  private evaluationHistory: Map<string, RiskScore[]> = new Map();
  private executionHistory: Map<string, ExecutionHistory[]> = new Map();

  constructor(config: Partial<RiskEvaluatorConfig> = {}) {
    super();

    this.config = {
      enableTrendAnalysis: config.enableTrendAnalysis ?? true,
      historyRetentionDays: config.historyRetentionDays ?? 90,
      riskThresholds: config.riskThresholds || {
        low: 25,
        medium: 50,
        high: 75,
        critical: 100,
      },
      weights: config.weights || {
        dataAccess: 0.15,
        externalAPIs: 0.12,
        userPermissions: 0.10,
        executionHistory: 0.10,
        complexity: 0.08,
        piiExposure: 0.15,
        complianceRisk: 0.12,
        costRisk: 0.08,
        performanceRisk: 0.05,
        ethicalRisk: 0.05,
      },
    };

    // Validate weights sum to 1.0
    const weightSum = Object.values(this.config.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(weightSum - 1.0) > 0.01) {
      throw new Error(`Risk factor weights must sum to 1.0, got ${weightSum}`);
    }

    // Cleanup old history periodically
    setInterval(() => this.cleanupOldHistory(), 24 * 60 * 60 * 1000); // Daily
  }

  // ============================================================================
  // Risk Evaluation
  // ============================================================================

  /**
   * Evaluate risk for a policy context
   */
  async evaluateRisk(context: PolicyContext): Promise<RiskScore> {
    const startTime = Date.now();

    // Calculate individual risk factors
    const factors: RiskFactors = {
      dataAccess: this.evaluateDataAccessRisk(context.dataAccess),
      externalAPIs: this.evaluateExternalAPIRisk(context.apiCalls),
      userPermissions: this.evaluatePermissionRisk(context.requestedActions),
      executionHistory: this.evaluateExecutionHistoryRisk(context.agentId),
      complexity: this.evaluateComplexityRisk(context),
      piiExposure: this.evaluatePIIExposureRisk(context.dataAccess),
      complianceRisk: this.evaluateComplianceRisk(context),
      costRisk: this.evaluateCostRisk(context.estimatedCost),
      performanceRisk: this.evaluatePerformanceRisk(context.estimatedDuration),
      ethicalRisk: this.evaluateEthicalRisk(context),
    };

    // Calculate weighted overall score
    const overall = this.calculateOverallScore(factors);

    // Determine severity
    const severity = this.determineSeverity(overall);

    // Generate recommendations
    const recommendations = this.generateRecommendations(factors, overall);

    // Calculate confidence based on data availability
    const confidence = this.calculateConfidence(context, factors);

    const riskScore: RiskScore = {
      overall,
      factors,
      severity,
      confidence,
      recommendations,
      calculatedAt: new Date(),
    };

    // Store in history
    this.storeEvaluation(context.agentId, riskScore);

    // Emit event
    this.emit('risk:evaluated', {
      agentId: context.agentId,
      score: overall,
      severity,
      duration: Date.now() - startTime,
    });

    return riskScore;
  }

  // ============================================================================
  // Individual Risk Factor Evaluators
  // ============================================================================

  /**
   * Evaluate data access risk (0-100)
   */
  private evaluateDataAccessRisk(dataAccess: DataAccessInfo[]): number {
    if (dataAccess.length === 0) return 0;

    let risk = 0;
    const classificationRisk = {
      public: 0,
      internal: 25,
      confidential: 60,
      restricted: 100,
    };

    for (const access of dataAccess) {
      const baseRisk = classificationRisk[access.dataClassification] || 0;

      // Increase risk for write/delete operations
      const operationMultiplier = access.accessType === 'delete' ? 1.5 :
                                   access.accessType === 'write' ? 1.2 : 1.0;

      risk += baseRisk * operationMultiplier;
    }

    return Math.min(100, risk / dataAccess.length);
  }

  /**
   * Evaluate external API risk (0-100)
   */
  private evaluateExternalAPIRisk(apiCalls: APICallInfo[]): number {
    if (apiCalls.length === 0) return 0;

    const externalCalls = apiCalls.filter(call => call.isExternal);
    if (externalCalls.length === 0) return 0;

    // Base risk for external calls
    let risk = externalCalls.length * 10;

    // Increase risk for unauthenticated calls
    const unauthenticatedCalls = externalCalls.filter(call => !call.requiresAuth).length;
    risk += unauthenticatedCalls * 20;

    return Math.min(100, risk);
  }

  /**
   * Evaluate permission risk (0-100)
   */
  private evaluatePermissionRisk(requestedActions: string[]): number {
    if (requestedActions.length === 0) return 0;

    const highRiskActions = [
      'system:admin',
      'user:delete',
      'credential:delete',
      'workflow:delete',
      'data:delete',
    ];

    const highRiskCount = requestedActions.filter(action =>
      highRiskActions.some(risk => action.includes(risk))
    ).length;

    // Base risk increases with number of permissions
    const baseRisk = Math.min(50, requestedActions.length * 5);

    // Add risk for high-risk actions
    const actionRisk = Math.min(50, highRiskCount * 15);

    return baseRisk + actionRisk;
  }

  /**
   * Evaluate execution history risk (0-100)
   */
  private evaluateExecutionHistoryRisk(agentId: string): number {
    const history = this.executionHistory.get(agentId) || [];
    if (history.length === 0) return 50; // Unknown = medium risk

    const recent = history.slice(-20); // Last 20 executions
    const failures = recent.filter(h => !h.success).length;
    const failureRate = failures / recent.length;

    // High failure rate = high risk
    const baseRisk = failureRate * 100;

    // Check for recurring error patterns
    const errorTypes = recent
      .filter(h => !h.success && h.errorType)
      .map(h => h.errorType);

    const uniqueErrors = new Set(errorTypes).size;
    const recurringErrors = errorTypes.length - uniqueErrors;
    const patternRisk = Math.min(20, recurringErrors * 5);

    return Math.min(100, baseRisk + patternRisk);
  }

  /**
   * Evaluate complexity risk (0-100)
   */
  private evaluateComplexityRisk(context: PolicyContext): number {
    let risk = 0;

    // Risk from number of requested actions
    risk += Math.min(30, context.requestedActions.length * 3);

    // Risk from data sources
    risk += Math.min(20, context.dataAccess.length * 5);

    // Risk from API integrations
    risk += Math.min(30, context.apiCalls.length * 5);

    // Risk from workflow complexity (if available)
    const nodeCount = context.metadata?.nodeCount || 0;
    risk += Math.min(20, nodeCount * 2);

    return Math.min(100, risk);
  }

  /**
   * Evaluate PII exposure risk (0-100)
   */
  private evaluatePIIExposureRisk(dataAccess: DataAccessInfo[]): number {
    const piiAccess = dataAccess.filter(d => d.containsPII);
    if (piiAccess.length === 0) return 0;

    // Base risk for accessing PII
    let risk = piiAccess.length * 20;

    // Increase risk for sensitive operations
    const writeOrDelete = piiAccess.filter(
      d => d.accessType === 'write' || d.accessType === 'delete'
    ).length;
    risk += writeOrDelete * 15;

    // Increase risk for confidential/restricted PII
    const sensitivePII = piiAccess.filter(
      d => d.dataClassification === 'confidential' || d.dataClassification === 'restricted'
    ).length;
    risk += sensitivePII * 20;

    return Math.min(100, risk);
  }

  /**
   * Evaluate compliance risk (0-100)
   */
  private evaluateComplianceRisk(context: PolicyContext): number {
    let risk = 0;

    // Risk from data residency issues
    const residencyIssues = context.dataAccess.filter(
      d => d.dataResidency && d.dataResidency !== context.metadata?.requiredResidency
    ).length;
    risk += residencyIssues * 30;

    // Risk from missing compliance frameworks
    const requiredFrameworks = context.metadata?.requiredFrameworks || [];
    const enabledFrameworks = context.metadata?.enabledFrameworks || [];
    const missingFrameworks = requiredFrameworks.filter(
      (f: string) => !enabledFrameworks.includes(f)
    ).length;
    risk += missingFrameworks * 25;

    return Math.min(100, risk);
  }

  /**
   * Evaluate cost risk (0-100)
   */
  private evaluateCostRisk(estimatedCost: number | undefined): number {
    if (!estimatedCost) return 0;

    // Define cost thresholds
    const thresholds = {
      low: 10,
      medium: 50,
      high: 100,
      critical: 500,
    };

    if (estimatedCost < thresholds.low) return 0;
    if (estimatedCost < thresholds.medium) return 25;
    if (estimatedCost < thresholds.high) return 50;
    if (estimatedCost < thresholds.critical) return 75;
    return 100;
  }

  /**
   * Evaluate performance risk (0-100)
   */
  private evaluatePerformanceRisk(estimatedDuration: number | undefined): number {
    if (!estimatedDuration) return 0;

    // Define duration thresholds (in milliseconds)
    const thresholds = {
      low: 30000,     // 30 seconds
      medium: 120000, // 2 minutes
      high: 300000,   // 5 minutes
      critical: 900000, // 15 minutes
    };

    if (estimatedDuration < thresholds.low) return 0;
    if (estimatedDuration < thresholds.medium) return 25;
    if (estimatedDuration < thresholds.high) return 50;
    if (estimatedDuration < thresholds.critical) return 75;
    return 100;
  }

  /**
   * Evaluate ethical AI risk (0-100)
   */
  private evaluateEthicalRisk(context: PolicyContext): number {
    let risk = 0;

    // Risk from high-impact decisions
    const highImpactDomains = ['hiring', 'lending', 'healthcare', 'legal'];
    const isHighImpact = context.metadata?.domain &&
                         highImpactDomains.includes(context.metadata.domain);
    if (isHighImpact) risk += 40;

    // Risk from lack of explainability
    const isExplainable = context.metadata?.explainable === true;
    if (!isExplainable && isHighImpact) risk += 30;

    // Risk from bias potential
    const biasRisk = context.metadata?.biasScore || 0;
    risk += biasRisk * 30;

    return Math.min(100, risk);
  }

  // ============================================================================
  // Score Calculation
  // ============================================================================

  /**
   * Calculate weighted overall risk score
   */
  private calculateOverallScore(factors: RiskFactors): number {
    const { weights } = this.config;

    const score =
      factors.dataAccess * weights.dataAccess +
      factors.externalAPIs * weights.externalAPIs +
      factors.userPermissions * weights.userPermissions +
      factors.executionHistory * weights.executionHistory +
      factors.complexity * weights.complexity +
      factors.piiExposure * weights.piiExposure +
      factors.complianceRisk * weights.complianceRisk +
      factors.costRisk * weights.costRisk +
      factors.performanceRisk * weights.performanceRisk +
      factors.ethicalRisk * weights.ethicalRisk;

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Determine severity from score
   */
  private determineSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
    const { riskThresholds } = this.config;

    if (score < riskThresholds.low) return 'low';
    if (score < riskThresholds.medium) return 'medium';
    if (score < riskThresholds.high) return 'high';
    return 'critical';
  }

  /**
   * Calculate confidence in risk assessment
   */
  private calculateConfidence(context: PolicyContext, factors: RiskFactors): number {
    let confidence = 100;

    // Reduce confidence for missing data
    if (!context.estimatedCost) confidence -= 10;
    if (!context.estimatedDuration) confidence -= 10;
    if (context.dataAccess.length === 0) confidence -= 15;
    if (context.apiCalls.length === 0) confidence -= 5;

    // Reduce confidence for unknown execution history
    const history = this.executionHistory.get(context.agentId) || [];
    if (history.length === 0) confidence -= 20;
    else if (history.length < 5) confidence -= 10;

    return Math.max(0, confidence);
  }

  // ============================================================================
  // Recommendations
  // ============================================================================

  /**
   * Generate risk mitigation recommendations
   */
  private generateRecommendations(factors: RiskFactors, overall: number): string[] {
    const recommendations: string[] = [];

    // Check each factor and recommend mitigations
    if (factors.dataAccess > 60) {
      recommendations.push('Reduce access to sensitive data or implement additional safeguards');
    }

    if (factors.externalAPIs > 50) {
      recommendations.push('Review external API integrations and implement rate limiting');
    }

    if (factors.userPermissions > 50) {
      recommendations.push('Apply principle of least privilege to reduce permission scope');
    }

    if (factors.executionHistory > 60) {
      recommendations.push('Investigate recurring failures and improve error handling');
    }

    if (factors.complexity > 60) {
      recommendations.push('Simplify workflow to reduce complexity and potential failure points');
    }

    if (factors.piiExposure > 70) {
      recommendations.push('Implement PII masking and minimize PII data access');
    }

    if (factors.complianceRisk > 50) {
      recommendations.push('Enable required compliance frameworks and fix data residency issues');
    }

    if (factors.costRisk > 50) {
      recommendations.push('Optimize resource usage to reduce execution costs');
    }

    if (factors.performanceRisk > 50) {
      recommendations.push('Optimize execution time through caching and parallel processing');
    }

    if (factors.ethicalRisk > 50) {
      recommendations.push('Add human review for high-impact decisions and ensure explainability');
    }

    // Overall recommendations
    if (overall > 75) {
      recommendations.push('CRITICAL: This agent requires immediate security review');
      recommendations.push('Consider disabling agent until risks are mitigated');
    } else if (overall > 50) {
      recommendations.push('Conduct thorough security review before production deployment');
    }

    return recommendations;
  }

  // ============================================================================
  // History Management
  // ============================================================================

  /**
   * Store risk evaluation in history
   */
  private storeEvaluation(agentId: string, score: RiskScore): void {
    let history = this.evaluationHistory.get(agentId) || [];
    history.push(score);

    // Keep only recent evaluations
    const cutoffDate = new Date(Date.now() - this.config.historyRetentionDays * 24 * 60 * 60 * 1000);
    history = history.filter(s => s.calculatedAt >= cutoffDate);

    this.evaluationHistory.set(agentId, history);
  }

  /**
   * Record execution history
   */
  recordExecution(
    agentId: string,
    success: boolean,
    duration: number,
    errorType?: string
  ): void {
    let history = this.executionHistory.get(agentId) || [];
    history.push({
      agentId,
      timestamp: new Date(),
      success,
      duration,
      errorType,
    });

    // Keep only recent executions (last 100)
    if (history.length > 100) {
      history = history.slice(-100);
    }

    this.executionHistory.set(agentId, history);
  }

  /**
   * Get evaluation history for agent
   */
  getEvaluationHistory(agentId: string): RiskEvaluationHistory | null {
    const evaluations = this.evaluationHistory.get(agentId) || [];
    if (evaluations.length === 0) return null;

    // Calculate averages
    const now = Date.now();
    const day7 = now - 7 * 24 * 60 * 60 * 1000;
    const day30 = now - 30 * 24 * 60 * 60 * 1000;
    const day90 = now - 90 * 24 * 60 * 60 * 1000;

    const calc7d = evaluations.filter(e => e.calculatedAt.getTime() >= day7);
    const calc30d = evaluations.filter(e => e.calculatedAt.getTime() >= day30);
    const calc90d = evaluations.filter(e => e.calculatedAt.getTime() >= day90);

    const avg = (scores: RiskScore[]) =>
      scores.length > 0
        ? scores.reduce((sum, s) => sum + s.overall, 0) / scores.length
        : 0;

    const avgScore7d = avg(calc7d);
    const avgScore30d = avg(calc30d);
    const avgScore90d = avg(calc90d);

    // Determine trend
    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (avgScore7d < avgScore30d - 5) trend = 'improving';
    else if (avgScore7d > avgScore30d + 5) trend = 'degrading';

    return {
      agentId,
      evaluations,
      trend,
      avgScore7d,
      avgScore30d,
      avgScore90d,
    };
  }

  /**
   * Cleanup old history
   */
  private cleanupOldHistory(): void {
    const cutoffDate = new Date(Date.now() - this.config.historyRetentionDays * 24 * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [agentId, history] of this.evaluationHistory.entries()) {
      const filtered = history.filter(s => s.calculatedAt >= cutoffDate);
      if (filtered.length !== history.length) {
        this.evaluationHistory.set(agentId, filtered);
        cleaned += history.length - filtered.length;
      }
    }

    if (cleaned > 0) {
      this.emit('history:cleaned', { count: cleaned });
    }
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const allScores: number[] = [];
    let highRiskAgents = 0;

    for (const history of this.evaluationHistory.values()) {
      if (history.length > 0) {
        const latest = history[history.length - 1];
        allScores.push(latest.overall);
        if (latest.overall > 75) highRiskAgents++;
      }
    }

    const avgRiskScore = allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;

    return {
      totalAgents: this.evaluationHistory.size,
      avgRiskScore,
      highRiskAgents,
      totalEvaluations: Array.from(this.evaluationHistory.values())
        .reduce((sum, h) => sum + h.length, 0),
    };
  }
}

/**
 * Singleton instance
 */
export const riskEvaluator = new RiskEvaluator();
