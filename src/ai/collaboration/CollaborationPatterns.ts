import {
  Agent,
  AgentTask,
  AgentInput,
  AgentOutput,
  CollaborationType,
} from '../../types/agents';
import { AgentBase } from '../agents/AgentBase';
import { AgentRegistry } from '../agents/AgentRegistry';
import { DelegationManager } from '../agents/DelegationManager';
import { logger } from '../../services/SimpleLogger';

/**
 * CollaborationPatterns - Implements common multi-agent collaboration patterns
 * Provides sequential, parallel, hierarchical, and custom collaboration workflows
 */
export class CollaborationPatterns {
  private registry: AgentRegistry;
  private delegationManager: DelegationManager;

  constructor(registry: AgentRegistry, delegationManager: DelegationManager) {
    this.registry = registry;
    this.delegationManager = delegationManager;
    logger.info('CollaborationPatterns initialized');
  }

  /**
   * Sequential Pattern: Agent A → Agent B → Agent C
   * Each agent processes the output of the previous agent
   */
  async sequential(
    agents: AgentBase[],
    initialInput: AgentInput
  ): Promise<SequentialResult> {
    if (agents.length === 0) {
      throw new Error('At least one agent required for sequential collaboration');
    }

    const startTime = Date.now();
    const steps: CollaborationStep[] = [];
    let currentInput = initialInput;

    logger.info(`Starting sequential collaboration with ${agents.length} agents`);

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const stepStart = Date.now();

      try {
        logger.debug(`Sequential step ${i + 1}/${agents.length}: ${agent.name}`);

        const task: AgentTask = {
          id: `seq-task-${Date.now()}-${i}`,
          agentId: agent.id,
          type: 'custom',
          input: currentInput,
          status: 'pending',
          priority: 'medium',
          createdAt: new Date().toISOString(),
          metadata: {
            collaboration: 'sequential',
            step: i + 1,
            totalSteps: agents.length,
          },
          retryCount: 0,
          maxRetries: 3,
        };

        const output = await agent.executeTask(task);

        steps.push({
          agentId: agent.id,
          agentName: agent.name,
          stepNumber: i + 1,
          input: currentInput,
          output,
          executionTime: Date.now() - stepStart,
          success: true,
        });

        // Output becomes input for next agent
        currentInput = {
          ...currentInput,
          data: output.result,
        };
      } catch (error) {
        steps.push({
          agentId: agent.id,
          agentName: agent.name,
          stepNumber: i + 1,
          input: currentInput,
          executionTime: Date.now() - stepStart,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        logger.error(`Sequential collaboration failed at step ${i + 1}`, error);
        throw error;
      }
    }

    const finalOutput = steps[steps.length - 1].output!;

    return {
      pattern: 'sequential',
      steps,
      finalOutput,
      totalExecutionTime: Date.now() - startTime,
      success: true,
    };
  }

  /**
   * Parallel Pattern: Multiple agents work simultaneously on the same task
   * Results are aggregated at the end
   */
  async parallel(
    agents: AgentBase[],
    input: AgentInput,
    aggregationStrategy: AggregationStrategy = 'merge'
  ): Promise<ParallelResult> {
    if (agents.length === 0) {
      throw new Error('At least one agent required for parallel collaboration');
    }

    const startTime = Date.now();

    logger.info(`Starting parallel collaboration with ${agents.length} agents`);

    const taskPromises = agents.map(async (agent, index) => {
      const stepStart = Date.now();

      try {
        logger.debug(`Parallel execution ${index + 1}/${agents.length}: ${agent.name}`);

        const task: AgentTask = {
          id: `par-task-${Date.now()}-${index}`,
          agentId: agent.id,
          type: 'custom',
          input,
          status: 'pending',
          priority: 'high', // Parallel tasks get higher priority
          createdAt: new Date().toISOString(),
          metadata: {
            collaboration: 'parallel',
            parallelIndex: index + 1,
            totalParallel: agents.length,
          },
          retryCount: 0,
          maxRetries: 3,
        };

        const output = await agent.executeTask(task);

        const step: CollaborationStep = {
          agentId: agent.id,
          agentName: agent.name,
          stepNumber: index + 1,
          input,
          output,
          executionTime: Date.now() - stepStart,
          success: true,
        };

        return step;
      } catch (error) {
        const step: CollaborationStep = {
          agentId: agent.id,
          agentName: agent.name,
          stepNumber: index + 1,
          input,
          executionTime: Date.now() - stepStart,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };

        logger.error(`Parallel execution failed for ${agent.name}`, error);
        return step;
      }
    });

    const results = await Promise.all(taskPromises);

    // Aggregate results
    const aggregatedOutput = this.aggregateResults(
      results.filter(r => r.success && r.output),
      aggregationStrategy
    );

    return {
      pattern: 'parallel',
      results,
      aggregatedOutput,
      totalExecutionTime: Date.now() - startTime,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      success: results.some(r => r.success),
    };
  }

  /**
   * Hierarchical Pattern: Coordinator agent + worker agents
   * Coordinator delegates to workers and aggregates results
   */
  async hierarchical(
    coordinator: AgentBase,
    workers: AgentBase[],
    input: AgentInput
  ): Promise<HierarchicalResult> {
    if (workers.length === 0) {
      throw new Error('At least one worker agent required for hierarchical collaboration');
    }

    const startTime = Date.now();

    logger.info(`Starting hierarchical collaboration: 1 coordinator, ${workers.length} workers`);

    // Step 1: Workers process in parallel
    const workerResults = await this.parallel(workers, input, 'merge');

    // Step 2: Coordinator aggregates worker results
    const coordinatorInput: AgentInput = {
      ...input,
      data: {
        workerResults: workerResults.results.map(r => ({
          agent: r.agentName,
          result: r.output?.result,
          confidence: r.output?.confidence,
        })),
        aggregated: workerResults.aggregatedOutput.result,
      },
    };

    const coordinatorStepStart = Date.now();
    const coordinatorTask: AgentTask = {
      id: `hier-coord-task-${Date.now()}`,
      agentId: coordinator.id,
      type: 'custom',
      input: coordinatorInput,
      status: 'pending',
      priority: 'high',
      createdAt: new Date().toISOString(),
      metadata: {
        collaboration: 'hierarchical',
        role: 'coordinator',
        workerCount: workers.length,
      },
      retryCount: 0,
      maxRetries: 3,
    };

    const coordinatorOutput = await coordinator.executeTask(coordinatorTask);

    const coordinatorStep: CollaborationStep = {
      agentId: coordinator.id,
      agentName: coordinator.name,
      stepNumber: 1,
      input: coordinatorInput,
      output: coordinatorOutput,
      executionTime: Date.now() - coordinatorStepStart,
      success: true,
    };

    return {
      pattern: 'hierarchical',
      coordinator: coordinatorStep,
      workers: workerResults.results,
      finalOutput: coordinatorOutput,
      totalExecutionTime: Date.now() - startTime,
      success: true,
    };
  }

  /**
   * Pipeline Pattern: Data flows through a series of transformations
   * Similar to sequential but with explicit data transformation focus
   */
  async pipeline(
    stages: PipelineStage[],
    initialData: unknown
  ): Promise<PipelineResult> {
    if (stages.length === 0) {
      throw new Error('At least one stage required for pipeline collaboration');
    }

    const startTime = Date.now();
    const stageResults: PipelineStageResult[] = [];
    let currentData = initialData;

    logger.info(`Starting pipeline collaboration with ${stages.length} stages`);

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const agent = this.registry.get(stage.agentId);

      if (!agent) {
        throw new Error(`Agent not found for stage ${i + 1}: ${stage.agentId}`);
      }

      const stageStart = Date.now();

      try {
        logger.debug(`Pipeline stage ${i + 1}/${stages.length}: ${stage.name}`);

        const input: AgentInput = {
          data: currentData,
          context: stage.context,
        };

        const task: AgentTask = {
          id: `pipe-task-${Date.now()}-${i}`,
          agentId: agent.id,
          type: 'custom',
          input,
          status: 'pending',
          priority: 'medium',
          createdAt: new Date().toISOString(),
          metadata: {
            collaboration: 'pipeline',
            stage: i + 1,
            totalStages: stages.length,
            stageName: stage.name,
          },
          retryCount: 0,
          maxRetries: 3,
        };

        const output = await agent.executeTask(task);

        // Apply transformation if specified
        const transformedData = stage.transform
          ? stage.transform(output.result)
          : output.result;

        stageResults.push({
          stageName: stage.name,
          stageNumber: i + 1,
          agentId: agent.id,
          agentName: agent.name,
          inputData: currentData,
          outputData: transformedData,
          executionTime: Date.now() - stageStart,
          success: true,
        });

        currentData = transformedData;
      } catch (error) {
        stageResults.push({
          stageName: stage.name,
          stageNumber: i + 1,
          agentId: agent.id,
          agentName: agent.name,
          inputData: currentData,
          executionTime: Date.now() - stageStart,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        logger.error(`Pipeline stage ${i + 1} failed`, error);
        throw error;
      }
    }

    return {
      pattern: 'pipeline',
      stages: stageResults,
      finalData: currentData,
      totalExecutionTime: Date.now() - startTime,
      success: true,
    };
  }

  /**
   * Debate Pattern: Multiple agents discuss and refine a solution
   * Agents iterate on each other's outputs
   */
  async debate(
    agents: AgentBase[],
    topic: string,
    initialInput: AgentInput,
    rounds = 3
  ): Promise<DebateResult> {
    if (agents.length < 2) {
      throw new Error('At least two agents required for debate collaboration');
    }

    const startTime = Date.now();
    const debateRounds: DebateRound[] = [];

    logger.info(`Starting debate collaboration: ${agents.length} agents, ${rounds} rounds`);

    let currentResponses: Map<string, AgentOutput> = new Map();

    for (let round = 1; round <= rounds; round++) {
      const roundStart = Date.now();
      const roundResponses = new Map<string, AgentOutput>();

      logger.debug(`Debate round ${round}/${rounds}`);

      for (const agent of agents) {
        const input: AgentInput = {
          ...initialInput,
          data: {
            topic,
            round,
            previousResponses: Array.from(currentResponses.entries()).map(([id, output]) => ({
              agentId: id,
              response: output.result,
              confidence: output.confidence,
            })),
          },
        };

        const task: AgentTask = {
          id: `debate-task-${Date.now()}-${round}-${agent.id}`,
          agentId: agent.id,
          type: 'custom',
          input,
          status: 'pending',
          priority: 'medium',
          createdAt: new Date().toISOString(),
          metadata: {
            collaboration: 'debate',
            round,
            totalRounds: rounds,
          },
          retryCount: 0,
          maxRetries: 3,
        };

        const output = await agent.executeTask(task);
        roundResponses.set(agent.id, output);
      }

      debateRounds.push({
        roundNumber: round,
        responses: Array.from(roundResponses.entries()).map(([agentId, output]) => ({
          agentId,
          agentName: agents.find(a => a.id === agentId)?.name || 'Unknown',
          response: output,
        })),
        executionTime: Date.now() - roundStart,
      });

      currentResponses = roundResponses;
    }

    // Final round contains the refined responses
    const finalResponses = debateRounds[debateRounds.length - 1].responses;

    return {
      pattern: 'debate',
      topic,
      rounds: debateRounds,
      finalResponses,
      totalExecutionTime: Date.now() - startTime,
      success: true,
    };
  }

  // Private methods

  private aggregateResults(
    steps: CollaborationStep[],
    strategy: AggregationStrategy
  ): AgentOutput {
    if (steps.length === 0) {
      return {
        result: null,
        metadata: {},
      };
    }

    switch (strategy) {
      case 'merge':
        return this.mergeResults(steps);
      case 'vote':
        return this.voteResults(steps);
      case 'average':
        return this.averageResults(steps);
      case 'first':
        return steps[0].output!;
      case 'best':
        return this.bestResult(steps);
      default:
        return this.mergeResults(steps);
    }
  }

  private mergeResults(steps: CollaborationStep[]): AgentOutput {
    const results = steps.map(s => s.output!.result);
    const avgConfidence = steps.reduce((sum, s) => sum + (s.output!.confidence || 0), 0) / steps.length;

    return {
      result: results,
      confidence: avgConfidence,
      metadata: {
        aggregationStrategy: 'merge',
        resultCount: results.length,
      },
    };
  }

  private voteResults(steps: CollaborationStep[]): AgentOutput {
    // Simple voting: most common result wins
    const votes = new Map<string, number>();

    steps.forEach(step => {
      const key = JSON.stringify(step.output!.result);
      votes.set(key, (votes.get(key) || 0) + 1);
    });

    let maxVotes = 0;
    let winner = null;

    votes.forEach((count, result) => {
      if (count > maxVotes) {
        maxVotes = count;
        winner = result;
      }
    });

    return {
      result: winner ? JSON.parse(winner) : null,
      confidence: maxVotes / steps.length,
      metadata: {
        aggregationStrategy: 'vote',
        votes: maxVotes,
        totalVoters: steps.length,
      },
    };
  }

  private averageResults(steps: CollaborationStep[]): AgentOutput {
    // Only works for numeric results
    const numericResults = steps
      .map(s => s.output!.result)
      .filter(r => typeof r === 'number') as number[];

    if (numericResults.length === 0) {
      return this.mergeResults(steps);
    }

    const average = numericResults.reduce((sum, val) => sum + val, 0) / numericResults.length;

    return {
      result: average,
      confidence: 1,
      metadata: {
        aggregationStrategy: 'average',
        count: numericResults.length,
      },
    };
  }

  private bestResult(steps: CollaborationStep[]): AgentOutput {
    // Return result with highest confidence
    let best = steps[0].output!;

    steps.forEach(step => {
      if ((step.output!.confidence || 0) > (best.confidence || 0)) {
        best = step.output!;
      }
    });

    return best;
  }
}

// Types

export type AggregationStrategy = 'merge' | 'vote' | 'average' | 'first' | 'best';

export interface CollaborationStep {
  agentId: string;
  agentName: string;
  stepNumber: number;
  input: AgentInput;
  output?: AgentOutput;
  executionTime: number;
  success: boolean;
  error?: string;
}

export interface SequentialResult {
  pattern: 'sequential';
  steps: CollaborationStep[];
  finalOutput: AgentOutput;
  totalExecutionTime: number;
  success: boolean;
}

export interface ParallelResult {
  pattern: 'parallel';
  results: CollaborationStep[];
  aggregatedOutput: AgentOutput;
  totalExecutionTime: number;
  successCount: number;
  failureCount: number;
  success: boolean;
}

export interface HierarchicalResult {
  pattern: 'hierarchical';
  coordinator: CollaborationStep;
  workers: CollaborationStep[];
  finalOutput: AgentOutput;
  totalExecutionTime: number;
  success: boolean;
}

export interface PipelineStage {
  name: string;
  agentId: string;
  context?: Record<string, unknown>;
  transform?: (data: unknown) => unknown;
}

export interface PipelineStageResult {
  stageName: string;
  stageNumber: number;
  agentId: string;
  agentName: string;
  inputData: unknown;
  outputData?: unknown;
  executionTime: number;
  success: boolean;
  error?: string;
}

export interface PipelineResult {
  pattern: 'pipeline';
  stages: PipelineStageResult[];
  finalData: unknown;
  totalExecutionTime: number;
  success: boolean;
}

export interface DebateRound {
  roundNumber: number;
  responses: {
    agentId: string;
    agentName: string;
    response: AgentOutput;
  }[];
  executionTime: number;
}

export interface DebateResult {
  pattern: 'debate';
  topic: string;
  rounds: DebateRound[];
  finalResponses: {
    agentId: string;
    agentName: string;
    response: AgentOutput;
  }[];
  totalExecutionTime: number;
  success: boolean;
}
