import { AgentOutput } from '../../types/agents';
import { AgentBase } from '../agents/AgentBase';
import { logger } from '../../services/SimpleLogger';

/**
 * ConsensusManager - Manages multi-agent consensus building
 * Implements various consensus strategies: voting, averaging, weighted, etc.
 */
export class ConsensusManager {
  constructor() {
    logger.info('ConsensusManager initialized');
  }

  /**
   * Build consensus from multiple agent outputs using voting
   */
  async buildConsensus(
    outputs: AgentOutput[],
    strategy: ConsensusStrategy = 'majority-vote'
  ): Promise<ConsensusResult> {
    if (outputs.length === 0) {
      throw new Error('At least one output required for consensus');
    }

    const startTime = Date.now();

    logger.debug(`Building consensus with strategy: ${strategy}`, {
      outputCount: outputs.length,
    });

    let consensusOutput: AgentOutput;
    let confidence: number;
    let agreement: number;

    switch (strategy) {
      case 'majority-vote':
        ({ consensusOutput, confidence, agreement } = this.majorityVote(outputs));
        break;

      case 'weighted-vote':
        ({ consensusOutput, confidence, agreement } = this.weightedVote(outputs));
        break;

      case 'average':
        ({ consensusOutput, confidence, agreement } = this.average(outputs));
        break;

      case 'median':
        ({ consensusOutput, confidence, agreement } = this.median(outputs));
        break;

      case 'unanimous':
        ({ consensusOutput, confidence, agreement } = this.unanimous(outputs));
        break;

      case 'highest-confidence':
        ({ consensusOutput, confidence, agreement } = this.highestConfidence(outputs));
        break;

      case 'consensus-threshold':
        ({ consensusOutput, confidence, agreement } = this.consensusThreshold(outputs, 0.7));
        break;

      default:
        throw new Error(`Unknown consensus strategy: ${strategy}`);
    }

    const result: ConsensusResult = {
      strategy,
      consensusOutput,
      confidence,
      agreement,
      participantCount: outputs.length,
      executionTime: Date.now() - startTime,
      metadata: {
        allOutputs: outputs.map(o => ({
          result: o.result,
          confidence: o.confidence,
        })),
      },
    };

    logger.debug(`Consensus built successfully`, {
      strategy,
      confidence,
      agreement,
      time: result.executionTime,
    });

    return result;
  }

  /**
   * Check if consensus is reached based on threshold
   */
  isConsensusReached(outputs: AgentOutput[], threshold = 0.7): boolean {
    const { agreement } = this.majorityVote(outputs);
    return agreement >= threshold;
  }

  /**
   * Get disagreement analysis
   */
  analyzeDisagreement(outputs: AgentOutput[]): DisagreementAnalysis {
    const groups = this.groupByResult(outputs);
    const diversity = groups.length / outputs.length;

    const distribution = groups.map(group => ({
      result: group.result,
      count: group.outputs.length,
      percentage: group.outputs.length / outputs.length,
      averageConfidence: group.outputs.reduce((sum, o) => sum + (o.confidence || 0), 0) / group.outputs.length,
    }));

    return {
      totalGroups: groups.length,
      diversity,
      distribution,
      hasStrongDisagreement: diversity > 0.5,
    };
  }

  // Consensus strategies

  private majorityVote(outputs: AgentOutput[]): {
    consensusOutput: AgentOutput;
    confidence: number;
    agreement: number;
  } {
    const groups = this.groupByResult(outputs);

    // Find the group with most votes
    let maxGroup = groups[0];
    groups.forEach(group => {
      if (group.outputs.length > maxGroup.outputs.length) {
        maxGroup = group;
      }
    });

    const agreement = maxGroup.outputs.length / outputs.length;
    const avgConfidence = maxGroup.outputs.reduce((sum, o) => sum + (o.confidence || 0), 0) / maxGroup.outputs.length;

    return {
      consensusOutput: {
        result: maxGroup.result,
        confidence: avgConfidence,
        metadata: {
          votes: maxGroup.outputs.length,
          totalVotes: outputs.length,
        },
      },
      confidence: avgConfidence * agreement, // Weighted by agreement
      agreement,
    };
  }

  private weightedVote(outputs: AgentOutput[]): {
    consensusOutput: AgentOutput;
    confidence: number;
    agreement: number;
  } {
    // Weight votes by confidence
    const weighted = new Map<string, { result: unknown; weight: number; count: number }>();

    outputs.forEach(output => {
      const key = JSON.stringify(output.result);
      const current = weighted.get(key) || { result: output.result, weight: 0, count: 0 };
      current.weight += output.confidence || 0.5;
      current.count += 1;
      weighted.set(key, current);
    });

    // Find highest weighted result
    let maxWeight = 0;
    let winner: unknown = null;
    let winnerCount = 0;

    weighted.forEach(({ result, weight, count }) => {
      if (weight > maxWeight) {
        maxWeight = weight;
        winner = result;
        winnerCount = count;
      }
    });

    const totalWeight = outputs.reduce((sum, o) => sum + (o.confidence || 0.5), 0);
    const agreement = winnerCount / outputs.length;

    return {
      consensusOutput: {
        result: winner,
        confidence: maxWeight / totalWeight,
        metadata: {
          weight: maxWeight,
          totalWeight,
        },
      },
      confidence: maxWeight / totalWeight,
      agreement,
    };
  }

  private average(outputs: AgentOutput[]): {
    consensusOutput: AgentOutput;
    confidence: number;
    agreement: number;
  } {
    // Only for numeric results
    const numericResults = outputs
      .map(o => o.result)
      .filter(r => typeof r === 'number') as number[];

    if (numericResults.length === 0) {
      // Fallback to majority vote
      return this.majorityVote(outputs);
    }

    const avg = numericResults.reduce((sum, val) => sum + val, 0) / numericResults.length;
    const variance = numericResults.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / numericResults.length;
    const stdDev = Math.sqrt(variance);

    // Agreement based on how close values are (low variance = high agreement)
    const normalizedVariance = stdDev / (avg || 1);
    const agreement = Math.max(0, 1 - normalizedVariance);

    const avgConfidence = outputs.reduce((sum, o) => sum + (o.confidence || 0), 0) / outputs.length;

    return {
      consensusOutput: {
        result: avg,
        confidence: avgConfidence,
        metadata: {
          variance,
          stdDev,
          count: numericResults.length,
        },
      },
      confidence: avgConfidence * agreement,
      agreement,
    };
  }

  private median(outputs: AgentOutput[]): {
    consensusOutput: AgentOutput;
    confidence: number;
    agreement: number;
  } {
    const numericResults = outputs
      .map(o => o.result)
      .filter(r => typeof r === 'number') as number[];

    if (numericResults.length === 0) {
      return this.majorityVote(outputs);
    }

    const sorted = [...numericResults].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

    // Agreement based on how many values are close to median
    const tolerance = 0.1 * median;
    const closeToMedian = numericResults.filter(
      val => Math.abs(val - median) <= tolerance
    ).length;
    const agreement = closeToMedian / numericResults.length;

    const avgConfidence = outputs.reduce((sum, o) => sum + (o.confidence || 0), 0) / outputs.length;

    return {
      consensusOutput: {
        result: median,
        confidence: avgConfidence,
        metadata: {
          median,
          count: numericResults.length,
        },
      },
      confidence: avgConfidence * agreement,
      agreement,
    };
  }

  private unanimous(outputs: AgentOutput[]): {
    consensusOutput: AgentOutput;
    confidence: number;
    agreement: number;
  } {
    const groups = this.groupByResult(outputs);

    if (groups.length === 1) {
      // Perfect consensus
      const avgConfidence = outputs.reduce((sum, o) => sum + (o.confidence || 0), 0) / outputs.length;
      return {
        consensusOutput: {
          result: groups[0].result,
          confidence: avgConfidence,
          metadata: { unanimous: true },
        },
        confidence: avgConfidence,
        agreement: 1,
      };
    }

    // No consensus - return null or throw error
    throw new Error('Unanimous consensus not reached');
  }

  private highestConfidence(outputs: AgentOutput[]): {
    consensusOutput: AgentOutput;
    confidence: number;
    agreement: number;
  } {
    let best = outputs[0];

    outputs.forEach(output => {
      if ((output.confidence || 0) > (best.confidence || 0)) {
        best = output;
      }
    });

    // Agreement is based on how many agents had similar confidence
    const similarConfidence = outputs.filter(
      o => Math.abs((o.confidence || 0) - (best.confidence || 0)) < 0.1
    ).length;
    const agreement = similarConfidence / outputs.length;

    return {
      consensusOutput: best,
      confidence: best.confidence || 0,
      agreement,
    };
  }

  private consensusThreshold(outputs: AgentOutput[], threshold: number): {
    consensusOutput: AgentOutput;
    confidence: number;
    agreement: number;
  } {
    const groups = this.groupByResult(outputs);

    // Find a group that meets the threshold
    for (const group of groups) {
      const agreement = group.outputs.length / outputs.length;
      if (agreement >= threshold) {
        const avgConfidence = group.outputs.reduce((sum, o) => sum + (o.confidence || 0), 0) / group.outputs.length;
        return {
          consensusOutput: {
            result: group.result,
            confidence: avgConfidence,
            metadata: {
              threshold,
              actualAgreement: agreement,
            },
          },
          confidence: avgConfidence * agreement,
          agreement,
        };
      }
    }

    throw new Error(`Consensus threshold (${threshold}) not reached`);
  }

  // Helper methods

  private groupByResult(outputs: AgentOutput[]): ResultGroup[] {
    const groups = new Map<string, AgentOutput[]>();

    outputs.forEach(output => {
      const key = JSON.stringify(output.result);
      const group = groups.get(key) || [];
      group.push(output);
      groups.set(key, group);
    });

    return Array.from(groups.entries())
      .map(([key, outputs]) => ({
        result: JSON.parse(key),
        outputs,
      }))
      .sort((a, b) => b.outputs.length - a.outputs.length);
  }
}

// Types

export type ConsensusStrategy =
  | 'majority-vote'
  | 'weighted-vote'
  | 'average'
  | 'median'
  | 'unanimous'
  | 'highest-confidence'
  | 'consensus-threshold';

export interface ConsensusResult {
  strategy: ConsensusStrategy;
  consensusOutput: AgentOutput;
  confidence: number;
  agreement: number; // 0-1, how many agents agree
  participantCount: number;
  executionTime: number;
  metadata: Record<string, unknown>;
}

interface ResultGroup {
  result: unknown;
  outputs: AgentOutput[];
}

export interface DisagreementAnalysis {
  totalGroups: number;
  diversity: number; // 0-1, higher means more diverse opinions
  distribution: {
    result: unknown;
    count: number;
    percentage: number;
    averageConfidence: number;
  }[];
  hasStrongDisagreement: boolean;
}
