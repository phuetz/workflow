/**
 * Sequential Processing Pattern
 *
 * Agents process tasks in sequential order, with each agent's output
 * becoming the next agent's input
 */

import { Agent, AgentInput, AgentOutput } from '../../types/agents';
import { InterAgentCommunication } from '../InterAgentCommunication';
import { AgenticPatternExecutor } from '../AgenticWorkflowEngine';
import { logger } from '../../services/SimpleLogger';

export class SequentialPattern implements AgenticPatternExecutor {
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
    logger.info(`Sequential pattern: Processing with ${agents.length} agents`);

    let currentInput = input;
    let currentOutput: AgentOutput = {
      result: input.data,
      metadata: {},
    };

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];

      try {
        logger.debug(`Sequential step ${i + 1}/${agents.length}: ${agent.name}`);

        // Send message to agent
        await this.communication.publish({
          id: `seq_${Date.now()}_${i}`,
          fromAgentId: 'system',
          toAgentId: agent.id,
          type: 'request',
          content: currentInput,
          priority: 'medium',
          timestamp: new Date().toISOString(),
          requiresResponse: true,
          metadata: { step: i, pattern: 'sequential' },
        });

        // Execute agent task
        const task = {
          id: `task_seq_${i}`,
          agentId: agent.id,
          type: 'execute' as const,
          input: currentInput,
          status: 'pending' as const,
          priority: 'medium' as const,
          createdAt: new Date().toISOString(),
          metadata: {},
          retryCount: 0,
          maxRetries: options?.failurePolicy === 'retry' ? 3 : 0,
        };

        currentOutput = await agent.executeTask(task);

        // Update input for next agent
        currentInput = {
          ...currentInput,
          data: currentOutput.result,
          context: {
            ...currentInput.context,
            previousAgent: agent.id,
            previousStep: i,
          },
        };
      } catch (error) {
        logger.error(`Sequential pattern failed at step ${i}:`, error);

        if (options?.failurePolicy === 'fail-fast') {
          throw error;
        } else if (options?.failurePolicy === 'continue') {
          logger.warn(`Continuing despite error at step ${i}`);
          continue;
        } else {
          // retry
          logger.info(`Retrying step ${i}`);
          i--; // Retry this step
        }
      }
    }

    return {
      ...currentOutput,
      metadata: {
        ...currentOutput.metadata,
        pattern: 'sequential',
        steps: agents.length,
        iterations: 1,
        totalCost: 0,
        cacheHits: 0,
        parallelization: 1,
      },
    };
  }
}
