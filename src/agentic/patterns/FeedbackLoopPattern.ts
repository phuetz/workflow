/**
 * Feedback Loop Pattern
 *
 * Agents iteratively refine output based on feedback until criteria met
 */

import { Agent, AgentInput, AgentOutput } from '../../types/agents';
import { InterAgentCommunication } from '../InterAgentCommunication';
import { AgenticPatternExecutor } from '../AgenticWorkflowEngine';
import { logger } from '../../services/SimpleLogger';

export class FeedbackLoopPattern implements AgenticPatternExecutor {
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
    const maxIterations = options?.maxIterations || 5;
    const [executor, evaluator] = agents;

    if (!executor || !evaluator) {
      throw new Error('Feedback loop requires at least 2 agents (executor and evaluator)');
    }

    logger.info(`Feedback loop: Max ${maxIterations} iterations`);

    let currentOutput: AgentOutput = {
      result: input.data,
      metadata: {},
    };
    let iteration = 0;
    let feedbackHistory: Array<{ iteration: number; feedback: unknown; quality: number }> = [];

    while (iteration < maxIterations) {
      iteration++;

      // Execute
      const executeTask = {
        id: `task_feedback_execute_${iteration}`,
        agentId: executor.id,
        type: 'execute' as const,
        input: {
          ...input,
          data: iteration === 1 ? input.data : currentOutput.result,
          context: {
            ...input.context,
            iteration,
            previousFeedback: feedbackHistory[feedbackHistory.length - 1]?.feedback,
          },
        },
        status: 'pending' as const,
        priority: 'medium' as const,
        createdAt: new Date().toISOString(),
        metadata: { iteration, phase: 'execution' },
        retryCount: 0,
        maxRetries: 0,
      };

      currentOutput = await executor.executeTask(executeTask);

      // Evaluate
      const evaluateTask = {
        id: `task_feedback_evaluate_${iteration}`,
        agentId: evaluator.id,
        type: 'validate' as const,
        input: {
          ...input,
          data: {
            output: currentOutput.result,
            iteration,
          },
        },
        status: 'pending' as const,
        priority: 'medium' as const,
        createdAt: new Date().toISOString(),
        metadata: { iteration, phase: 'evaluation' },
        retryCount: 0,
        maxRetries: 0,
      };

      const evaluation = await evaluator.executeTask(evaluateTask);
      const feedback = evaluation.result as { quality: number; feedback?: string; shouldContinue: boolean };

      feedbackHistory.push({
        iteration,
        feedback: feedback.feedback,
        quality: feedback.quality,
      });

      logger.info(`Iteration ${iteration}: Quality ${feedback.quality}`);

      // Check if criteria met
      if (!feedback.shouldContinue || feedback.quality >= 0.9) {
        logger.info(`Feedback loop completed at iteration ${iteration}`);
        break;
      }
    }

    return {
      ...currentOutput,
      metadata: {
        ...currentOutput.metadata,
        pattern: 'feedback-loop',
        iterations: iteration,
        feedbackHistory,
        finalQuality: feedbackHistory[feedbackHistory.length - 1]?.quality || 0,
        totalCost: 0,
        cacheHits: 0,
        parallelization: 1,
      },
    };
  }
}
