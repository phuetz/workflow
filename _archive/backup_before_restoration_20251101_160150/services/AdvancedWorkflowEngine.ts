/**
 * Advanced Workflow Engine
 * Sophisticated workflow execution with advanced features like conditional branching,
 * loops, parallel execution, sub-workflows, and dynamic node generation
 */

import { EventEmitter } from 'events';
import { logger } from './LoggingService';
// import { cachingService } from './CachingService'; // Currently unused
import { monitoringService } from './MonitoringService';
import { telemetryService } from './OpenTelemetryService';
import { webSocketServerService } from './WebSocketServerService';
import { advancedAnalyticsService } from './AdvancedAnalyticsService';

interface WorkflowExecution {
  id: string;
  workflowId: string;
  userId?: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  context: ExecutionContext;
  nodeExecutions: Map<string, NodeExecution>;
  variables: Map<string, unknown>;
  metadata: {
    retryCount: number;
    parentExecutionId?: string;
    isSubWorkflow: boolean;
    priority: 'low' | 'normal' | 'high' | 'critical';
    timeout?: number;
  };
  error?: ExecutionError;
  metrics: ExecutionMetrics;
}

interface NodeExecution {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  retryCount: number;
  iterations?: number; // For loop nodes
  childExecutions?: string[]; // For parallel/sub-workflow nodes
}

interface ExecutionContext {
  workflow: WorkflowDefinition;
  currentNode?: string;
  nextNodes: string[];
  executionPath: string[];
  loopStates: Map<string, LoopState>;
  conditionResults: Map<string, boolean>;
  parallelBranches: Map<string, ParallelBranch>;
  subWorkflows: Map<string, string>; // nodeId -> executionId
}

interface LoopState {
  nodeId: string;
  currentIteration: number;
  totalIterations?: number;
  iterationData: unknown[];
  breakCondition?: string;
  continueCondition?: string;
}

interface ParallelBranch {
  id: string;
  nodeIds: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: Map<string, unknown>;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  nodes: Map<string, WorkflowNode>;
  edges: Map<string, WorkflowEdge>;
  variables: Map<string, VariableDefinition>;
  settings: WorkflowSettings;
  triggers: TriggerDefinition[];
}

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  conditions?: ConditionDefinition[];
  retryConfig?: RetryConfig;
  timeout?: number;
  metadata: Record<string, unknown>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  condition?: string;
  label?: string;
  animated?: boolean;
}

interface VariableDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: unknown;
  required?: boolean;
  description?: string;
}

interface WorkflowSettings {
  maxExecutionTime?: number;
  maxRetries?: number;
  onError: 'stop' | 'continue' | 'retry';
  parallelism: {
    enabled: boolean;
    maxConcurrency?: number;
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    includeInputOutput: boolean;
  };
  notifications: {
    onStart?: string[];
    onSuccess?: string[];
    onError?: string[];
  };
}

interface TriggerDefinition {
  id: string;
  type: 'webhook' | 'schedule' | 'event' | 'manual';
  config: Record<string, unknown>;
  enabled: boolean;
}

interface ConditionDefinition {
  id: string;
  expression: string;
  description?: string;
  onTrue?: string; // Target node if condition is true
  onFalse?: string; // Target node if condition is false
}

interface RetryConfig {
  maxAttempts: number;
  delay: number;
  backoff: 'linear' | 'exponential';
  retryOn: string[]; // Error types to retry on
}

interface ExecutionError {
  nodeId?: string;
  type: string;
  message: string;
  stack?: string;
  timestamp: Date;
  recoverable: boolean;
}

interface ExecutionMetrics {
  nodesExecuted: number;
  nodesSkipped: number;
  nodesFailed: number;
  totalDuration: number;
  averageNodeDuration: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface DynamicNodeTemplate {
  id: string;
  name: string;
  description: string;
  generator: (context: unknown) => WorkflowNode[];
  conditions: string[];
}

export class AdvancedWorkflowEngine extends EventEmitter {
  private static instance: AdvancedWorkflowEngine;
  private executions: Map<string, WorkflowExecution> = new Map();
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private nodeExecutors: Map<string, NodeExecutor> = new Map();
  private dynamicNodeTemplates: Map<string, DynamicNodeTemplate> = new Map();
  private executionQueue: ExecutionQueue[] = [];
  private maxConcurrentExecutions = 10;
  private currentExecutions = 0;
  private processInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.initializeNodeExecutors();
    this.initializeDynamicNodeTemplates();
    this.startExecutionProcessor();
  }

  public static getInstance(): AdvancedWorkflowEngine {
    if (!AdvancedWorkflowEngine.instance) {
      AdvancedWorkflowEngine.instance = new AdvancedWorkflowEngine();
    }
    return AdvancedWorkflowEngine.instance;
  }

  private initializeNodeExecutors(): void {
    // Register built-in node executors
    this.registerNodeExecutor('start', new StartNodeExecutor());
    this.registerNodeExecutor('end', new EndNodeExecutor());
    this.registerNodeExecutor('condition', new ConditionNodeExecutor());
    this.registerNodeExecutor('loop', new LoopNodeExecutor());
    this.registerNodeExecutor('parallel', new ParallelNodeExecutor());
    this.registerNodeExecutor('subworkflow', new SubWorkflowNodeExecutor());
    this.registerNodeExecutor('code', new CodeNodeExecutor());
    this.registerNodeExecutor('http', new HttpNodeExecutor());
    this.registerNodeExecutor('transform', new TransformNodeExecutor());
    this.registerNodeExecutor('delay', new DelayNodeExecutor());
    this.registerNodeExecutor('variable', new VariableNodeExecutor());
    this.registerNodeExecutor('webhook', new WebhookNodeExecutor());
    this.registerNodeExecutor('email', new EmailNodeExecutor());
    this.registerNodeExecutor('database', new DatabaseNodeExecutor());
    this.registerNodeExecutor('ai', new AINodeExecutor());

    logger.info(`🔧 Initialized ${this.nodeExecutors.size} node executors`);
  }

  private initializeDynamicNodeTemplates(): void {
    // Register dynamic node templates
    this.registerDynamicNodeTemplate({
      id: 'api_batch_processor',
      name: 'API Batch Processor',
      description: 'Dynamically creates nodes for batch API processing',
      generator: (context) => this.generateAPIBatchNodes(context),
      conditions: ['input.batch_size > 1', 'input.api_endpoint']
    });

    this.registerDynamicNodeTemplate({
      id: 'conditional_branch_generator',
      name: 'Conditional Branch Generator',
      description: 'Creates conditional branches based on data structure',
      generator: (context) => this.generateConditionalBranches(context),
      conditions: ['input.conditions && input.conditions.length > 0']
    });

    logger.info(`🧩 Initialized ${this.dynamicNodeTemplates.size} dynamic node templates`);
  }

  /**
   * Execute a workflow
   */
  public async executeWorkflow(
    workflowId: string,
    input: Record<string, unknown> = {},
    options: {
      userId?: string;
      priority?: 'low' | 'normal' | 'high' | 'critical';
      timeout?: number;
      parentExecutionId?: string;
    } = {}
  ): Promise<string> {
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      userId: options.userId,
      status: 'pending',
      startTime: new Date(),
      input,
      context: {
        workflow,
        nextNodes: this.findStartNodes(workflow),
        executionPath: [],
        loopStates: new Map(),
        conditionResults: new Map(),
        parallelBranches: new Map(),
        subWorkflows: new Map()
      },
      nodeExecutions: new Map(),
      variables: new Map(workflow.variables),
      metadata: {
        retryCount: 0,
        parentExecutionId: options.parentExecutionId,
        isSubWorkflow: !!options.parentExecutionId,
        priority: options.priority || 'normal',
        timeout: options.timeout
      },
      metrics: {
        nodesExecuted: 0,
        nodesSkipped: 0,
        nodesFailed: 0,
        totalDuration: 0,
        averageNodeDuration: 0,
        memoryUsage: 0,
        cpuUsage: 0
      }
    };

    // Apply dynamic node generation
    await this.applyDynamicNodeGeneration(execution);

    this.executions.set(executionId, execution);

    // Add to execution queue
    this.executionQueue.push({
      executionId,
      priority: execution.metadata.priority,
      timestamp: new Date()
    });

    // Sort queue by priority and timestamp
    this.executionQueue.sort((a, b) => {
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    this.emit('execution_queued', { executionId, workflowId });

    // Track analytics
    advancedAnalyticsService.trackWorkflowEvent(workflowId, 'executed', {
      executionId,
      userId: options.userId,
      priority: execution.metadata.priority
    });

    logger.info(`🚀 Workflow execution queued: ${executionId} (${workflowId})`);

    return executionId;
  }

  private async applyDynamicNodeGeneration(execution: WorkflowExecution): Promise<void> {
      input: execution.input,
      variables: Object.fromEntries(execution.variables),
      workflow: execution.context.workflow
    };

    for (const [templateId, template] of this.dynamicNodeTemplates) {
      try {
        // Check if conditions are met
          this.evaluateExpression(condition, context)
        );

        if (conditionsMet) {
          
          // Add generated nodes to workflow
          generatedNodes.forEach(node => {
            execution.context.workflow.nodes.set(node.id, node);
          });

          logger.info(`🧩 Generated ${generatedNodes.length} dynamic nodes from template: ${templateId}`);
        }
      } catch (error) {
        logger.error(`❌ Failed to apply dynamic node template ${templateId}:`, error);
      }
    }
  }

  /**
   * Start execution processor
   */
  private startExecutionProcessor(): void {
    this.processInterval = setInterval(() => {
      this.processExecutionQueue();
    }, 1000); // Process every second
  }

  private async processExecutionQueue(): Promise<void> {
    while (this.executionQueue.length > 0 && this.currentExecutions < this.maxConcurrentExecutions) {
      
      if (execution && execution.status === 'pending') {
        this.currentExecutions++;
        this.processExecution(execution).finally(() => {
          this.currentExecutions--;
        });
      }
    }
  }

  private async processExecution(execution: WorkflowExecution): Promise<void> {

    try {
      execution.status = 'running';
      this.emit('execution_started', execution);

      // Broadcast to WebSocket clients
      webSocketServerService.broadcastWorkflowUpdate(execution.workflowId, 'execution:started', {
        executionId: execution.id,
        status: execution.status
      });

      // Execute workflow
      await this.executeWorkflowNodes(execution);

      // Calculate final metrics
      this.calculateExecutionMetrics(execution);

      execution.status = 'completed';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      span.recordResult(true, execution.duration);

      this.emit('execution_completed', execution);

      webSocketServerService.broadcastWorkflowUpdate(execution.workflowId, 'execution:completed', {
        executionId: execution.id,
        status: execution.status,
        duration: execution.duration,
        output: execution.output
      });

      logger.info(`✅ Workflow execution completed: ${execution.id} (${execution.duration}ms)`);

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.duration = execution.endTime!.getTime() - execution.startTime.getTime();
      execution.error = {
        type: error.constructor.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date(),
        recoverable: this.isRecoverableError(error)
      };

      span.recordResult(false, execution.duration!, error);

      this.emit('execution_failed', execution);

      webSocketServerService.broadcastWorkflowUpdate(execution.workflowId, 'execution:failed', {
        executionId: execution.id,
        status: execution.status,
        error: execution.error
      });

      logger.error(`❌ Workflow execution failed: ${execution.id}`, error);

      // Handle retry if configured
      if (this.shouldRetryExecution(execution)) {
        await this.retryExecution(execution);
      }
    }

    // Record metrics
    monitoringService.recordMetric('workflow.execution.duration', execution.duration || 0, {
      workflowId: execution.workflowId,
      status: execution.status
    }, 'ms');

    monitoringService.recordMetric('workflow.execution.nodes', execution.metrics.nodesExecuted, {
      workflowId: execution.workflowId
    });
  }

  private async executeWorkflowNodes(execution: WorkflowExecution): Promise<void> {
    while (execution.context.nextNodes.length > 0 && execution.status === 'running') {
      execution.context.nextNodes = [];

      // Check if we can execute nodes in parallel

      for (const group of parallelGroups) {
        if (group.length === 1) {
          // Single node execution
          await this.executeNode(group[0], execution);
        } else {
          // Parallel execution
          await this.executeNodesInParallel(group, execution);
        }
      }
    }
  }

  private async executeNode(nodeId: string, execution: WorkflowExecution): Promise<void> {
    if (!node) {
      throw new Error(`Node ${nodeId} not found in workflow`);
    }

    const nodeExecution: NodeExecution = {
      nodeId,
      status: 'running',
      startTime: new Date(),
      input: await this.prepareNodeInput(node, execution),
      retryCount: 0
    };

    execution.nodeExecutions.set(nodeId, nodeExecution);
    execution.context.executionPath.push(nodeId);

    // Broadcast node execution start
    webSocketServerService.broadcastWorkflowUpdate(execution.workflowId, 'node:started', {
      executionId: execution.id,
      nodeId,
      status: 'running'
    });

    try {
      if (!executor) {
        throw new Error(`No executor found for node type: ${node.type}`);
      }

      // Execute node with timeout
        ? await this.executeWithTimeout(() => executor.execute(node, nodeExecution.input, execution), timeout)
        : await executor.execute(node, nodeExecution.input, execution);

      nodeExecution.output = result;
      nodeExecution.status = 'completed';
      nodeExecution.endTime = new Date();
      nodeExecution.duration = nodeExecution.endTime.getTime() - nodeExecution.startTime!.getTime();

      execution.metrics.nodesExecuted++;

      // Process node output and determine next nodes
      await this.processNodeOutput(node, result, execution);

      webSocketServerService.broadcastWorkflowUpdate(execution.workflowId, 'node:completed', {
        executionId: execution.id,
        nodeId,
        status: 'completed',
        output: result,
        duration: nodeExecution.duration
      });

      logger.debug(`✅ Node executed: ${nodeId} (${nodeExecution.duration}ms)`);

    } catch (error) {
      nodeExecution.status = 'failed';
      nodeExecution.error = error.message;
      nodeExecution.endTime = new Date();
      nodeExecution.duration = nodeExecution.endTime.getTime() - nodeExecution.startTime!.getTime();

      execution.metrics.nodesFailed++;

      // Handle node retry
      if (this.shouldRetryNode(node, nodeExecution, error)) {
        await this.retryNode(nodeId, execution);
        return;
      }

      // Handle error based on workflow settings
      if (execution.context.workflow.settings.onError === 'stop') {
        throw error;
      } else if (execution.context.workflow.settings.onError === 'continue') {
        execution.metrics.nodesSkipped++;
        this.findNextNodes(node, execution); // Continue to next nodes
      }

      webSocketServerService.broadcastWorkflowUpdate(execution.workflowId, 'node:failed', {
        executionId: execution.id,
        nodeId,
        status: 'failed',
        error: error.message
      });

      logger.error(`❌ Node execution failed: ${nodeId}`, error);
    }
  }

  private async executeNodesInParallel(nodeIds: string[], execution: WorkflowExecution): Promise<void> {
    const parallelBranch: ParallelBranch = {
      id: branchId,
      nodeIds,
      status: 'running',
      results: new Map()
    };

    execution.context.parallelBranches.set(branchId, parallelBranch);

    try {
      await Promise.all(promises);

      parallelBranch.status = 'completed';

    } catch (error) {
      parallelBranch.status = 'failed';
      throw error;
    }
  }

  private async processNodeOutput(
    node: WorkflowNode, 
    output: unknown, 
    execution: WorkflowExecution
  ): Promise<void> {
    // Update variables if node produces variable updates
    if (output && output._variables) {
      for (const [key, value] of Object.entries(output._variables)) {
        execution.variables.set(key, value);
      }
    }

    // Process conditions and find next nodes
    if (node.conditions && node.conditions.length > 0) {
      await this.processConditionalRouting(node, output, execution);
    } else {
      this.findNextNodes(node, execution);
    }

    // Handle special node types
    switch (node.type) {
      case 'loop':
        await this.processLoopNode(node, output, execution);
        break;
      case 'subworkflow':
        await this.processSubWorkflowNode(node, output, execution);
        break;
      case 'end':
        execution.output = output;
        execution.context.nextNodes = []; // Stop execution
        break;
    }
  }

  private async processConditionalRouting(
    node: WorkflowNode,
    output: unknown,
    execution: WorkflowExecution
  ): Promise<void> {
      output,
      variables: Object.fromEntries(execution.variables),
      input: execution.input
    };

    for (const condition of node.conditions!) {
      try {
        execution.context.conditionResults.set(condition.id, result);

        if (result && condition.onTrue) {
          execution.context.nextNodes.push(condition.onTrue);
        } else if (!result && condition.onFalse) {
          execution.context.nextNodes.push(condition.onFalse);
        }
      } catch (error) {
        logger.error(`❌ Failed to evaluate condition ${condition.id}:`, error);
      }
    }
  }

  private async processLoopNode(
    node: WorkflowNode,
    output: unknown,
    execution: WorkflowExecution
  ): Promise<void> {
      nodeId: node.id,
      currentIteration: 0,
      iterationData: output.iterationData || [],
      breakCondition: node.config.breakCondition,
      continueCondition: node.config.continueCondition
    };

    loopState.currentIteration++;
    execution.context.loopStates.set(node.id, loopState);

    // Check loop conditions
    
    if (shouldContinue && loopState.currentIteration < (node.config.maxIterations || 1000)) {
      // Continue loop - add loop body nodes to next execution
      execution.context.nextNodes.push(...loopBodyNodes);
    } else {
      // Exit loop - continue to next nodes
      this.findNextNodes(node, execution);
    }
  }

  private async processSubWorkflowNode(
    node: WorkflowNode,
    output: unknown,
    execution: WorkflowExecution
  ): Promise<void> {
    if (!subWorkflowId) {
      throw new Error(`Sub-workflow ID not specified for node ${node.id}`);
    }

    // Execute sub-workflow
      userId: execution.userId,
      parentExecutionId: execution.id,
      priority: execution.metadata.priority
    });

    execution.context.subWorkflows.set(node.id, subExecutionId);

    // Wait for sub-workflow completion
    
    // Use sub-workflow output as node output
    nodeExecution.output = subExecution.output;
    nodeExecution.childExecutions = [subExecutionId];
  }

  /**
   * Node Executors
   */

  private registerNodeExecutor(type: string, executor: NodeExecutor): void {
    this.nodeExecutors.set(type, executor);
  }

  /**
   * Dynamic Node Generation
   */

  private registerDynamicNodeTemplate(template: DynamicNodeTemplate): void {
    this.dynamicNodeTemplates.set(template.id, template);
  }

  private generateAPIBatchNodes(context: unknown): WorkflowNode[] {

    const nodes: WorkflowNode[] = [];

    for (let __i = 0; i < batches; i++) {

      nodes.push({
        id: `batch_${i}`,
        type: 'http',
        name: `Batch ${i + 1}`,
        position: { x: 200 + (i * 200), y: 200 },
        config: {
          method: 'POST',
          url: apiEndpoint,
          body: { items: batchItems }
        },
        inputs: {},
        outputs: {},
        metadata: { generated: true, batch: i }
      });
    }

    return nodes;
  }

  private generateConditionalBranches(context: unknown): WorkflowNode[] {
    const nodes: WorkflowNode[] = [];

    conditions.forEach((condition: unknown, index: number) => {
      nodes.push({
        id: `condition_${index}`,
        type: 'condition',
        name: `Condition ${index + 1}`,
        position: { x: 200 + (index * 150), y: 300 },
        config: {
          expression: condition.expression
        },
        inputs: {},
        outputs: {},
        conditions: [{
          id: `cond_${index}`,
          expression: condition.expression,
          onTrue: condition.onTrue,
          onFalse: condition.onFalse
        }],
        metadata: { generated: true }
      });
    });

    return nodes;
  }

  /**
   * Helper Methods
   */

  private findStartNodes(workflow: WorkflowDefinition): string[] {
    const startNodes: string[] = [];
    
    for (const [nodeId, node] of workflow.nodes) {
      if (node.type === 'start' || !this.hasIncomingEdges(nodeId, workflow)) {
        startNodes.push(nodeId);
      }
    }
    
    return startNodes.length > 0 ? startNodes : [workflow.nodes.keys().next().value];
  }

  private hasIncomingEdges(nodeId: string, workflow: WorkflowDefinition): boolean {
    for (const edge of workflow.edges.values()) {
      if (edge.target === nodeId) {
        return true;
      }
    }
    return false;
  }

  private findNextNodes(node: WorkflowNode, execution: WorkflowExecution): void {
    
    for (const edge of workflow.edges.values()) {
      if (edge.source === node.id) {
        // Check edge condition if present
        if (edge.condition) {
            variables: Object.fromEntries(execution.variables),
            nodeOutput: execution.nodeExecutions.get(node.id)?.output
          };
          
          if (this.evaluateExpression(edge.condition, context)) {
            execution.context.nextNodes.push(edge.target);
          }
        } else {
          execution.context.nextNodes.push(edge.target);
        }
      }
    }
  }

  private groupNodesForParallelExecution(nodeIds: string[], execution: WorkflowExecution): string[][] {
    // Simple implementation - could be more sophisticated
    
    if (!workflow.settings.parallelism.enabled) {
      return nodeIds.map(id => [id]);
    }
    
    // Group nodes that can be executed in parallel (no dependencies)
    const groups: string[][] = [];
    
    while (remaining.length > 0) {
      const parallelGroup: string[] = [];
      
      for (let __i = remaining.length - 1; i >= 0; i--) {
        
        // Check if node has dependencies on other nodes in remaining list
        
        if (!hasDependency && !dependencies.has(nodeId)) {
          parallelGroup.push(nodeId);
          remaining.splice(i, 1);
          
          // Add this node as a dependency for subsequent checks
          dependencies.add(nodeId);
        }
      }
      
      if (parallelGroup.length > 0) {
        groups.push(parallelGroup);
      } else if (remaining.length > 0) {
        // If no nodes can be executed in parallel, execute one at a time
        groups.push([remaining.shift()!]);
      }
    }
    
    return groups;
  }

  private hasDependencyOnNodes(nodeId: string, nodeList: string[], workflow: WorkflowDefinition): boolean {
    for (const edge of workflow.edges.values()) {
      if (edge.target === nodeId && nodeList.includes(edge.source)) {
        return true;
      }
    }
    return false;
  }

  private async prepareNodeInput(node: WorkflowNode, execution: WorkflowExecution): Promise<Record<string, unknown>> {
    
    // Add global input
    input._globalInput = execution.input;
    
    // Add variables
    input._variables = Object.fromEntries(execution.variables);
    
    // Add outputs from previous nodes
    input._previousOutputs = {};
    for (const [nodeId, nodeExecution] of execution.nodeExecutions) {
      if (nodeExecution.output) {
        input._previousOutputs[nodeId] = nodeExecution.output;
      }
    }
    
    return input;
  }

  private evaluateExpression(expression: string, context: Record<string, unknown>): boolean {
    try {
      // Simple expression evaluation - in production use a proper expression parser
      return func(...Object.values(context));
    } catch (error) {
      logger.error(`❌ Failed to evaluate expression: ${expression}`, error);
      return false;
    }
  }

  private evaluateLoopCondition(loopState: LoopState, output: unknown, execution: WorkflowExecution): boolean {
    if (loopState.breakCondition) {
      return !this.evaluateExpression(loopState.breakCondition, context);
    }
    
    if (loopState.continueCondition) {
      return this.evaluateExpression(loopState.continueCondition, context);
    }
    
    return loopState.currentIteration < (loopState.totalIterations || loopState.iterationData.length);
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Execution timeout')), timeout)
      )
    ]);
  }

  private shouldRetryExecution(execution: WorkflowExecution): boolean {
    return execution.metadata.retryCount < maxRetries && 
           execution.error?.recoverable === true;
  }

  private shouldRetryNode(node: WorkflowNode, nodeExecution: NodeExecution, error: Error): boolean {
    if (!node.retryConfig) return false;
    
    return nodeExecution.retryCount < node.retryConfig.maxAttempts &&
           node.retryConfig.retryOn.includes(error.constructor.name);
  }

  private async retryExecution(execution: WorkflowExecution): Promise<void> {
    execution.metadata.retryCount++;
    execution.status = 'pending';
    execution.context.nextNodes = this.findStartNodes(execution.context.workflow);
    execution.nodeExecutions.clear();
    
    // Add back to queue
    this.executionQueue.push({
      executionId: execution.id,
      priority: execution.metadata.priority,
      timestamp: new Date()
    });
    
    logger.info(`🔄 Retrying workflow execution: ${execution.id} (attempt ${execution.metadata.retryCount})`);
  }

  private async retryNode(nodeId: string, execution: WorkflowExecution): Promise<void> {
    nodeExecution.retryCount++;
    
    
    setTimeout(() => {
      execution.context.nextNodes.push(nodeId);
    }, delay);
    
    logger.info(`🔄 Retrying node: ${nodeId} (attempt ${nodeExecution.retryCount})`);
  }

  private calculateRetryDelay(retryConfig: RetryConfig, attempt: number): number {
    switch (retryConfig.backoff) {
      case 'exponential':
        return retryConfig.delay * Math.pow(2, attempt - 1);
      case 'linear':
      default:
        return retryConfig.delay * attempt;
    }
  }

  private isRecoverableError(error: Error): boolean {
    return recoverableErrors.includes(error.constructor.name);
  }

  private calculateExecutionMetrics(execution: WorkflowExecution): void {
    
    execution.metrics.averageNodeDuration = completedNodes.length > 0
      ? completedNodes.reduce((sum, ne) => sum + (ne.duration || 0), 0) / completedNodes.length
      : 0;
    
    execution.metrics.totalDuration = execution.duration || 0;
    execution.metrics.memoryUsage = process.memoryUsage().heapUsed;
  }

  private async waitForExecution(executionId: string): Promise<WorkflowExecution> {
    return new Promise((resolve, reject) => {
        if (!execution) {
          reject(new Error(`Execution ${executionId} not found`));
          return;
        }
        
        if (execution.status === 'completed' || execution.status === 'failed') {
          resolve(execution);
        } else {
          setTimeout(checkExecution, 1000);
        }
      };
      
      checkExecution();
    });
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBranchId(): string {
    return `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Public API Methods
   */

  public registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
    logger.info(`📋 Registered workflow: ${workflow.name} (${workflow.id})`);
  }

  public getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  public getAllExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }

  public getWorkflowExecutions(workflowId: string): WorkflowExecution[] {
    return Array.from(this.executions.values()).filter(e => e.workflowId === workflowId);
  }

  public async pauseExecution(executionId: string): Promise<boolean> {
    if (!execution || execution.status !== 'running') {
      return false;
    }
    
    execution.status = 'paused';
    this.emit('execution_paused', execution);
    return true;
  }

  public async resumeExecution(executionId: string): Promise<boolean> {
    if (!execution || execution.status !== 'paused') {
      return false;
    }
    
    execution.status = 'running';
    this.emit('execution_resumed', execution);
    return true;
  }

  public async cancelExecution(executionId: string): Promise<boolean> {
    if (!execution || !['running', 'paused'].includes(execution.status)) {
      return false;
    }
    
    execution.status = 'cancelled';
    execution.endTime = new Date();
    execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
    
    this.emit('execution_cancelled', execution);
    return true;
  }

  /**
   * Shutdown service
   */
  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down advanced workflow engine...');

    if (this.processInterval) {
      clearInterval(this.processInterval);
    }

    // Cancel all running executions
    for (const execution of this.executions.values()) {
      if (['running', 'paused'].includes(execution.status)) {
        await this.cancelExecution(execution.id);
      }
    }

    this.removeAllListeners();

    logger.info('✅ Advanced workflow engine shutdown complete');
  }
}

// Interfaces for execution queue
interface ExecutionQueue {
  executionId: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timestamp: Date;
}

// Base interface for node executors
interface NodeExecutor {
  execute(node: WorkflowNode, input: Record<string, unknown>, execution: WorkflowExecution): Promise<unknown>;
}

// Sample node executor implementations
class StartNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, input: Record<string, unknown>): Promise<unknown> {
    return { started: true, timestamp: new Date(), input };
  }
}

class EndNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, input: Record<string, unknown>): Promise<unknown> {
    return { completed: true, timestamp: new Date(), result: input };
  }
}

class ConditionNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, input: Record<string, unknown>): Promise<unknown> {
    // Condition logic is handled in processConditionalRouting
    return { condition: true, input };
  }
}

class LoopNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, input: Record<string, unknown>): Promise<unknown> {
    return { 
      loop: true, 
      iterationData: input._variables?.iterationData || [],
      input 
    };
  }
}

class ParallelNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, input: Record<string, unknown>): Promise<unknown> {
    return { parallel: true, input };
  }
}

class SubWorkflowNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, input: Record<string, unknown>): Promise<unknown> {
    // Sub-workflow execution is handled in processSubWorkflowNode
    return input;
  }
}

class CodeNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, input: Record<string, unknown>): Promise<unknown> {
    return func(input, input._variables);
  }
}

class HttpNodeExecutor implements NodeExecutor {
  async execute(
    node: WorkflowNode, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    input: Record<string, unknown>
  ): Promise<unknown> {
    const { method = 'GET', url, headers = {}, body } = node.config;
    
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined
    });
    
    return {
      status: response.status,
      statusText: response.statusText,
      data: await response.json()
    };
  }
}

class TransformNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, input: Record<string, unknown>): Promise<unknown> {
    return func(input);
  }
}

class DelayNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, input: Record<string, unknown>): Promise<unknown> {
    await new Promise(resolve => setTimeout(resolve, delay));
    return { delayed: true, duration: delay, input };
  }
}

class VariableNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, input: Record<string, unknown>): Promise<unknown> {
    return { 
      _variables: variables,
      updated: Object.keys(variables),
      input 
    };
  }
}

class WebhookNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, input: Record<string, unknown>): Promise<unknown> {
    // Webhook execution would integrate with webhook service
    return { webhook: true, sent: true, input };
  }
}

class EmailNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, input: Record<string, unknown>): Promise<unknown> {
    // Email execution would integrate with email service
    const { _to, subject, body } = node.config;
    return { 
      email: true, 
      sent: true, 
      to, 
      subject, 
      body: body || JSON.stringify(input) 
    };
  }
}

class DatabaseNodeExecutor implements NodeExecutor {
  async execute(
    node: WorkflowNode, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    input: Record<string, unknown>
  ): Promise<unknown> {
    // Database execution would integrate with database service
    const { _query, parameters } = node.config;
    return { 
      database: true, 
      query, 
      parameters, 
      result: 'Database operation completed' 
    };
  }
}

class AINodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, input: Record<string, unknown>): Promise<unknown> {
    // AI execution would integrate with AI service
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _model, prompt, parameters } = node.config;
    return { 
      ai: true, 
      model, 
      prompt, 
      response: 'AI processing completed',
      input 
    };
  }
}

export const advancedWorkflowEngine = AdvancedWorkflowEngine.getInstance();