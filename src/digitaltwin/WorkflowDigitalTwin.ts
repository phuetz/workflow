/**
 * Workflow Digital Twin Core
 *
 * Creates virtual representations of workflows for simulation,
 * testing, and quality assurance before production deployment.
 */

import type {
  VirtualWorkflow,
  SimulationConfig,
  SimulationResult,
  ComparisonResult,
  TwinSyncEvent,
  DigitalTwinConfig,
  TwinStatistics,
  FaultScenario,
  SimulatedNodeResult,
  SimulationMetrics,
  ExecutionDifference,
  ComparisonMetrics,
} from './types/digitaltwin';
import type { Workflow, WorkflowExecution } from '../types/workflowTypes';
import { generateUUID } from '../utils/uuid';

// Alias for compatibility
const uuidv4 = generateUUID;

/**
 * Digital Twin class manages virtual workflow representations
 */
export class WorkflowDigitalTwin {
  private twins: Map<string, VirtualWorkflow> = new Map();
  private simulations: Map<string, SimulationResult[]> = new Map();
  private syncEvents: Map<string, TwinSyncEvent[]> = new Map();
  private config: DigitalTwinConfig;

  constructor(config: Partial<DigitalTwinConfig> = {}) {
    this.config = {
      realTimeSync: config.realTimeSync ?? true,
      syncInterval: config.syncInterval ?? 5000,
      autoSimulate: config.autoSimulate ?? false,
      defaultSimulationMode: config.defaultSimulationMode ?? 'isolated',
      retentionDays: config.retentionDays ?? 90,
      maxSimulations: config.maxSimulations ?? 100,
      enableMetrics: config.enableMetrics ?? true,
      enableComparison: config.enableComparison ?? true,
    };
  }

  /**
   * Create a digital twin for a workflow
   */
  async createTwin(workflow: Workflow): Promise<VirtualWorkflow> {
    const twinId = uuidv4();
    const twin: VirtualWorkflow = {
      id: twinId,
      realWorkflowId: workflow.id,
      workflow: this.cloneWorkflow(workflow),
      state: {},
      executionCount: 0,
      divergence: 0,
      metadata: {
        created: new Date(),
        updated: new Date(),
        version: '1.0.0',
      },
    };

    this.twins.set(twinId, twin);
    this.simulations.set(twinId, []);
    this.syncEvents.set(twinId, []);

    return twin;
  }

  /**
   * Get a digital twin by ID
   */
  getTwin(twinId: string): VirtualWorkflow | undefined {
    return this.twins.get(twinId);
  }

  /**
   * Get twin by real workflow ID
   */
  getTwinByWorkflowId(workflowId: string): VirtualWorkflow | undefined {
    for (const twin of Array.from(this.twins.values())) {
      if (twin.realWorkflowId === workflowId) {
        return twin;
      }
    }
    return undefined;
  }

  /**
   * Simulate workflow execution without running real workflow
   */
  async simulate(
    twinId: string,
    input: any,
    config: Partial<SimulationConfig> = {}
  ): Promise<SimulationResult> {
    const twin = this.twins.get(twinId);
    if (!twin) {
      throw new Error(`Digital twin ${twinId} not found`);
    }

    const simulationConfig: SimulationConfig = {
      mode: config.mode ?? this.config.defaultSimulationMode,
      timeCompression: config.timeCompression ?? 1,
      deterministic: config.deterministic ?? true,
      faults: config.faults ?? [],
      recordMetrics: config.recordMetrics ?? this.config.enableMetrics,
      validateOutput: config.validateOutput ?? true,
      timeout: config.timeout ?? 300000, // 5 minutes
      maxIterations: config.maxIterations,
    };

    const startTime = Date.now();
    const simulationId = uuidv4();

    try {
      // Execute virtual workflow
      const nodeResults = await this.executeVirtualWorkflow(
        twin,
        input,
        simulationConfig
      );

      // Calculate final output
      const lastNode = nodeResults[nodeResults.length - 1];
      const output = lastNode?.output;
      const error = nodeResults.find(r => r.error)?.error;

      // Calculate metrics
      const metrics = this.calculateSimulationMetrics(nodeResults);

      const result: SimulationResult = {
        id: simulationId,
        twinId,
        workflowId: twin.realWorkflowId,
        input,
        output,
        error,
        status: error ? 'failed' : 'success',
        duration: Date.now() - startTime,
        nodeResults,
        faultsInjected: simulationConfig.faults,
        metrics,
        timestamp: new Date(),
        config: simulationConfig,
      };

      // Store simulation result
      this.storeSimulation(twinId, result);

      // Update twin
      twin.executionCount++;
      twin.metadata.updated = new Date();

      return result;
    } catch (error) {
      const result: SimulationResult = {
        id: simulationId,
        twinId,
        workflowId: twin.realWorkflowId,
        input,
        output: null,
        error: error as Error,
        status: 'failed',
        duration: Date.now() - startTime,
        nodeResults: [],
        faultsInjected: simulationConfig.faults,
        metrics: this.emptyMetrics(),
        timestamp: new Date(),
        config: simulationConfig,
      };

      this.storeSimulation(twinId, result);
      throw error;
    }
  }

  /**
   * Execute virtual workflow with fault injection
   */
  private async executeVirtualWorkflow(
    twin: VirtualWorkflow,
    input: any,
    config: SimulationConfig
  ): Promise<SimulatedNodeResult[]> {
    const { workflow } = twin;
    const results: SimulatedNodeResult[] = [];
    const nodeOutputs = new Map<string, any>();

    // Find start node
    const startNodes = workflow.nodes.filter(n =>
      n.type === 'trigger' || !workflow.edges.some(e => e.target === n.id)
    );

    if (startNodes.length === 0) {
      throw new Error('No start node found in workflow');
    }

    // Execute nodes in topological order
    const executionOrder = this.getExecutionOrder(workflow);

    for (const nodeId of executionOrder) {
      const node = workflow.nodes.find(n => n.id === nodeId);
      if (!node) continue;

      // Get input from previous nodes
      const nodeInput = this.getNodeInput(nodeId, workflow, nodeOutputs, input);

      // Check for fault injection
      const nodeFaults = config.faults.filter(f => f.nodeId === nodeId);
      const beforeFaults = nodeFaults.filter(f => f.timing === 'before');

      // Inject before faults
      if (beforeFaults.some(f => this.shouldInjectFault(f, config))) {
        const fault = beforeFaults[0];
        results.push({
          nodeId,
          nodeName: node.data.label || node.type,
          input: nodeInput,
          output: null,
          error: new Error(`Injected fault: ${fault.faultType}`),
          duration: 0,
          retries: 0,
          faultsInjected: [fault],
          timestamp: new Date(),
        });
        continue;
      }

      // Execute node
      const nodeStartTime = Date.now();
      try {
        const output = await this.executeVirtualNode(
          node,
          nodeInput,
          config,
          nodeFaults
        );

        const duration = Date.now() - nodeStartTime;

        // Apply time compression
        const compressedDuration = duration / config.timeCompression;

        results.push({
          nodeId,
          nodeName: node.data.label || node.type,
          input: nodeInput,
          output,
          duration: compressedDuration,
          retries: 0,
          faultsInjected: nodeFaults.filter(f =>
            f.timing === 'during' && this.shouldInjectFault(f, config)
          ),
          timestamp: new Date(),
        });

        nodeOutputs.set(nodeId, output);
      } catch (error) {
        results.push({
          nodeId,
          nodeName: node.data.label || node.type,
          input: nodeInput,
          output: null,
          error: error as Error,
          duration: Date.now() - nodeStartTime,
          retries: 0,
          faultsInjected: nodeFaults,
          timestamp: new Date(),
        });

        // Stop execution on error unless configured otherwise
        if (!node.data.config?.continueOnError) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Execute a virtual node (simulated)
   */
  private async executeVirtualNode(
    node: any,
    input: any,
    config: SimulationConfig,
    faults: FaultScenario[]
  ): Promise<any> {
    // Check for during faults
    const duringFaults = faults.filter(f => f.timing === 'during');
    if (duringFaults.some(f => this.shouldInjectFault(f, config))) {
      const fault = duringFaults[0];
      throw this.createFaultError(fault);
    }

    // Simulate node execution based on mode
    switch (config.mode) {
      case 'isolated':
        return this.simulateIsolated(node, input, config);
      case 'connected':
        return this.simulateConnected(node, input, config);
      case 'hybrid':
        return this.simulateHybrid(node, input, config);
      default:
        return this.simulateIsolated(node, input, config);
    }
  }

  /**
   * Simulate node in isolated mode (no external calls)
   */
  private async simulateIsolated(node: any, input: any, config: SimulationConfig): Promise<any> {
    // Generate deterministic or random output based on node type
    if (config.deterministic) {
      return this.generateDeterministicOutput(node, input);
    } else {
      return this.generateStochasticOutput(node, input);
    }
  }

  /**
   * Simulate node in connected mode (real API calls)
   */
  private async simulateConnected(node: any, input: any, config: SimulationConfig): Promise<any> {
    // This would make actual API calls - simplified for simulation
    return this.generateDeterministicOutput(node, input);
  }

  /**
   * Simulate node in hybrid mode (mix of isolated and connected)
   */
  private async simulateHybrid(node: any, input: any, config: SimulationConfig): Promise<any> {
    // Use connected mode for safe nodes, isolated for risky ones
    const safeNodeTypes = ['transform', 'filter', 'merge', 'split'];
    if (safeNodeTypes.includes(node.type)) {
      return this.simulateConnected(node, input, config);
    }
    return this.simulateIsolated(node, input, config);
  }

  /**
   * Generate deterministic output for a node
   */
  private generateDeterministicOutput(node: any, input: any): any {
    // Simple transformation based on node type
    switch (node.type) {
      case 'transform':
        return { ...input, transformed: true };
      case 'filter':
        return input;
      case 'merge':
        return { merged: true, data: input };
      case 'httpRequest':
        return { status: 200, body: { success: true } };
      default:
        return { output: input, nodeType: node.type };
    }
  }

  /**
   * Generate stochastic (random) output for a node
   */
  private generateStochasticOutput(node: any, input: any): any {
    const baseOutput = this.generateDeterministicOutput(node, input);
    return {
      ...baseOutput,
      randomValue: Math.random(),
      timestamp: Date.now(),
    };
  }

  /**
   * Check if fault should be injected based on probability
   */
  private shouldInjectFault(fault: FaultScenario, config: SimulationConfig): boolean {
    if (!fault.enabled) return false;
    if (config.deterministic) {
      return fault.probability >= 1.0;
    }
    return Math.random() < fault.probability;
  }

  /**
   * Create error from fault scenario
   */
  private createFaultError(fault: FaultScenario): Error {
    const messages: Record<string, string> = {
      network_timeout: 'Network timeout',
      invalid_data: 'Invalid data received',
      api_failure: 'API request failed',
      auth_failure: 'Authentication failed',
      resource_exhaustion: 'Resource exhausted',
      data_corruption: 'Data corruption detected',
      cascading_failure: 'Cascading failure',
      intermittent_failure: 'Intermittent failure',
      slow_response: 'Slow response',
      partial_failure: 'Partial failure',
    };

    return new Error(messages[fault.faultType] || 'Unknown fault');
  }

  /**
   * Get node input from previous nodes
   */
  private getNodeInput(
    nodeId: string,
    workflow: Workflow,
    nodeOutputs: Map<string, any>,
    initialInput: any
  ): any {
    const incomingEdges = workflow.edges.filter(e => e.target === nodeId);

    if (incomingEdges.length === 0) {
      return initialInput;
    }

    if (incomingEdges.length === 1) {
      return nodeOutputs.get(incomingEdges[0].source) || {};
    }

    // Merge multiple inputs
    return incomingEdges.reduce((acc, edge) => {
      const output = nodeOutputs.get(edge.source);
      return { ...acc, ...output };
    }, {});
  }

  /**
   * Get execution order using topological sort
   */
  private getExecutionOrder(workflow: Workflow): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const outgoingEdges = workflow.edges.filter(e => e.source === nodeId);
      outgoingEdges.forEach(edge => visit(edge.target));

      order.unshift(nodeId);
    };

    // Start from trigger/start nodes
    const startNodes = workflow.nodes.filter(n =>
      n.type === 'trigger' || !workflow.edges.some(e => e.target === n.id)
    );

    startNodes.forEach(node => visit(node.id));

    return order;
  }

  /**
   * Compare virtual vs real execution
   */
  async compare(
    twinId: string,
    virtualExecutionId: string,
    realExecution: WorkflowExecution
  ): Promise<ComparisonResult> {
    const twin = this.twins.get(twinId);
    if (!twin) {
      throw new Error(`Digital twin ${twinId} not found`);
    }

    const simulations = this.simulations.get(twinId) || [];
    const virtualExecution = simulations.find(s => s.id === virtualExecutionId);

    if (!virtualExecution) {
      throw new Error(`Virtual execution ${virtualExecutionId} not found`);
    }

    // Find differences
    const differences = this.findDifferences(virtualExecution, realExecution);

    // Calculate metrics
    const metrics = this.calculateComparisonMetrics(differences);

    const result: ComparisonResult = {
      id: uuidv4(),
      twinId,
      virtualExecutionId,
      realExecutionId: realExecution.id,
      status: this.getComparisonStatus(metrics.overallAccuracy),
      accuracy: metrics.overallAccuracy,
      differences,
      metrics,
      timestamp: new Date(),
    };

    return result;
  }

  /**
   * Find differences between virtual and real execution
   */
  private findDifferences(
    virtual: SimulationResult,
    real: WorkflowExecution
  ): ExecutionDifference[] {
    const differences: ExecutionDifference[] = [];

    // Compare outputs
    if (JSON.stringify(virtual.output) !== JSON.stringify(real.output)) {
      differences.push({
        type: 'output',
        location: 'final_output',
        virtualValue: virtual.output,
        realValue: real.output,
        severity: 'critical',
        description: 'Final output differs between virtual and real execution',
      });
    }

    // Compare durations
    const durationDiff = Math.abs(virtual.duration - (real.endTime?.getTime() || 0 - real.startTime.getTime()));
    if (durationDiff > 1000) { // > 1 second difference
      differences.push({
        type: 'duration',
        location: 'execution_time',
        virtualValue: virtual.duration,
        realValue: real.endTime?.getTime() || 0 - real.startTime.getTime(),
        severity: 'minor',
        description: `Duration differs by ${durationDiff}ms`,
      });
    }

    // Compare errors
    if ((virtual.error && !real.error) || (!virtual.error && real.error)) {
      differences.push({
        type: 'error',
        location: 'error_state',
        virtualValue: virtual.error?.message,
        realValue: real.error,
        severity: 'critical',
        description: 'Error state differs between virtual and real execution',
      });
    }

    return differences;
  }

  /**
   * Calculate comparison metrics
   */
  private calculateComparisonMetrics(differences: ExecutionDifference[]): ComparisonMetrics {
    const criticalDifferences = differences.filter(d => d.severity === 'critical').length;
    const totalDifferences = differences.length;

    const outputDiffs = differences.filter(d => d.type === 'output').length;
    const durationDiffs = differences.filter(d => d.type === 'duration').length;
    const errorDiffs = differences.filter(d => d.type === 'error').length;

    const outputMatch = outputDiffs === 0 ? 1.0 : 0.0;
    const durationMatch = durationDiffs === 0 ? 1.0 : 0.5;
    const errorMatch = errorDiffs === 0 ? 1.0 : 0.0;

    const overallAccuracy = criticalDifferences === 0
      ? 1.0 - (totalDifferences * 0.1)
      : 0.5;

    return {
      outputMatch,
      durationMatch,
      errorMatch,
      stateMatch: 1.0,
      overallAccuracy: Math.max(0, overallAccuracy),
      totalDifferences,
      criticalDifferences,
    };
  }

  /**
   * Get comparison status from accuracy
   */
  private getComparisonStatus(accuracy: number): 'identical' | 'similar' | 'different' | 'failed' {
    if (accuracy >= 0.99) return 'identical';
    if (accuracy >= 0.90) return 'similar';
    if (accuracy >= 0.50) return 'different';
    return 'failed';
  }

  /**
   * Sync twin from real workflow execution
   */
  async sync(twinId: string, execution: WorkflowExecution): Promise<void> {
    const twin = this.twins.get(twinId);
    if (!twin) {
      throw new Error(`Digital twin ${twinId} not found`);
    }

    // Update twin state from real execution
    const changes: string[] = [];

    // Update last sync time
    twin.lastSyncAt = new Date();
    changes.push('lastSyncAt');

    // Calculate divergence based on recent comparisons
    // Simplified: assume low divergence after sync
    twin.divergence = 0.1;
    changes.push('divergence');

    // Record sync event
    const syncEvent: TwinSyncEvent = {
      twinId,
      realExecutionId: execution.id,
      syncedAt: new Date(),
      changes,
      divergence: twin.divergence,
    };

    const events = this.syncEvents.get(twinId) || [];
    events.push(syncEvent);
    this.syncEvents.set(twinId, events);

    twin.metadata.updated = new Date();
  }

  /**
   * Calculate simulation metrics
   */
  private calculateSimulationMetrics(nodeResults: SimulatedNodeResult[]): SimulationMetrics {
    const totalNodes = nodeResults.length;
    const nodesExecuted = nodeResults.filter(r => !r.error).length;
    const nodesFailed = nodeResults.filter(r => r.error).length;
    const totalDuration = nodeResults.reduce((sum, r) => sum + r.duration, 0);
    const avgNodeDuration = totalNodes > 0 ? totalDuration / totalNodes : 0;

    return {
      totalNodes,
      nodesExecuted,
      nodesFailed,
      totalDuration,
      avgNodeDuration,
      memoryUsed: 0, // Would be tracked in production
      cpuTime: totalDuration,
      networkCalls: 0,
      dataProcessed: 0,
    };
  }

  /**
   * Get empty metrics
   */
  private emptyMetrics(): SimulationMetrics {
    return {
      totalNodes: 0,
      nodesExecuted: 0,
      nodesFailed: 0,
      totalDuration: 0,
      avgNodeDuration: 0,
      memoryUsed: 0,
      cpuTime: 0,
      networkCalls: 0,
      dataProcessed: 0,
    };
  }

  /**
   * Store simulation result with retention
   */
  private storeSimulation(twinId: string, result: SimulationResult): void {
    const simulations = this.simulations.get(twinId) || [];
    simulations.push(result);

    // Apply retention policy
    const maxSimulations = this.config.maxSimulations;
    if (simulations.length > maxSimulations) {
      simulations.splice(0, simulations.length - maxSimulations);
    }

    this.simulations.set(twinId, simulations);
  }

  /**
   * Clone workflow for virtual representation
   */
  private cloneWorkflow(workflow: Workflow): Workflow {
    return JSON.parse(JSON.stringify(workflow));
  }

  /**
   * Get twin statistics
   */
  getStatistics(twinId: string): TwinStatistics | undefined {
    const twin = this.twins.get(twinId);
    if (!twin) return undefined;

    const simulations = this.simulations.get(twinId) || [];
    const successful = simulations.filter(s => s.status === 'success').length;
    const failed = simulations.filter(s => s.status === 'failed').length;

    const accuracies = simulations
      .map(s => s.metrics.accuracy)
      .filter((a): a is number => a !== undefined);
    const avgAccuracy = accuracies.length > 0
      ? accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length
      : 0;

    const durations = simulations.map(s => s.duration);
    const avgDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    const totalFaults = simulations.reduce(
      (sum, s) => sum + s.faultsInjected.length,
      0
    );

    return {
      twinId,
      totalSimulations: simulations.length,
      successfulSimulations: successful,
      failedSimulations: failed,
      avgAccuracy,
      avgDuration,
      totalFaultsInjected: totalFaults,
      faultRecoveryRate: successful / Math.max(1, simulations.length),
      lastSyncAt: twin.lastSyncAt,
      divergence: twin.divergence,
    };
  }

  /**
   * Delete a digital twin
   */
  deleteTwin(twinId: string): boolean {
    this.simulations.delete(twinId);
    this.syncEvents.delete(twinId);
    return this.twins.delete(twinId);
  }

  /**
   * List all twins
   */
  listTwins(): VirtualWorkflow[] {
    return Array.from(this.twins.values());
  }
}

// Singleton instance
let instance: WorkflowDigitalTwin | null = null;

export function getDigitalTwinManager(config?: Partial<DigitalTwinConfig>): WorkflowDigitalTwin {
  if (!instance) {
    instance = new WorkflowDigitalTwin(config);
  }
  return instance;
}
