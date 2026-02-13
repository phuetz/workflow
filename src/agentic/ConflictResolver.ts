/**
 * Conflict Resolver
 *
 * Implements consensus algorithms, priority-based resolution,
 * human-in-the-loop escalation, and learning from resolutions
 */

import { AgentOutput } from '../types/agents';
import { InterAgentCommunication } from './InterAgentCommunication';
import { logger } from '../services/SimpleLogger';

/**
 * Conflict resolution strategy
 */
export type ConflictResolutionStrategy =
  | 'voting'
  | 'weighted-voting'
  | 'priority-based'
  | 'consensus'
  | 'human-escalation'
  | 'auto-retry'
  | 'best-confidence'
  | 'unanimous';

/**
 * Conflict instance
 */
export interface Conflict {
  id: string;
  agentOutputs: Array<{
    agentId: string;
    output: AgentOutput;
    confidence: number;
    weight?: number;
  }>;
  context: Record<string, unknown>;
  createdAt: string;
  resolvedAt?: string;
  resolution?: AgentOutput;
  strategy?: ConflictResolutionStrategy;
  metadata?: Record<string, unknown>;
}

/**
 * Resolution result
 */
export interface ResolutionResult {
  conflict: Conflict;
  resolution: AgentOutput;
  strategy: ConflictResolutionStrategy;
  confidence: number;
  reasoning: string;
  votesDistribution?: Record<string, number>;
  humanInvolved?: boolean;
}

/**
 * Consensus configuration
 */
export interface ConsensusConfig {
  minimumAgreement: number; // 0-1 (e.g., 0.66 for 2/3 majority)
  confidenceThreshold: number; // 0-1
  maxRetries: number;
  humanEscalationThreshold: number;
  enableLearning: boolean;
}

/**
 * Conflict Resolver
 */
export class ConflictResolver {
  private communication: InterAgentCommunication;
  private config: ConsensusConfig;
  private conflicts: Map<string, Conflict>;
  private resolvedCount = 0;
  private escalationCount = 0;
  private learningData: Map<string, ResolutionResult[]>;

  constructor(
    communication: InterAgentCommunication,
    config?: Partial<ConsensusConfig>
  ) {
    this.communication = communication;
    this.config = {
      minimumAgreement: config?.minimumAgreement || 0.66,
      confidenceThreshold: config?.confidenceThreshold || 0.7,
      maxRetries: config?.maxRetries || 3,
      humanEscalationThreshold: config?.humanEscalationThreshold || 0.5,
      enableLearning: config?.enableLearning ?? true,
    };

    this.conflicts = new Map();
    this.learningData = new Map();

    logger.info('ConflictResolver initialized', this.config);
  }

  /**
   * Resolve a conflict using the specified strategy
   */
  async resolve(
    conflict: Conflict,
    strategy?: ConflictResolutionStrategy
  ): Promise<ResolutionResult> {
    logger.info(`Resolving conflict ${conflict.id} with strategy: ${strategy || 'auto'}`);

    // Auto-select strategy if not specified
    const selectedStrategy = strategy || this.selectStrategy(conflict);

    let result: ResolutionResult;

    try {
      switch (selectedStrategy) {
        case 'voting':
          result = await this.resolveByVoting(conflict);
          break;
        case 'weighted-voting':
          result = await this.resolveByWeightedVoting(conflict);
          break;
        case 'priority-based':
          result = await this.resolveByPriority(conflict);
          break;
        case 'consensus':
          result = await this.resolveByConsensus(conflict);
          break;
        case 'human-escalation':
          result = await this.resolveByHumanEscalation(conflict);
          break;
        case 'auto-retry':
          result = await this.resolveByAutoRetry(conflict);
          break;
        case 'best-confidence':
          result = await this.resolveByBestConfidence(conflict);
          break;
        case 'unanimous':
          result = await this.resolveByUnanimous(conflict);
          break;
        default:
          result = await this.resolveByVoting(conflict);
      }

      // Update conflict
      conflict.resolvedAt = new Date().toISOString();
      conflict.resolution = result.resolution;
      conflict.strategy = selectedStrategy;

      this.resolvedCount++;

      // Learn from resolution
      if (this.config.enableLearning) {
        this.learn(result);
      }

      logger.info(`Conflict ${conflict.id} resolved using ${selectedStrategy} with confidence ${result.confidence}`);

      return result;
    } catch (error) {
      logger.error(`Failed to resolve conflict ${conflict.id}:`, error);
      throw error;
    }
  }

  /**
   * Create a conflict from multiple agent outputs
   */
  createConflict(
    agentOutputs: Array<{
      agentId: string;
      output: AgentOutput;
      confidence?: number;
      weight?: number;
    }>,
    context?: Record<string, unknown>
  ): Conflict {
    const conflict: Conflict = {
      id: this.generateId(),
      agentOutputs: agentOutputs.map(ao => ({
        ...ao,
        confidence: ao.confidence || ao.output.confidence || 0.5,
      })),
      context: context || {},
      createdAt: new Date().toISOString(),
    };

    this.conflicts.set(conflict.id, conflict);
    return conflict;
  }

  /**
   * Get conflict by ID
   */
  getConflict(conflictId: string): Conflict | undefined {
    return this.conflicts.get(conflictId);
  }

  /**
   * Get resolved count
   */
  getResolvedCount(): number {
    return this.resolvedCount;
  }

  /**
   * Get escalation count
   */
  getEscalationCount(): number {
    return this.escalationCount;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalConflicts: number;
    resolvedConflicts: number;
    escalations: number;
    averageResolutionConfidence: number;
    strategyDistribution: Record<ConflictResolutionStrategy, number>;
  } {
    const resolvedConflicts = Array.from(this.conflicts.values()).filter(c => c.resolvedAt);

    const strategyDistribution: Record<string, number> = {};
    let totalConfidence = 0;

    resolvedConflicts.forEach(conflict => {
      if (conflict.strategy) {
        strategyDistribution[conflict.strategy] = (strategyDistribution[conflict.strategy] || 0) + 1;
      }
      if (conflict.resolution?.confidence) {
        totalConfidence += conflict.resolution.confidence;
      }
    });

    return {
      totalConflicts: this.conflicts.size,
      resolvedConflicts: resolvedConflicts.length,
      escalations: this.escalationCount,
      averageResolutionConfidence: resolvedConflicts.length > 0
        ? totalConfidence / resolvedConflicts.length
        : 0,
      strategyDistribution: strategyDistribution as never,
    };
  }

  // Resolution strategies

  private async resolveByVoting(conflict: Conflict): Promise<ResolutionResult> {
    // Simple majority voting based on result similarity
    const resultGroups = this.groupSimilarResults(conflict.agentOutputs);

    const winner = Array.from(resultGroups.entries()).reduce((max, current) =>
      current[1].length > max[1].length ? current : max
    );

    const votes = winner[1];
    const totalVotes = conflict.agentOutputs.length;
    const confidence = votes.length / totalVotes;

    return {
      conflict,
      resolution: votes[0].output,
      strategy: 'voting',
      confidence,
      reasoning: `Selected by ${votes.length}/${totalVotes} votes`,
      votesDistribution: Object.fromEntries(
        Array.from(resultGroups.entries()).map(([key, value]) => [key, value.length])
      ),
    };
  }

  private async resolveByWeightedVoting(conflict: Conflict): Promise<ResolutionResult> {
    const resultGroups = this.groupSimilarResults(conflict.agentOutputs);

    // Calculate weighted votes
    const weightedScores = new Map<string, number>();
    for (const [key, outputs] of resultGroups) {
      const totalWeight = outputs.reduce((sum, o) => sum + (o.weight || 1), 0);
      weightedScores.set(key, totalWeight);
    }

    const winner = Array.from(weightedScores.entries()).reduce((max, current) =>
      current[1] > max[1] ? current : max
    );

    const winningOutputs = resultGroups.get(winner[0])!;
    const totalWeight = Array.from(weightedScores.values()).reduce((sum, w) => sum + w, 0);
    const confidence = winner[1] / totalWeight;

    return {
      conflict,
      resolution: winningOutputs[0].output,
      strategy: 'weighted-voting',
      confidence,
      reasoning: `Selected with weighted score ${winner[1]}/${totalWeight}`,
      votesDistribution: Object.fromEntries(weightedScores),
    };
  }

  private async resolveByPriority(conflict: Conflict): Promise<ResolutionResult> {
    // Select output with highest weight (priority)
    const highest = conflict.agentOutputs.reduce((max, current) =>
      (current.weight || 0) > (max.weight || 0) ? current : max
    );

    return {
      conflict,
      resolution: highest.output,
      strategy: 'priority-based',
      confidence: highest.confidence,
      reasoning: `Selected based on highest priority (weight: ${highest.weight})`,
    };
  }

  private async resolveByConsensus(conflict: Conflict): Promise<ResolutionResult> {
    const resultGroups = this.groupSimilarResults(conflict.agentOutputs);

    for (const [key, outputs] of resultGroups) {
      const agreement = outputs.length / conflict.agentOutputs.length;

      if (agreement >= this.config.minimumAgreement) {
        const avgConfidence = outputs.reduce((sum, o) => sum + o.confidence, 0) / outputs.length;

        return {
          conflict,
          resolution: outputs[0].output,
          strategy: 'consensus',
          confidence: avgConfidence,
          reasoning: `Consensus reached with ${(agreement * 100).toFixed(1)}% agreement`,
        };
      }
    }

    // No consensus, escalate
    logger.warn(`No consensus reached for conflict ${conflict.id}, escalating`);
    return this.resolveByHumanEscalation(conflict);
  }

  private async resolveByBestConfidence(conflict: Conflict): Promise<ResolutionResult> {
    const best = conflict.agentOutputs.reduce((max, current) =>
      current.confidence > max.confidence ? current : max
    );

    return {
      conflict,
      resolution: best.output,
      strategy: 'best-confidence',
      confidence: best.confidence,
      reasoning: `Selected output with highest confidence (${(best.confidence * 100).toFixed(1)}%)`,
    };
  }

  private async resolveByUnanimous(conflict: Conflict): Promise<ResolutionResult> {
    const resultGroups = this.groupSimilarResults(conflict.agentOutputs);

    if (resultGroups.size === 1) {
      const outputs = Array.from(resultGroups.values())[0];
      const avgConfidence = outputs.reduce((sum, o) => sum + o.confidence, 0) / outputs.length;

      return {
        conflict,
        resolution: outputs[0].output,
        strategy: 'unanimous',
        confidence: avgConfidence,
        reasoning: 'Unanimous agreement reached',
      };
    }

    // Not unanimous, escalate
    logger.warn(`No unanimous agreement for conflict ${conflict.id}, escalating`);
    return this.resolveByHumanEscalation(conflict);
  }

  private async resolveByHumanEscalation(conflict: Conflict): Promise<ResolutionResult> {
    this.escalationCount++;

    // Emit event for human review
    this.communication.emit('conflict:escalation', {
      conflictId: conflict.id,
      agentOutputs: conflict.agentOutputs,
      context: conflict.context,
    });

    logger.info(`Conflict ${conflict.id} escalated to human review`);

    // For now, select best confidence as fallback
    const best = conflict.agentOutputs.reduce((max, current) =>
      current.confidence > max.confidence ? current : max
    );

    return {
      conflict,
      resolution: best.output,
      strategy: 'human-escalation',
      confidence: this.config.humanEscalationThreshold,
      reasoning: 'Escalated to human review (using best confidence as temporary resolution)',
      humanInvolved: true,
    };
  }

  private async resolveByAutoRetry(conflict: Conflict): Promise<ResolutionResult> {
    // Request all agents to retry with adjusted parameters
    this.communication.emit('conflict:retry', {
      conflictId: conflict.id,
      agentIds: conflict.agentOutputs.map(o => o.agentId),
    });

    logger.info(`Conflict ${conflict.id} triggered auto-retry`);

    // For now, use best confidence
    const best = conflict.agentOutputs.reduce((max, current) =>
      current.confidence > max.confidence ? current : max
    );

    return {
      conflict,
      resolution: best.output,
      strategy: 'auto-retry',
      confidence: best.confidence,
      reasoning: 'Auto-retry triggered for all agents',
    };
  }

  // Helper methods

  private selectStrategy(conflict: Conflict): ConflictResolutionStrategy {
    const avgConfidence = conflict.agentOutputs.reduce((sum, o) => sum + o.confidence, 0) / conflict.agentOutputs.length;

    // Low confidence -> human escalation
    if (avgConfidence < this.config.humanEscalationThreshold) {
      return 'human-escalation';
    }

    // Check if weights are provided
    const hasWeights = conflict.agentOutputs.some(o => o.weight !== undefined);
    if (hasWeights) {
      return 'weighted-voting';
    }

    // High confidence variance -> best confidence
    const confidenceVariance = this.calculateVariance(conflict.agentOutputs.map(o => o.confidence));
    if (confidenceVariance > 0.1) {
      return 'best-confidence';
    }

    // Default to voting
    return 'voting';
  }

  private groupSimilarResults(
    outputs: Array<{ agentId: string; output: AgentOutput; confidence: number; weight?: number }>
  ): Map<string, typeof outputs> {
    const groups = new Map<string, typeof outputs>();

    for (const output of outputs) {
      // Simple grouping by result hash (in practice, use semantic similarity)
      const key = JSON.stringify(output.output.result);

      const group = groups.get(key) || [];
      group.push(output);
      groups.set(key, group);
    }

    return groups;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;
  }

  private learn(result: ResolutionResult): void {
    const strategyKey = result.strategy;
    const results = this.learningData.get(strategyKey) || [];
    results.push(result);
    this.learningData.set(strategyKey, results);

    // Analyze and adjust thresholds based on learning
    if (results.length >= 10) {
      const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
      const successRate = results.filter(r => r.confidence > 0.7).length / results.length;

      logger.debug(`Learning stats for ${strategyKey}:`, {
        samples: results.length,
        avgConfidence,
        successRate,
      });
    }
  }

  private generateId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
