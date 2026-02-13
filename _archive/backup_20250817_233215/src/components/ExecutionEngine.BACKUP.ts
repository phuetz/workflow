import { logger } from '../services/LoggingService';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';

// Types for ExecutionEngine
interface ExecutionOptions {
  maxRecoveryAttempts?: number;
  enableCheckpoints?: boolean;
  validateBeforeExecution?: boolean;
}

interface ExecutionResult {
  success: boolean;
  status?: 'success' | 'error';
  data?: Record<string, unknown>;
  error?: string;
  timestamp?: number | string;
  duration?: number;
  nodeId?: string;
  nodeType?: string;
  [key: string]: unknown;
}

// ExecutionContext interface - kept for future use
// interface ExecutionContext {
//   nodeId: string;
//   inputData: Record<string, unknown>;
//   outputData?: Record<string, unknown>;
//   error?: Error;
//   startTime: number;
//   endTime?: number;
// }

interface Checkpoint {
  executedNodes: Set<string>;
  results: Record<string, ExecutionResult>;
  timestamp: number;
}

// Moteur d'exécution complet pour les workflows
export class WorkflowExecutor {
  // WORKFLOW EXECUTION EDGE CASE FIX: Add execution state and resource tracking
  private executionState = {
    recoveryAttempts: 0,
    isRecovering: false,
    lastCheckpoint: null as Checkpoint | null,
    startTime: Date.now(),
    memoryUsage: 0,
    nodeExecutionCount: 0,
    maxMemoryUsage: 0,
    resourceLimits: {
      maxExecutionTime: 300000, // 5 minutes
      maxMemoryMB: 100,
      maxNodeExecutions: 1000,
      maxCircularDepth: 10
    },
    errors: [] as Array<{nodeId: string; error: string; timestamp: string}>,
    executionPath: [] as string[]
  };
  
  // ENHANCED CIRCULAR DEPENDENCY DETECTION: Advanced data structures
  private dependencyGraph = new Map<string, Set<string>>();
  private conditionalDependencyGraph = new Map<string, Map<string, Set<string>>>();
  private executionPath: string[] = [];
  private stronglyConnectedComponents: string[][] = [];
  private cycleAnalysis: {
    simpleCycles: string[][];
    complexCycles: string[][];
    conditionalCycles: Map<string, string[][]>;
    selfReferences: string[];
  } = {
    simpleCycles: [],
    complexCycles: [],
    conditionalCycles: new Map(),
    selfReferences: []
  };
  
  constructor(
    private nodes: WorkflowNode[],
    private edges: WorkflowEdge[],
    private options: ExecutionOptions = {}
  ) {
    // WORKFLOW EXECUTION EDGE CASE FIX: Initialize options with defaults
    this.options = {
      maxRecoveryAttempts: 3,
      enableCheckpoints: true,
      validateBeforeExecution: true,
      ...options
    };
    
    // WORKFLOW EXECUTION EDGE CASE FIX: Build dependency graph for circular detection
    this.buildDependencyGraph();
    
    // WORKFLOW EXECUTION EDGE CASE FIX: Validate workflow before execution
    if (this.options.validateBeforeExecution) {
      this.validateWorkflowStructure();
    }
  }
  
  // ENHANCED CIRCULAR DEPENDENCY DETECTION: Advanced dependency graph construction
  private buildDependencyGraph() {
    this.dependencyGraph.clear();
    this.conditionalDependencyGraph.clear();
    this.cycleAnalysis = {
      simpleCycles: [],
      complexCycles: [],
      conditionalCycles: new Map(),
      selfReferences: []
    };
    
    // Initialize all nodes in the dependency graph
    for (const node of this.nodes) {
      this.dependencyGraph.set(node.id, new Set());
      this.conditionalDependencyGraph.set(node.id, new Map());
      
      // ENHANCED: Detect self-referencing nodes
      if (this.edges.some(edge => edge.source === node.id && edge.target === node.id)) {
        this.cycleAnalysis.selfReferences.push(node.id);
        logger.warn(`Self-referencing node detected: ${node.id}`);
      }
    }
    
    // Build dependencies based on edges
    for (const edge of this.edges) {
      if (dependencies) {
        dependencies.add(edge.source);
      }
      
      // ENHANCED: Build conditional dependency graph
      if (sourceConditionals && edge.sourceHandle) {
        if (!sourceConditionals.has(edge.sourceHandle)) {
          sourceConditionals.set(edge.sourceHandle, new Set());
        }
        sourceConditionals.get(edge.sourceHandle)!.add(edge.target);
      }
    }
    
    // ENHANCED: Find strongly connected components using Tarjan's algorithm
    this.findStronglyConnectedComponents();
    
    // ENHANCED: Comprehensive cycle analysis
    this.performCycleAnalysis();
  }
  
  // ENHANCED CIRCULAR DEPENDENCY DETECTION: Tarjan's algorithm for strongly connected components
  private findStronglyConnectedComponents() {
    const stack: string[] = [];
    this.stronglyConnectedComponents = [];
    
      indices.set(nodeId, index);
      lowLinks.set(nodeId, index);
      index++;
      stack.push(nodeId);
      onStack.add(nodeId);
      
      // Consider successors of nodeId
      for (const edge of this.edges) {
        if (edge.source === nodeId) {
          successors.add(edge.target);
        }
      }
      
      for (const successor of successors) {
        if (!indices.has(successor)) {
          // Successor has not yet been visited; recurse on it
          strongConnect(successor);
          lowLinks.set(nodeId, Math.min(lowLinks.get(nodeId)!, lowLinks.get(successor)!));
        } else if (onStack.has(successor)) {
          // Successor is in stack and hence in the current SCC
          lowLinks.set(nodeId, Math.min(lowLinks.get(nodeId)!, indices.get(successor)!));
        }
      }
      
      // If nodeId is a root node, pop the stack and generate an SCC
      if (lowLinks.get(nodeId) === indices.get(nodeId)) {
        const component: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          onStack.delete(w);
          component.push(w);
        } while (w !== nodeId);
        
        if (component.length > 1) {
          this.stronglyConnectedComponents.push(component);
          logger.warn(`Strongly connected component (cycle) detected: ${component.join(' ↔ ')}`);
        }
      }
    };
    
    // Find SCCs for all nodes
    for (const node of this.nodes) {
      if (!indices.has(node.id)) {
        strongConnect(node.id);
      }
    }
  }
  
  // ENHANCED CIRCULAR DEPENDENCY DETECTION: Comprehensive cycle analysis
  private performCycleAnalysis() {
    // Analyze simple cycles (direct circular references)
    this.findSimpleCycles();
    
    // Analyze complex cycles (longer dependency chains)
    this.findComplexCycles();
    
    // Analyze conditional cycles (cycles that depend on execution conditions)
    this.findConditionalCycles();
  }
  
  // ENHANCED CIRCULAR DEPENDENCY DETECTION: Find simple 2-node cycles
  private findSimpleCycles() {
    
    for (const edge of this.edges) {
      if (visited.has(pairKey)) continue;
      visited.add(pairKey);
      
      // Check if there's a reverse edge
        e.source === edge.target && e.target === edge.source
      );
      
      if (hasReverse) {
        this.cycleAnalysis.simpleCycles.push([edge.source, edge.target]);
        logger.warn(`Simple cycle detected: ${edge.source} ↔ ${edge.target}`);
      }
    }
  }
  
  // ENHANCED CIRCULAR DEPENDENCY DETECTION: Find complex multi-node cycles
  private findComplexCycles() {
    
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        if (cyclePath.length > 2) { // Only complex cycles (more than 2 nodes)
          this.cycleAnalysis.complexCycles.push([...cyclePath, nodeId]);
          logger.warn(`Complex cycle detected: ${[...cyclePath, nodeId].join(' → ')}`);
        }
        return;
      }
      
      if (visited.has(nodeId)) {
        return;
      }
      
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      // Get successors
        .filter(edge => edge.source === nodeId)
        .map(edge => edge.target);
      
      for (const successor of successors) {
        dfs(successor, [...path, nodeId]);
      }
      
      recursionStack.delete(nodeId);
    };
    
    // Check each node for complex cycles
    for (const node of this.nodes) {
      visited.clear();
      recursionStack.clear();
      dfs(node.id, []);
    }
  }
  
  // ENHANCED CIRCULAR DEPENDENCY DETECTION: Find conditional cycles
  private findConditionalCycles() {
    // Analyze cycles that depend on specific conditions or edge types
    for (const [, conditionals] of this.conditionalDependencyGraph) {
      for (const [condition, targets] of conditionals) {
        const cycles: string[][] = [];
        
        // Use DFS to find cycles for this specific condition
        
          if (recursionStack.has(currentId)) {
            cycles.push([...cyclePath, currentId]);
            return;
          }
          
          if (visited.has(currentId)) return;
          
          visited.add(currentId);
          recursionStack.add(currentId);
          
          // Follow edges with the same condition
          for (const edge of this.edges) {
            if (edge.source === currentId && edge.sourceHandle === condition) {
              conditionalDfs(edge.target, [...path, currentId]);
            }
          }
          
          recursionStack.delete(currentId);
        };
        
        for (const target of targets) {
          visited.clear();
          recursionStack.clear();
          conditionalDfs(target, []);
        }
        
        if (cycles.length > 0) {
          this.cycleAnalysis.conditionalCycles.set(condition, cycles);
          logger.warn(`Conditional cycles detected for condition '${condition}':`, cycles);
        }
      }
    }
  }
  
  // ENHANCED CIRCULAR DEPENDENCY DETECTION: Get comprehensive cycle report
  private getCycleReport(): {
    hasCycles: boolean;
    totalCycles: number;
    details: {
      selfReferences: string[];
      simpleCycles: string[][];
      complexCycles: string[][];
      conditionalCycles: Map<string, string[][]>;
      stronglyConnectedComponents: string[][];
    };
    recommendations: string[];
  } {
      this.cycleAnalysis.selfReferences.length +
      this.cycleAnalysis.simpleCycles.length +
      this.cycleAnalysis.complexCycles.length +
      Array.from(this.cycleAnalysis.conditionalCycles.values()).reduce((sum, cycles) => sum + cycles.length, 0) +
      this.stronglyConnectedComponents.length;
    
    const recommendations: string[] = [];
    
    if (this.cycleAnalysis.selfReferences.length > 0) {
      recommendations.push('Remove self-referencing nodes or add proper exit conditions');
    }
    
    if (this.cycleAnalysis.simpleCycles.length > 0) {
      recommendations.push('Break simple cycles by adding conditional logic or removing unnecessary connections');
    }
    
    if (this.cycleAnalysis.complexCycles.length > 0) {
      recommendations.push('Refactor complex cycles by introducing decision nodes or breaking the workflow into sub-workflows');
    }
    
    if (this.cycleAnalysis.conditionalCycles.size > 0) {
      recommendations.push('Review conditional cycles to ensure proper termination conditions');
    }
    
    return {
      hasCycles: totalCycles > 0,
      totalCycles,
      details: {
        selfReferences: this.cycleAnalysis.selfReferences,
        simpleCycles: this.cycleAnalysis.simpleCycles,
        complexCycles: this.cycleAnalysis.complexCycles,
        conditionalCycles: this.cycleAnalysis.conditionalCycles,
        stronglyConnectedComponents: this.stronglyConnectedComponents
      },
      recommendations
    };
  }
  
  // ENHANCED CIRCULAR DEPENDENCY DETECTION: Legacy method for backward compatibility
  private detectCircularDependencies(): string[] {
    const cycles: string[] = [];
    
    // Convert new format to legacy format
    report.details.selfReferences.forEach(nodeId => {
      cycles.push(`Self-reference: ${nodeId} → ${nodeId}`);
    });
    
    report.details.simpleCycles.forEach(cycle => {
      cycles.push(`Simple cycle: ${cycle.join(' ↔ ')}`);
    });
    
    report.details.complexCycles.forEach(cycle => {
      cycles.push(`Complex cycle: ${cycle.join(' → ')}`);
    });
    
    report.details.conditionalCycles.forEach((cyclelist, condition) => {
      cyclelist.forEach(cycle => {
        cycles.push(`Conditional cycle (${condition}): ${cycle.join(' → ')}`);
      });
    });
    
    return cycles;
  }
  
  // ENHANCED RUNTIME CYCLE DETECTION: Advanced runtime cycle detection with context
  private detectRuntimeCycle(nodeId: string): {
    hasCycle: boolean;
    cyclePath: string[];
    cycleType: 'simple' | 'complex' | 'conditional' | 'execution-path';
    context: {
      executionCount: number;
      pathLength: number;
      timestamp: number;
    };
  } {
      executionCount: this.executionPath.filter(id => id === nodeId).length,
      pathLength: this.executionPath.length,
      timestamp: Date.now()
    };
    
    // Check if node is already in execution path (immediate cycle)
    if (this.executionPath.includes(nodeId)) {
      
      let cycleType: 'simple' | 'complex' | 'conditional' | 'execution-path';
      
      if (cyclePath.length === 2) {
        cycleType = 'simple';
      } else if (cyclePath.length <= 5) {
        cycleType = 'complex';
      } else {
        cycleType = 'execution-path';
      }
      
      // Check if it's a conditional cycle
        if (index === cyclePath.length - 1) return false;
        return this.edges.some(edge => 
          edge.source === id && edge.target === nextId && edge.sourceHandle
        );
      });
      
      if (hasConditionalEdges) {
        cycleType = 'conditional';
      }
      
      return {
        hasCycle: true,
        cyclePath,
        cycleType,
        context
      };
    }
    
    // Check for potential cycles based on node execution count
    if (context.executionCount > this.options.maxCircularDepth) {
      return {
        hasCycle: true,
        cyclePath: [nodeId],
        cycleType: 'execution-path',
        context
      };
    }
    
    return {
      hasCycle: false,
      cyclePath: [],
      cycleType: 'simple',
      context
    };
  }
  
  // ENHANCED CYCLE BREAKING: Attempt to break cycles intelligently
  private attemptCycleBreaking(cycleDetection: {
    hasCycle: boolean;
    cyclePath: string[];
    cycleType: 'simple' | 'complex' | 'conditional' | 'execution-path';
    context: {
      executionCount: number;
      pathLength: number;
      timestamp: number;
    };
  }): boolean {
    if (!cycleDetection.hasCycle) return false;
    
    logger.info('Attempting to break cycle:', cycleDetection);
    
    switch (cycleDetection.cycleType) {
      case 'simple':
        return this.breakSimpleCycle(cycleDetection.cyclePath);
      
      case 'conditional':
        return this.breakConditionalCycle(cycleDetection.cyclePath);
      
      case 'execution-path':
        return this.breakExecutionPathCycle(cycleDetection.cyclePath[0]);
      
      case 'complex':
        return this.breakComplexCycle(cycleDetection.cyclePath);
      
      default:
        return false;
    }
  }
  
  // ENHANCED CYCLE BREAKING: Break simple cycles
  private breakSimpleCycle(cyclePath: string[]): boolean {
    if (cyclePath.length !== 2) return false;
    
    // For simple cycles, we can skip one iteration
    logger.warn(`Breaking simple cycle by skipping iteration: ${cyclePath.join(' ↔ ')}`);
    
    // Remove the last occurrence of the first node from execution path
    if (lastIndex !== -1) {
      this.executionPath.splice(lastIndex, 1);
      return true;
    }
    
    return false;
  }
  
  // ENHANCED CYCLE BREAKING: Break conditional cycles
  private breakConditionalCycle(cyclePath: string[]): boolean {
    // For conditional cycles, we can modify the execution context
    logger.warn(`Attempting to break conditional cycle: ${cyclePath.join(' → ')}`);
    
    // Clear the execution path up to the cycle start
    if (pathIndex !== -1) {
      this.executionPath = this.executionPath.slice(0, pathIndex);
      logger.info('Cleared execution path to break conditional cycle');
      return true;
    }
    
    return false;
  }
  
  // ENHANCED CYCLE BREAKING: Break execution path cycles
  private breakExecutionPathCycle(nodeId: string): boolean {
    logger.warn(`Breaking execution path cycle for node: ${nodeId}`);
    
    // Remove all but the first occurrence of the node from execution path
    if (firstIndex !== -1) {
      // Keep only up to the first occurrence
      this.executionPath = this.executionPath.slice(0, firstIndex);
      logger.info('Trimmed execution path to break cycle');
      return true;
    }
    
    return false;
  }
  
  // ENHANCED CYCLE BREAKING: Break complex cycles
  private breakComplexCycle(cyclePath: string[]): boolean {
    logger.warn(`Attempting to break complex cycle: ${cyclePath.join(' → ')}`);
    
    // For complex cycles, clear the execution path and restart from a safe point
      !cyclePath.includes(node.id) && this.getStartNodes().some(start => start.id === node.id)
    );
    
    if (safeNodes.length > 0) {
      this.executionPath = [];
      logger.info('Cleared execution path and will restart from safe nodes');
      return true;
    }
    
    // If no safe restart points, truncate the path
    this.executionPath = this.executionPath.slice(0, Math.max(0, this.executionPath.length - cyclePath.length));
    logger.info('Truncated execution path to break complex cycle');
    return true;
  }
  
  // Public method for validation that returns an object
  async validateWorkflow(showWarnings = true): Promise<{ valid: boolean; issues: string[]; warnings: string[] }> {
    const issues: string[] = [];
    const warnings: string[] = [];
    
    try {
      this.validateWorkflowStructure();
    } catch (error) {
      if (message.includes('Workflow validation failed:')) {
        issues.push(...issuesList);
      } else {
        issues.push(message);
      }
    }
    
    // Extract warnings from issues
    const actualIssues: string[] = [];
    
    for (const issue of issues) {
      if (warningPatterns.some(pattern => issue.includes(pattern))) {
        if (showWarnings) warnings.push(issue);
      } else {
        actualIssues.push(issue);
      }
    }
    
    return {
      valid: actualIssues.length === 0,
      issues: actualIssues,
      warnings
    };
  }
  
  // WORKFLOW EXECUTION EDGE CASE FIX: Comprehensive workflow validation
  private validateWorkflowStructure() {
    const issues: string[] = [];
    
    // 1. Check for empty workflow
    if (this.nodes.length === 0) {
      throw new Error('Workflow validation failed: No nodes found');
    }
    
    // 2. Check for invalid node configurations
    for (const node of this.nodes) {
      if (!node.id || !node.data || !node.data.type) {
        issues.push(`Node missing required fields: ${JSON.stringify(node)}`);
      }
      
      // Validate node-specific configurations
      if (node.data.type === 'condition' && !node.data.config?.condition) {
        issues.push(`Condition node ${node.id} missing condition expression`);
      }
      
      if ((node.data.type === 'httpRequest') && !node.data.config?.url) {
        issues.push(`HTTP request node ${node.id} missing URL configuration`);
      }
      
      if ((node.data.type === 'email' || node.data.type === 'gmail') && !node.data.config?.to) {
        issues.push(`Email node ${node.id} missing recipient configuration`);
      }
    }
    
    // 3. Check for invalid edges
    for (const edge of this.edges) {
      if (!edge.source || !edge.target) {
        issues.push(`Edge missing source or target: ${JSON.stringify(edge)}`);
      }
      
      if (!nodeIds.has(edge.source)) {
        issues.push(`Edge references non-existent source node: ${edge.source}`);
      }
      
      if (!nodeIds.has(edge.target)) {
        issues.push(`Edge references non-existent target node: ${edge.target}`);
      }
    }
    
    // 4. ENHANCED: Comprehensive circular dependency analysis
    if (cycleReport.hasCycles) {
      issues.push(`Found ${cycleReport.totalCycles} cycles in workflow:`);
      
      if (cycleReport.details.selfReferences.length > 0) {
        issues.push(`- ${cycleReport.details.selfReferences.length} self-references: ${cycleReport.details.selfReferences.join(', ')}`);
      }
      
      if (cycleReport.details.simpleCycles.length > 0) {
        issues.push(`- ${cycleReport.details.simpleCycles.length} simple cycles`);
      }
      
      if (cycleReport.details.complexCycles.length > 0) {
        issues.push(`- ${cycleReport.details.complexCycles.length} complex cycles`);
      }
      
      if (cycleReport.details.conditionalCycles.size > 0) {
        issues.push(`- ${Array.from(cycleReport.details.conditionalCycles.values()).reduce((sum, cycles) => sum + cycles.length, 0)} conditional cycles`);
      }
      
      issues.push(...cycleReport.recommendations.map(rec => `Recommendation: ${rec}`));
    }
    
    // Legacy compatibility
    if (legacyCycles.length > 0 && cycleReport.totalCycles === 0) {
      issues.push(...legacyCycles);
    }
    
    // 5. Check for orphaned nodes (nodes with no path to start)
    if (startNodes.length === 0) {
      // Check if there are any trigger-type nodes at all
      if (!hasTriggerNodes) {
        issues.push('No start nodes found (no trigger-type nodes in workflow)');
      } else {
        issues.push('No valid start nodes found (all trigger nodes have incoming edges)');
      }
    } else {
      
      if (orphanedNodes.length > 0) {
        issues.push(`Orphaned nodes found (unreachable from start): ${orphanedNodes.map(n => n.id).join(', ')}`);
      }
    }
    
    // 6. Check for resource-intensive configurations
    if (httpNodes.length > 50) {
      issues.push(`High number of HTTP request nodes (${httpNodes.length}) may cause rate limiting`);
    }
    
    for (const loopNode of loopNodes) {
      if (maxIterations > 1000) {
        issues.push(`Loop node ${loopNode.id} has high iteration count (${maxIterations}) which may cause timeout`);
      }
    }
    
    // Throw error if critical issues found
    if (issues.length > 0) {
      logger.warn('Workflow validation issues found:', issues);
      
      // Check for critical issues that should stop execution
        legacyCycles.length > 0 || 
        cycleReport.hasCycles ||
        issues.some(issue => 
          issue.includes('missing required fields') ||
          issue.includes('missing condition expression') ||
          issue.includes('missing URL configuration') ||
          issue.includes('references non-existent') ||
          issue.includes('No start nodes found') ||
          issue.includes('Orphaned nodes found')
        );
      
      if (hasCriticalIssues) {
        throw new Error(`Workflow validation failed: ${issues.join('; ')}`);
      }
    }
  }
  
  // WORKFLOW EXECUTION EDGE CASE FIX: Get all nodes reachable from start nodes
  public getReachableNodes(startNodes: WorkflowNode[]): Set<string> {
    
    while (queue.length > 0) {
      if (reachable.has(nodeId)) continue;
      
      reachable.add(nodeId);
      
      // Add all target nodes from this node's outgoing edges
      for (const edge of outgoingEdges) {
        if (!reachable.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }
    
    return reachable;
  }
  
  // WORKFLOW EXECUTION EDGE CASE FIX: Resource monitoring and limits
  private checkResourceLimits(): void {
    
    // Check execution time limit
    if (executionTime > this.executionState.resourceLimits.maxExecutionTime) {
      this.executionState.errors.push({
        nodeId: 'system',
        error,
        timestamp: new Date().toISOString()
      });
      throw new Error(error);
    }
    
    // Check node execution count limit
    if (this.executionState.nodeExecutionCount > this.executionState.resourceLimits.maxNodeExecutions) {
      this.executionState.errors.push({
        nodeId: 'system',
        error,
        timestamp: new Date().toISOString()
      });
      throw new Error(error);
    }
    
    // Check memory usage (simplified)
    this.executionState.memoryUsage = memoryUsageMB;
    this.executionState.maxMemoryUsage = Math.max(this.executionState.maxMemoryUsage, memoryUsageMB);
    
    if (memoryUsageMB > this.executionState.resourceLimits.maxMemoryMB) {
      this.executionState.errors.push({
        nodeId: 'system',
        error,
        timestamp: new Date().toISOString()
      });
      throw new Error(error);
    }
  }
  
  // WORKFLOW EXECUTION EDGE CASE FIX: Enhanced data combination with conflict resolution
  private combineNodeData(incomingEdges: WorkflowEdge[], results: Record<string, ExecutionResult>, inputData: Record<string, unknown>): Record<string, unknown> {
    const combinedData: Record<string, unknown> = { ...inputData };
    const conflicts: string[] = [];
    
    for (const edge of incomingEdges) {
      if (sourceResult?.data) {
        for (const [key, value] of Object.entries(sourceResult.data)) {
          if (key in combinedData && combinedData[key] !== value) {
            conflicts.push(`Key '${key}' conflict: ${JSON.stringify(combinedData[key])} vs ${JSON.stringify(value)}`);
            
            // Conflict resolution strategy: keep array of all values
            if (!Array.isArray(combinedData[key])) {
              combinedData[key] = [combinedData[key]];
            }
            if (!combinedData[key].includes(value)) {
              combinedData[key].push(value);
            }
          } else {
            combinedData[key] = value;
          }
        }
      }
    }
    
    if (conflicts.length > 0) {
      logger.warn('Data conflicts resolved:', conflicts);
      combinedData._conflicts = conflicts;
    }
    
    return combinedData;
  }
  
  // WORKFLOW EXECUTION EDGE CASE FIX: Enhanced execution diagnostics
  private getExecutionDiagnostics() {
    
    return {
      executionTimeMs: executionTime,
      nodesExecuted: this.executionState.nodeExecutionCount,
      memoryUsageMB: this.executionState.memoryUsage,
      maxMemoryUsageMB: this.executionState.maxMemoryUsage,
      recoveryAttempts: this.executionState.recoveryAttempts,
      executionPath: [...this.executionPath],
      resourceLimits: { ...this.executionState.resourceLimits },
      healthScore: this.calculateHealthScore(),
      warnings: this.getWarnings()
    };
  }
  
  // WORKFLOW EXECUTION EDGE CASE FIX: Calculate execution health score
  private calculateHealthScore(): number {
    
    return Math.round((timeScore + memoryScore + recoveryScore) / 3);
  }
  
  // WORKFLOW EXECUTION EDGE CASE FIX: Get execution warnings
  private getWarnings(): string[] {
    const warnings: string[] = [];
    
    if (executionTime > this.executionState.resourceLimits.maxExecutionTime * 0.8) {
      warnings.push('Approaching execution time limit');
    }
    
    if (this.executionState.memoryUsage > this.executionState.resourceLimits.maxMemoryMB * 0.8) {
      warnings.push('High memory usage detected');
    }
    
    if (this.executionState.recoveryAttempts > 0) {
      warnings.push(`${this.executionState.recoveryAttempts} recovery attempts made`);
    }
    
    if (this.executionPath.length > 100) {
      warnings.push('Long execution path detected - possible inefficiency');
    }
    
    return warnings;
  }
  
  // Exécution d'un nœud spécifique
  async executeNode(node: WorkflowNode, inputData: Record<string, unknown> = {}): Promise<ExecutionResult> {
    try {
      this.executionState.nodeExecutionCount++;
      this.checkResourceLimits();
      
      const { type, config = {} } = node.data;
      
      // Add node to execution path
      this.executionState.executionPath.push(node.id);
      
      logger.info(`🚀 Executing node: ${node.data.label} (${type})`);
      
      // Simuler un délai d'exécution réaliste
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 2000));
      
      let result: Record<string, unknown> = {};
      
      switch (type) {
        case 'trigger':
        case 'manualTrigger':
        case 'webhook':
          result = await this.executeTrigger(node, config);
          break;
          
        case 'schedule':
          result = await this.executeSchedule(node, config);
          break;
          
        case 'httpRequest':
          result = await this.executeHttpRequest(node, config);
          break;
          
        case 'email':
        case 'gmail':
          result = await this.executeEmail(node, config, inputData);
          break;
          
        case 'slack':
          result = await this.executeSlack(node, config);
          break;
          
        case 'discord':
          result = await this.executeDiscord(node, config);
          break;
          
        case 'mysql':
        case 'postgres':
          result = await this.executeDatabase(node, config);
          break;
          
        case 'mongodb':
          result = await this.executeMongoDB(node, config);
          break;
          
        case 'condition':
          result = await this.executeCondition(node, config, inputData);
          break;
          
        case 'transform':
          result = await this.executeTransform(node, config, inputData);
          break;
          
        case 'code':
          result = await this.executeCode(node, config, inputData);
          break;
          
        case 'openai':
          result = await this.executeOpenAI(node, config);
          break;
          
        case 'filter':
          result = await this.executeFilter(node, config, inputData);
          break;
          
        case 'sort':
          result = await this.executeSort(node, config, inputData);
          break;
          
        case 'merge':
          result = await this.executeMerge(node, config, inputData);
          break;

        case 'delay':
          result = await this.executeDelay(node, config, inputData);
          break;

        case 'subWorkflow':
          result = await this.executeSubWorkflow(node, config);
          break;

        case 'loop':
          result = await this.executeLoop(node, config, inputData);
          break;

        case 'forEach':
          result = await this.executeForEach(node, config, inputData);
          break;

        case 'etl':
          result = await this.executeETL(node, config, inputData);
          break;

        case 'googleSheets':
          result = await this.executeGoogleSheets(node, config);
          break;
          
        case 's3':
          result = await this.executeS3(node, config);
          break;

        case 'errorGenerator':
          throw new Error(config.message || 'Intentional error');

        default:
          result = await this.executeGeneric(node, config, inputData);
      }
      
      
      // Normalize the result - if the execution method returned a 'data' property, use it directly
      
      return {
        status: 'success',
        data: normalizedData,
        duration,
        timestamp: new Date().toISOString(),
        nodeId: node.id,
        nodeType: type,
        // Include any additional properties from the result
        ...result
      };
      
    } catch (error: unknown) {
      
      // Check if it's a resource limit error
      if (errorMessage.includes('timeout') || errorMessage.includes('limit exceeded')) {
        // Resource limit errors should propagate to stop execution
        throw error;
      }
      
      // Safely handle different error types
        message: 'Unknown error occurred',
        stack: undefined as string | undefined,
        code: 'EXECUTION_ERROR'
      };
      
      if (error instanceof Error) {
        errorInfo.message = error.message;
        errorInfo.stack = error.stack;
      } else if (typeof error === 'string') {
        errorInfo.message = error;
      } else if (error && typeof error === 'object') {
        errorInfo.message = (typeof errorObj.message === 'string' ? errorObj.message : JSON.stringify(error));
        errorInfo.stack = (typeof errorObj.stack === 'string' ? errorObj.stack : undefined);
        errorInfo.code = (typeof errorObj.code === 'string' ? errorObj.code : 'EXECUTION_ERROR');
      }
      
      return {
        status: 'error',
        error: errorInfo.message,
        duration,
        timestamp: new Date().toISOString(),
        nodeId: node.id,
        nodeType: node.data?.type,
        data: inputData
      };
    }
  }
  
  // Implémentations spécifiques des nœuds
  async executeTrigger(_node: WorkflowNode, config: Record<string, unknown>): Promise<ExecutionResult> {
    return { 
      trigger: 'manual',
      timestamp: new Date().toISOString(),
      data: config.mockData || {
        userId: Math.floor(Math.random() * 1000),
        email: 'user@example.com',
        action: 'signup'
      }
    };
  }
  
  async executeSchedule(_node: WorkflowNode, config: Record<string, unknown>): Promise<ExecutionResult> {
    return {
      scheduled: true,
      cron: config.cron || '0 9 * * *',
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      data: { scheduledExecution: true }
    };
  }
  
  async executeHttpRequest(_node: WorkflowNode, config: Record<string, unknown>): Promise<ExecutionResult> {
    
    // ERROR RECOVERY FIX: Implement retry mechanism with exponential backoff
    for (let __attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // ERROR RECOVERY FIX: Implement timeout protection
        
        try {
          // Simulation of real HTTP request with error scenarios
          // For testing retry logic, simulate error on first attempts based on config
          
          // Force retries for test URLs or based on config
                                    attempt <= forceRetries || 
                                    (Math.random() < 0.3 && attempt < maxRetries);
          
          if (shouldSimulateError) {
            throw new Error(`Network error (attempt ${attempt}/${maxRetries})`);
          }
        } finally {
          // MEMORY LEAK FIX: Always clear timeout regardless of success or failure
          clearTimeout(timeoutId);
        }
        
          'https://jsonplaceholder.typicode.com/posts/1': {
            id: 1,
            title: 'Mock post title',
            body: 'Mock post body',
            userId: 1
          },
          'https://api.github.com/users/octocat': {
            login: 'octocat',
            id: 1,
            name: 'The Octocat',
            company: 'GitHub'
          }
        };
        
        // Success - return the result
        return {
          status: 'success',
          statusCode: 200,
          headers: { 'content-type': 'application/json' },
          body: mockResponses[url] || { message: 'HTTP request executed', url, method },
          url,
          method,
          duration: Math.floor(Math.random() * 1000) + 100,
          attempt,
          retriesUsed: attempt - 1,
          data: {
            response: mockResponses[url] || { message: 'HTTP request executed', url, method },
            retriesUsed: attempt - 1
          }
        };
        
      } catch (error: unknown) {
        logger.warn(`HTTP request attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        if (attempt === maxRetries) {
          // ERROR RECOVERY FIX: Return structured error with fallback data
          return {
            statusCode: 500,
            headers: { 'content-type': 'application/json' },
            body: { 
              error: 'HTTP request failed after all retries', 
              message: error.message,
              fallbackData: config.fallbackResponse || { status: 'failed', url, method }
            },
            url,
            method,
            duration: timeout,
            attempt,
            retriesUsed: maxRetries,
            failed: true
          };
        }
        
        // ERROR RECOVERY FIX: Exponential backoff delay
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  async executeEmail(_node: WorkflowNode, config: Record<string, unknown>, inputData: Record<string, unknown>): Promise<ExecutionResult> {
    // const __body = config.body || 'This is an automated email';
    
    return {
      sent: true,
      to,
      subject,
      messageId: `msg_${Date.now()}_${(() => {
        return randomStr.length >= 9 ? randomStr.substring(0, 9) : randomStr.padEnd(9, '0');
      })()}`,
      provider: config.host?.includes('gmail') ? 'Gmail' : 'SMTP',
      timestamp: new Date().toISOString()
    };
  }
  
  async executeSlack(_node: WorkflowNode, config: Record<string, unknown>): Promise<ExecutionResult> {
    
    return {
      sent: true,
      channel,
      message,
      ts: Date.now().toString(),
      user: 'workflow-bot'
    };
  }
  
  async executeDiscord(_node: WorkflowNode, config: Record<string, unknown>): Promise<ExecutionResult> {
    
    return {
      sent: true,
      content,
      messageId: (() => {
        return randomStr.length >= 18 ? randomStr.substring(0, 18) : randomStr.padEnd(18, '0');
      })(),
      timestamp: new Date().toISOString()
    };
  }
  
  async executeDatabase(_node: WorkflowNode, config: Record<string, unknown>): Promise<ExecutionResult> {
    
    // ERROR RECOVERY FIX: Implement database connection retry and fallback
    for (let __attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Simulate database connection issues
        if (shouldSimulateConnectionError && attempt < maxRetries) {
          throw new Error(`Database connection failed (attempt ${attempt}/${maxRetries})`);
        }
        
        // Simulate query timeout
        if (shouldSimulateTimeout && attempt < maxRetries) {
          throw new Error(`Query timeout after ${timeout}ms`);
        }
        
          { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2024-01-01' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: '2024-01-02' },
          { id: 3, name: 'Bob Johnson', email: 'bob@example.com', created_at: '2024-01-03' }
        ];
        
        return {
          operation,
          query,
          rowsAffected: mockData.length,
          data: operation === 'select' ? mockData : null,
          executionTime: Math.floor(Math.random() * 100) + 10,
          attempt,
          retriesUsed: attempt - 1,
          connectionStatus: 'healthy'
        };
        
      } catch (error: unknown) {
        logger.warn(`Database operation attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        if (attempt === maxRetries) {
          // ERROR RECOVERY FIX: Return fallback data instead of complete failure
          return {
            operation,
            query,
            rowsAffected: 0,
            data: operation === 'select' ? (config.fallbackData || []) : null,
            executionTime: timeout,
            attempt,
            retriesUsed: maxRetries,
            failed: true,
            error: error.message,
            connectionStatus: 'failed',
            fallbackUsed: true
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  async executeMongoDB(_node: WorkflowNode, config: Record<string, unknown>): Promise<ExecutionResult> {
    
    return {
      operation,
      collection,
      database: config.database,
      result: {
        acknowledged: true,
        insertedCount: operation.includes('insert') ? 1 : undefined,
        matchedCount: operation.includes('update') ? 1 : undefined,
        modifiedCount: operation.includes('update') ? 1 : undefined
      }
    };
  }
  
  async executeCondition(node: WorkflowNode, config: Record<string, unknown>, inputData: Record<string, unknown>): Promise<ExecutionResult> {
    
    // Évaluation simple de conditions
    
    try {
      if (condition === 'true') result = true;
      else if (condition === 'false') result = false;
      else if (condition.includes('$json')) {
        // Use secure expression evaluation
        result = this.evaluateSecureExpression(condition, inputData);
      } else {
        // Try to parse as a simple expression
        result = this.evaluateSecureExpression(condition, inputData);
      }
    } catch {
      result = false;
    }
    
    return {
      condition,
      result,
      branch: result ? 'true' : 'false',
      data: {
        ...inputData,
        result,
        branch: result ? 'true' : 'false'
      }
    };
  }
  
  async executeTransform(_node: WorkflowNode, config: Record<string, unknown>, inputData: Record<string, unknown>): Promise<ExecutionResult> {
    // const _code = config.code || 'return { ...items, transformed: true };';
    
    // Simulation de transformation
      ...inputData,
      transformed: true,
      transformedAt: new Date().toISOString(),
      originalKeys: Object.keys(inputData || {}),
      transformationType: config.transformType || 'javascript'
    };
    
    return transformed;
  }
  
  async executeCode(_node: WorkflowNode, config: Record<string, unknown>, inputData: Record<string, unknown>): Promise<ExecutionResult> {
    // const __memoryLimit = config.memoryLimit || 50; // MB
    
    try {
      // ERROR RECOVERY FIX: Implement execution timeout protection
        let timeoutId: NodeJS.Timeout | null = null;
        let executionId: NodeJS.Timeout | null = null;
        
        // MEMORY LEAK FIX: Cleanup function to clear all timers
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          if (executionId) {
            clearTimeout(executionId);
            executionId = null;
          }
        };
        
        // Simulate code execution with potential failures
        
        if (shouldSimulateTimeout) {
          timeoutId = setTimeout(() => {
            cleanup();
            reject(new Error('Code execution timeout'));
          }, timeout + 100);
          return;
        }
        
        if (shouldSimulateError) {
          cleanup();
          reject(new Error('Runtime error in user code'));
          return;
        }
        
        // Simulate successful execution
        executionId = setTimeout(() => {
          cleanup();
          resolve({
            executed: true,
            code: _code.substring(0, 100) + (_code.length > 100 ? '...' : ''),
            result: { success: true, timestamp: new Date().toISOString() },
            runtime: 'javascript',
            inputData,
            executionTime: Date.now() - startTime
          });
        }, Math.random() * 1000 + 100);
      });
      
      // ERROR RECOVERY FIX: Add timeout wrapper
        setTimeout(() => reject(new Error(`Code execution timeout after ${timeout}ms`)), timeout);
      });
      
      return result;
      
    } catch (error: unknown) {
      // ERROR RECOVERY FIX: Provide fallback result instead of throwing
      logger.warn('Code execution failed, using fallback:', error.message);
      
      return {
        executed: false,
        code: _code.substring(0, 100) + (_code.length > 100 ? '...' : ''),
        result: config.fallbackResult || { success: false, error: error.message },
        runtime: 'javascript',
        inputData,
        error: error.message,
        fallbackUsed: true,
        executionTime: timeout
      };
    }
  }
  
  async executeOpenAI(_node: WorkflowNode, config: Record<string, unknown>): Promise<ExecutionResult> {
    // const __timeout = config.timeout || 60000; // 60 second timeout for AI requests
    
    // ERROR RECOVERY FIX: Implement API retry with rate limiting and fallback
    for (let __attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Simulate various API failure scenarios
        
        if (shouldSimulateRateLimit && attempt < maxRetries) {
          throw new Error('Rate limit exceeded - too many requests');
        }
        
        if (shouldSimulateQuotaExceeded && attempt < maxRetries) {
          throw new Error('API quota exceeded for this month');
        }
        
        if (shouldSimulateServiceUnavailable && attempt < maxRetries) {
          throw new Error('OpenAI API service temporarily unavailable');
        }
        
        // Simulate successful response
          'Hello! I\'m doing well, thank you for asking. How can I help you today?',
          'I\'m functioning perfectly! What would you like to know or discuss?',
          'Greetings! I\'m here and ready to assist you with any questions or tasks.',
          'Hi there! I\'m doing great. What can I do for you?'
        ];
        
        return {
          model,
          prompt,
          response: responses[Math.floor(Math.random() * responses.length)],
          usage: {
            prompt_tokens: prompt.split(' ').length,
            completion_tokens: Math.floor(Math.random() * 50) + 10,
            total_tokens: Math.floor(Math.random() * 100) + 50
          },
          temperature: config.temperature || 0.7,
          attempt,
          retriesUsed: attempt - 1
        };
        
      } catch (error: unknown) {
        logger.warn(`OpenAI API attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        if (attempt === maxRetries) {
          // ERROR RECOVERY FIX: Use fallback response when API fails
            'I apologize, but I\'m experiencing technical difficulties. Please try again later.';
          
          return {
            model,
            prompt,
            response: fallbackResponse,
            usage: {
              prompt_tokens: prompt.split(' ').length,
              completion_tokens: fallbackResponse.split(' ').length,
              total_tokens: prompt.split(' ').length + fallbackResponse.split(' ').length
            },
            temperature: config.temperature || 0.7,
            attempt,
            retriesUsed: maxRetries,
            failed: true,
            error: error.message,
            fallbackUsed: true
          };
        }
        
        // ERROR RECOVERY FIX: Progressive delay for different error types
        if (error.message.includes('rate limit')) {
          delay = Math.min(60000, 5000 * Math.pow(2, attempt - 1)); // Exponential backoff for rate limits
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  async executeFilter(_node: WorkflowNode, config: Record<string, unknown>, inputData: Record<string, unknown>): Promise<ExecutionResult> {
    
    // Simulation de filtrage
      { id: 1, name: 'Item 1', active: true },
      { id: 2, name: 'Item 2', active: false },
      { id: 3, name: 'Item 3', active: true }
    ];
    
    
    return {
      originalCount: items.length,
      filteredCount: filtered.length,
      filter: filterExpression,
      items: filtered
    };
  }
  
  async executeSort(_node: WorkflowNode, config: Record<string, unknown>, inputData: Record<string, unknown>): Promise<ExecutionResult> {
    
      { id: 3, name: 'Charlie', score: 85 },
      { id: 1, name: 'Alice', score: 92 },
      { id: 2, name: 'Bob', score: 78 }
    ];
    
      return order === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    
    return {
      field,
      order,
      count: sorted.length,
      items: sorted
    };
  }
  
  async executeMerge(_node: WorkflowNode, config: Record<string, unknown>, inputData: Record<string, unknown>): Promise<ExecutionResult> {
    // Handle data merging with conflict detection
    const conflicts: string[] = [];
    
    // Check for conflicts in the input data (arrays indicate conflicts)
    for (const [key, value] of Object.entries(inputData)) {
      if (Array.isArray(value) && value.length > 1) {
        conflicts.push(`Key '${key}' has multiple values: ${JSON.stringify(value)}`);
      }
    }
    
    return {
      merged: true,
      sources: 2,
      data: {
        ...inputData,
        mergedAt: new Date().toISOString(),
        mergeStrategy: 'combine',
        _conflicts: conflicts.length > 0 ? conflicts : undefined
      }
    };
  }
  
  async executeDelay(_node: WorkflowNode, config: Record<string, unknown>, inputData: Record<string, unknown>): Promise<ExecutionResult> {
    
                   unit === 'hours' ? delay * 60 * 60 * 1000 : 
                   delay * 1000;
    
    // For testing purposes, simulate actual delay if it would exceed resource limits
    if (this.executionState.resourceLimits && delayMs > this.executionState.resourceLimits.maxExecutionTime) {
      // This will trigger a timeout when checkResourceLimits is called
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return {
      delayed: true,
      duration: delay,
      unit,
      delayMs,
      data: inputData
    };
  }
  
  async executeGoogleSheets(_node: WorkflowNode, config: Record<string, unknown>): Promise<ExecutionResult> {
    
    return {
      operation,
      spreadsheetId,
      range,
      data: operation === 'read' ? [
        ['Name', 'Email', 'Score', 'Date'],
        ['John Doe', 'john@example.com', '95', '2024-01-01'],
        ['Jane Smith', 'jane@example.com', '87', '2024-01-02']
      ] : null,
      rowsAffected: operation === 'write' ? 1 : undefined
    };
  }
  
  async executeS3(_node: WorkflowNode, config: Record<string, unknown>): Promise<ExecutionResult> {
    
    return {
      operation,
      bucket,
      region: config.region || 'us-east-1',
      key: `file-${Date.now()}.json`,
      size: Math.floor(Math.random() * 10000) + 1000,
      etag: (() => {
        return randomStr.length >= 32 ? randomStr.substring(0, 32) : randomStr.padEnd(32, '0');
      })()
    };
  }

  async executeLoop(_node: WorkflowNode, config: Record<string, unknown>, inputData: Record<string, unknown>): Promise<ExecutionResult> {

    const results: unknown[] = [];
    for (let __i = 0; i < items.length && i < max; i++) {
      results.push({ index: i, item: items[i] });
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      iterations: results.length,
      results
    };
  }

  async executeForEach(_node: WorkflowNode, config: Record<string, unknown>, inputData: Record<string, unknown>): Promise<ExecutionResult> {
    const results: unknown[] = [];

    for (let __i = 0; i < items.length; i++) {
      results.push({ index: i, item: items[i] });
    }

    return {
      count: results.length,
      results
    };
  }

  async executeETL(_node: WorkflowNode, config: Record<string, unknown>, inputData: Record<string, unknown>): Promise<ExecutionResult> {

    if (config.filterField) {
      transformed = transformed.filter((item: unknown) =>
        item && item[config.filterField] === config.filterValue
      );
    }

    if (Array.isArray(config.selectFields) && config.selectFields.length > 0) {
      transformed = transformed.map((item: unknown) => {
        const out: Record<string, unknown> = {};
        for (const field of config.selectFields) {
          out[field] = item[field];
        }
        return out;
      });
    }

    return {
      extracted: data.length,
      loaded: transformed.length,
      sample: transformed.slice(0, 3),
      data: transformed
    };
  }

  async executeSubWorkflow(_node: WorkflowNode, config: Record<string, unknown>): Promise<ExecutionResult> {
    
    if (!workflowId) {
      throw new Error('No workflow selected');
    }
    if (typeof this.options.loadWorkflow !== 'function') {
      throw new Error('loadWorkflow option not provided');
    }

    try {
      // ERROR RECOVERY FIX: Track execution depth to prevent stack overflow
      if (currentDepth > maxDepth) {
        throw new Error(`Maximum execution depth (${maxDepth}) exceeded - possible recursive loop`);
      }

      if (!sub || !Array.isArray(sub.nodes)) {
        throw new Error('Workflow not found or invalid');
      }

      // ERROR RECOVERY FIX: Add timeout protection for sub-workflow execution
          ...this.options,
          executionDepth: currentDepth
        });
        return await executor.execute(() => {}, () => {}, () => {});
      })();
      
        setTimeout(() => reject(new Error(`Sub-workflow timeout after ${timeout}ms`)), timeout);
      });
      
      
      return { 
        workflowId, 
        result, 
        executionDepth: currentDepth,
        timeout: false
      };
      
    } catch (error: unknown) {
      // ERROR RECOVERY FIX: Provide partial results and fallback
      logger.warn(`Sub-workflow execution failed: ${error.message}`);
      
      return {
        workflowId,
        result: {
          status: 'error',
          error: error.message,
          executionId: `failed_${Date.now()}`,
          duration: timeout,
          nodesExecuted: 0,
          errors: [{ nodeId: 'subworkflow', error: error.message }],
          results: {},
          fallbackData: config.fallbackResult || { status: 'sub-workflow failed' }
        },
        executionDepth: (this.options.executionDepth || 0) + 1,
        timeout: error.message.includes('timeout'),
        failed: true
      };
    }
  }

  async executeGeneric(node: WorkflowNode, config: Record<string, unknown>, inputData: Record<string, unknown>): Promise<ExecutionResult> {
    return {
      nodeType: node.data.type,
      executed: true,
      config,
      inputData,
      timestamp: new Date().toISOString()
    };
  }

  // SECURITY FIX: Completely rewritten expression evaluator with comprehensive security
  parseExpression(expression: string, data: Record<string, unknown>): unknown {
    if (!expression) return true;
    
    // SECURITY FIX: Comprehensive input validation and sanitization
    if (!this.isExpressionSafe(expression)) {
      logger.warn('Dangerous expression blocked:', expression);
      return false;
    }
    
    try {
      // SECURITY FIX: Strict type and length validation
      if (!expression || typeof expression !== 'string' || expression.length > 500) {
        logger.warn('Invalid expression format or too long');
        return false;
      }
      
      // SECURITY FIX: Decode and check for encoded payloads
      if (!decodedExpression || !this.isExpressionSafe(decodedExpression)) {
        logger.warn('Encoded malicious expression detected');
        return false;
      }
      
      // SECURITY FIX: Only allow extremely limited safe operations
      return this.evaluateSecureExpression(decodedExpression, data);
      
    } catch (error) {
      logger.error('Expression evaluation failed securely:', error);
      return false;
    }
  }
  
  // SECURITY FIX: Comprehensive security validation
  private isExpressionSafe(expression: string): boolean {
    // SECURITY FIX: Expanded dangerous patterns with case variations and bypass attempts
      // Direct access patterns
      /window/i, /document/i, /global/i, /globalThis/i, /self/i, /parent/i, /top/i,
      /process/i, /require/i, /import/i, /export/i, /module/i,
      
      // Code execution patterns
      /eval/i, /Function/i, /setTimeout/i, /setInterval/i, /setImmediate/i,
      /execScript/i, /javascript:/i, /vbscript:/i, /data:/i,
      
      // Prototype pollution
      /constructor/i, /prototype/i, /__proto__/i, /__defineGetter__/i, /__defineSetter__/i,
      /__lookupGetter__/i, /__lookupSetter__/i,
      
      // Network access
      /fetch/i, /XMLHttpRequest/i, /WebSocket/i, /EventSource/i,
      /navigator/i, /location/i, /history/i,
      
      // DOM manipulation
      /createElement/i, /appendChild/i, /innerHTML/i, /outerHTML/i,
      /insertAdjacentHTML/i, /write/i, /writeln/i,
      
      // User interaction
      /alert/i, /confirm/i, /prompt/i, /print/i,
      
      // Storage access
      /localStorage/i, /sessionStorage/i, /indexedDB/i, /cookie/i,
      
      // Encoded bypass attempts
      /&#/i, /%[0-9a-f]/i, /\\u[0-9a-f]/i, /\\x[0-9a-f]/i,
      
      // Template literals and string manipulation
      /`/, /\$\{/, /String\.fromCharCode/i, /String\.fromCodePoint/i,
      /unescape/i, /decodeURI/i, /decodeURIComponent/i,
      
      // Regex exploitation
      /RegExp/i, /replace/i, /match/i, /search/i,
      
      // Array/Object bypass attempts
      /\[\s*['"]constructor['"]/, /\[\s*['"]__proto__['"]/, 
      /\.\s*constructor/, /\.\s*__proto__/,
      
      // Function call bypasses
      /call/i, /apply/i, /bind/i, /toString/i, /valueOf/i
    ];
    
    // SECURITY FIX: Check for dangerous patterns
    if (dangerousPatterns.some(pattern => pattern.test(expression))) {
      return false;
    }
    
    // SECURITY FIX: Only allow very specific safe characters
    if (!safeCharacterPattern.test(expression)) {
      return false;
    }
    
    // SECURITY FIX: Prevent various bypass techniques
      /\[.*\]/, // Bracket notation access
      /\{.*\}/, // Object literals
      /['"].*['"]/, // String literals (potential code)
      /\\\w/, // Escape sequences
      /\/\*.*\*\//, // Comments
      /\/\/.*$/, // Line comments
      /;/, // Statement separators
    ];
    
    if (bypassPatterns.some(pattern => pattern.test(expression))) {
      return false;
    }
    
    return true;
  }
  
  // SECURITY FIX: Decode and validate potential encoded attacks
  private decodeAndValidateExpression(expression: string): string | null {
    try {
      
      // SECURITY FIX: Check for various encoding bypass attempts
      if (decoded.includes('%') || decoded.includes('&#') || decoded.includes('\\')) {
        // Don't decode - reject potentially encoded malicious content
        logger.warn('Encoded content detected in expression');
        return null;
      }
      
      return decoded;
    } catch {
      return null;
    }
  }
  
  // SECURITY FIX: Extremely restricted expression evaluator
  private evaluateSecureExpression(expression: string, data: Record<string, unknown>): boolean {
    // SECURITY FIX: Only support very basic comparison operations
    // Updated pattern to support nested properties like $json.user.age
    
    if (!match) {
      // If it doesn't match our extremely restrictive pattern, reject it
      logger.warn('Expression does not match safe pattern:', expression);
      return false;
    }
    
    const [, fieldPath, operator, valueStr] = match;
    
    // SECURITY FIX: Validate field path (allow nested paths like user.age)
    if (!/^\w+(?:\.\w+)*$/.test(fieldPath)) {
      logger.warn('Invalid field path:', fieldPath);
      return false;
    }
    
    // SECURITY FIX: Safely extract value from data
    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }
    
    // SECURITY FIX: Parse value safely
    let compareValue: unknown;
    if (valueStr === 'true') {
      compareValue = true;
    } else if (valueStr === 'false') {
      compareValue = false;
    } else {
      compareValue = parseFloat(valueStr);
      if (isNaN(compareValue)) {
        logger.warn('Invalid comparison value:', valueStr);
        return false;
      }
    }
    
    // SECURITY FIX: Perform safe comparison
    switch (operator) {
      case '>': return typeof fieldValue === 'number' && fieldValue > compareValue;
      case '<': return typeof fieldValue === 'number' && fieldValue < compareValue;
      case '>=': return typeof fieldValue === 'number' && fieldValue >= compareValue;
      case '<=': return typeof fieldValue === 'number' && fieldValue <= compareValue;
      case '===': return fieldValue === compareValue;
      case '!==': return fieldValue !== compareValue;
      default: return false;
    }
  }
  
  // SECURITY FIX: Safe property access without prototype pollution
  private safeGetProperty(obj: Record<string, unknown>, path: string): unknown {
    if (!obj || typeof obj !== 'object' || !path || typeof path !== 'string') {
      return undefined;
    }
    
    // SECURITY FIX: Disallow dangerous patterns
    if (path.includes('[') || path.includes('constructor') || path.includes('__proto__')) {
      return undefined;
    }
    
    // Support nested paths safely (e.g., "user.age")
    let current: unknown = obj;
    
    for (const part of parts) {
      // Validate each part of the path
      if (!/^\w+$/.test(part)) {
        return undefined;
      }
      
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  // Vérifie si l'arête doit être suivie
  edgeConditionMet(edge: WorkflowEdge, data: Record<string, unknown>): boolean {
    if (edge.data && edge.data.condition) {
      return this.parseExpression(edge.data.condition, data);
    }
    return true;
  }
  
  // Obtenir les nœuds suivants
  getNextNodes(nodeId: string, branch?: string) {
      if (edge.source !== nodeId) return false;
      if (branch && edge.sourceHandle && edge.sourceHandle !== branch) return false;
      return true;
    });
    
    return outgoingEdges.map(edge => {
      return { node, edge };
    });
  }
  
  // Obtenir les nœuds de départ
  public getStartNodes() {
    // Only trigger nodes can be start nodes
    return this.nodes.filter(node => 
      !nodesWithInputs.has(node.id) && 
      triggerTypes.includes(node.data.type)
    );
  }
  
  // Exécution principale avec support des branches
  async execute(
    onNodeStart: (nodeId: string) => void,
    onNodeComplete: (nodeId: string, inputData: Record<string, unknown>, result: ExecutionResult) => void,
    onNodeError: (nodeId: string, error: Error) => void
  ) {
    
    logger.info(`🚀 Starting workflow execution: ${executionId}`);
    
    if (startNodes.length === 0) {
      throw new Error('No start nodes found in workflow');
    }
    
    const executionQueue: Array<{node: WorkflowNode, inputData: Record<string, unknown>}> = startNodes.map(node => ({
      node,
      inputData: {}
    }));
    
    const results: {[nodeId: string]: ExecutionResult} = {};
    const errors: Error[] = [];
    
    // Protection contre les boucles infinies lors de l'exécution
    
    // RACE CONDITION FIX: Add atomic operation protection
    
    // CRITICAL FIX: Atomic operation mutex to prevent race conditions
    
      return new Promise((resolve) => {
        if (!globalLock.locked) {
          globalLock.locked = true;
          resolve(() => {
            globalLock.locked = false;
            if (waiter) waiter();
          });
        } else {
          globalLock.waiters.push(() => {
            globalLock.locked = true;
            resolve(() => {
              globalLock.locked = false;
              if (waiter) waiter();
            });
          });
        }
      });
    };
    
    while (executionQueue.length > 0) {
      const { _node, inputData } = executionQueue.shift()!;
      
      if (!node || executed.has(node.id)) continue;
      
      // ATOMIC OPERATION: Check if node is already being executed
      try {
        if (executionPromises.has(node.id)) {
          logger.warn(`Node ${node.id} is already being executed, skipping duplicate`);
          shouldSkipNode = true;
        } else if (concurrentExecutions >= maxConcurrentExecutions) {
          // Put node back in queue if at capacity
          executionQueue.unshift({ node, inputData });
          shouldSkipNode = true;
        } else {
          // Atomically mark node as being executed
          concurrentExecutions++;
          executionPromises.set(node.id, Promise.resolve().then(async () => {
            // This will be replaced with actual execution
            return { success: false, nodeId: node.id, error: 'Placeholder' };
          }));
        }
      } finally {
        releaseCheckLock();
      }
      
      if (shouldSkipNode) continue;
      
      // WORKFLOW EXECUTION EDGE CASE FIX: Check resource limits before each node execution
      try {
        this.checkResourceLimits();
      } catch (error: unknown) {
        logger.error('Resource limit exceeded:', errorMessage);
        errors.push({ nodeId: 'system', error: errorMessage, timestamp: new Date().toISOString() });
        break;
      }
      
      // ENHANCED RUNTIME CYCLE DETECTION: Advanced cycle detection with context
      if (runtimeCycleDetection.hasCycle) {
        logger.error('Runtime circular dependency detected:', {
          cycle: runtimeCycleDetection.cyclePath,
          cycleType: runtimeCycleDetection.cycleType,
          executionContext: runtimeCycleDetection.context
        });
        
        errors.push({ 
          nodeId: node.id, 
          error: `Runtime ${runtimeCycleDetection.cycleType} detected: ${runtimeCycleDetection.cyclePath.join(' → ')}`,
          timestamp: new Date().toISOString()
        });
        
        // ENHANCED: Attempt cycle breaking if possible
        if (this.attemptCycleBreaking(runtimeCycleDetection)) {
          logger.info('Successfully broke cycle, continuing execution');
        } else {
          break;
        }
      }
      
      this.executionPath.push(node.id);
      
      // ENHANCED: Limit execution path length to prevent memory exhaustion
      if (this.executionPath.length > this.options.maxCircularDepth * 10) {
        this.executionPath = this.executionPath.slice(-this.options.maxCircularDepth);
        logger.warn('Trimmed execution path to prevent memory exhaustion');
      }
      // Don't increment here - it's already done in executeNode
      
      // Vérifier si nous sommes bloqués dans une boucle infinie
      if (executed.size === lastExecutedSize) {
        stuckCounter++;
        if (stuckCounter > MAX_STUCK_ITERATIONS) {
          logger.error('Execution stuck in infinite loop, breaking to prevent DoS');
          errors.push({ 
            nodeId: 'system', 
            error: 'Execution halted due to potential infinite loop (circular dependencies)',
            timestamp: new Date().toISOString()
          });
          break;
        }
      } else {
        stuckCounter = 0;
        lastExecutedSize = executed.size;
      }
      
      // This check is now handled in the atomic operation above
      
      try {
        logger.info(`▶️ Executing node: ${node.data.label} (${node.id})`);
        onNodeStart(node.id);
        
        // Obtenir les données d'entrée des nœuds précédents
        
        if (incomingEdges.length > 0) {
          // Check if all source nodes have been executed
          if (!allSourcesExecuted) {
            // Skip this node for now, it will be re-added when all sources are ready
            continue;
          }
          
          // WORKFLOW EXECUTION EDGE CASE FIX: Use enhanced data combination with conflict resolution
          nodeInputData = this.combineNodeData(incomingEdges, results, inputData);
        }
        
        // RACE CONDITION FIX: Execute node with concurrency tracking
        // Replace the placeholder promise with the actual execution
        executionPromises.set(node.id, executionPromise);
        
        
        // ATOMIC OPERATION: Update results and cleanup tracking atomically
        try {
          // Check and update results atomically
          if (!results[node.id] || !results[node.id].timestamp || 
              !result.timestamp || results[node.id].timestamp <= result.timestamp) {
            results[node.id] = result;
          } else {
            logger.warn(`Ignoring older result for node ${node.id}`);
          }
          
          // Cleanup execution tracking atomically
          executionPromises.delete(node.id);
          concurrentExecutions = Math.max(0, concurrentExecutions - 1);
        } finally {
          releaseResultLock();
        }

        if (result.status === 'error') {
          logger.error(`❌ Node returned error: ${node.data.label}`, result.error);
          errors.push({ nodeId: node.id, error: result.error || 'Unknown error', timestamp: new Date().toISOString() });
          onNodeError(node.id, errorObj);
          
          // ATOMIC OPERATION: Add to executed set atomically
          try {
            executed.add(node.id);
          } finally {
            releaseExecutedLock();
          }

          for (const { node: nextNode, edge } of errorEdges) {
            if (nextNode && !executed.has(nextNode.id) && this.edgeConditionMet(edge, result)) {
              executionQueue.push({ node: nextNode, inputData: { error: result.error } });
            }
          }

          // BUSINESS LOGIC FIX: Stop execution if continueOnFail is false, regardless of error edges
          if (!node.data.config?.continueOnFail) {
            logger.info(`🛑 Stopping execution due to error in ${node.data.label} (continueOnFail=false)`);
            break;
          }
          continue;
        }

        logger.info(`✅ Node completed: ${node.data.label}`, result);
        onNodeComplete(node.id, nodeInputData, result);
        
        // ATOMIC OPERATION: Add to executed set atomically
        try {
          executed.add(node.id);
        } finally {
          releaseExecutedSuccessLock();
        }

        // Gérer les nœuds suivants

        if (result.status === 'success' && node.data.type === 'condition' && result.data?.branch) {
          // Pour les conditions, utiliser la branche spécifique
          nextNodes = this.getNextNodes(node.id, result.data.branch);
        } else if (result.status === 'success') {
          // Pour les autres nœuds, prendre toutes les sorties
          nextNodes = this.getNextNodes(node.id);
        } else if (result.status === 'error') {
          // Pour les erreurs, utiliser les edges d'erreur
          nextNodes = this.getNextNodes(node.id, 'error');
        }

        // Ajouter les nœuds suivants à la queue
        for (const { node: nextNode, edge } of nextNodes) {
          // BUSINESS LOGIC FIX: Ensure consistent data structure for edge condition evaluation
          let conditionData, nodeInputData;
          
          if (result.status === 'error') {
            conditionData = { error: result.error, status: 'error' };
            nodeInputData = { error: result.error };
          } else {
            conditionData = result.data || result;
            nodeInputData = result.data || {};
          }
          
          if (nextNode && !executed.has(nextNode.id) && this.edgeConditionMet(edge, conditionData)) {
            executionQueue.push({
              node: nextNode,
              inputData: nodeInputData
            });
          }
        }
        
      } catch (error: unknown) {
        logger.error(`❌ Node failed: ${node.data.label}`, error);
        
        // ATOMIC OPERATION: Cleanup execution tracking on error atomically
        try {
          if (executionPromises.has(node.id)) {
            executionPromises.delete(node.id);
            concurrentExecutions = Math.max(0, concurrentExecutions - 1);
          }
        } finally {
          releaseErrorCleanupLock();
        }
        
        errors.push({ 
          nodeId: node.id, 
          error: errorMessage,
          timestamp: new Date().toISOString()
        });
        onNodeError(node.id, errorObj);
        
        // ERROR RECOVERY FIX: Attempt recovery for recoverable errors
        if (this.isRecoverableError && this.isRecoverableError(error) && this.executionState.recoveryAttempts < this.options.maxRecoveryAttempts) {
          logger.info(`🔄 Attempting recovery for node ${node.data.label} (attempt ${this.executionState.recoveryAttempts + 1})`);
          this.executionState.recoveryAttempts++;
          this.executionState.isRecovering = true;
          
          // Wait and retry the node
          await new Promise(resolve => setTimeout(resolve, 2000 * this.executionState.recoveryAttempts));
          
          // Don't add to executed set, retry immediately
          executionQueue.unshift({ node, inputData }); // Add to front of queue for immediate retry
          continue;
        }
        
        executed.add(node.id);
        this.executionState.isRecovering = false;
        this.executionState.recoveryAttempts = 0;
        
        for (const { node: nextNode, edge } of errorEdges) {
          if (nextNode && !executed.has(nextNode.id) && this.edgeConditionMet(edge, { error: errorMessage })) {
            executionQueue.push({ node: nextNode, inputData: { error: errorMessage } });
          }
        }

        if (!node.data.config?.continueOnFail && errorEdges.length === 0) {
          break;
        }
      }
    }
    
    
    logger.info(`🏁 Workflow execution completed: ${status} in ${duration}ms`);
    
    // WORKFLOW EXECUTION EDGE CASE FIX: Include comprehensive execution diagnostics
    
    // Format errors for backward compatibility
      nodeId: e.nodeId,
      error: e.error,
      timestamp: e.timestamp
    }));
    
    return {
      executionId,
      status,
      duration,
      nodesExecuted: executed.size,
      errors: formattedErrors,
      results,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      recoveryAttempts: this.executionState.recoveryAttempts,
      checkpointsUsed: this.executionState.lastCheckpoint ? 1 : 0,
      // Enhanced diagnostics
      diagnostics,
      resourceUsage: {
        memoryUsageMB: this.executionState.memoryUsage,
        maxMemoryUsageMB: this.executionState.maxMemoryUsage,
        nodeExecutionCount: this.executionState.nodeExecutionCount
      },
      healthScore: diagnostics.healthScore,
      warnings: diagnostics.warnings,
      executionPath: [...this.executionState.executionPath]
    };
  }
  
  // ERROR RECOVERY FIX: Error classification for better recovery strategies
  private classifyError(error: unknown): string {
    
    if (message.includes('timeout')) return 'TIMEOUT';
    if (message.includes('network') || message.includes('connection')) return 'NETWORK';
    if (message.includes('rate limit') || message.includes('quota')) return 'RATE_LIMIT';
    if (message.includes('auth') || message.includes('unauthorized')) return 'AUTH';
    if (message.includes('not found') || message.includes('404')) return 'NOT_FOUND';
    if (message.includes('memory') || message.includes('resource')) return 'RESOURCE';
    
    return 'UNKNOWN';
  }
  
  // ERROR RECOVERY FIX: Determine if error is recoverable
  private isRecoverableError(error: unknown): boolean {
    return recoverableTypes.includes(errorType);
  }
  
  // ERROR RECOVERY FIX: Create execution checkpoint
  private createCheckpoint(executedNodes: Set<string>, results: Record<string, ExecutionResult>): Checkpoint {
    return {
      timestamp: new Date().toISOString(),
      executedNodes: Array.from(executedNodes),
      results: { ...results },
      nodeCount: executedNodes.size
    };
  }
  
  // ERROR RECOVERY FIX: Restore from checkpoint
  private restoreFromCheckpoint(checkpoint: Checkpoint): { executed: Set<string>; results: Record<string, ExecutionResult> } {
    logger.info(`🔄 Restoring execution from checkpoint with ${(checkpoint as Record<string, unknown>).nodeCount || checkpoint.executedNodes.size} completed nodes`);
    return {
      executed: new Set(checkpoint.executedNodes),
      results: checkpoint.results
    };
  }
}