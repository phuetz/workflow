/**
 * Hybrid Execution Manager
 * Smart routing between edge and cloud execution based on multiple criteria
 * Optimizes for latency, cost, and resource availability
 */

import { logger } from '../services/SimpleLogger';
import type {
  EdgeDevice,
  ExecutionDecision,
  HybridExecutionPlan,
  DataTransfer,
  EdgeMetrics
} from '../types/edge';
import type { Workflow, WorkflowNode } from '../types/workflowTypes';

export interface ExecutionCriteria {
  maxLatency?: number; // ms
  maxCost?: number; // USD
  preferEdge?: boolean;
  requireOffline?: boolean;
  minReliability?: number; // 0-1
}

export interface ExecutionContext {
  workflow: Workflow;
  input: unknown;
  device?: EdgeDevice;
  criteria: ExecutionCriteria;
}

export class HybridExecutionManager {
  private devices: Map<string, EdgeDevice> = new Map();
  private deviceMetrics: Map<string, EdgeMetrics> = new Map();
  private executionHistory: Map<string, ExecutionDecision[]> = new Map();

  /**
   * Register an edge device
   */
  registerDevice(device: EdgeDevice): void {
    this.devices.set(device.id, device);
    logger.info('Edge device registered', {
      context: { deviceId: device.id, type: device.type }
    });
  }

  /**
   * Update device metrics
   */
  updateDeviceMetrics(deviceId: string, metrics: EdgeMetrics): void {
    this.deviceMetrics.set(deviceId, metrics);
  }

  /**
   * Make execution decision for a workflow
   */
  async decideExecution(context: ExecutionContext): Promise<ExecutionDecision> {
    const { workflow, device, criteria } = context;

    logger.info('Analyzing execution options', {
      context: {
        workflowId: workflow.id,
        deviceId: device?.id,
        criteria
      }
    });

    // Evaluate all factors
    const factors = {
      latency: this.evaluateLatency(workflow, device, criteria),
      dataSize: this.evaluateDataSize(workflow, context.input),
      networkAvailability: device ? this.evaluateNetwork(device) : false,
      deviceCapability: device ? this.evaluateDeviceCapability(device, workflow) : false,
      cost: this.evaluateCost(workflow, device)
    };

    // Make decision based on factors
    const decision = this.makeDecision(workflow, device, factors, criteria);

    // Store decision history
    if (workflow.id) {
      const history = this.executionHistory.get(workflow.id) || [];
      history.push(decision);
      this.executionHistory.set(workflow.id, history);
    }

    logger.info('Execution decision made', {
      context: {
        workflowId: workflow.id,
        location: decision.location,
        confidence: decision.confidence,
        estimatedLatency: decision.estimatedLatency
      }
    });

    return decision;
  }

  /**
   * Create hybrid execution plan
   */
  async createHybridPlan(
    context: ExecutionContext
  ): Promise<HybridExecutionPlan> {
    const { workflow, device } = context;

    // Categorize nodes
    const edgeNodes: string[] = [];
    const cloudNodes: string[] = [];
    const dataTransfers: DataTransfer[] = [];

    for (const node of workflow.nodes) {
      const decision = await this.decideNodeExecution(node, device, context.criteria);

      if (decision.location === 'edge') {
        edgeNodes.push(node.id);
      } else {
        cloudNodes.push(node.id);
      }
    }

    // Calculate data transfers between edge and cloud
    for (const edge of workflow.edges) {
      const sourceLocation = edgeNodes.includes(edge.source) ? 'edge' : 'cloud';
      const targetLocation = edgeNodes.includes(edge.target) ? 'edge' : 'cloud';

      if (sourceLocation !== targetLocation) {
        const dataSize = this.estimateDataTransferSize(edge.source, edge.target);

        dataTransfers.push({
          from: sourceLocation === 'edge' ? device?.id || 'edge' : 'cloud',
          to: targetLocation === 'edge' ? device?.id || 'edge' : 'cloud',
          size: dataSize,
          compressed: true,
          encrypted: true,
          estimatedDuration: this.estimateTransferDuration(dataSize, device)
        });
      }
    }

    // Determine optimal strategy
    const strategy = this.determineStrategy(edgeNodes.length, cloudNodes.length, context.criteria);

    // Estimate total latency and cost
    const estimatedLatency = this.estimatePlanLatency(edgeNodes, cloudNodes, dataTransfers, device);
    const estimatedCost = this.estimatePlanCost(edgeNodes, cloudNodes, dataTransfers);

    const plan: HybridExecutionPlan = {
      workflowId: workflow.id,
      executionId: this.generateId(),
      strategy,
      edgeNodes,
      cloudNodes,
      dataTransfers,
      estimatedLatency,
      estimatedCost,
      reasoning: this.explainStrategy(strategy, edgeNodes.length, cloudNodes.length, context.criteria)
    };

    logger.info('Hybrid execution plan created', {
      context: {
        workflowId: workflow.id,
        strategy,
        edgeNodes: edgeNodes.length,
        cloudNodes: cloudNodes.length,
        estimatedLatency,
        estimatedCost
      }
    });

    return plan;
  }

  /**
   * Decide execution location for a single node
   */
  private async decideNodeExecution(
    node: WorkflowNode,
    device: EdgeDevice | undefined,
    criteria: ExecutionCriteria
  ): Promise<ExecutionDecision> {
    const nodeLatencyRequirement = this.getNodeLatencyRequirement(node);
    const nodeDataSize = this.estimateNodeDataSize(node);
    const networkAvailable = device ? this.evaluateNetwork(device) : false;
    const deviceCapable = device ? this.canDeviceRunNode(device, node) : false;

    // Decision logic
    let location: 'edge' | 'cloud' | 'hybrid' = 'cloud';
    let confidence = 0.5;

    // Strong edge preference for low latency requirements
    if (nodeLatencyRequirement < 10 && deviceCapable) {
      location = 'edge';
      confidence = 0.95;
    }
    // Edge for offline mode
    else if (criteria.requireOffline && deviceCapable) {
      location = 'edge';
      confidence = 1.0;
    }
    // Cloud for large data processing
    else if (nodeDataSize > 10 * 1024 * 1024 && networkAvailable) {
      location = 'cloud';
      confidence = 0.9;
    }
    // Edge for real-time processing
    else if (this.isRealTimeNode(node) && deviceCapable) {
      location = 'edge';
      confidence = 0.85;
    }
    // Cloud for complex AI/ML
    else if (this.isAINode(node) && !this.hasAICapability(device)) {
      location = 'cloud';
      confidence = 0.9;
    }
    // Edge preference by default if capable
    else if (deviceCapable && criteria.preferEdge !== false) {
      location = 'edge';
      confidence = 0.7;
    }

    return {
      workflowId: '',
      nodeId: node.id,
      location,
      reasoning: {
        latencyRequirement: nodeLatencyRequirement,
        dataSize: nodeDataSize,
        networkAvailable,
        deviceCapable,
        costOptimized: location === 'edge'
      },
      confidence,
      estimatedLatency: location === 'edge' ? nodeLatencyRequirement / 10 : nodeLatencyRequirement
    };
  }

  // Evaluation methods

  private evaluateLatency(
    workflow: Workflow,
    device: EdgeDevice | undefined,
    criteria: ExecutionCriteria
  ): number {
    if (!device) return 1000; // High latency for cloud-only

    // Estimate edge latency based on device capabilities
    const baseLatency = 5; // 5ms base edge latency
    const cpuFactor = device.capabilities.cpu.cores / 4; // Normalized to 4 cores
    const memoryFactor = device.capabilities.memory.available / device.capabilities.memory.total;

    const edgeLatency = baseLatency / (cpuFactor * memoryFactor);

    // Cloud latency includes network overhead
    const cloudLatency = device.capabilities.network.latency + 50; // +50ms processing

    // Return score (0-1, higher is better)
    const maxLatency = criteria.maxLatency || 100;
    return Math.min(1, maxLatency / Math.min(edgeLatency, cloudLatency));
  }

  private evaluateDataSize(workflow: Workflow, input: unknown): number {
    const inputSize = JSON.stringify(input).length;

    // Large data (>10MB) prefers cloud
    if (inputSize > 10 * 1024 * 1024) {
      return 0.2; // Low score for edge
    }
    // Small data (<100KB) ideal for edge
    else if (inputSize < 100 * 1024) {
      return 1.0; // High score for edge
    }
    // Medium data
    else {
      return 0.6;
    }
  }

  private evaluateNetwork(device: EdgeDevice): boolean {
    const metrics = this.deviceMetrics.get(device.id);

    if (!metrics) {
      // Assume network available if no metrics
      return true;
    }

    // Check network latency and packet loss
    return metrics.network.latency < 100 && metrics.network.packetsDropped < 10;
  }

  private evaluateDeviceCapability(device: EdgeDevice, workflow: Workflow): boolean {
    const metrics = this.deviceMetrics.get(device.id);

    if (!metrics) {
      // Conservative: assume device can handle it
      return true;
    }

    // Check if device has enough resources
    const hasMemory = metrics.memory.usage < 80;
    const hasCpu = metrics.cpu.usage < 80;
    const hasCapacity = metrics.workflows.active < 10;

    return hasMemory && hasCpu && hasCapacity;
  }

  private evaluateCost(workflow: Workflow, device: EdgeDevice | undefined): number {
    // Edge execution is typically cheaper (no cloud compute/network costs)
    const edgeCost = 0.0001; // Very low cost
    const cloudCost = 0.001 * workflow.nodes.length; // Per-node cloud cost

    return device ? edgeCost : cloudCost;
  }

  private makeDecision(
    workflow: Workflow,
    device: EdgeDevice | undefined,
    factors: {
      latency: number;
      dataSize: number;
      networkAvailability: boolean;
      deviceCapability: boolean;
      cost: number;
    },
    criteria: ExecutionCriteria
  ): ExecutionDecision {
    // Weighted scoring
    const weights = {
      latency: criteria.maxLatency ? 0.4 : 0.2,
      dataSize: 0.15,
      network: 0.15,
      capability: 0.25,
      cost: criteria.maxCost ? 0.25 : 0.05
    };

    // Calculate scores
    const edgeScore =
      (factors.latency * weights.latency) +
      (factors.dataSize * weights.dataSize) +
      ((factors.networkAvailability ? 1 : 0) * weights.network) +
      ((factors.deviceCapability ? 1 : 0) * weights.capability) +
      ((1 / (factors.cost + 0.0001)) * weights.cost);

    const cloudScore =
      (0.5 * weights.latency) + // Cloud has higher latency
      (0.8 * weights.dataSize) + // Cloud handles large data better
      (1 * weights.network) + // Cloud always available
      (1 * weights.capability) + // Cloud has unlimited capability
      (0.3 * weights.cost); // Cloud is more expensive

    // Make decision
    let location: 'edge' | 'cloud' | 'hybrid';
    let confidence: number;

    if (criteria.requireOffline) {
      location = 'edge';
      confidence = 1.0;
    } else if (edgeScore > cloudScore * 1.2) {
      // Edge with margin
      location = 'edge';
      confidence = Math.min(1, edgeScore / cloudScore);
    } else if (cloudScore > edgeScore * 1.2) {
      // Cloud with margin
      location = 'cloud';
      confidence = Math.min(1, cloudScore / edgeScore);
    } else {
      // Hybrid execution
      location = 'hybrid';
      confidence = 0.7;
    }

    return {
      workflowId: workflow.id,
      nodeId: workflow.nodes[0]?.id || '',
      location,
      reasoning: {
        latencyRequirement: criteria.maxLatency || 100,
        dataSize: factors.dataSize,
        networkAvailable: factors.networkAvailability,
        deviceCapable: factors.deviceCapability,
        costOptimized: location === 'edge'
      },
      confidence,
      estimatedLatency: location === 'edge' ? 5 : 50
    };
  }

  // Helper methods

  private getNodeLatencyRequirement(node: WorkflowNode): number {
    // Map node types to latency requirements
    const latencyMap: Record<string, number> = {
      'trigger': 1,
      'sensor-read': 5,
      'ai-inference': 20,
      'http-request': 50,
      'database-query': 30,
      'transform': 10
    };

    return latencyMap[node.type] || 50;
  }

  private estimateNodeDataSize(node: WorkflowNode): number {
    return JSON.stringify(node.data || {}).length;
  }

  private isRealTimeNode(node: WorkflowNode): boolean {
    const realTimeTypes = ['sensor-read', 'event-listener', 'stream-processor'];
    return realTimeTypes.includes(node.type);
  }

  private isAINode(node: WorkflowNode): boolean {
    const aiTypes = ['ai-inference', 'ml-prediction', 'image-recognition', 'nlp'];
    return aiTypes.includes(node.type);
  }

  private canDeviceRunNode(device: EdgeDevice, node: WorkflowNode): boolean {
    // Check if device has required capabilities
    if (this.isAINode(node) && !this.hasAICapability(device)) {
      return false;
    }

    return true;
  }

  private hasAICapability(device: EdgeDevice | undefined): boolean {
    if (!device) return false;

    // Check for ARM architecture with sufficient resources
    return device.capabilities.cpu.architecture.includes('arm64') ||
           device.capabilities.memory.total >= 2048; // 2GB+
  }

  private determineStrategy(
    edgeCount: number,
    cloudCount: number,
    criteria: ExecutionCriteria
  ): 'edge-first' | 'cloud-first' | 'split' | 'dynamic' {
    if (criteria.requireOffline) {
      return 'edge-first';
    }

    if (edgeCount === 0) {
      return 'cloud-first';
    }

    if (cloudCount === 0) {
      return 'edge-first';
    }

    if (edgeCount > cloudCount * 2) {
      return 'edge-first';
    }

    if (cloudCount > edgeCount * 2) {
      return 'cloud-first';
    }

    return 'split';
  }

  private explainStrategy(
    strategy: string,
    edgeCount: number,
    cloudCount: number,
    criteria: ExecutionCriteria
  ): string {
    const reasons: string[] = [];

    if (criteria.requireOffline) {
      reasons.push('Offline capability required');
    }

    if (criteria.maxLatency && criteria.maxLatency < 10) {
      reasons.push(`Ultra-low latency required (<${criteria.maxLatency}ms)`);
    }

    if (edgeCount > 0) {
      reasons.push(`${edgeCount} nodes optimal for edge execution`);
    }

    if (cloudCount > 0) {
      reasons.push(`${cloudCount} nodes require cloud resources`);
    }

    reasons.push(`Strategy: ${strategy}`);

    return reasons.join('. ');
  }

  private estimatePlanLatency(
    edgeNodes: string[],
    cloudNodes: string[],
    transfers: DataTransfer[],
    device: EdgeDevice | undefined
  ): number {
    const edgeLatency = edgeNodes.length * 5; // 5ms per edge node
    const cloudLatency = cloudNodes.length * 50; // 50ms per cloud node
    const transferLatency = transfers.reduce((sum, t) => sum + t.estimatedDuration, 0);

    return edgeLatency + cloudLatency + transferLatency;
  }

  private estimatePlanCost(
    edgeNodes: string[],
    cloudNodes: string[],
    transfers: DataTransfer[]
  ): number {
    const edgeCost = edgeNodes.length * 0.0001;
    const cloudCost = cloudNodes.length * 0.001;
    const transferCost = transfers.reduce((sum, t) => sum + (t.size / 1024 / 1024 * 0.0001), 0);

    return edgeCost + cloudCost + transferCost;
  }

  private estimateDataTransferSize(sourceId: string, targetId: string): number {
    // Estimate based on typical node output
    return 1024 * 10; // 10KB default
  }

  private estimateTransferDuration(size: number, device: EdgeDevice | undefined): number {
    if (!device) return 100;

    const bandwidth = device.capabilities.network.bandwidth * 1024 * 1024 / 8; // Convert Mbps to bytes/s
    const transferTime = (size / bandwidth) * 1000; // ms
    const latency = device.capabilities.network.latency;

    return transferTime + latency;
  }

  private generateId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Create a hybrid execution manager instance
 */
export function createHybridExecutionManager(): HybridExecutionManager {
  return new HybridExecutionManager();
}
