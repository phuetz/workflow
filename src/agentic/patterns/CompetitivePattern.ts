/**
 * Competitive Selection Pattern
 *
 * Multiple agents compete and the best result is selected
 */

import { Agent, AgentInput, AgentOutput } from '../../types/agents';
import { InterAgentCommunication } from '../InterAgentCommunication';
import { AgenticPatternExecutor } from '../AgenticWorkflowEngine';
import { logger } from '../../services/SimpleLogger';

export class CompetitivePattern implements AgenticPatternExecutor {
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
    logger.info(`Competitive pattern: ${agents.length} agents competing`);

    // All agents compete simultaneously
    const competitionResults = await Promise.all(
      agents.map(async (agent, i) => {
        const startTime = Date.now();

        try {
          const task = {
            id: `task_compete_${i}`,
            agentId: agent.id,
            type: 'execute' as const,
            input: {
              ...input,
              context: {
                ...input.context,
                competition: true,
                competitorCount: agents.length,
              },
            },
            status: 'pending' as const,
            priority: 'high' as const,
            createdAt: new Date().toISOString(),
            metadata: { competitorIndex: i },
            retryCount: 0,
            maxRetries: 0,
          };

          const output = await agent.executeTask(task);
          const executionTime = Date.now() - startTime;

          return {
            agentId: agent.id,
            agentName: agent.name,
            output,
            confidence: output.confidence || 0.5,
            executionTime,
            score: this.calculateScore(output, executionTime),
          };
        } catch (error) {
          logger.error(`Competitor ${agent.id} failed:`, error);
          return null;
        }
      })
    );

    const successfulResults = competitionResults.filter((r): r is NonNullable<typeof r> => r !== null);

    if (successfulResults.length === 0) {
      throw new Error('All competitors failed');
    }

    // Select winner based on score
    const winner = successfulResults.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    logger.info(`Winner: ${winner.agentName} (score: ${winner.score})`);

    return {
      ...winner.output,
      metadata: {
        ...winner.output.metadata,
        pattern: 'competitive',
        winner: winner.agentId,
        winnerScore: winner.score,
        totalCompetitors: agents.length,
        successfulCompetitors: successfulResults.length,
        allScores: successfulResults.map(r => ({ agent: r.agentId, score: r.score })),
        iterations: 1,
        totalCost: 0,
        cacheHits: 0,
        parallelization: agents.length,
      },
    };
  }

  private calculateScore(output: AgentOutput, executionTime: number): number {
    // Score based on confidence and speed
    const confidence = output.confidence || 0.5;
    const speedScore = 1 - Math.min(executionTime / 10000, 1); // Normalize to 10s max

    return confidence * 0.7 + speedScore * 0.3;
  }
}
