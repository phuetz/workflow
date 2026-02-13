/**
 * Workflow Generator
 * Converts structured intents into executable workflow graphs
 */

import {
  Intent,
  WorkflowGenerationResult,
  ActionIntent,
  TriggerIntent,
  ConditionIntent,
  WorkflowValidationResult
} from '../types/nlp';
import { WorkflowNode, WorkflowEdge, Position } from '../types/workflow';
import { nodeTypes } from '../data/nodeTypes';
import { logger } from '../services/SimpleLogger';

export class WorkflowGenerator {
  private nodeIdCounter = 0;
  private edgeIdCounter = 0;
  private readonly nodeSpacing = { x: 300, y: 150 };
  private readonly startPosition = { x: 100, y: 100 };

  /**
   * Generate workflow from intent
   */
  async generate(intent: Intent): Promise<WorkflowGenerationResult> {
    const startTime = Date.now();

    try {
      logger.info('Generating workflow from intent', {
        type: intent.type,
        actionsCount: intent.actions.length
      });

      // Reset counters
      this.nodeIdCounter = 0;
      this.edgeIdCounter = 0;

      const nodes: WorkflowNode[] = [];
      const edges: WorkflowEdge[] = [];
      const warnings: string[] = [];
      const missingParameters: string[] = [];

      // 1. Create trigger node
      if (intent.trigger) {
        const triggerNode = this.createTriggerNode(intent.trigger);
        nodes.push(triggerNode);
      } else {
        warnings.push('No trigger specified, using manual trigger');
        nodes.push(this.createDefaultTriggerNode());
      }

      // 2. Create condition/filter nodes if present
      let previousNodeId = nodes[0].id;
      if (intent.conditions && intent.conditions.length > 0) {
        const conditionNode = this.createConditionNode(
          intent.conditions,
          this.calculatePosition(nodes.length)
        );
        nodes.push(conditionNode);
        edges.push(this.createEdge(previousNodeId, conditionNode.id));
        previousNodeId = conditionNode.id;
      }

      // 3. Create action nodes
      intent.actions.forEach((action, index) => {
        const actionNode = this.createActionNode(
          action,
          this.calculatePosition(nodes.length),
          index
        );
        nodes.push(actionNode);
        edges.push(this.createEdge(previousNodeId, actionNode.id));
        previousNodeId = actionNode.id;

        // Check for missing parameters
        const missing = this.checkMissingParameters(actionNode);
        missingParameters.push(...missing);
      });

      // 4. Validate generated workflow
      const validation = this.validateWorkflow(nodes, edges);

      // 5. Apply auto-layout if needed
      this.applyAutoLayout(nodes);

      const result: WorkflowGenerationResult = {
        success: validation.valid || validation.warnings.length === 0,
        nodes,
        edges,
        intent,
        confidence: intent.confidence,
        warnings: [...warnings, ...validation.warnings],
        suggestions: this.generateSuggestions(intent, nodes),
        missingParameters: missingParameters.length > 0 ? missingParameters : undefined
      };

      logger.info('Workflow generation complete', {
        nodesCreated: nodes.length,
        edgesCreated: edges.length,
        processingTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      logger.error('Workflow generation failed:', error);
      return {
        success: false,
        nodes: [],
        edges: [],
        intent,
        confidence: 0,
        warnings: [`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Create trigger node from intent
   */
  private createTriggerNode(trigger: TriggerIntent): WorkflowNode {
    const position = this.startPosition;
    const nodeId = this.generateNodeId();

    // Map trigger type to node type
    const typeMapping: Record<string, string> = {
      schedule: 'schedule',
      webhook: 'webhook',
      watch: 'fileWatcher',
      email: 'emailTrigger',
      database: 'databaseTrigger',
      manual: 'manualTrigger'
    };

    const nodeType = typeMapping[trigger.type] || 'manualTrigger';
    const nodeTypeInfo = nodeTypes[nodeType];

    if (!nodeTypeInfo) {
      throw new Error(`Unknown trigger type: ${nodeType}`);
    }

    const config: Record<string, unknown> = {};

    // Add type-specific configuration
    if (trigger.type === 'schedule' && trigger.schedule) {
      config.schedule = trigger.schedule;
      config.enabled = true;
    } else if (trigger.type === 'webhook' && trigger.webhookPath) {
      config.path = trigger.webhookPath;
      config.method = 'POST';
    } else if (trigger.type === 'watch' && trigger.source) {
      config.source = trigger.source;
      config.interval = 60000; // 1 minute default
    }

    return {
      id: nodeId,
      type: nodeType,
      position,
      data: {
        id: nodeId,
        type: nodeType,
        label: nodeTypeInfo.label,
        position,
        icon: nodeTypeInfo.icon,
        color: nodeTypeInfo.color,
        inputs: nodeTypeInfo.inputs,
        outputs: nodeTypeInfo.outputs,
        config
      }
    };
  }

  /**
   * Create default manual trigger node
   */
  private createDefaultTriggerNode(): WorkflowNode {
    const nodeId = this.generateNodeId();
    const nodeTypeInfo = nodeTypes['manualTrigger'];

    return {
      id: nodeId,
      type: 'manualTrigger',
      position: this.startPosition,
      data: {
        id: nodeId,
        type: 'manualTrigger',
        label: nodeTypeInfo.label,
        position: this.startPosition,
        icon: nodeTypeInfo.icon,
        color: nodeTypeInfo.color,
        inputs: nodeTypeInfo.inputs,
        outputs: nodeTypeInfo.outputs,
        config: {}
      }
    };
  }

  /**
   * Create condition/filter node
   */
  private createConditionNode(
    conditions: ConditionIntent[],
    position: Position
  ): WorkflowNode {
    const nodeId = this.generateNodeId();
    const nodeTypeInfo = nodeTypes['filter'];

    const filterRules = conditions.map(cond => ({
      field: cond.field,
      operator: cond.operator,
      value: cond.value
    }));

    return {
      id: nodeId,
      type: 'filter',
      position,
      data: {
        id: nodeId,
        type: 'filter',
        label: 'Filter',
        position,
        icon: nodeTypeInfo.icon,
        color: nodeTypeInfo.color,
        inputs: nodeTypeInfo.inputs,
        outputs: nodeTypeInfo.outputs,
        config: {
          rules: filterRules,
          mode: 'all' // All conditions must match
        }
      }
    };
  }

  /**
   * Create action node
   */
  private createActionNode(
    action: ActionIntent,
    position: Position,
    index: number
  ): WorkflowNode {
    const nodeId = this.generateNodeId();

    // Determine node type from action
    const nodeType = action.nodeType || this.inferNodeType(action);
    const nodeTypeInfo = nodeTypes[nodeType];

    if (!nodeTypeInfo) {
      throw new Error(`Unknown node type: ${nodeType}`);
    }

    const config = this.buildActionConfig(action);

    // Generate label
    let label = nodeTypeInfo.label;
    if (action.service) {
      label = `${action.service} - ${action.type}`;
    } else if (index > 0) {
      label = `${nodeTypeInfo.label} ${index + 1}`;
    }

    return {
      id: nodeId,
      type: nodeType,
      position,
      data: {
        id: nodeId,
        type: nodeType,
        label,
        position,
        icon: nodeTypeInfo.icon,
        color: nodeTypeInfo.color,
        inputs: nodeTypeInfo.inputs,
        outputs: nodeTypeInfo.outputs,
        config
      }
    };
  }

  /**
   * Infer node type from action intent
   */
  private inferNodeType(action: ActionIntent): string {
    // Service-based mapping
    if (action.service) {
      const service = action.service.toLowerCase();
      const serviceMap: Record<string, string> = {
        'slack': 'slack',
        'email': 'email',
        'gmail': 'gmail',
        'discord': 'discord',
        'teams': 'teams',
        'telegram': 'telegram',
        'sms': 'twilio',
        'twilio': 'twilio',
        'postgres': 'postgres',
        'postgresql': 'postgres',
        'mysql': 'mysql',
        'mongodb': 'mongodb',
        'redis': 'redis',
        'database': 'postgres',
        'openai': 'openai',
        'anthropic': 'anthropic',
        'ai': 'openai',
        's3': 'awsS3',
        'aws': 'awsLambda',
        'http': 'httpRequest',
        'api': 'httpRequest'
      };

      if (serviceMap[service]) {
        return serviceMap[service];
      }
    }

    // Action type-based mapping
    const actionMap: Record<string, string> = {
      'fetch': 'httpRequest',
      'post': 'httpRequest',
      'transform': 'transform',
      'filter': 'filter',
      'aggregate': 'aggregate',
      'notify': 'slack',
      'email': 'email',
      'save': 'postgres',
      'execute': 'code',
      'log': 'log',
      'enrich': 'httpRequest',
      'validate': 'validate',
      'analyze': 'openai',
      'summarize': 'openai',
      'forward': 'httpRequest',
      'store': 'postgres',
      'process': 'transform'
    };

    return actionMap[action.type] || 'transform';
  }

  /**
   * Build configuration for action node
   */
  private buildActionConfig(action: ActionIntent): Record<string, unknown> {
    const config: Record<string, unknown> = {};

    // Add explicit parameters
    if (action.parameters) {
      Object.assign(config, action.parameters);
    }

    // Add service-specific defaults
    if (action.service === 'slack' || action.type === 'notify') {
      config.channel = config.channel || '#general';
      config.message = config.message || '{{ $json }}';
    } else if (action.type === 'email') {
      config.to = config.to || '';
      config.subject = config.subject || 'Workflow Notification';
      config.body = config.body || '{{ $json }}';
    } else if (action.type === 'fetch' || action.type === 'post') {
      config.url = config.url || '';
      config.method = action.type === 'fetch' ? 'GET' : 'POST';
      config.headers = config.headers || {};
    } else if (action.type === 'save' || action.type === 'store') {
      config.table = config.table || 'data';
      config.operation = 'insert';
    } else if (action.type === 'transform') {
      config.mode = 'jsonata';
      config.expression = config.expression || '$';
    } else if (action.type === 'summarize' || action.type === 'analyze') {
      config.model = 'gpt-4';
      config.prompt = config.prompt || 'Summarize the following: {{ $json }}';
    }

    return config;
  }

  /**
   * Create edge between nodes
   */
  private createEdge(sourceId: string, targetId: string): WorkflowEdge {
    return {
      id: this.generateEdgeId(),
      source: sourceId,
      target: targetId,
      animated: true,
      style: {
        strokeWidth: 2
      }
    };
  }

  /**
   * Calculate position for node
   */
  private calculatePosition(index: number): Position {
    return {
      x: this.startPosition.x + (index * this.nodeSpacing.x),
      y: this.startPosition.y
    };
  }

  /**
   * Apply auto-layout to nodes
   */
  private applyAutoLayout(nodes: WorkflowNode[]): void {
    // Simple horizontal layout
    nodes.forEach((node, index) => {
      node.position = {
        x: this.startPosition.x + (index * this.nodeSpacing.x),
        y: this.startPosition.y
      };
    });
  }

  /**
   * Validate generated workflow
   */
  private validateWorkflow(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): WorkflowValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check minimum nodes
    if (nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    // Check trigger node
    const triggerNode = nodes[0];
    if (triggerNode && triggerNode.data.inputs > 0) {
      warnings.push('First node should be a trigger with 0 inputs');
    }

    // Check for disconnected nodes
    const connectedNodes = new Set<string>();
    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    nodes.forEach(node => {
      if (!connectedNodes.has(node.id) && nodes.length > 1) {
        warnings.push(`Node "${node.data.label}" is disconnected`);
      }
    });

    // Check for missing configurations
    nodes.forEach(node => {
      if (!node.data.config || Object.keys(node.data.config).length === 0) {
        warnings.push(`Node "${node.data.label}" has no configuration`);
      }
    });

    const completeness = 1 - (errors.length * 0.3 + warnings.length * 0.1);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      completeness: Math.max(0, Math.min(1, completeness)),
      readyForExecution: errors.length === 0 && warnings.length < 3
    };
  }

  /**
   * Check for missing parameters in node
   */
  private checkMissingParameters(node: WorkflowNode): string[] {
    const missing: string[] = [];
    const config = node.data.config || {};

    // Check node-type specific required parameters
    const requiredParams: Record<string, string[]> = {
      'slack': ['channel'],
      'email': ['to', 'subject'],
      'httpRequest': ['url'],
      'postgres': ['query'],
      'mysql': ['query'],
      'mongodb': ['operation'],
      'openai': ['prompt'],
      'anthropic': ['prompt'],
      'awsS3': ['bucket', 'key'],
      'schedule': ['schedule']
    };

    const required = requiredParams[node.type] || [];
    required.forEach(param => {
      if (!config[param] || config[param] === '') {
        missing.push(`${node.data.label}: missing "${param}"`);
      }
    });

    return missing;
  }

  /**
   * Generate suggestions for improvement
   */
  private generateSuggestions(intent: Intent, nodes: WorkflowNode[]): string[] {
    const suggestions: string[] = [];

    // Suggest error handling
    const hasErrorHandling = nodes.some(n =>
      n.type === 'tryCatch' || n.type === 'errorWorkflow'
    );
    if (!hasErrorHandling && nodes.length > 2) {
      suggestions.push('Consider adding error handling with a Try-Catch node');
    }

    // Suggest logging for complex workflows
    const hasLogging = nodes.some(n => n.type === 'log');
    if (!hasLogging && nodes.length > 4) {
      suggestions.push('Add logging nodes to track execution progress');
    }

    // Suggest data validation
    const hasValidation = nodes.some(n =>
      n.type === 'validate' || n.type === 'filter'
    );
    if (!hasValidation && intent.actions.some(a => a.type === 'save')) {
      suggestions.push('Add data validation before saving to database');
    }

    // Suggest optimization
    if (nodes.length > 10) {
      suggestions.push('Consider breaking this into sub-workflows for better maintainability');
    }

    return suggestions;
  }

  /**
   * Generate unique node ID
   */
  private generateNodeId(): string {
    return `node_${Date.now()}_${this.nodeIdCounter++}`;
  }

  /**
   * Generate unique edge ID
   */
  private generateEdgeId(): string {
    return `edge_${Date.now()}_${this.edgeIdCounter++}`;
  }
}
