/**
 * AI Workflow Copilot
 * Natural language workflow builder with AI-powered suggestions
 */

import { EventEmitter } from 'events';

// Types
export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface GeneratedWorkflow {
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  suggestedImprovements?: string[];
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    workflow?: GeneratedWorkflow;
    suggestions?: string[];
    nodeRecommendations?: NodeRecommendation[];
  };
}

export interface NodeRecommendation {
  nodeType: string;
  reason: string;
  confidence: number;
  suggestedConfig?: Record<string, unknown>;
}

export interface Suggestion {
  type: string;
  message: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  action?: {
    type: string;
    nodeType?: string;
    nodeTypes?: string[];
    position?: string;
    setting?: string;
    value?: unknown;
    pattern?: string;
  };
}

export interface CopilotConfig {
  provider: 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface IntentClassification {
  intent: 'create_workflow' | 'modify_workflow' | 'debug' | 'explain' | 'optimize' | 'question' | 'unknown';
  confidence: number;
  entities: Record<string, string>;
}

// Node Library for workflow generation
const NODE_LIBRARY: Record<string, { description: string; category: string; inputs: string[]; outputs: string[] }> = {
  'webhook': { description: 'Receive HTTP requests', category: 'trigger', inputs: [], outputs: ['data'] },
  'schedule': { description: 'Run on a schedule', category: 'trigger', inputs: [], outputs: ['timestamp'] },
  'http_request': { description: 'Make HTTP requests', category: 'action', inputs: ['url', 'method'], outputs: ['response'] },
  'email': { description: 'Send emails', category: 'action', inputs: ['to', 'subject', 'body'], outputs: ['sent'] },
  'slack': { description: 'Send Slack messages', category: 'action', inputs: ['channel', 'message'], outputs: ['sent'] },
  'filter': { description: 'Filter data based on conditions', category: 'transform', inputs: ['data', 'condition'], outputs: ['filtered'] },
  'transform': { description: 'Transform data', category: 'transform', inputs: ['data', 'mapping'], outputs: ['transformed'] },
  'code': { description: 'Execute custom code', category: 'action', inputs: ['code', 'data'], outputs: ['result'] },
  'database': { description: 'Query databases', category: 'action', inputs: ['query'], outputs: ['results'] },
  'ai_completion': { description: 'Generate AI completions', category: 'ai', inputs: ['prompt'], outputs: ['completion'] },
  'condition': { description: 'Branch based on conditions', category: 'flow', inputs: ['condition'], outputs: ['true', 'false'] },
  'loop': { description: 'Iterate over items', category: 'flow', inputs: ['items'], outputs: ['item', 'done'] },
  'merge': { description: 'Merge multiple inputs', category: 'flow', inputs: ['input1', 'input2'], outputs: ['merged'] },
  'delay': { description: 'Wait for a specified time', category: 'flow', inputs: ['duration'], outputs: ['continued'] },
};

/**
 * AI Copilot - Natural language workflow builder
 */
export class AICopilot extends EventEmitter {
  private config: CopilotConfig;
  private conversationHistory: CopilotMessage[] = [];
  private currentWorkflow: GeneratedWorkflow | null = null;

  constructor(config: CopilotConfig) {
    super();
    this.config = {
      provider: config.provider || 'anthropic',
      model: config.model || 'claude-3-sonnet-20240229',
      maxTokens: config.maxTokens || 4096,
      temperature: config.temperature || 0.7,
      ...config,
    };
  }

  /**
   * Process user message and generate response
   */
  async chat(userMessage: string): Promise<CopilotMessage> {
    const userMsg: CopilotMessage = {
      id: this.generateId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    this.conversationHistory.push(userMsg);

    // Classify intent
    const intent = await this.classifyIntent(userMessage);
    this.emit('intent:classified', intent);

    let response: CopilotMessage;

    switch (intent.intent) {
      case 'create_workflow':
        response = await this.handleCreateWorkflow(userMessage, intent);
        break;
      case 'modify_workflow':
        response = await this.handleModifyWorkflow(userMessage, intent);
        break;
      case 'debug':
        response = await this.handleDebug(userMessage, intent);
        break;
      case 'explain':
        response = await this.handleExplain(userMessage, intent);
        break;
      case 'optimize':
        response = await this.handleOptimize(userMessage, intent);
        break;
      case 'question':
        response = await this.handleQuestion(userMessage, intent);
        break;
      default:
        response = await this.handleGenericMessage(userMessage);
    }

    this.conversationHistory.push(response);
    this.emit('message', response);
    return response;
  }

  /**
   * Classify user intent using pattern matching and keywords
   */
  private async classifyIntent(message: string): Promise<IntentClassification> {
    const lowerMessage = message.toLowerCase();
    const entities: Record<string, string> = {};

    // Extract entities
    const triggerMatch = lowerMessage.match(/(?:when|on|every|at)\s+(.+?)(?:\s+(?:then|do|send|create)|$)/);
    if (triggerMatch) {
      entities.trigger = triggerMatch[1];
    }

    const actionMatch = lowerMessage.match(/(?:send|create|update|delete|fetch|get|post)\s+(?:a\s+)?(.+?)(?:\s+to|\s+from|$)/);
    if (actionMatch) {
      entities.action = actionMatch[1];
    }

    // Classify intent
    if (/(?:create|build|make|generate|design)\s+(?:a\s+)?(?:new\s+)?workflow/i.test(message) ||
        /(?:i want|i need|help me)\s+(?:to\s+)?(?:automate|create|build)/i.test(message)) {
      return { intent: 'create_workflow', confidence: 0.9, entities };
    }

    if (/(?:add|remove|change|modify|update|edit)\s+(?:a\s+)?(?:node|step|action)/i.test(message) ||
        /(?:connect|link|wire)\s+(?:the\s+)?/i.test(message)) {
      return { intent: 'modify_workflow', confidence: 0.85, entities };
    }

    if (/(?:debug|fix|error|issue|problem|not working|failing)/i.test(message)) {
      return { intent: 'debug', confidence: 0.9, entities };
    }

    if (/(?:explain|what does|how does|describe|tell me about)/i.test(message)) {
      return { intent: 'explain', confidence: 0.85, entities };
    }

    if (/(?:optimize|improve|faster|better|performance|efficient)/i.test(message)) {
      return { intent: 'optimize', confidence: 0.85, entities };
    }

    if (/(?:can i|how do i|is it possible|what if|\?$)/i.test(message)) {
      return { intent: 'question', confidence: 0.7, entities };
    }

    return { intent: 'unknown', confidence: 0.5, entities };
  }

  /**
   * Handle workflow creation request
   */
  private async handleCreateWorkflow(message: string, intent: IntentClassification): Promise<CopilotMessage> {
    const workflow = await this.generateWorkflowFromDescription(message);
    this.currentWorkflow = workflow;

    const response: CopilotMessage = {
      id: this.generateId(),
      role: 'assistant',
      content: this.formatWorkflowResponse(workflow),
      timestamp: new Date(),
      metadata: {
        workflow,
        suggestions: workflow.suggestedImprovements,
      },
    };

    this.emit('workflow:generated', workflow);
    return response;
  }

  /**
   * Generate workflow from natural language description
   */
  async generateWorkflowFromDescription(description: string): Promise<GeneratedWorkflow> {
    const lowerDesc = description.toLowerCase();
    const nodes: WorkflowNode[] = [];
    const edges: WorkflowEdge[] = [];
    let nodeIndex = 0;

    // Detect trigger
    let triggerType = 'webhook';
    if (/every\s+(?:day|hour|minute|week|month)|schedule|cron|daily|hourly/i.test(lowerDesc)) {
      triggerType = 'schedule';
    }

    // Add trigger node
    const triggerId = `node_${nodeIndex++}`;
    nodes.push({
      id: triggerId,
      type: triggerType,
      position: { x: 100, y: 200 },
      data: {
        label: triggerType === 'schedule' ? 'Schedule Trigger' : 'Webhook Trigger',
      },
    });

    let lastNodeId = triggerId;

    // Detect HTTP request needs
    if (/fetch|get|post|api|request|call\s+(?:an?\s+)?(?:api|endpoint|url)/i.test(lowerDesc)) {
      const httpId = `node_${nodeIndex++}`;
      nodes.push({
        id: httpId,
        type: 'http_request',
        position: { x: 300, y: 200 },
        data: {
          label: 'HTTP Request',
          method: /post/i.test(lowerDesc) ? 'POST' : 'GET',
        },
      });
      edges.push({ id: `edge_${lastNodeId}_${httpId}`, source: lastNodeId, target: httpId });
      lastNodeId = httpId;
    }

    // Detect filter/condition needs
    if (/filter|if|when|condition|only|where/i.test(lowerDesc)) {
      const filterId = `node_${nodeIndex++}`;
      nodes.push({
        id: filterId,
        type: 'filter',
        position: { x: 500, y: 200 },
        data: {
          label: 'Filter',
        },
      });
      edges.push({ id: `edge_${lastNodeId}_${filterId}`, source: lastNodeId, target: filterId });
      lastNodeId = filterId;
    }

    // Detect transformation needs
    if (/transform|convert|map|format|parse/i.test(lowerDesc)) {
      const transformId = `node_${nodeIndex++}`;
      nodes.push({
        id: transformId,
        type: 'transform',
        position: { x: 700, y: 200 },
        data: {
          label: 'Transform',
        },
      });
      edges.push({ id: `edge_${lastNodeId}_${transformId}`, source: lastNodeId, target: transformId });
      lastNodeId = transformId;
    }

    // Detect output/notification type
    if (/email|mail|send\s+(?:an?\s+)?email/i.test(lowerDesc)) {
      const emailId = `node_${nodeIndex++}`;
      nodes.push({
        id: emailId,
        type: 'email',
        position: { x: 900, y: 200 },
        data: {
          label: 'Send Email',
        },
      });
      edges.push({ id: `edge_${lastNodeId}_${emailId}`, source: lastNodeId, target: emailId });
      lastNodeId = emailId;
    }

    if (/slack|message\s+(?:on\s+)?slack/i.test(lowerDesc)) {
      const slackId = `node_${nodeIndex++}`;
      nodes.push({
        id: slackId,
        type: 'slack',
        position: { x: 900, y: 350 },
        data: {
          label: 'Send Slack Message',
        },
      });
      edges.push({ id: `edge_${lastNodeId}_${slackId}`, source: lastNodeId, target: slackId });
    }

    if (/database|db|save|store|insert/i.test(lowerDesc)) {
      const dbId = `node_${nodeIndex++}`;
      nodes.push({
        id: dbId,
        type: 'database',
        position: { x: 900, y: 50 },
        data: {
          label: 'Database',
        },
      });
      edges.push({ id: `edge_${lastNodeId}_${dbId}`, source: lastNodeId, target: dbId });
    }

    // Generate suggestions
    const suggestions: string[] = [];
    if (!nodes.some(n => n.type === 'condition')) {
      suggestions.push('Consider adding error handling with a condition node');
    }
    if (nodes.length > 5 && !nodes.some(n => n.type === 'code')) {
      suggestions.push('For complex logic, a code node might simplify the workflow');
    }

    return {
      name: this.generateWorkflowName(description),
      description: description,
      nodes,
      edges,
      suggestedImprovements: suggestions,
    };
  }

  /**
   * Handle workflow modification request
   */
  private async handleModifyWorkflow(message: string, intent: IntentClassification): Promise<CopilotMessage> {
    if (!this.currentWorkflow) {
      return {
        id: this.generateId(),
        role: 'assistant',
        content: "I don't have a current workflow to modify. Would you like to create a new workflow first, or load an existing one?",
        timestamp: new Date(),
      };
    }

    const modifications = this.parseModificationRequest(message);
    const updatedWorkflow = this.applyModifications(this.currentWorkflow, modifications);
    this.currentWorkflow = updatedWorkflow;

    return {
      id: this.generateId(),
      role: 'assistant',
      content: `I've updated the workflow:\n\n${modifications.map(m => `- ${m.action}: ${m.description}`).join('\n')}\n\nThe workflow now has ${updatedWorkflow.nodes.length} nodes and ${updatedWorkflow.edges.length} connections.`,
      timestamp: new Date(),
      metadata: { workflow: updatedWorkflow },
    };
  }

  /**
   * Parse modification request
   */
  private parseModificationRequest(message: string): Array<{ action: string; description: string; nodeType?: string }> {
    const modifications: Array<{ action: string; description: string; nodeType?: string }> = [];
    const lowerMessage = message.toLowerCase();

    if (/add\s+(?:a\s+)?(.+?)\s+node/i.test(message)) {
      const match = message.match(/add\s+(?:a\s+)?(.+?)\s+node/i);
      if (match) {
        modifications.push({
          action: 'add',
          description: `Added ${match[1]} node`,
          nodeType: match[1].toLowerCase().replace(/\s+/g, '_'),
        });
      }
    }

    if (/remove\s+(?:the\s+)?(.+?)\s+node/i.test(message)) {
      const match = message.match(/remove\s+(?:the\s+)?(.+?)\s+node/i);
      if (match) {
        modifications.push({
          action: 'remove',
          description: `Removed ${match[1]} node`,
          nodeType: match[1].toLowerCase().replace(/\s+/g, '_'),
        });
      }
    }

    if (modifications.length === 0 && lowerMessage.includes('add')) {
      modifications.push({
        action: 'add',
        description: 'Added new node based on context',
        nodeType: 'transform',
      });
    }

    return modifications;
  }

  /**
   * Apply modifications to workflow
   */
  private applyModifications(workflow: GeneratedWorkflow, modifications: Array<{ action: string; description: string; nodeType?: string }>): GeneratedWorkflow {
    const updatedWorkflow = { ...workflow, nodes: [...workflow.nodes], edges: [...workflow.edges] };

    for (const mod of modifications) {
      if (mod.action === 'add' && mod.nodeType) {
        const newId = `node_${Date.now()}`;
        const lastNode = updatedWorkflow.nodes[updatedWorkflow.nodes.length - 1];

        updatedWorkflow.nodes.push({
          id: newId,
          type: mod.nodeType,
          position: {
            x: lastNode ? lastNode.position.x + 200 : 100,
            y: lastNode ? lastNode.position.y : 200,
          },
          data: { label: mod.nodeType },
        });

        if (lastNode) {
          updatedWorkflow.edges.push({
            id: `edge_${lastNode.id}_${newId}`,
            source: lastNode.id,
            target: newId,
          });
        }
      }

      if (mod.action === 'remove' && mod.nodeType) {
        const nodeIndex = updatedWorkflow.nodes.findIndex(n => n.type === mod.nodeType);
        if (nodeIndex !== -1) {
          const nodeId = updatedWorkflow.nodes[nodeIndex].id;
          updatedWorkflow.nodes.splice(nodeIndex, 1);
          updatedWorkflow.edges = updatedWorkflow.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
        }
      }
    }

    return updatedWorkflow;
  }

  /**
   * Handle debug request
   */
  private async handleDebug(message: string, intent: IntentClassification): Promise<CopilotMessage> {
    const debugInfo = this.analyzeForDebug(message);

    return {
      id: this.generateId(),
      role: 'assistant',
      content: debugInfo.analysis,
      timestamp: new Date(),
      metadata: { suggestions: debugInfo.suggestions },
    };
  }

  /**
   * Analyze message for debugging hints
   */
  private analyzeForDebug(message: string): { analysis: string; suggestions: string[] } {
    const suggestions: string[] = [];
    let analysis = 'Based on your description, here are some debugging steps:\n\n';

    if (/timeout|slow|taking\s+too\s+long/i.test(message)) {
      analysis += '**Timeout Issues:**\n';
      suggestions.push('Check if external API calls have appropriate timeout settings');
      suggestions.push('Consider adding a delay node to rate-limit requests');
      suggestions.push('Review the execution logs for slow-running nodes');
    }

    if (/error|failed|exception/i.test(message)) {
      analysis += '**Error Handling:**\n';
      suggestions.push('Add error output branches to handle failures gracefully');
      suggestions.push('Check node configurations for missing required fields');
      suggestions.push('Verify credentials and API keys are valid');
    }

    if (/data|missing|empty|null/i.test(message)) {
      analysis += '**Data Issues:**\n';
      suggestions.push('Check input data format matches expected schema');
      suggestions.push('Add data validation nodes before processing');
      suggestions.push('Use pin data to test with sample inputs');
    }

    analysis += '\n' + suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n');

    return { analysis, suggestions };
  }

  /**
   * Handle explain request
   */
  private async handleExplain(message: string, intent: IntentClassification): Promise<CopilotMessage> {
    let explanation = '';

    // Explain node types
    for (const [nodeType, info] of Object.entries(NODE_LIBRARY)) {
      if (message.toLowerCase().includes(nodeType.replace('_', ' '))) {
        explanation += `**${nodeType.replace('_', ' ').toUpperCase()}**\n`;
        explanation += `${info.description}\n`;
        explanation += `Category: ${info.category}\n`;
        explanation += `Inputs: ${info.inputs.join(', ') || 'none'}\n`;
        explanation += `Outputs: ${info.outputs.join(', ')}\n\n`;
      }
    }

    if (!explanation && this.currentWorkflow) {
      explanation = `**Current Workflow: ${this.currentWorkflow.name}**\n\n`;
      explanation += `${this.currentWorkflow.description}\n\n`;
      explanation += `This workflow has ${this.currentWorkflow.nodes.length} nodes:\n`;
      for (const node of this.currentWorkflow.nodes) {
        explanation += `- ${node.type}: ${node.data.label || 'Unnamed'}\n`;
      }
    }

    if (!explanation) {
      explanation = "I can explain workflow concepts, node types, or the current workflow. What would you like to know more about?";
    }

    return {
      id: this.generateId(),
      role: 'assistant',
      content: explanation,
      timestamp: new Date(),
    };
  }

  /**
   * Handle optimize request
   */
  private async handleOptimize(message: string, intent: IntentClassification): Promise<CopilotMessage> {
    if (!this.currentWorkflow) {
      return {
        id: this.generateId(),
        role: 'assistant',
        content: "I don't have a workflow to optimize. Please create or load a workflow first.",
        timestamp: new Date(),
      };
    }

    const optimizations = this.analyzeWorkflowForOptimization(this.currentWorkflow);

    return {
      id: this.generateId(),
      role: 'assistant',
      content: `**Optimization Suggestions for "${this.currentWorkflow.name}":**\n\n${optimizations.join('\n\n')}`,
      timestamp: new Date(),
      metadata: { suggestions: optimizations },
    };
  }

  /**
   * Analyze workflow for optimization opportunities
   */
  private analyzeWorkflowForOptimization(workflow: GeneratedWorkflow): string[] {
    const suggestions: string[] = [];

    // Check for parallel execution opportunities
    const sequentialNodes = workflow.nodes.filter(node => {
      const incomingEdges = workflow.edges.filter(e => e.target === node.id);
      const outgoingEdges = workflow.edges.filter(e => e.source === node.id);
      return incomingEdges.length === 1 && outgoingEdges.length === 1;
    });

    if (sequentialNodes.length > 3) {
      suggestions.push('**Parallel Execution:** Consider running independent nodes in parallel using a Split node to improve execution speed.');
    }

    // Check for caching opportunities
    const httpNodes = workflow.nodes.filter(n => n.type === 'http_request');
    if (httpNodes.length > 1) {
      suggestions.push('**Caching:** Multiple HTTP requests detected. Consider adding a cache node to avoid redundant API calls.');
    }

    // Check for error handling
    const hasErrorHandling = workflow.nodes.some(n => n.type === 'condition' || n.type === 'try_catch');
    if (!hasErrorHandling) {
      suggestions.push('**Error Handling:** Add error handling nodes to gracefully manage failures and retry logic.');
    }

    // Check for batching
    const loopNodes = workflow.nodes.filter(n => n.type === 'loop');
    if (loopNodes.length > 0) {
      suggestions.push('**Batch Processing:** Consider using batch operations instead of loops for better performance with large datasets.');
    }

    if (suggestions.length === 0) {
      suggestions.push('This workflow looks well-optimized! No major improvements suggested.');
    }

    return suggestions;
  }

  /**
   * Handle general question
   */
  private async handleQuestion(message: string, intent: IntentClassification): Promise<CopilotMessage> {
    let answer = '';

    if (/what\s+(?:nodes|types|actions)\s+(?:are\s+)?available/i.test(message)) {
      answer = '**Available Node Types:**\n\n';
      const categories: Record<string, string[]> = {};

      for (const [nodeType, info] of Object.entries(NODE_LIBRARY)) {
        if (!categories[info.category]) {
          categories[info.category] = [];
        }
        categories[info.category].push(`${nodeType}: ${info.description}`);
      }

      for (const [category, nodes] of Object.entries(categories)) {
        answer += `**${category.toUpperCase()}**\n${nodes.map(n => `- ${n}`).join('\n')}\n\n`;
      }
    } else if (/how\s+(?:do\s+i|can\s+i|to)/i.test(message)) {
      answer = "Here's how you can work with the AI Copilot:\n\n";
      answer += "1. **Create a workflow**: Describe what you want to automate in natural language\n";
      answer += "2. **Modify a workflow**: Ask to add, remove, or change nodes\n";
      answer += "3. **Debug issues**: Describe the problem you're facing\n";
      answer += "4. **Optimize**: Ask for performance improvements\n";
      answer += "5. **Learn**: Ask about specific nodes or concepts\n\n";
      answer += "Try saying: 'Create a workflow that fetches data from an API and sends it to Slack'";
    } else {
      answer = "I can help you with:\n";
      answer += "- Creating new workflows from descriptions\n";
      answer += "- Modifying existing workflows\n";
      answer += "- Debugging workflow issues\n";
      answer += "- Optimizing workflow performance\n";
      answer += "- Explaining workflow concepts\n\n";
      answer += "What would you like to do?";
    }

    return {
      id: this.generateId(),
      role: 'assistant',
      content: answer,
      timestamp: new Date(),
    };
  }

  /**
   * Handle generic message
   */
  private async handleGenericMessage(message: string): Promise<CopilotMessage> {
    return {
      id: this.generateId(),
      role: 'assistant',
      content: "I understand you want to work with workflows. Could you please be more specific? For example:\n\n" +
        "- 'Create a workflow that...'\n" +
        "- 'Add a filter node to the workflow'\n" +
        "- 'Help me debug this error'\n" +
        "- 'How can I optimize my workflow?'",
      timestamp: new Date(),
    };
  }

  /**
   * Format workflow response for display
   */
  private formatWorkflowResponse(workflow: GeneratedWorkflow): string {
    let response = `I've created a workflow called **"${workflow.name}"**\n\n`;
    response += `**Description:** ${workflow.description}\n\n`;
    response += `**Nodes (${workflow.nodes.length}):**\n`;

    for (const node of workflow.nodes) {
      response += `- ${node.data.label || node.type}\n`;
    }

    response += `\n**Connections (${workflow.edges.length}):**\n`;
    for (const edge of workflow.edges) {
      const sourceNode = workflow.nodes.find(n => n.id === edge.source);
      const targetNode = workflow.nodes.find(n => n.id === edge.target);
      response += `- ${sourceNode?.data.label || sourceNode?.type} → ${targetNode?.data.label || targetNode?.type}\n`;
    }

    if (workflow.suggestedImprovements && workflow.suggestedImprovements.length > 0) {
      response += '\n**Suggestions:**\n';
      for (const suggestion of workflow.suggestedImprovements) {
        response += `- ${suggestion}\n`;
      }
    }

    response += '\nWould you like me to modify anything?';
    return response;
  }

  /**
   * Generate workflow name from description
   */
  private generateWorkflowName(description: string): string {
    const keywords = description.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter(w => w.length > 3 && !['that', 'this', 'with', 'from', 'when', 'then', 'have', 'want', 'need'].includes(w))
      .slice(0, 3);

    return keywords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Workflow';
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get conversation history
   */
  getHistory(): CopilotMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Get current workflow
   */
  getCurrentWorkflow(): GeneratedWorkflow | null {
    return this.currentWorkflow;
  }

  /**
   * Set current workflow (for loading existing)
   */
  setCurrentWorkflow(workflow: GeneratedWorkflow): void {
    this.currentWorkflow = workflow;
    this.emit('workflow:loaded', workflow);
  }

  /**
   * Clear conversation
   */
  clearConversation(): void {
    this.conversationHistory = [];
    this.currentWorkflow = null;
    this.emit('conversation:cleared');
  }

  // ============================================================================
  // Action Handlers - generateNode, explainWorkflow, suggestImprovements, autoConnect
  // ============================================================================

  /**
   * Generate a node from a natural language description
   * Parses the description to determine the node type and configuration
   */
  async generateNode(description: string): Promise<WorkflowNode> {
    // Parse the description to determine node type
    const nodeType = await this.classifyNodeType(description);

    // Generate node configuration based on type
    const config = await this.generateNodeConfig(nodeType, description);

    // Calculate position based on current workflow or default
    const position = this.calculateNodePosition();

    const node: WorkflowNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type: nodeType,
      position,
      data: {
        label: config.label,
        ...config.settings
      }
    };

    this.emit('node:generated', node);
    return node;
  }

  /**
   * Classify node type from natural language description
   */
  private async classifyNodeType(description: string): Promise<string> {
    const lowerDesc = description.toLowerCase();

    // Trigger types
    if (/webhook|http\s+trigger|receive\s+request/i.test(lowerDesc)) {
      return 'webhook';
    }
    if (/schedule|cron|every\s+(?:day|hour|minute|week)|daily|hourly/i.test(lowerDesc)) {
      return 'schedule';
    }
    if (/email\s+trigger|receive\s+email|incoming\s+email/i.test(lowerDesc)) {
      return 'email_trigger';
    }

    // Communication types
    if (/send\s+email|email|mail|smtp/i.test(lowerDesc)) {
      return 'email';
    }
    if (/slack|slack\s+message|post\s+to\s+slack/i.test(lowerDesc)) {
      return 'slack';
    }
    if (/discord|discord\s+message/i.test(lowerDesc)) {
      return 'discord';
    }
    if (/teams|microsoft\s+teams/i.test(lowerDesc)) {
      return 'teams';
    }
    if (/sms|text\s+message|twilio/i.test(lowerDesc)) {
      return 'sms';
    }

    // Data processing types
    if (/filter|condition|if|when|where/i.test(lowerDesc)) {
      return 'filter';
    }
    if (/transform|convert|map|format|parse/i.test(lowerDesc)) {
      return 'transform';
    }
    if (/merge|combine|join/i.test(lowerDesc)) {
      return 'merge';
    }
    if (/split|separate|divide/i.test(lowerDesc)) {
      return 'split';
    }
    if (/loop|iterate|for\s+each|repeat/i.test(lowerDesc)) {
      return 'loop';
    }

    // Integration types
    if (/http|api|request|fetch|get|post|put|delete/i.test(lowerDesc)) {
      return 'http_request';
    }
    if (/database|sql|query|mysql|postgres|mongodb/i.test(lowerDesc)) {
      return 'database';
    }
    if (/google\s+sheets|spreadsheet/i.test(lowerDesc)) {
      return 'google_sheets';
    }
    if (/github|git/i.test(lowerDesc)) {
      return 'github';
    }
    if (/jira|issue|ticket/i.test(lowerDesc)) {
      return 'jira';
    }

    // AI types
    if (/ai|gpt|openai|claude|completion|generate\s+text/i.test(lowerDesc)) {
      return 'ai_completion';
    }

    // Flow control
    if (/delay|wait|pause|sleep/i.test(lowerDesc)) {
      return 'delay';
    }
    if (/condition|branch|decision|if.*then/i.test(lowerDesc)) {
      return 'condition';
    }

    // Code execution
    if (/code|script|javascript|python|custom/i.test(lowerDesc)) {
      return 'code';
    }

    // Default
    return 'custom';
  }

  /**
   * Generate node configuration based on type and description
   */
  private async generateNodeConfig(nodeType: string, description: string): Promise<{ label: string; settings: Record<string, unknown> }> {
    const lowerDesc = description.toLowerCase();
    const nodeInfo = NODE_LIBRARY[nodeType];

    // Generate a meaningful label
    let label = nodeInfo?.description || nodeType.replace(/_/g, ' ');
    label = label.charAt(0).toUpperCase() + label.slice(1);

    const settings: Record<string, unknown> = {};

    // Extract and set common settings based on node type
    switch (nodeType) {
      case 'http_request':
        settings.method = /post/i.test(lowerDesc) ? 'POST' :
                          /put/i.test(lowerDesc) ? 'PUT' :
                          /delete/i.test(lowerDesc) ? 'DELETE' : 'GET';
        // Try to extract URL if present
        const urlMatch = lowerDesc.match(/(?:url|endpoint)[\s:]+([^\s,]+)/);
        if (urlMatch) {
          settings.url = urlMatch[1];
        }
        break;

      case 'email':
        // Try to extract email recipient
        const toMatch = lowerDesc.match(/to[\s:]+([^\s,@]+@[^\s,]+)/);
        if (toMatch) {
          settings.to = toMatch[1];
        }
        break;

      case 'slack':
        // Try to extract channel
        const channelMatch = lowerDesc.match(/#([a-z0-9-_]+)/i);
        if (channelMatch) {
          settings.channel = `#${channelMatch[1]}`;
        }
        break;

      case 'schedule':
        // Try to extract schedule pattern
        if (/every\s+minute/i.test(lowerDesc)) {
          settings.cronExpression = '* * * * *';
        } else if (/every\s+hour/i.test(lowerDesc)) {
          settings.cronExpression = '0 * * * *';
        } else if (/daily|every\s+day/i.test(lowerDesc)) {
          settings.cronExpression = '0 9 * * *';
        } else if (/weekly|every\s+week/i.test(lowerDesc)) {
          settings.cronExpression = '0 9 * * 1';
        }
        break;

      case 'delay':
        // Try to extract delay duration
        const delayMatch = lowerDesc.match(/(\d+)\s*(second|minute|hour|day)/i);
        if (delayMatch) {
          const value = parseInt(delayMatch[1]);
          const unit = delayMatch[2].toLowerCase();
          settings.delayMs = unit === 'second' ? value * 1000 :
                             unit === 'minute' ? value * 60000 :
                             unit === 'hour' ? value * 3600000 :
                             value * 86400000;
        }
        break;

      case 'filter':
        settings.conditions = [];
        break;

      case 'transform':
        settings.mapping = {};
        break;

      case 'code':
        settings.language = /python/i.test(lowerDesc) ? 'python' : 'javascript';
        settings.code = '';
        break;

      case 'ai_completion':
        settings.provider = /claude|anthropic/i.test(lowerDesc) ? 'anthropic' : 'openai';
        settings.model = settings.provider === 'anthropic' ? 'claude-3-sonnet-20240229' : 'gpt-4';
        break;
    }

    return { label, settings };
  }

  /**
   * Calculate position for a new node
   */
  private calculateNodePosition(): { x: number; y: number } {
    if (!this.currentWorkflow || !this.currentWorkflow.nodes.length) {
      return { x: 100, y: 200 };
    }

    // Find the rightmost node position
    const lastNode = this.currentWorkflow.nodes[this.currentWorkflow.nodes.length - 1];
    return {
      x: lastNode.position.x + 200,
      y: lastNode.position.y
    };
  }

  /**
   * Explain a workflow in natural language
   * Analyzes the workflow structure and generates a human-readable explanation
   */
  explainWorkflow(workflow?: GeneratedWorkflow): string {
    const workflowToExplain = workflow || this.currentWorkflow;

    if (!workflowToExplain) {
      return "No workflow available to explain. Create a workflow first, then I can explain how it works.";
    }

    const nodes = workflowToExplain.nodes;
    const edges = workflowToExplain.edges;

    if (nodes.length === 0) {
      return "This workflow is empty and has no nodes yet.";
    }

    let explanation = `## Workflow: ${workflowToExplain.name}\n\n`;
    explanation += `${workflowToExplain.description}\n\n`;
    explanation += `### Overview\n`;
    explanation += `This workflow contains ${nodes.length} node${nodes.length !== 1 ? 's' : ''} and ${edges.length} connection${edges.length !== 1 ? 's' : ''}.\n\n`;

    // Identify trigger (first node)
    const triggerNode = nodes[0];
    const nodeInfo = NODE_LIBRARY[triggerNode.type];
    explanation += `### Trigger\n`;
    explanation += `The workflow starts with a **${triggerNode.data.label || triggerNode.type}**`;
    if (nodeInfo) {
      explanation += ` - ${nodeInfo.description}`;
    }
    explanation += `.\n\n`;

    // Explain the flow
    if (nodes.length > 1) {
      explanation += `### Flow Steps\n`;
      for (let i = 1; i < nodes.length; i++) {
        const node = nodes[i];
        const info = NODE_LIBRARY[node.type];
        explanation += `${i}. **${node.data.label || node.type}**`;
        if (info) {
          explanation += `: ${info.description}`;
        }
        explanation += `\n`;
      }
      explanation += `\n`;
    }

    // Explain connections
    if (edges.length > 0) {
      explanation += `### Data Flow\n`;
      for (const edge of edges) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        if (sourceNode && targetNode) {
          explanation += `- ${sourceNode.data.label || sourceNode.type} → ${targetNode.data.label || targetNode.type}\n`;
        }
      }
      explanation += `\n`;
    }

    // Add suggestions if available
    if (workflowToExplain.suggestedImprovements && workflowToExplain.suggestedImprovements.length > 0) {
      explanation += `### Suggestions\n`;
      for (const suggestion of workflowToExplain.suggestedImprovements) {
        explanation += `- ${suggestion}\n`;
      }
    }

    this.emit('workflow:explained', { workflow: workflowToExplain, explanation });
    return explanation;
  }

  /**
   * Suggest improvements for a workflow
   * Analyzes the workflow structure and provides actionable suggestions
   */
  suggestImprovements(workflow?: GeneratedWorkflow): Suggestion[] {
    const workflowToAnalyze = workflow || this.currentWorkflow;

    if (!workflowToAnalyze) {
      return [{
        type: 'info',
        message: 'No workflow available to analyze. Create a workflow first.',
        priority: 'low'
      }];
    }

    const suggestions: Suggestion[] = [];
    const nodes = workflowToAnalyze.nodes;
    const edges = workflowToAnalyze.edges;

    // Check for error handling
    const hasErrorHandling = nodes.some(n =>
      n.type === 'condition' ||
      n.type === 'try_catch' ||
      n.type === 'error_handler' ||
      n.data?.errorOutput
    );
    if (!hasErrorHandling && nodes.length > 2) {
      suggestions.push({
        type: 'add_error_handling',
        message: 'Add error handling to your workflow. Consider adding a condition or try-catch node to handle failures gracefully.',
        priority: 'high',
        action: {
          type: 'add_node',
          nodeType: 'condition',
          position: 'after_trigger'
        }
      });
    }

    // Check for retry logic on HTTP requests
    const httpNodes = nodes.filter(n => n.type === 'http_request');
    const hasRetryLogic = httpNodes.some(n => n.data?.retryOnFail || n.data?.retryCount);
    if (httpNodes.length > 0 && !hasRetryLogic) {
      suggestions.push({
        type: 'add_retry_logic',
        message: 'Add retry logic to HTTP request nodes. External APIs can fail temporarily, and retry logic improves reliability.',
        priority: 'high',
        action: {
          type: 'configure_node',
          nodeTypes: ['http_request'],
          setting: 'retryCount',
          value: 3
        }
      });
    }

    // Check for logging
    const hasLogging = nodes.some(n => n.type === 'log' || n.type === 'debug');
    if (!hasLogging && nodes.length > 3) {
      suggestions.push({
        type: 'add_logging',
        message: 'Add logging nodes at key points in your workflow for better debugging and monitoring.',
        priority: 'medium',
        action: {
          type: 'add_node',
          nodeType: 'log',
          position: 'after_each_step'
        }
      });
    }

    // Check for timeouts
    const hasTimeouts = nodes.some(n => n.data?.timeout || n.data?.timeoutMs);
    if (httpNodes.length > 0 && !hasTimeouts) {
      suggestions.push({
        type: 'add_timeouts',
        message: 'Set timeouts on HTTP request nodes to prevent workflows from hanging indefinitely.',
        priority: 'medium',
        action: {
          type: 'configure_node',
          nodeTypes: ['http_request'],
          setting: 'timeout',
          value: 30000
        }
      });
    }

    // Check for data validation
    const hasValidation = nodes.some(n => n.type === 'filter' || n.type === 'validate');
    const hasTrigger = nodes.some(n => n.type === 'webhook' || n.type === 'schedule');
    if (hasTrigger && !hasValidation && nodes.length > 2) {
      suggestions.push({
        type: 'add_validation',
        message: 'Add input validation after your trigger node to ensure data meets expected format.',
        priority: 'medium',
        action: {
          type: 'add_node',
          nodeType: 'filter',
          position: 'after_trigger'
        }
      });
    }

    // Check for parallel execution opportunities
    const sequentialNodes = nodes.filter((node, idx) => {
      if (idx === 0) return false;
      const incomingEdges = edges.filter(e => e.target === node.id);
      const outgoingEdges = edges.filter(e => e.source === node.id);
      return incomingEdges.length === 1 && outgoingEdges.length <= 1;
    });
    if (sequentialNodes.length > 4) {
      suggestions.push({
        type: 'optimize_parallel',
        message: 'Consider running independent operations in parallel using a Split node to improve execution speed.',
        priority: 'low',
        action: {
          type: 'refactor',
          pattern: 'parallel_execution'
        }
      });
    }

    // Check for credential security
    const hasHardcodedCredentials = nodes.some(n => {
      const data = JSON.stringify(n.data || {}).toLowerCase();
      return data.includes('password') || data.includes('api_key') || data.includes('secret');
    });
    if (hasHardcodedCredentials) {
      suggestions.push({
        type: 'secure_credentials',
        message: 'Move hardcoded credentials to the credential manager for better security.',
        priority: 'critical',
        action: {
          type: 'migrate_credentials'
        }
      });
    }

    // Check for notification on failure
    const hasNotificationNode = nodes.some(n =>
      n.type === 'email' || n.type === 'slack' || n.type === 'sms'
    );
    if (nodes.length > 3 && !hasNotificationNode) {
      suggestions.push({
        type: 'add_notifications',
        message: 'Consider adding a notification node to alert you when the workflow completes or fails.',
        priority: 'low',
        action: {
          type: 'add_node',
          nodeType: 'email',
          position: 'end'
        }
      });
    }

    // Check workflow complexity
    if (nodes.length > 10) {
      suggestions.push({
        type: 'reduce_complexity',
        message: 'This workflow is quite complex. Consider breaking it into smaller sub-workflows for better maintainability.',
        priority: 'medium',
        action: {
          type: 'refactor',
          pattern: 'extract_subworkflow'
        }
      });
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    this.emit('improvements:suggested', { workflow: workflowToAnalyze, suggestions });
    return suggestions;
  }

  /**
   * Automatically connect nodes in a workflow
   * Analyzes node types and creates logical connections between them
   */
  autoConnect(workflow?: GeneratedWorkflow): GeneratedWorkflow {
    const workflowToConnect = workflow || this.currentWorkflow;

    if (!workflowToConnect) {
      throw new Error('No workflow available to auto-connect. Create a workflow first.');
    }

    const nodes = [...workflowToConnect.nodes];
    const newEdges: WorkflowEdge[] = [];

    if (nodes.length < 2) {
      return workflowToConnect;
    }

    // Group nodes by type for smart connecting
    const triggers = nodes.filter(n => ['webhook', 'schedule', 'email_trigger', 'file_trigger'].includes(n.type));
    const processors = nodes.filter(n => ['filter', 'transform', 'merge', 'split', 'code'].includes(n.type));
    const actions = nodes.filter(n => ['http_request', 'email', 'slack', 'database', 'ai_completion'].includes(n.type));
    const flowControl = nodes.filter(n => ['condition', 'loop', 'delay'].includes(n.type));
    const outputs = nodes.filter(n => ['email', 'slack', 'sms', 'discord', 'teams'].includes(n.type));

    // Track connected nodes
    const connectedNodes = new Set<string>();

    // Connect triggers first (they should be the entry points)
    for (const trigger of triggers) {
      // Find the next logical node (processor, flow control, or action)
      const nextNode = processors[0] || flowControl[0] || actions[0];
      if (nextNode && !connectedNodes.has(nextNode.id)) {
        newEdges.push({
          id: `edge_${trigger.id}_${nextNode.id}`,
          source: trigger.id,
          target: nextNode.id
        });
        connectedNodes.add(trigger.id);
        connectedNodes.add(nextNode.id);
      }
    }

    // Connect processors in sequence
    for (let i = 0; i < processors.length - 1; i++) {
      const current = processors[i];
      const next = processors[i + 1];
      if (!this.hasConnection(newEdges, current.id, next.id)) {
        newEdges.push({
          id: `edge_${current.id}_${next.id}`,
          source: current.id,
          target: next.id
        });
      }
    }

    // Connect last processor to actions or flow control
    const lastProcessor = processors[processors.length - 1];
    if (lastProcessor) {
      const nextNode = flowControl[0] || actions[0];
      if (nextNode && !this.hasConnection(newEdges, lastProcessor.id, nextNode.id)) {
        newEdges.push({
          id: `edge_${lastProcessor.id}_${nextNode.id}`,
          source: lastProcessor.id,
          target: nextNode.id
        });
      }
    }

    // Connect flow control to actions
    for (const fc of flowControl) {
      if (fc.type === 'condition') {
        // Conditions can have multiple outputs (true/false)
        const unconnectedActions = actions.filter(a => !connectedNodes.has(a.id));
        if (unconnectedActions.length >= 2) {
          newEdges.push({
            id: `edge_${fc.id}_${unconnectedActions[0].id}_true`,
            source: fc.id,
            target: unconnectedActions[0].id,
            sourceHandle: 'true'
          });
          newEdges.push({
            id: `edge_${fc.id}_${unconnectedActions[1].id}_false`,
            source: fc.id,
            target: unconnectedActions[1].id,
            sourceHandle: 'false'
          });
          connectedNodes.add(unconnectedActions[0].id);
          connectedNodes.add(unconnectedActions[1].id);
        } else if (unconnectedActions.length === 1) {
          newEdges.push({
            id: `edge_${fc.id}_${unconnectedActions[0].id}`,
            source: fc.id,
            target: unconnectedActions[0].id
          });
          connectedNodes.add(unconnectedActions[0].id);
        }
      } else {
        const nextAction = actions.find(a => !connectedNodes.has(a.id));
        if (nextAction) {
          newEdges.push({
            id: `edge_${fc.id}_${nextAction.id}`,
            source: fc.id,
            target: nextAction.id
          });
          connectedNodes.add(nextAction.id);
        }
      }
    }

    // Connect remaining unconnected nodes sequentially by position
    const unconnected = nodes.filter(n => !connectedNodes.has(n.id));
    unconnected.sort((a, b) => a.position.x - b.position.x);

    for (let i = 0; i < unconnected.length - 1; i++) {
      const current = unconnected[i];
      const next = unconnected[i + 1];
      if (!this.hasConnection(newEdges, current.id, next.id)) {
        newEdges.push({
          id: `edge_${current.id}_${next.id}`,
          source: current.id,
          target: next.id
        });
      }
    }

    // Update positions if needed for better layout
    const connectedWorkflow: GeneratedWorkflow = {
      ...workflowToConnect,
      edges: newEdges
    };

    // Update current workflow if it was the one being connected
    if (workflowToConnect === this.currentWorkflow) {
      this.currentWorkflow = connectedWorkflow;
    }

    this.emit('workflow:auto-connected', connectedWorkflow);
    return connectedWorkflow;
  }

  /**
   * Check if a connection already exists between two nodes
   */
  private hasConnection(edges: WorkflowEdge[], sourceId: string, targetId: string): boolean {
    return edges.some(e => e.source === sourceId && e.target === targetId);
  }

  /**
   * Get node recommendations based on context
   */
  async getNodeRecommendations(context: { currentNodes: string[]; lastNode?: string; userIntent?: string }): Promise<NodeRecommendation[]> {
    const recommendations: NodeRecommendation[] = [];

    // Recommend based on last node type
    if (context.lastNode) {
      const transitionRules: Record<string, string[]> = {
        'webhook': ['filter', 'transform', 'condition'],
        'schedule': ['http_request', 'database', 'code'],
        'http_request': ['filter', 'transform', 'condition', 'email', 'slack'],
        'filter': ['transform', 'email', 'slack', 'database'],
        'transform': ['email', 'slack', 'database', 'http_request'],
        'condition': ['email', 'slack', 'code', 'http_request'],
      };

      const suggested = transitionRules[context.lastNode] || [];
      for (const nodeType of suggested) {
        if (!context.currentNodes.includes(nodeType)) {
          const nodeInfo = NODE_LIBRARY[nodeType];
          if (nodeInfo) {
            recommendations.push({
              nodeType,
              reason: `Common next step after ${context.lastNode}`,
              confidence: 0.7,
            });
          }
        }
      }
    }

    // Add based on user intent
    if (context.userIntent) {
      const intentNodes: Record<string, string[]> = {
        'notify': ['email', 'slack'],
        'store': ['database'],
        'process': ['transform', 'code'],
        'filter': ['filter', 'condition'],
      };

      for (const [intent, nodes] of Object.entries(intentNodes)) {
        if (context.userIntent.toLowerCase().includes(intent)) {
          for (const nodeType of nodes) {
            if (!recommendations.some(r => r.nodeType === nodeType)) {
              recommendations.push({
                nodeType,
                reason: `Matches intent: ${intent}`,
                confidence: 0.8,
              });
            }
          }
        }
      }
    }

    return recommendations.slice(0, 5);
  }
}

// Export factory function
export function createAICopilot(config?: Partial<CopilotConfig>): AICopilot {
  return new AICopilot({
    provider: config?.provider || 'anthropic',
    ...config,
  });
}

export default AICopilot;
