/**
 * Workflow Simulator - Core Simulation Engine
 * Simulates workflow execution without side effects
 */

import { v4 as uuidv4 } from 'uuid';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import {
  SimulationResult,
  SimulationOptions,
  NodeSimulationResult,
  DataFlowStep,
  TimeEstimation,
  ResourceEstimation,
  PotentialError,
  Warning,
  Recommendation,
  DataTransformation,
  CostBreakdown,
} from '../types/simulation';
import { PreFlightChecker } from './PreFlightChecker';
import { CostEstimator } from './CostEstimator';
import { DataFlowValidator } from './DataFlowValidator';
import { logger } from '../services/SimpleLogger';

/**
 * Main workflow simulator class
 */
export class WorkflowSimulator {
  private preFlightChecker: PreFlightChecker;
  private costEstimator: CostEstimator;
  private dataFlowValidator: DataFlowValidator;

  constructor() {
    this.preFlightChecker = new PreFlightChecker();
    this.costEstimator = new CostEstimator();
    this.dataFlowValidator = new DataFlowValidator();
  }

  /**
   * Simulate workflow execution
   */
  async simulate(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    options: SimulationOptions = {}
  ): Promise<SimulationResult> {
    const startTime = Date.now();
    const simulationId = uuidv4();

    logger.info(`Starting simulation ${simulationId} for ${nodes.length} nodes`);

    try {
      // Initialize result
      const result: SimulationResult = {
        simulationId,
        timestamp: new Date(),
        workflow: {
          nodeCount: nodes.length,
          edgeCount: edges.length,
        },
        estimatedTime: {
          total: 0,
          breakdown: [],
          criticalPath: [],
          parallelizable: false,
        },
        estimatedCost: {
          apiCalls: 0,
          computeTime: 0,
          storage: 0,
          network: 0,
          llmTokens: 0,
          total: 0,
          currency: 'USD',
        },
        dataFlow: [],
        potentialErrors: [],
        warnings: [],
        recommendations: [],
        preFlightChecks: [],
        resourceEstimation: {
          memory: { peak: 0, average: 0 },
          cpu: { average: 0, peak: 0 },
          network: { download: 0, upload: 0 },
          storage: { temporary: 0, persistent: 0 },
        },
        quotaStatus: [],
        credentialValidations: [],
        score: {
          reliability: 0,
          performance: 0,
          costEfficiency: 0,
          security: 0,
          overall: 0,
        },
        readyForExecution: false,
        blockers: [],
      };

      // Step 1: Run pre-flight checks
      if (!options.skipCredentialValidation || !options.skipQuotaCheck) {
        logger.debug('Running pre-flight checks...');
        result.preFlightChecks = await this.preFlightChecker.runChecks(
          { nodes, edges },
          {
            skipCredentialValidation: options.skipCredentialValidation,
            skipQuotaCheck: options.skipQuotaCheck,
          }
        );

        result.credentialValidations = this.preFlightChecker.getCredentialValidations();
        result.quotaStatus = this.preFlightChecker.getQuotaStatus();

        // Identify blockers (error-level failed checks)
        result.blockers = result.preFlightChecks.filter(
          (check) => check.severity === 'error' && !check.passed
        );
      }

      // Step 2: Build execution graph
      const executionOrder = this.buildExecutionGraph(nodes, edges);
      logger.debug(`Execution order determined: ${executionOrder.length} nodes`);

      // Step 3: Simulate each node
      let currentData = options.sampleData || this.generateSampleData();

      for (const nodeId of executionOrder) {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) continue;

        try {
          const nodeResult = await this.simulateNode(node, currentData, options);

          // Add to data flow
          const dataFlowStep: DataFlowStep = {
            nodeId: node.id,
            nodeType: node.type,
            nodeLabel: node.data.label,
            inputData: currentData,
            outputData: nodeResult.outputData,
            transformations: nodeResult.transformations,
            estimatedTime: nodeResult.estimatedTime,
            estimatedCost: nodeResult.estimatedCost,
            dataSize: {
              input: this.estimateDataSize(currentData),
              output: this.estimateDataSize(nodeResult.outputData),
            },
          };

          result.dataFlow.push(dataFlowStep);

          // Update cost breakdown
          this.updateCostBreakdown(result.estimatedCost, node.type, nodeResult.estimatedCost);

          // Update time estimation
          result.estimatedTime.breakdown.push({
            nodeId: node.id,
            nodeType: node.type,
            estimatedTime: nodeResult.estimatedTime,
            confidence: 0.85, // Default confidence
          });

          // Collect potential errors and warnings
          result.potentialErrors.push(...nodeResult.potentialErrors);
          result.warnings.push(...nodeResult.warnings);

          // Update resource estimation
          this.updateResourceEstimation(result.resourceEstimation, nodeResult);

          // Update current data for next node
          currentData = nodeResult.outputData;
        } catch (error) {
          logger.error(`Error simulating node ${node.id}:`, error);

          result.potentialErrors.push({
            nodeId: node.id,
            nodeType: node.type,
            errorType: 'simulation_error',
            probability: 0.8,
            message: error instanceof Error ? error.message : String(error),
            impact: 'high',
            mitigation: 'Review node configuration and ensure all required fields are set',
          });
        }
      }

      // Step 4: Calculate total estimated time
      result.estimatedTime.total = this.calculateTotalTime(result.estimatedTime.breakdown, edges);
      result.estimatedTime.criticalPath = this.identifyCriticalPath(nodes, edges, result.estimatedTime.breakdown);
      result.estimatedTime.parallelizable = this.isParallelizable(nodes, edges);

      // Step 5: Calculate total estimated cost
      if (!options.skipCostEstimation) {
        result.estimatedCost.total = this.calculateTotalCost(result.estimatedCost);
      }

      // Step 6: Generate recommendations
      result.recommendations = this.generateRecommendations(result);

      // Step 7: Calculate scores
      result.score = this.calculateScores(result);

      // Step 8: Determine if ready for execution
      result.readyForExecution = result.blockers.length === 0 && result.score.overall >= 50;

      const simulationTime = Date.now() - startTime;
      logger.info(`Simulation completed in ${simulationTime}ms`, {
        estimatedTime: result.estimatedTime.total,
        estimatedCost: result.estimatedCost.total,
        readyForExecution: result.readyForExecution,
        blockers: result.blockers.length,
      });

      return result;
    } catch (error) {
      logger.error('Simulation failed:', error);
      throw error;
    }
  }

  /**
   * Simulate a single node
   */
  private async simulateNode(
    node: WorkflowNode,
    inputData: unknown,
    options: SimulationOptions
  ): Promise<NodeSimulationResult> {
    const nodeType = node.type;
    const config = node.data.config || {};

    // Estimate time based on node type
    const estimatedTime = this.estimateNodeTime(nodeType, config);

    // Estimate cost based on node type
    const estimatedCost = this.costEstimator.estimateNodeCost(nodeType, config);

    // Simulate data transformation
    const transformations = this.simulateDataTransformation(nodeType, config);

    // Generate mock output data
    const outputData = this.generateMockOutput(nodeType, inputData, config);

    // Identify potential errors
    const potentialErrors = this.identifyPotentialErrors(node, config);

    // Generate warnings
    const warnings = this.generateWarnings(node, config);

    // Validate data flow
    const dataValidation = await this.dataFlowValidator.validateNodeData(
      node,
      inputData,
      outputData
    );

    return {
      nodeId: node.id,
      success: true,
      outputData,
      estimatedTime,
      estimatedCost,
      transformations,
      potentialErrors,
      warnings,
      dataValidation,
      resourceUsage: {
        memory: this.estimateMemoryUsage(nodeType),
        cpu: this.estimateCPUUsage(nodeType),
      },
    };
  }

  /**
   * Build execution graph in topological order
   */
  private buildExecutionGraph(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize graph
    nodes.forEach((node) => {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    });

    // Build adjacency list and calculate in-degrees
    edges.forEach((edge) => {
      if (graph.has(edge.source) && graph.has(edge.target)) {
        graph.get(edge.source)!.push(edge.target);
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      }
    });

    // Topological sort using Kahn's algorithm
    const queue: string[] = [];
    const result: string[] = [];

    // Start with nodes that have no dependencies
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
      }
    });

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);

      const neighbors = graph.get(nodeId) || [];
      neighbors.forEach((neighbor) => {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);

        if (newDegree === 0) {
          queue.push(neighbor);
        }
      });
    }

    // If not all nodes are included, there's a cycle
    if (result.length !== nodes.length) {
      logger.warn('Workflow contains cycles, execution order may be incomplete');
    }

    return result;
  }

  /**
   * Estimate execution time for a node type
   */
  private estimateNodeTime(nodeType: string, config: Record<string, unknown>): number {
    // Base times in milliseconds
    const baseTimes: Record<string, number> = {
      // Triggers
      trigger: 50,
      webhook: 50,
      schedule: 50,
      manualTrigger: 10,

      // Communication
      email: 1500,
      gmail: 1200,
      slack: 800,
      discord: 700,
      teams: 900,

      // Data Processing
      transform: 100,
      filter: 50,
      aggregate: 200,
      sort: 150,
      merge: 100,
      split: 80,

      // HTTP & APIs
      httpRequest: 1000,
      graphql: 1200,
      rest: 1000,

      // Databases
      mysql: 500,
      postgres: 500,
      mongodb: 400,
      redis: 100,
      elasticsearch: 600,

      // Cloud Services
      aws_s3: 800,
      aws_lambda: 1500,
      aws_sns: 500,
      aws_sqs: 400,
      azure_blob: 800,
      gcp_storage: 800,

      // AI/ML
      openai: 3000,
      anthropic: 3500,
      llm: 3000,

      // Control Flow
      if: 10,
      switch: 15,
      loop: 100,
      delay: 0, // Configurable

      // Code Execution
      code: 200,
      python: 500,
      javascript: 300,
    };

    let baseTime = baseTimes[nodeType] || 500;

    // Adjust for delay node
    if (nodeType === 'delay' && config.duration) {
      baseTime = Number(config.duration) || 1000;
    }

    // Add variability (±20%)
    const variation = baseTime * 0.2;
    return Math.round(baseTime + (Math.random() - 0.5) * 2 * variation);
  }

  /**
   * Simulate data transformation
   */
  private simulateDataTransformation(
    nodeType: string,
    config: Record<string, unknown>
  ): DataTransformation[] {
    const transformations: DataTransformation[] = [];

    switch (nodeType) {
      case 'transform':
      case 'filter':
      case 'aggregate':
        transformations.push({
          type: nodeType,
          description: `${nodeType} operation on input data`,
          requiredFields: ['data'],
          optionalFields: ['metadata'],
        });
        break;

      case 'httpRequest':
        transformations.push({
          type: 'http_response',
          description: 'HTTP response data',
          requiredFields: ['body', 'statusCode'],
          optionalFields: ['headers'],
        });
        break;

      case 'email':
      case 'slack':
        transformations.push({
          type: 'message_sent',
          description: 'Message delivery confirmation',
          requiredFields: ['messageId', 'timestamp'],
        });
        break;

      default:
        transformations.push({
          type: 'generic',
          description: `${nodeType} output`,
        });
    }

    return transformations;
  }

  /**
   * Generate mock output data
   */
  private generateMockOutput(
    nodeType: string,
    inputData: unknown,
    config: Record<string, unknown>
  ): unknown {
    switch (nodeType) {
      case 'httpRequest':
        return {
          statusCode: 200,
          body: { success: true, data: {} },
          headers: { 'content-type': 'application/json' },
        };

      case 'email':
      case 'slack':
      case 'discord':
        return {
          messageId: `msg_${Date.now()}`,
          timestamp: new Date().toISOString(),
          sent: true,
        };

      case 'transform':
      case 'filter':
        return inputData;

      case 'aggregate':
        return {
          total: 0,
          count: 0,
          average: 0,
        };

      default:
        return { success: true, data: inputData };
    }
  }

  /**
   * Identify potential errors for a node
   */
  private identifyPotentialErrors(
    node: WorkflowNode,
    config: Record<string, unknown>
  ): PotentialError[] {
    const errors: PotentialError[] = [];

    // Check for missing required configuration
    if (node.type === 'httpRequest') {
      if (!config.url) {
        errors.push({
          nodeId: node.id,
          nodeType: node.type,
          errorType: 'configuration_missing',
          probability: 1.0,
          message: 'URL is required for HTTP request',
          impact: 'critical',
          mitigation: 'Configure the URL in node settings',
        });
      }

      // Network errors
      errors.push({
        nodeId: node.id,
        nodeType: node.type,
        errorType: 'network_error',
        probability: 0.05,
        message: 'Network request may fail due to connectivity issues',
        impact: 'high',
        mitigation: 'Add retry logic and error handling',
      });
    }

    if (node.type === 'email' || node.type === 'slack') {
      if (!config.recipient && !config.channel) {
        errors.push({
          nodeId: node.id,
          nodeType: node.type,
          errorType: 'configuration_missing',
          probability: 1.0,
          message: 'Recipient or channel is required',
          impact: 'critical',
          mitigation: 'Configure recipient/channel in node settings',
        });
      }
    }

    // Database connection errors
    if (['mysql', 'postgres', 'mongodb'].includes(node.type)) {
      errors.push({
        nodeId: node.id,
        nodeType: node.type,
        errorType: 'connection_error',
        probability: 0.1,
        message: 'Database connection may fail',
        impact: 'high',
        mitigation: 'Verify database credentials and connectivity',
      });
    }

    // API quota errors
    if (['openai', 'anthropic', 'llm'].includes(node.type)) {
      errors.push({
        nodeId: node.id,
        nodeType: node.type,
        errorType: 'quota_exceeded',
        probability: 0.15,
        message: 'API quota may be exceeded',
        impact: 'medium',
        mitigation: 'Monitor API usage and implement rate limiting',
      });
    }

    return errors;
  }

  /**
   * Generate warnings for a node
   */
  private generateWarnings(node: WorkflowNode, config: Record<string, unknown>): Warning[] {
    const warnings: Warning[] = [];

    // High cost warnings
    if (['openai', 'anthropic', 'llm'].includes(node.type)) {
      warnings.push({
        nodeId: node.id,
        type: 'high_cost',
        message: 'This node may incur significant API costs',
        severity: 'warning',
        suggestion: 'Consider caching results or using smaller models',
      });
    }

    // Performance warnings
    if (node.type === 'loop' && !config.maxIterations) {
      warnings.push({
        nodeId: node.id,
        type: 'performance',
        message: 'Loop without max iterations may run indefinitely',
        severity: 'warning',
        suggestion: 'Set a maximum iteration limit',
      });
    }

    return warnings;
  }

  /**
   * Generate sample data for simulation
   */
  private generateSampleData(): unknown {
    return {
      id: 'sample_001',
      timestamp: new Date().toISOString(),
      data: {
        message: 'Sample workflow data',
        value: 42,
      },
    };
  }

  /**
   * Estimate data size in bytes
   */
  private estimateDataSize(data: unknown): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  /**
   * Update cost breakdown
   */
  private updateCostBreakdown(
    breakdown: CostBreakdown,
    nodeType: string,
    nodeCost: number
  ): void {
    if (['httpRequest', 'rest', 'graphql'].includes(nodeType)) {
      breakdown.apiCalls += nodeCost;
    } else if (['openai', 'anthropic', 'llm'].includes(nodeType)) {
      breakdown.llmTokens += nodeCost;
    } else if (['code', 'python', 'javascript'].includes(nodeType)) {
      breakdown.computeTime += nodeCost;
    } else if (['aws_s3', 'azure_blob', 'gcp_storage'].includes(nodeType)) {
      breakdown.storage += nodeCost;
    } else {
      breakdown.computeTime += nodeCost;
    }
  }

  /**
   * Update resource estimation
   */
  private updateResourceEstimation(
    estimation: ResourceEstimation,
    nodeResult: NodeSimulationResult
  ): void {
    if (nodeResult.resourceUsage) {
      estimation.memory.peak = Math.max(estimation.memory.peak, nodeResult.resourceUsage.memory);
      estimation.memory.average =
        (estimation.memory.average + nodeResult.resourceUsage.memory) / 2;

      estimation.cpu.peak = Math.max(estimation.cpu.peak, nodeResult.resourceUsage.cpu);
      estimation.cpu.average = (estimation.cpu.average + nodeResult.resourceUsage.cpu) / 2;
    }
  }

  /**
   * Estimate memory usage for node type
   */
  private estimateMemoryUsage(nodeType: string): number {
    const memoryUsage: Record<string, number> = {
      // In MB
      httpRequest: 10,
      email: 5,
      transform: 20,
      aggregate: 50,
      code: 100,
      python: 150,
      openai: 30,
      database: 25,
    };

    return memoryUsage[nodeType] || 10;
  }

  /**
   * Estimate CPU usage for node type
   */
  private estimateCPUUsage(nodeType: string): number {
    const cpuUsage: Record<string, number> = {
      // Percentage
      httpRequest: 5,
      email: 3,
      transform: 15,
      aggregate: 25,
      code: 40,
      python: 50,
      openai: 10,
      database: 10,
    };

    return cpuUsage[nodeType] || 5;
  }

  /**
   * Calculate total execution time considering parallelization
   */
  private calculateTotalTime(
    breakdown: Array<{ nodeId: string; estimatedTime: number }>,
    edges: WorkflowEdge[]
  ): number {
    // Simple sum for now - could be enhanced with parallel execution detection
    return breakdown.reduce((sum, node) => sum + node.estimatedTime, 0);
  }

  /**
   * Identify critical path (longest path through workflow)
   */
  private identifyCriticalPath(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    breakdown: Array<{ nodeId: string; estimatedTime: number }>
  ): string[] {
    // Simplified - return all nodes in order for now
    return breakdown.map((b) => b.nodeId);
  }

  /**
   * Check if workflow can be parallelized
   */
  private isParallelizable(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
    // Check if there are independent branches
    const nodeIds = new Set(nodes.map((n) => n.id));
    const hasMultipleBranches = nodes.some((node) => {
      const outgoingEdges = edges.filter((e) => e.source === node.id);
      return outgoingEdges.length > 1;
    });

    return hasMultipleBranches;
  }

  /**
   * Calculate total cost
   */
  private calculateTotalCost(breakdown: CostBreakdown): number {
    return (
      breakdown.apiCalls +
      breakdown.computeTime +
      breakdown.storage +
      breakdown.network +
      breakdown.llmTokens
    );
  }

  /**
   * Generate recommendations based on simulation results
   */
  private generateRecommendations(result: SimulationResult): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Cost recommendations
    if (result.estimatedCost.total > 1.0) {
      recommendations.push({
        type: 'cost',
        priority: 'high',
        message: 'High execution cost detected',
        impact: `Estimated cost: $${result.estimatedCost.total.toFixed(4)} per execution`,
        implementation: 'Consider caching, batching, or using cheaper alternatives',
      });
    }

    // Performance recommendations
    if (result.estimatedTime.total > 60000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'Long execution time detected',
        impact: `Estimated time: ${(result.estimatedTime.total / 1000).toFixed(1)}s`,
        implementation: 'Consider parallel execution or optimization',
      });
    }

    // Reliability recommendations
    const highProbabilityErrors = result.potentialErrors.filter((e) => e.probability > 0.5);
    if (highProbabilityErrors.length > 0) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'High probability of errors detected',
        impact: `${highProbabilityErrors.length} nodes likely to fail`,
        implementation: 'Fix configuration issues and add error handling',
      });
    }

    // Security recommendations
    const securityChecks = result.preFlightChecks.filter(
      (c) => c.category === 'security' && !c.passed
    );
    if (securityChecks.length > 0) {
      recommendations.push({
        type: 'security',
        priority: 'high',
        message: 'Security issues detected',
        impact: `${securityChecks.length} security checks failed`,
        implementation: 'Address security concerns before execution',
      });
    }

    return recommendations;
  }

  /**
   * Calculate quality scores
   */
  private calculateScores(result: SimulationResult): {
    reliability: number;
    performance: number;
    costEfficiency: number;
    security: number;
    overall: number;
  } {
    // Reliability score (based on potential errors)
    const criticalErrors = result.potentialErrors.filter(
      (e) => e.impact === 'critical' && e.probability > 0.5
    ).length;
    const reliability = Math.max(0, 100 - criticalErrors * 20);

    // Performance score (based on execution time)
    const targetTime = 10000; // 10 seconds
    const performance = Math.max(
      0,
      100 - Math.floor((result.estimatedTime.total / targetTime) * 50)
    );

    // Cost efficiency score
    const targetCost = 0.1; // $0.10
    const costEfficiency = Math.max(
      0,
      100 - Math.floor((result.estimatedCost.total / targetCost) * 50)
    );

    // Security score (based on failed security checks)
    const failedSecurityChecks = result.preFlightChecks.filter(
      (c) => c.category === 'security' && !c.passed
    ).length;
    const security = Math.max(0, 100 - failedSecurityChecks * 25);

    // Overall score (weighted average)
    const overall = Math.round(
      reliability * 0.3 + performance * 0.2 + costEfficiency * 0.2 + security * 0.3
    );

    return {
      reliability,
      performance,
      costEfficiency,
      security,
      overall,
    };
  }
}
