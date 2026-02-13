/**
 * PLAN C PHASE 3 - Service Monolithique 2: Orchestration de Workflows
 * Unifie l'exécution, le scheduling, les sous-workflows et l'orchestration avancée
 * REFACTORED: Utilise SharedPatterns pour éliminer les duplications
 */

import { logger } from '../LoggingService';
import cacheService from '../CacheService';
import { eventNotificationService } from '../EventNotificationService';
import { dbOptimizer } from '../DatabaseOptimizationService';
import { Node, Edge } from 'reactflow';
import {
  withErrorHandling,
  withRetry,
  withCache,
  generateId,
  sleep
} from '../../utils/SharedPatterns';

// Types
export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  nodes: Node[];
  edges: Edge[];
  triggers: TriggerConfig[];
  variables: Record<string, any>;
  metadata: Record<string, any>;
  subWorkflows?: string[];
}

export interface TriggerConfig {
  type: 'schedule' | 'webhook' | 'event' | 'manual' | 'condition';
  config: Record<string, any>;
  enabled: boolean;
}

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  parentExecutionId?: string;
  startTime: Date;
  variables: Record<string, any>;
  credentials: Record<string, any>;
  results: Map<string, NodeExecutionResult>;
  errors: Map<string, Error>;
  status: ExecutionStatus;
  retryCount: number;
  metadata: Record<string, any>;
}

export interface NodeExecutionResult {
  nodeId: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  data: any;
  error?: Error;
  startTime: Date;
  endTime?: Date;
  retryCount: number;
}

export type ExecutionStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface ExecutionPlan {
  steps: ExecutionStep[];
  parallelGroups: ExecutionStep[][];
  estimatedDuration: number;
  dependencies: Map<string, string[]>;
}

export interface ExecutionStep {
  nodeId: string;
  nodeType: string;
  priority: number;
  canRunInParallel: boolean;
  dependencies: string[];
  estimatedDuration: number;
}

export interface ScheduledJob {
  id: string;
  workflowId: string;
  cronExpression: string;
  nextRun: Date;
  lastRun?: Date;
  enabled: boolean;
  timezone: string;
  metadata: Record<string, any>;
}

/**
 * Service d'orchestration unifié pour workflows
 */
export class WorkflowOrchestrationService {
  private static instance: WorkflowOrchestrationService;
  
  // Configuration
  private readonly MAX_PARALLEL_EXECUTIONS = 10;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly EXECUTION_TIMEOUT = 3600000; // 1 hour
  private readonly CHECKPOINT_INTERVAL = 5000; // 5 seconds
  
  // Storage
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, ExecutionContext> = new Map();
  private scheduledJobs: Map<string, ScheduledJob> = new Map();
  private executionQueue: ExecutionContext[] = [];
  private activeExecutions: Set<string> = new Set();
  private executionHistory: ExecutionContext[] = [];
  
  // Execution engine
  private executionTimer: NodeJS.Timeout | null = null;
  private checkpointTimer: NodeJS.Timeout | null = null;
  
  private constructor() {
    this.initialize();
  }
  
  static getInstance(): WorkflowOrchestrationService {
    if (!WorkflowOrchestrationService.instance) {
      WorkflowOrchestrationService.instance = new WorkflowOrchestrationService();
    }
    return WorkflowOrchestrationService.instance;
  }
  
  private initialize(): void {
    // Start execution engine
    this.startExecutionEngine();
    
    // Start checkpoint system
    this.startCheckpointSystem();
    
    // Load scheduled jobs
    this.loadScheduledJobs();
    
    logger.info('Workflow Orchestration Service initialized');
  }
  
  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    inputs?: Record<string, any>,
    options?: {
      async?: boolean;
      parentExecutionId?: string;
      priority?: number;
      timeout?: number;
    }
  ): Promise<ExecutionContext> {
    try {
      // Get workflow definition
      const workflow = await this.getWorkflow(workflowId);
      
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }
      
      // Create execution context
      const context = this.createExecutionContext(workflow, inputs, options);
      
      // Store execution
      this.executions.set(context.executionId, context);
      
      // Generate execution plan
      const plan = await this.generateExecutionPlan(workflow, context);
      context.metadata.executionPlan = plan;
      
      // Validate before execution
      const validation = await this.validateExecution(workflow, context);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Add to queue or execute immediately
      if (options?.async === false) {
        await this.executeWorkflowSync(context, plan);
      } else {
        this.queueExecution(context, options?.priority || 5);
      }
      
      logger.info(`Workflow ${workflowId} execution started: ${context.executionId}`);
      
      return context;
      
    } catch (error) {
      logger.error(`Failed to execute workflow ${workflowId}:`, error);
      throw error;
    }
  }
  
  /**
   * Execute workflow synchronously
   */
  private async executeWorkflowSync(
    context: ExecutionContext,
    plan: ExecutionPlan
  ): Promise<void> {
    context.status = 'running';
    this.activeExecutions.add(context.executionId);
    
    try {
      // Execute parallel groups in sequence
      for (const group of plan.parallelGroups) {
        await this.executeParallelGroup(context, group);
        
        // Check if execution should stop
        if (context.status === 'cancelled' || context.status === 'failed') {
          break;
        }
      }
      
      // Mark as completed if all nodes succeeded
      if (context.status === 'running') {
        context.status = 'completed';
      }
      
    } catch (error) {
      context.status = 'failed';
      logger.error(`Workflow execution failed: ${context.executionId}`, error);
      throw error;
    } finally {
      this.activeExecutions.delete(context.executionId);
      this.saveExecutionHistory(context);
    }
  }
  
  /**
   * Execute a group of nodes in parallel
   */
  private async executeParallelGroup(
    context: ExecutionContext,
    group: ExecutionStep[]
  ): Promise<void> {
    const promises = group.map(step => this.executeNode(context, step));
    
    await Promise.allSettled(promises);
  }
  
  /**
   * Execute a single node
   */
  private async executeNode(
    context: ExecutionContext,
    step: ExecutionStep
  ): Promise<NodeExecutionResult> {
    const result: NodeExecutionResult = {
      nodeId: step.nodeId,
      status: 'running',
      data: null,
      startTime: new Date(),
      retryCount: 0
    };
    
    context.results.set(step.nodeId, result);
    
    try {
      // Emit node start event
      eventNotificationService.notify('node.execution.start', {
        executionId: context.executionId,
        nodeId: step.nodeId
      });
      
      // Get node executor
      const executor = this.getNodeExecutor(step.nodeType);
      
      // Prepare node inputs
      const inputs = this.prepareNodeInputs(context, step);
      
      // Execute with retry logic
      result.data = await withRetry(
        () => executor(inputs, context),
        {
          maxAttempts: this.MAX_RETRY_ATTEMPTS + 1,
          delay: 1000,
          strategy: 'exponential',
          onRetry: (attempt) => {
            result.retryCount = attempt;
          }
        }
      );
      result.status = 'success';
      
    } catch (error: any) {
      result.status = 'error';
      result.error = error;
      context.errors.set(step.nodeId, error);
      
      // Check if error should stop execution
      if (this.shouldStopOnError(step, context)) {
        context.status = 'failed';
      }
      
      logger.error(`Node ${step.nodeId} execution failed:`, error);
      
    } finally {
      result.endTime = new Date();
      
      // Emit node complete event
      eventNotificationService.notify('node.execution.complete', {
        executionId: context.executionId,
        nodeId: step.nodeId,
        status: result.status
      });
    }
    
    return result;
  }
  
  /**
   * Schedule a workflow
   */
  async scheduleWorkflow(
    workflowId: string,
    cronExpression: string,
    options?: {
      timezone?: string;
      enabled?: boolean;
      metadata?: Record<string, any>;
    }
  ): Promise<ScheduledJob> {
    try {
      const job: ScheduledJob = {
        id: this.generateExecutionId(),
        workflowId,
        cronExpression,
        nextRun: this.calculateNextRun(cronExpression, options?.timezone),
        enabled: options?.enabled !== false,
        timezone: options?.timezone || 'UTC',
        metadata: options?.metadata || {}
      };
      
      this.scheduledJobs.set(job.id, job);
      
      // Save to database
      await this.saveScheduledJob(job);
      
      logger.info(`Workflow ${workflowId} scheduled: ${job.id}`);
      
      return job;
      
    } catch (error) {
      logger.error(`Failed to schedule workflow ${workflowId}:`, error);
      throw error;
    }
  }
  
  /**
   * Cancel an execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    const context = this.executions.get(executionId);
    
    if (!context) {
      throw new Error(`Execution ${executionId} not found`);
    }
    
    context.status = 'cancelled';
    
    // Remove from queue if pending
    const queueIndex = this.executionQueue.findIndex(e => e.executionId === executionId);
    if (queueIndex >= 0) {
      this.executionQueue.splice(queueIndex, 1);
    }
    
    logger.info(`Execution ${executionId} cancelled`);
  }
  
  /**
   * Pause an execution
   */
  async pauseExecution(executionId: string): Promise<void> {
    const context = this.executions.get(executionId);
    
    if (!context) {
      throw new Error(`Execution ${executionId} not found`);
    }
    
    if (context.status === 'running') {
      context.status = 'paused';
      logger.info(`Execution ${executionId} paused`);
    }
  }
  
  /**
   * Resume an execution
   */
  async resumeExecution(executionId: string): Promise<void> {
    const context = this.executions.get(executionId);
    
    if (!context) {
      throw new Error(`Execution ${executionId} not found`);
    }
    
    if (context.status === 'paused') {
      context.status = 'running';
      this.queueExecution(context, 10); // High priority
      logger.info(`Execution ${executionId} resumed`);
    }
  }
  
  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): ExecutionContext | undefined {
    return this.executions.get(executionId);
  }
  
  /**
   * Get execution history
   */
  getExecutionHistory(
    workflowId?: string,
    limit: number = 100
  ): ExecutionContext[] {
    let history = this.executionHistory;
    
    if (workflowId) {
      history = history.filter(e => e.workflowId === workflowId);
    }
    
    return history.slice(0, limit);
  }
  
  /**
   * Generate execution plan
   */
  private async generateExecutionPlan(
    workflow: WorkflowDefinition,
    context: ExecutionContext
  ): Promise<ExecutionPlan> {
    const plan: ExecutionPlan = {
      steps: [],
      parallelGroups: [],
      estimatedDuration: 0,
      dependencies: new Map()
    };
    
    // Build dependency graph
    const dependencies = this.buildDependencyGraph(workflow);
    plan.dependencies = dependencies;
    
    // Topological sort to determine execution order
    const sortedNodes = this.topologicalSort(workflow.nodes, workflow.edges);
    
    // Create execution steps
    for (const node of sortedNodes) {
      const step: ExecutionStep = {
        nodeId: node.id,
        nodeType: node.data?.type || 'unknown',
        priority: this.calculateNodePriority(node, dependencies),
        canRunInParallel: this.canRunInParallel(node, dependencies),
        dependencies: dependencies.get(node.id) || [],
        estimatedDuration: this.estimateNodeDuration(node)
      };
      
      plan.steps.push(step);
      plan.estimatedDuration += step.estimatedDuration;
    }
    
    // Group into parallel execution groups
    plan.parallelGroups = this.groupParallelSteps(plan.steps, dependencies);
    
    return plan;
  }
  
  /**
   * Build dependency graph from workflow
   */
  private buildDependencyGraph(workflow: WorkflowDefinition): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();
    
    // Initialize all nodes
    for (const node of workflow.nodes) {
      dependencies.set(node.id, []);
    }
    
    // Add edge dependencies
    for (const edge of workflow.edges) {
      const deps = dependencies.get(edge.target) || [];
      deps.push(edge.source);
      dependencies.set(edge.target, deps);
    }
    
    return dependencies;
  }
  
  /**
   * Topological sort of nodes
   */
  private topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
    const visited = new Set<string>();
    const sorted: Node[] = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    
    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      // Visit dependencies first
      const deps = edges.filter(e => e.target === nodeId);
      for (const dep of deps) {
        visit(dep.source);
      }
      
      const node = nodeMap.get(nodeId);
      if (node) {
        sorted.push(node);
      }
    };
    
    // Visit all nodes
    for (const node of nodes) {
      visit(node.id);
    }
    
    return sorted;
  }
  
  /**
   * Group steps that can run in parallel
   */
  private groupParallelSteps(
    steps: ExecutionStep[],
    dependencies: Map<string, string[]>
  ): ExecutionStep[][] {
    const groups: ExecutionStep[][] = [];
    const executed = new Set<string>();
    
    for (const step of steps) {
      // Find the earliest group this step can join
      let groupIndex = -1;
      
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        
        // Check if all dependencies are in earlier groups
        const canJoinGroup = step.dependencies.every(dep => {
          for (let j = 0; j < i; j++) {
            if (groups[j].some(s => s.nodeId === dep)) {
              return true;
            }
          }
          return false;
        });
        
        if (canJoinGroup) {
          groupIndex = i;
          break;
        }
      }
      
      if (groupIndex === -1) {
        // Create new group
        groups.push([step]);
      } else {
        // Add to existing group
        groups[groupIndex].push(step);
      }
    }
    
    return groups;
  }
  
  /**
   * Helper methods
   */
  
  private createExecutionContext(
    workflow: WorkflowDefinition,
    inputs?: Record<string, any>,
    options?: any
  ): ExecutionContext {
    return {
      workflowId: workflow.id,
      executionId: this.generateExecutionId(),
      parentExecutionId: options?.parentExecutionId,
      startTime: new Date(),
      variables: { ...workflow.variables, ...inputs },
      credentials: {},
      results: new Map(),
      errors: new Map(),
      status: 'pending',
      retryCount: 0,
      metadata: {
        workflowVersion: workflow.version,
        triggeredBy: options?.triggeredBy || 'manual'
      }
    };
  }
  
  private queueExecution(context: ExecutionContext, priority: number): void {
    // Insert based on priority
    const index = this.executionQueue.findIndex(e => 
      (e.metadata.priority || 5) < priority
    );
    
    if (index === -1) {
      this.executionQueue.push(context);
    } else {
      this.executionQueue.splice(index, 0, context);
    }
    
    context.metadata.priority = priority;
  }
  
  private startExecutionEngine(): void {
    this.executionTimer = setInterval(async () => {
      await this.processExecutionQueue();
    }, 1000);
  }
  
  private async processExecutionQueue(): Promise<void> {
    if (this.activeExecutions.size >= this.MAX_PARALLEL_EXECUTIONS) {
      return;
    }
    
    const context = this.executionQueue.shift();
    if (!context) {
      return;
    }
    
    const plan = context.metadata.executionPlan as ExecutionPlan;
    this.executeWorkflowSync(context, plan).catch(error => {
      logger.error(`Queue execution failed: ${context.executionId}`, error);
    });
  }
  
  private startCheckpointSystem(): void {
    this.checkpointTimer = setInterval(() => {
      this.saveCheckpoints();
    }, this.CHECKPOINT_INTERVAL);
  }
  
  private saveCheckpoints(): void {
    for (const context of this.executions.values()) {
      if (context.status === 'running') {
        this.saveExecutionCheckpoint(context);
      }
    }
  }
  
  private async saveExecutionCheckpoint(context: ExecutionContext): Promise<void> {
    try {
      await cacheService.set(
        `checkpoint:${context.executionId}`,
        context,
        { ttl: 3600 }
      );
    } catch (error) {
      logger.error(`Failed to save checkpoint: ${context.executionId}`, error);
    }
  }
  
  private async getWorkflow(workflowId: string): Promise<WorkflowDefinition | undefined> {
    // Check cache
    const cached = await cacheService.get<WorkflowDefinition>(`workflow:${workflowId}`);
    if (cached) return cached;
    
    // Get from storage
    return this.workflows.get(workflowId);
  }
  
  private async validateExecution(
    workflow: WorkflowDefinition,
    context: ExecutionContext
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Validate required variables
    // Validate node configurations
    // Validate credentials
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  private getNodeExecutor(nodeType: string): Function {
    // Return appropriate executor based on node type
    // This would be extended with actual node executors
    return async (inputs: any, context: ExecutionContext) => {
      // Simulate execution
      await this.delay(100);
      return { success: true, data: inputs };
    };
  }
  
  private prepareNodeInputs(context: ExecutionContext, step: ExecutionStep): any {
    const inputs: any = {};
    
    // Collect outputs from dependencies
    for (const depId of step.dependencies) {
      const depResult = context.results.get(depId);
      if (depResult?.data) {
        inputs[depId] = depResult.data;
      }
    }
    
    // Add context variables
    inputs.variables = context.variables;
    
    return inputs;
  }
  
  private shouldStopOnError(step: ExecutionStep, context: ExecutionContext): boolean {
    // Check if node has error handling
    // For now, stop on any error
    return true;
  }
  
  private calculateNodePriority(node: Node, dependencies: Map<string, string[]>): number {
    // Higher priority for nodes with more dependents
    let priority = 5;
    
    for (const [nodeId, deps] of dependencies) {
      if (deps.includes(node.id)) {
        priority++;
      }
    }
    
    return Math.min(priority, 10);
  }
  
  private canRunInParallel(node: Node, dependencies: Map<string, string[]>): boolean {
    // Check if node type supports parallel execution
    const parallelTypes = ['transform', 'filter', 'map'];
    return parallelTypes.includes(node.data?.type || '');
  }
  
  private estimateNodeDuration(node: Node): number {
    // Estimate based on node type and historical data
    const estimates: Record<string, number> = {
      httpRequest: 1000,
      database: 500,
      transform: 100,
      filter: 50,
      condition: 10
    };
    
    return estimates[node.data?.type || ''] || 100;
  }
  
  private calculateNextRun(cronExpression: string, timezone?: string): Date {
    // Would use a cron library
    // Simplified for now
    return new Date(Date.now() + 86400000); // Tomorrow
  }
  
  private async saveScheduledJob(job: ScheduledJob): Promise<void> {
    // Save to database
    await dbOptimizer.executeQuery(
      'INSERT INTO scheduled_jobs (id, workflow_id, cron, next_run, enabled) VALUES (?, ?, ?, ?, ?)',
      [job.id, job.workflowId, job.cronExpression, job.nextRun, job.enabled]
    );
  }
  
  private async loadScheduledJobs(): Promise<void> {
    // Load from database
    // Start cron scheduler
  }
  
  private saveExecutionHistory(context: ExecutionContext): void {
    this.executionHistory.unshift(context);
    
    // Keep only last 1000 executions
    if (this.executionHistory.length > 1000) {
      this.executionHistory = this.executionHistory.slice(0, 1000);
    }
  }
  
  private generateExecutionId(): string {
    return generateId('exec');
  }
  
  private delay(ms: number): Promise<void> {
    return sleep(ms);
  }
}

// Export singleton instance
export const orchestrationService = WorkflowOrchestrationService.getInstance();