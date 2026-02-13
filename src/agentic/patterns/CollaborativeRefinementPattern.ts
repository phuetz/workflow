/**
 * Collaborative Refinement Pattern
 *
 * Agents collaboratively refine a solution through multiple rounds
 */

import { Agent, AgentInput, AgentOutput } from '../../types/agents';
import { InterAgentCommunication } from '../InterAgentCommunication';
import { AgenticPatternExecutor } from '../AgenticWorkflowEngine';
import { logger } from '../../services/SimpleLogger';

export class CollaborativeRefinementPattern implements AgenticPatternExecutor {
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
    const maxRounds = options?.maxIterations || 3;
    logger.info(`Collaborative refinement: ${agents.length} agents, ${maxRounds} rounds`);

    let currentSolution: AgentOutput = {
      result: input.data,
      metadata: {},
    };

    const refinementHistory: Array<{
      round: number;
      agentId: string;
      contribution: unknown;
      quality: number;
    }> = [];

    for (let round = 1; round <= maxRounds; round++) {
      logger.info(`Refinement round ${round}/${maxRounds}`);

      // Each agent contributes to refinement
      for (const agent of agents) {
        const task = {
          id: `task_refine_r${round}_${agent.id}`,
          agentId: agent.id,
          type: 'transform' as const,
          input: {
            ...input,
            data: {
              currentSolution: currentSolution.result,
              round,
              previousContributions: refinementHistory.filter(h => h.round === round - 1),
            },
            context: {
              ...input.context,
              refinementRound: round,
              collaborators: agents.map(a => a.id),
            },
          },
          status: 'pending' as const,
          priority: 'medium' as const,
          createdAt: new Date().toISOString(),
          metadata: { round, phase: 'refinement' },
          retryCount: 0,
          maxRetries: 0,
        };

        const refinement = await agent.executeTask(task);

        // Update solution with refinement
        currentSolution = {
          result: refinement.result,
          confidence: Math.min(1, (currentSolution.confidence || 0.5) + 0.1),
          metadata: {
            ...currentSolution.metadata,
            lastRefinedBy: agent.id,
            lastRefinedAt: new Date().toISOString(),
          },
        };

        refinementHistory.push({
          round,
          agentId: agent.id,
          contribution: refinement.result,
          quality: refinement.confidence || 0.5,
        });

        // Communicate contribution to other agents
        await this.communication.broadcast({
          id: `refinement_${round}_${agent.id}`,
          fromAgentId: agent.id,
          type: 'notification',
          content: {
            round,
            contribution: refinement.result,
          },
          priority: 'low',
          timestamp: new Date().toISOString(),
          requiresResponse: false,
          metadata: { round },
        });
      }

      // Check if quality threshold met
      const avgQuality = refinementHistory
        .filter(h => h.round === round)
        .reduce((sum, h) => sum + h.quality, 0) / agents.length;

      if (avgQuality >= 0.95) {
        logger.info(`High quality achieved at round ${round}, stopping refinement`);
        break;
      }
    }

    const finalQuality = refinementHistory
      .filter(h => h.round === Math.max(...refinementHistory.map(r => r.round)))
      .reduce((sum, h) => sum + h.quality, 0) / agents.length;

    return {
      ...currentSolution,
      metadata: {
        ...currentSolution.metadata,
        pattern: 'collaborative-refinement',
        rounds: Math.max(...refinementHistory.map(h => h.round)),
        totalContributions: refinementHistory.length,
        refinementHistory,
        finalQuality,
        iterations: Math.max(...refinementHistory.map(h => h.round)),
        totalCost: 0,
        cacheHits: 0,
        parallelization: 1,
      },
    };
  }
}
