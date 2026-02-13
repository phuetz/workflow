/**
 * Consensus Building Pattern
 *
 * Multiple agents work to reach consensus through voting and conflict resolution
 */

import { Agent, AgentInput, AgentOutput } from '../../types/agents';
import { InterAgentCommunication } from '../InterAgentCommunication';
import { ConflictResolver } from '../ConflictResolver';
import { AgenticPatternExecutor } from '../AgenticWorkflowEngine';
import { logger } from '../../services/SimpleLogger';

export class ConsensusPattern implements AgenticPatternExecutor {
  constructor(
    private communication: InterAgentCommunication,
    private conflictResolver: ConflictResolver
  ) {}

  async execute(
    agents: Agent[],
    input: AgentInput,
    options?: {
      maxIterations?: number;
      timeoutMs?: number;
      failurePolicy?: 'fail-fast' | 'continue' | 'retry';
    }
  ): Promise<AgentOutput> {
    if (agents.length < 3) {
      throw new Error('Consensus pattern requires at least 3 agents');
    }

    logger.info(`Consensus pattern: Building consensus with ${agents.length} agents`);

    // Phase 1: All agents independently process the input
    const agentOutputs = await Promise.all(
      agents.map(async (agent, i) => {
        const task = {
          id: `task_consensus_${i}`,
          agentId: agent.id,
          type: 'execute' as const,
          input,
          status: 'pending' as const,
          priority: 'medium' as const,
          createdAt: new Date().toISOString(),
          metadata: { phase: 'independent' },
          retryCount: 0,
          maxRetries: 0,
        };

        const output = await agent.executeTask(task);

        return {
          agentId: agent.id,
          output,
          confidence: output.confidence || 0.5,
        };
      })
    );

    // Phase 2: Resolve conflicts and build consensus
    const conflict = this.conflictResolver.createConflict(agentOutputs);
    const resolution = await this.conflictResolver.resolve(conflict, 'consensus');

    logger.info(`Consensus reached with ${resolution.confidence} confidence`);

    return {
      ...resolution.resolution,
      metadata: {
        ...resolution.resolution.metadata,
        pattern: 'consensus',
        agentCount: agents.length,
        consensusStrategy: resolution.strategy,
        votesDistribution: resolution.votesDistribution,
        iterations: 1,
        totalCost: 0,
        cacheHits: 0,
        parallelization: agents.length,
      },
    };
  }
}
