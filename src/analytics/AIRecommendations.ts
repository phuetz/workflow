/**
 * AI-Powered Recommendations Engine
 *
 * Provides intelligent recommendations for:
 * - Workflow optimization (remove redundant nodes, parallelize, caching)
 * - Node replacement suggestions
 * - Alternative workflow designs
 * - Cost optimization
 * - Performance improvements
 * - Security best practices
 *
 * @module AIRecommendations
 */

// Re-export types for backward compatibility
export {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowSettings,
  Recommendation,
  SuggestedChange,
  OptimizationAnalysis,
  RecommendationType,
  RecommendationPriority,
  EffortLevel,
  RecommendationImpact,
  DuplicateNodeInfo,
  NodeReplacementInfo,
  NodeReplacementMap,
  WorkflowExecutionData,
} from './recommendations/types';

// Import types for internal use
import {
  Workflow,
  Recommendation,
  OptimizationAnalysis,
  WorkflowExecutionData,
} from './recommendations/types';

// Import modular components
import { DataAnalyzer } from './recommendations/DataAnalyzer';
import { PriorityRanker } from './recommendations/PriorityRanker';
import { RecommendationEngine } from './recommendations/RecommendationEngine';
import { RecommendationFormatter } from './recommendations/RecommendationFormatter';

// Re-export components for direct access
export { DataAnalyzer } from './recommendations/DataAnalyzer';
export { PriorityRanker } from './recommendations/PriorityRanker';
export { RecommendationEngine } from './recommendations/RecommendationEngine';
export { RecommendationFormatter } from './recommendations/RecommendationFormatter';

/**
 * Main AI Recommendations Engine - Orchestrates all recommendation components
 */
export class AIRecommendationsEngine {
  private dataAnalyzer: DataAnalyzer;
  private priorityRanker: PriorityRanker;
  private recommendationEngine: RecommendationEngine;
  private formatter: RecommendationFormatter;

  constructor() {
    this.dataAnalyzer = new DataAnalyzer();
    this.priorityRanker = new PriorityRanker(this.dataAnalyzer);
    this.recommendationEngine = new RecommendationEngine(
      this.dataAnalyzer,
      this.priorityRanker
    );
    this.formatter = new RecommendationFormatter();
  }

  /**
   * Analyze workflow and generate comprehensive recommendations
   */
  async analyzeWorkflow(
    workflow: Workflow,
    executionData?: WorkflowExecutionData[]
  ): Promise<OptimizationAnalysis> {
    const recommendations: Recommendation[] = [];

    // Detect redundant nodes
    recommendations.push(
      ...this.recommendationEngine.detectRedundantNodes(workflow)
    );

    // Suggest parallelization opportunities
    recommendations.push(
      ...this.recommendationEngine.suggestParallelization(workflow)
    );

    // Suggest caching opportunities
    recommendations.push(
      ...this.recommendationEngine.suggestCaching(workflow, executionData)
    );

    // Detect error handling issues
    recommendations.push(
      ...this.recommendationEngine.detectErrorHandlingIssues(workflow)
    );

    // Suggest node replacements
    recommendations.push(
      ...this.recommendationEngine.suggestNodeReplacements(workflow)
    );

    // Cost optimization suggestions
    recommendations.push(
      ...this.recommendationEngine.suggestCostOptimizations(workflow, executionData)
    );

    // Performance improvements
    recommendations.push(
      ...this.recommendationEngine.suggestPerformanceImprovements(workflow, executionData)
    );

    // Security best practices
    recommendations.push(
      ...this.recommendationEngine.suggestSecurityImprovements(workflow)
    );

    // Alternative workflow designs
    recommendations.push(
      ...this.recommendationEngine.suggestAlternativeDesigns(workflow)
    );

    // Calculate scores
    const currentScore = this.priorityRanker.calculateWorkflowScore(
      workflow,
      executionData
    );
    const potentialScore = this.priorityRanker.calculatePotentialScore(
      currentScore,
      recommendations
    );

    // Sort by priority and impact
    const sortedRecommendations = this.priorityRanker.sortRecommendations(
      recommendations
    );

    return {
      workflow,
      executionData,
      recommendations: sortedRecommendations,
      score: {
        current: currentScore,
        potential: potentialScore,
        improvement: ((potentialScore - currentScore) / currentScore) * 100,
      },
      summary: this.formatter.generateSummary(
        sortedRecommendations,
        currentScore,
        potentialScore
      ),
    };
  }

  /**
   * Get the data analyzer instance for direct access
   */
  getDataAnalyzer(): DataAnalyzer {
    return this.dataAnalyzer;
  }

  /**
   * Get the priority ranker instance for direct access
   */
  getPriorityRanker(): PriorityRanker {
    return this.priorityRanker;
  }

  /**
   * Get the recommendation engine instance for direct access
   */
  getRecommendationEngine(): RecommendationEngine {
    return this.recommendationEngine;
  }

  /**
   * Get the formatter instance for direct access
   */
  getFormatter(): RecommendationFormatter {
    return this.formatter;
  }

  /**
   * Format recommendations as a readable report
   */
  formatReport(analysis: OptimizationAnalysis): string {
    return this.formatter.formatReport(
      analysis.recommendations,
      analysis.score.current,
      analysis.score.potential
    );
  }

  /**
   * Filter recommendations by minimum priority level
   */
  filterByPriority(
    recommendations: Recommendation[],
    minPriority: 'low' | 'medium' | 'high' | 'critical'
  ): Recommendation[] {
    return this.formatter.filterByMinPriority(recommendations, minPriority);
  }

  /**
   * Group recommendations by type
   */
  groupByType(recommendations: Recommendation[]): Record<string, Recommendation[]> {
    return this.formatter.groupByType(recommendations);
  }

  /**
   * Get total estimated impact across all recommendations
   */
  getTotalImpact(recommendations: Recommendation[]): {
    performance: number;
    cost: number;
    reliability: number;
    security: number;
  } {
    return this.formatter.getTotalImpact(recommendations);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let engineInstance: AIRecommendationsEngine | null = null;

export function getAIRecommendationsEngine(): AIRecommendationsEngine {
  if (!engineInstance) {
    engineInstance = new AIRecommendationsEngine();
  }
  return engineInstance;
}
