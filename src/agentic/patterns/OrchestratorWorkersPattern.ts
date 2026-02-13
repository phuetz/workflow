/**
 * Orchestrator-Workers Pattern
 *
 * One coordinator agent manages multiple worker agents in parallel
 */

import { Agent, AgentInput, AgentOutput } from '../../types/agents';
import { InterAgentCommunication } from '../InterAgentCommunication';
import { AgenticPatternExecutor } from '../AgenticWorkflowEngine';
import { logger } from '../../services/SimpleLogger';

export class OrchestratorWorkersPattern implements AgenticPatternExecutor {
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
    if (agents.length < 2) {
      throw new Error('Orchestrator-Workers pattern requires at least 2 agents');
    }

    const [orchestrator, ...workers] = agents;
    logger.info(`Orchestrator-Workers: 1 orchestrator, ${workers.length} workers`);

    // Phase 1: Orchestrator plans the work
    const planTask = {
      id: 'task_orchestrator_plan',
      agentId: orchestrator.id,
      type: 'plan' as const,
      input: {
        ...input,
        data: {
          ...input.data as object,
          action: 'plan',
          workerCount: workers.length,
        },
      },
      status: 'pending' as const,
      priority: 'high' as const,
      createdAt: new Date().toISOString(),
      metadata: { phase: 'planning' },
      retryCount: 0,
      maxRetries: 0,
    };

    const plan = await orchestrator.executeTask(planTask);

    // Phase 2: Workers execute in parallel
    const workerTasks = workers.map(async (worker, i) => {
      const task = {
        id: `task_worker_${i}`,
        agentId: worker.id,
        type: 'execute' as const,
        input: {
          ...input,
          data: plan.result,
          context: {
            ...input.context,
            workerIndex: i,
            orchestratorId: orchestrator.id,
          },
        },
        status: 'pending' as const,
        priority: 'high' as const,
        createdAt: new Date().toISOString(),
        metadata: { workerIndex: i },
        retryCount: 0,
        maxRetries: 0,
      };

      return worker.executeTask(task);
    });

    const workerResults = await Promise.all(workerTasks);

    // Phase 3: Orchestrator aggregates results
    const aggregateTask = {
      id: 'task_orchestrator_aggregate',
      agentId: orchestrator.id,
      type: 'execute' as const,
      input: {
        ...input,
        data: {
          ...input.data as object,
          action: 'aggregate',
          workerResults: workerResults.map(r => r.result),
        },
      },
      status: 'pending' as const,
      priority: 'high' as const,
      createdAt: new Date().toISOString(),
      metadata: { phase: 'aggregation' },
      retryCount: 0,
      maxRetries: 0,
    };

    const finalResult = await orchestrator.executeTask(aggregateTask);

    return {
      ...finalResult,
      metadata: {
        ...finalResult.metadata,
        pattern: 'orchestrator-workers',
        workerCount: workers.length,
        iterations: 1,
        totalCost: 0,
        cacheHits: 0,
        parallelization: workers.length,
      },
    };
  }
}
