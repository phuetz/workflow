import {
  AgentTask,
  AgentInput,
  AgentOutput,
  AgentCapability,
} from '../../types/agents';
import { AgentBase } from '../agents/AgentBase';
import { AgentRegistry } from '../agents/AgentRegistry';
import { logger } from '../../services/SimpleLogger';

/**
 * TaskDecomposition - Breaks complex tasks into manageable subtasks
 * Enables autonomous task splitting and parallel execution
 */
export class TaskDecomposition {
  private registry: AgentRegistry;

  constructor(registry: AgentRegistry) {
    this.registry = registry;
    logger.info('TaskDecomposition initialized');
  }

  /**
   * Decompose a complex task into subtasks
   */
  async decompose(
    task: ComplexTask,
    strategy: DecompositionStrategy = 'auto'
  ): Promise<DecompositionResult> {
    const startTime = Date.now();

    logger.info(`Decomposing task using strategy: ${strategy}`, {
      description: task.description,
    });

    let subtasks: Subtask[];

    switch (strategy) {
      case 'auto':
        subtasks = await this.autoDecompose(task);
        break;

      case 'sequential':
        subtasks = await this.sequentialDecompose(task);
        break;

      case 'parallel':
        subtasks = await this.parallelDecompose(task);
        break;

      case 'capability-based':
        subtasks = await this.capabilityBasedDecompose(task);
        break;

      case 'custom':
        subtasks = task.customDecomposer ? task.customDecomposer(task) : [];
        break;

      default:
        throw new Error(`Unknown decomposition strategy: ${strategy}`);
    }

    const result: DecompositionResult = {
      originalTask: task,
      subtasks,
      strategy,
      executionPlan: this.createExecutionPlan(subtasks),
      totalSubtasks: subtasks.length,
      estimatedTime: this.estimateExecutionTime(subtasks),
      decompositionTime: Date.now() - startTime,
    };

    logger.info(`Task decomposed into ${subtasks.length} subtasks`, {
      strategy,
      estimatedTime: result.estimatedTime,
    });

    return result;
  }

  /**
   * Execute decomposed task
   */
  async executeDecomposed(
    decomposition: DecompositionResult
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const results: SubtaskResult[] = [];

    logger.info(`Executing decomposed task with ${decomposition.subtasks.length} subtasks`);

    for (const step of decomposition.executionPlan) {
      const stepResults = await this.executeStep(step, decomposition.subtasks, results);
      results.push(...stepResults);
    }

    // Aggregate results
    const aggregatedOutput = this.aggregateResults(results, decomposition.originalTask);

    const executionResult: ExecutionResult = {
      decomposition,
      subtaskResults: results,
      aggregatedOutput,
      totalExecutionTime: Date.now() - startTime,
      successRate: results.filter(r => r.success).length / results.length,
      success: results.every(r => r.success),
    };

    logger.info(`Decomposed task execution completed`, {
      subtasks: results.length,
      successRate: executionResult.successRate,
      totalTime: executionResult.totalExecutionTime,
    });

    return executionResult;
  }

  // Decomposition strategies

  private async autoDecompose(task: ComplexTask): Promise<Subtask[]> {
    // Analyze task complexity and choose best strategy
    const complexity = this.analyzeComplexity(task);

    if (complexity.canParallelize) {
      return this.parallelDecompose(task);
    } else if (complexity.hasSequentialDeps) {
      return this.sequentialDecompose(task);
    } else {
      return this.capabilityBasedDecompose(task);
    }
  }

  private async sequentialDecompose(task: ComplexTask): Promise<Subtask[]> {
    // Break into sequential steps
    const steps = task.steps || this.inferSteps(task);

    return steps.map((step, index) => ({
      id: `subtask-${index + 1}`,
      description: step.description,
      input: step.input || task.input,
      requiredCapabilities: step.requiredCapabilities || [],
      dependencies: index > 0 ? [`subtask-${index}`] : [],
      priority: task.priority || 'medium',
      estimatedTime: step.estimatedTime || 30000,
      metadata: {
        stepNumber: index + 1,
        totalSteps: steps.length,
        ...step.metadata,
      },
    }));
  }

  private async parallelDecompose(task: ComplexTask): Promise<Subtask[]> {
    // Break into independent parallel tasks
    const chunks = task.dataChunks || this.chunkData(task);

    return chunks.map((chunk, index) => ({
      id: `subtask-${index + 1}`,
      description: `${task.description} - Chunk ${index + 1}`,
      input: {
        ...task.input,
        data: chunk,
      },
      requiredCapabilities: task.requiredCapabilities || [],
      dependencies: [],
      priority: task.priority || 'high',
      estimatedTime: task.estimatedTime ? task.estimatedTime / chunks.length : 30000,
      metadata: {
        chunkIndex: index + 1,
        totalChunks: chunks.length,
      },
    }));
  }

  private async capabilityBasedDecompose(task: ComplexTask): Promise<Subtask[]> {
    // Decompose based on required capabilities
    const capabilityGroups = this.groupByCapability(task.requiredCapabilities || []);

    return capabilityGroups.map((group, index) => ({
      id: `subtask-${index + 1}`,
      description: `${task.description} - ${group.capabilities.join(', ')}`,
      input: task.input,
      requiredCapabilities: group.capabilities,
      dependencies: group.dependencies || [],
      priority: task.priority || 'medium',
      estimatedTime: task.estimatedTime ? task.estimatedTime / capabilityGroups.length : 30000,
      metadata: {
        capabilityGroup: index + 1,
        totalGroups: capabilityGroups.length,
      },
    }));
  }

  // Execution helpers

  private async executeStep(
    step: ExecutionStep,
    allSubtasks: Subtask[],
    completedResults: SubtaskResult[]
  ): Promise<SubtaskResult[]> {
    const subtasksToExecute = step.subtaskIds
      .map(id => allSubtasks.find(st => st.id === id))
      .filter((st): st is Subtask => st !== undefined);

    if (step.parallel) {
      return this.executeParallel(subtasksToExecute, completedResults);
    } else {
      return this.executeSequential(subtasksToExecute, completedResults);
    }
  }

  private async executeParallel(
    subtasks: Subtask[],
    previousResults: SubtaskResult[]
  ): Promise<SubtaskResult[]> {
    const promises = subtasks.map(subtask =>
      this.executeSubtask(subtask, previousResults)
    );

    return Promise.all(promises);
  }

  private async executeSequential(
    subtasks: Subtask[],
    previousResults: SubtaskResult[]
  ): Promise<SubtaskResult[]> {
    const results: SubtaskResult[] = [];

    for (const subtask of subtasks) {
      const result = await this.executeSubtask(subtask, [...previousResults, ...results]);
      results.push(result);
    }

    return results;
  }

  private async executeSubtask(
    subtask: Subtask,
    previousResults: SubtaskResult[]
  ): Promise<SubtaskResult> {
    const startTime = Date.now();

    try {
      // Find best agent for subtask
      const agent = this.registry.getBestAgent({
        capabilities: subtask.requiredCapabilities,
      });

      if (!agent) {
        throw new Error(`No agent found with required capabilities: ${subtask.requiredCapabilities.join(', ')}`);
      }

      // Prepare input with dependency results
      const input = this.prepareInput(subtask, previousResults);

      // Execute subtask
      const task: AgentTask = {
        id: `task-${subtask.id}`,
        agentId: agent.id,
        type: 'custom',
        input,
        status: 'pending',
        priority: subtask.priority,
        createdAt: new Date().toISOString(),
        metadata: {
          subtask: true,
          subtaskId: subtask.id,
          ...subtask.metadata,
        },
        retryCount: 0,
        maxRetries: 3,
      };

      const output = await agent.executeTask(task);

      return {
        subtaskId: subtask.id,
        agentId: agent.id,
        agentName: agent.name,
        output,
        executionTime: Date.now() - startTime,
        success: true,
      };
    } catch (error) {
      return {
        subtaskId: subtask.id,
        agentId: '',
        agentName: '',
        executionTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private prepareInput(subtask: Subtask, previousResults: SubtaskResult[]): AgentInput {
    const input = { ...subtask.input };

    // Add dependency results
    if (subtask.dependencies.length > 0) {
      const depResults = subtask.dependencies
        .map(depId => previousResults.find(r => r.subtaskId === depId))
        .filter((r): r is SubtaskResult => r !== undefined && r.success);

      input.data = {
        ...input.data as Record<string, unknown>,
        dependencyResults: depResults.map(r => r.output?.result),
      };
    }

    return input;
  }

  private aggregateResults(results: SubtaskResult[], originalTask: ComplexTask): AgentOutput {
    const successfulResults = results.filter(r => r.success && r.output);

    if (successfulResults.length === 0) {
      return {
        result: null,
        metadata: { error: 'All subtasks failed' },
      };
    }

    // Combine all results
    const combinedResult = successfulResults.map(r => r.output!.result);
    const avgConfidence = successfulResults.reduce((sum, r) => sum + (r.output!.confidence || 0), 0) / successfulResults.length;

    return {
      result: combinedResult.length === 1 ? combinedResult[0] : combinedResult,
      confidence: avgConfidence,
      metadata: {
        subtaskCount: results.length,
        successCount: successfulResults.length,
        totalExecutionTime: results.reduce((sum, r) => sum + r.executionTime, 0),
      },
    };
  }

  // Analysis helpers

  private analyzeComplexity(task: ComplexTask): ComplexityAnalysis {
    return {
      canParallelize: task.dataChunks !== undefined || task.allowParallel === true,
      hasSequentialDeps: task.steps !== undefined && task.steps.some(s => s.dependencies?.length),
      estimatedComplexity: task.estimatedTime || 60000,
    };
  }

  private inferSteps(task: ComplexTask): TaskStep[] {
    // Simple inference - could be enhanced with LLM
    return [
      {
        description: `Prepare: ${task.description}`,
        input: task.input,
      },
      {
        description: `Execute: ${task.description}`,
        input: task.input,
      },
      {
        description: `Finalize: ${task.description}`,
        input: task.input,
      },
    ];
  }

  private chunkData(task: ComplexTask): unknown[] {
    const data = task.input.data;

    if (Array.isArray(data)) {
      // Split array into chunks
      const chunkSize = Math.ceil(data.length / 4); // 4 chunks
      const chunks: unknown[] = [];

      for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.slice(i, i + chunkSize));
      }

      return chunks;
    }

    // Can't chunk, return as single chunk
    return [data];
  }

  private groupByCapability(capabilities: AgentCapability[]): CapabilityGroup[] {
    // Simple grouping - could be more sophisticated
    return capabilities.map(cap => ({
      capabilities: [cap],
      dependencies: [],
    }));
  }

  private createExecutionPlan(subtasks: Subtask[]): ExecutionStep[] {
    // Group subtasks by dependencies
    const steps: ExecutionStep[] = [];
    const processed = new Set<string>();

    let currentLevel = 0;
    while (processed.size < subtasks.length) {
      const levelSubtasks = subtasks.filter(st =>
        !processed.has(st.id) &&
        st.dependencies.every(dep => processed.has(dep))
      );

      if (levelSubtasks.length === 0) {
        break; // Avoid infinite loop
      }

      steps.push({
        stepNumber: ++currentLevel,
        subtaskIds: levelSubtasks.map(st => st.id),
        parallel: levelSubtasks.every(st => st.dependencies.length === 0 || currentLevel > 1),
      });

      levelSubtasks.forEach(st => processed.add(st.id));
    }

    return steps;
  }

  private estimateExecutionTime(subtasks: Subtask[]): number {
    // Simple estimation based on critical path
    return subtasks.reduce((max, st) => Math.max(max, st.estimatedTime), 0);
  }
}

// Types

export type DecompositionStrategy = 'auto' | 'sequential' | 'parallel' | 'capability-based' | 'custom';

export interface ComplexTask {
  description: string;
  input: AgentInput;
  requiredCapabilities?: AgentCapability[];
  priority?: AgentTask['priority'];
  estimatedTime?: number;
  steps?: TaskStep[];
  dataChunks?: unknown[];
  allowParallel?: boolean;
  customDecomposer?: (task: ComplexTask) => Subtask[];
}

export interface TaskStep {
  description: string;
  input?: AgentInput;
  requiredCapabilities?: AgentCapability[];
  dependencies?: string[];
  estimatedTime?: number;
  metadata?: Record<string, unknown>;
}

export interface Subtask {
  id: string;
  description: string;
  input: AgentInput;
  requiredCapabilities: AgentCapability[];
  dependencies: string[];
  priority: AgentTask['priority'];
  estimatedTime: number;
  metadata?: Record<string, unknown>;
}

export interface DecompositionResult {
  originalTask: ComplexTask;
  subtasks: Subtask[];
  strategy: DecompositionStrategy;
  executionPlan: ExecutionStep[];
  totalSubtasks: number;
  estimatedTime: number;
  decompositionTime: number;
}

export interface ExecutionStep {
  stepNumber: number;
  subtaskIds: string[];
  parallel: boolean;
}

export interface SubtaskResult {
  subtaskId: string;
  agentId: string;
  agentName: string;
  output?: AgentOutput;
  executionTime: number;
  success: boolean;
  error?: string;
}

export interface ExecutionResult {
  decomposition: DecompositionResult;
  subtaskResults: SubtaskResult[];
  aggregatedOutput: AgentOutput;
  totalExecutionTime: number;
  successRate: number;
  success: boolean;
}

interface ComplexityAnalysis {
  canParallelize: boolean;
  hasSequentialDeps: boolean;
  estimatedComplexity: number;
}

interface CapabilityGroup {
  capabilities: AgentCapability[];
  dependencies: string[];
}
