/**
 * Parallel Execution Pattern
 *
 * All agents process the same input simultaneously and results are aggregated
 */

import { Agent, AgentInput, AgentOutput } from '../../types/agents';
import { InterAgentCommunication } from '../InterAgentCommunication';
import { AgenticPatternExecutor } from '../AgenticWorkflowEngine';
import { logger } from '../../services/SimpleLogger';

export class ParallelPattern implements AgenticPatternExecutor {
  constructor(private communication: InterAgentCommunication) {}

  async execute(
    agents: Agent[],
    input: AgentInput,
    options?: {
      maxIterations?: number;
      timeoutMs?: number;
      failurePolicy?: 'fail-fast' | 'continue' | 'retry';
    }
  ): Promise<AgentOutput> {
    logger.info(`Parallel pattern: Processing with ${agents.length} agents`);

    // Execute all agents in parallel
    const tasks = agents.map(async (agent, i) => {
      try {
        await this.communication.publish({
          id: `parallel_${Date.now()}_${i}`,
          fromAgentId: 'system',
          toAgentId: agent.id,
          type: 'request',
          content: input,
          priority: 'high',
          timestamp: new Date().toISOString(),
          requiresResponse: true,
          metadata: { index: i, pattern: 'parallel' },
        });

        const task = {
          id: `task_parallel_${i}`,
          agentId: agent.id,
          type: 'execute' as const,
          input,
          status: 'pending' as const,
          priority: 'high' as const,
          createdAt: new Date().toISOString(),
          metadata: { parallelIndex: i },
          retryCount: 0,
          maxRetries: 0,
        };

        return await agent.executeTask(task);
      } catch (error) {
        logger.error(`Parallel agent ${agent.id} failed:`, error);
        if (options?.failurePolicy === 'fail-fast') {
          throw error;
        }
        return null;
      }
    });

    const results = await Promise.all(tasks);
    const successfulResults = results.filter((r): r is AgentOutput => r !== null);

    if (successfulResults.length === 0) {
      throw new Error('All parallel agents failed');
    }

    return {
      result: successfulResults.map(r => r.result),
      metadata: {
        pattern: 'parallel',
        parallelResults: successfulResults,
        successCount: successfulResults.length,
        totalCount: agents.length,
        iterations: 1,
        totalCost: 0,
        cacheHits: 0,
        parallelization: agents.length,
      },
    };
  }
}
