/**
 * Routing/Decision Tree Pattern
 *
 * Dynamically route tasks to specialized agents based on classification
 */

import { Agent, AgentInput, AgentOutput } from '../../types/agents';
import { InterAgentCommunication } from '../InterAgentCommunication';
import { AgenticPatternExecutor } from '../AgenticWorkflowEngine';
import { logger } from '../../services/SimpleLogger';

export class RoutingDecisionPattern implements AgenticPatternExecutor {
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
    logger.info(`Routing pattern: Classifying and routing to ${agents.length} agents`);

    // Find classifier agent or use first agent
    const classifier = agents.find(a => a.capabilities.includes('classification')) || agents[0];
    const specialists = agents.filter(a => a.id !== classifier.id);

    // Step 1: Classify the input
    const classifyTask = {
      id: 'task_classify',
      agentId: classifier.id,
      type: 'classify' as const,
      input: {
        ...input,
        data: {
          ...input.data as object,
          action: 'classify',
          options: specialists.map(s => s.name),
        },
      },
      status: 'pending' as const,
      priority: 'high' as const,
      createdAt: new Date().toISOString(),
      metadata: { phase: 'classification' },
      retryCount: 0,
      maxRetries: 0,
    };

    const classification = await classifier.executeTask(classifyTask);

    // Step 2: Route to appropriate specialist
    const routedAgent = this.selectAgent(specialists, classification.result as { targetAgent?: string });

    if (!routedAgent) {
      throw new Error('No suitable agent found for routing');
    }

    logger.info(`Routing to agent: ${routedAgent.name}`);

    const executeTask = {
      id: 'task_execute_routed',
      agentId: routedAgent.id,
      type: 'execute' as const,
      input: {
        ...input,
        context: {
          ...input.context,
          classification: classification.result,
          routedFrom: classifier.id,
        },
      },
      status: 'pending' as const,
      priority: 'high' as const,
      createdAt: new Date().toISOString(),
      metadata: { phase: 'execution' },
      retryCount: 0,
      maxRetries: 0,
    };

    const result = await routedAgent.executeTask(executeTask);

    return {
      ...result,
      metadata: {
        ...result.metadata,
        pattern: 'routing',
        classification: classification.result,
        routedTo: routedAgent.id,
        iterations: 1,
        totalCost: 0,
        cacheHits: 0,
        parallelization: 1,
      },
    };
  }

  private selectAgent(agents: Agent[], classification: { targetAgent?: string }): Agent | undefined {
    if (classification.targetAgent) {
      return agents.find(a => a.id === classification.targetAgent || a.name === classification.targetAgent);
    }
    return agents[0];
  }
}
