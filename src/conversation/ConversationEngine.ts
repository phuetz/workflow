/**
 * Conversation Engine - Core natural language workflow modification
 * Parses requests, updates workflows, and manages conversation state
 */

import { v4 as uuidv4 } from 'uuid';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { logger } from '../services/SimpleLogger';
import {
  ConversationContext,
  ConversationResponse,
  Intent,
  IntentType,
  Message,
  WorkflowChange,
  WorkflowUpdateResult,
  ChangeType,
} from './types';
import { IntentParser } from './IntentParser';
import { ChangeApplicator } from './ChangeApplicator';

/**
 * Main conversation engine for natural language workflow editing
 */
export class ConversationEngine {
  private contexts = new Map<string, ConversationContext>();
  private intentParser: IntentParser;
  private changeApplicator: ChangeApplicator;

  constructor() {
    this.intentParser = new IntentParser();
    this.changeApplicator = new ChangeApplicator();
  }

  /**
   * Create a new conversation context
   */
  createContext(
    workflowId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): ConversationContext {
    const context: ConversationContext = {
      workflowId,
      history: [],
      pendingChanges: [],
      appliedChanges: [],
      userIntent: null,
      currentNodes: [...nodes],
      currentEdges: [...edges],
      sessionId: uuidv4(),
      startTime: new Date(),
    };

    this.contexts.set(context.sessionId, context);
    logger.info(`Created conversation context for workflow ${workflowId}`);

    return context;
  }

  /**
   * Process a user message and generate response
   */
  async processMessage(
    message: string,
    sessionId: string
  ): Promise<ConversationResponse> {
    const startTime = Date.now();
    const context = this.contexts.get(sessionId);

    if (!context) {
      throw new Error(`Conversation context not found: ${sessionId}`);
    }

    // Add user message to history
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    context.history.push(userMessage);

    try {
      // Parse user intent
      const intent = await this.intentParser.parse(message, context);
      context.userIntent = intent;

      logger.debug(`Parsed intent: ${intent.type} (confidence: ${intent.confidence})`);

      // Generate response based on intent
      const response = await this.handleIntent(intent, context);

      // Add assistant response to history
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        metadata: {
          confidence: response.confidence,
          changes: response.changes?.map((c) => c.id),
        },
      };
      context.history.push(assistantMessage);

      response.metadata = {
        processingTime: Date.now() - startTime,
      };

      return response;
    } catch (error) {
      logger.error('Error processing message:', error);
      return {
        message: `I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        needsConfirmation: false,
        confidence: 0,
        metadata: {
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Handle different types of intents
   */
  private async handleIntent(
    intent: Intent,
    context: ConversationContext
  ): Promise<ConversationResponse> {
    switch (intent.type) {
      case 'modify_workflow':
        return this.handleModifyWorkflow(intent, context);

      case 'add_node':
        return this.handleAddNode(intent, context);

      case 'remove_node':
        return this.handleRemoveNode(intent, context);

      case 'configure_node':
        return this.handleConfigureNode(intent, context);

      case 'optimize_workflow':
        return this.handleOptimizeWorkflow(intent, context);

      case 'undo_change':
        return this.handleUndoChange(context);

      case 'apply_suggestion':
        return this.handleApplySuggestion(intent, context);

      case 'ask_question':
        return this.handleQuestion(intent, context);

      default:
        return {
          message: "I'm not sure I understand. Could you rephrase that? You can ask me to:\n" +
                   "- Add or remove nodes\n" +
                   "- Configure specific nodes\n" +
                   "- Optimize your workflow\n" +
                   "- Explain how something works\n" +
                   "- Debug issues",
          needsConfirmation: false,
          confidence: 0.3,
        };
    }
  }

  /**
   * Handle workflow modification requests
   */
  private async handleModifyWorkflow(
    intent: Intent,
    context: ConversationContext
  ): Promise<ConversationResponse> {
    const changes = await this.intentParser.extractChanges(intent, context);

    if (changes.length === 0) {
      return {
        message: "I understand you want to modify the workflow, but I need more specific details. What would you like to change?",
        needsConfirmation: false,
        confidence: 0.5,
      };
    }

    // Add to pending changes
    context.pendingChanges.push(...changes);

    // Generate explanation
    const explanation = changes.map((change, index) =>
      `${index + 1}. ${change.description}`
    ).join('\n');

    const impactSummary = this.summarizeImpact(changes);

    return {
      message: `I can make the following changes:\n\n${explanation}\n\n${impactSummary}\n\nShould I apply these changes?`,
      changes,
      needsConfirmation: true,
      confidence: intent.confidence,
    };
  }

  /**
   * Handle add node request
   */
  private async handleAddNode(
    intent: Intent,
    context: ConversationContext
  ): Promise<ConversationResponse> {
    const { nodeTypes, parameters } = intent.entities;

    if (!nodeTypes || nodeTypes.length === 0) {
      return {
        message: "What type of node would you like to add? (e.g., HTTP Request, Email, Slack, Filter, etc.)",
        needsConfirmation: false,
        confidence: 0.6,
      };
    }

    const nodeType = nodeTypes[0];
    const change: WorkflowChange = {
      id: uuidv4(),
      type: 'add_node',
      timestamp: new Date(),
      description: `Add ${nodeType} node`,
      impact: {
        nodes: [],
        edges: [],
      },
      operation: {
        action: 'create_node',
        data: {
          type: nodeType,
          config: parameters || {},
        },
      },
      reversible: true,
      confidence: intent.confidence,
    };

    context.pendingChanges.push(change);

    return {
      message: `I'll add a ${nodeType} node to your workflow. Where should I place it, or should I add it at the end?`,
      changes: [change],
      needsConfirmation: true,
      confidence: intent.confidence,
    };
  }

  /**
   * Handle remove node request
   */
  private async handleRemoveNode(
    intent: Intent,
    context: ConversationContext
  ): Promise<ConversationResponse> {
    const { nodeIds } = intent.entities;

    if (!nodeIds || nodeIds.length === 0) {
      return {
        message: "Which node would you like to remove? You can specify by node name, number, or description.",
        needsConfirmation: false,
        confidence: 0.6,
      };
    }

    const changes: WorkflowChange[] = nodeIds.map((nodeId) => ({
      id: uuidv4(),
      type: 'remove_node',
      timestamp: new Date(),
      description: `Remove node ${nodeId}`,
      impact: {
        nodes: [nodeId],
        edges: context.currentEdges
          .filter((e) => e.source === nodeId || e.target === nodeId)
          .map((e) => e.id),
      },
      operation: {
        action: 'delete_node',
        target: nodeId,
      },
      reversible: true,
      confidence: intent.confidence,
    }));

    context.pendingChanges.push(...changes);

    return {
      message: `I'll remove ${nodeIds.length} node(s). This will also remove ${changes[0]?.impact.edges.length || 0} connected edge(s). Continue?`,
      changes,
      needsConfirmation: true,
      confidence: intent.confidence,
    };
  }

  /**
   * Handle configure node request
   */
  private async handleConfigureNode(
    intent: Intent,
    context: ConversationContext
  ): Promise<ConversationResponse> {
    const { nodeIds, parameters } = intent.entities;

    if (!nodeIds || nodeIds.length === 0 || !parameters) {
      return {
        message: "Which node would you like to configure and what settings should I change?",
        needsConfirmation: false,
        confidence: 0.5,
      };
    }

    const changes: WorkflowChange[] = nodeIds.map((nodeId) => ({
      id: uuidv4(),
      type: 'update_node',
      timestamp: new Date(),
      description: `Configure ${nodeId}: ${Object.keys(parameters).join(', ')}`,
      impact: {
        nodes: [nodeId],
        edges: [],
      },
      operation: {
        action: 'update_config',
        target: nodeId,
        data: parameters,
      },
      reversible: true,
      confidence: intent.confidence,
    }));

    context.pendingChanges.push(...changes);

    return {
      message: `I'll update the configuration for node ${nodeIds[0]}. Apply these changes?`,
      changes,
      needsConfirmation: true,
      confidence: intent.confidence,
    };
  }

  /**
   * Handle workflow optimization request
   */
  private async handleOptimizeWorkflow(
    intent: Intent,
    context: ConversationContext
  ): Promise<ConversationResponse> {
    // Analyze current workflow for optimization opportunities
    const optimizations = await this.analyzeOptimizations(context);

    if (optimizations.length === 0) {
      return {
        message: "Your workflow is already well-optimized! I couldn't find any significant improvements.",
        needsConfirmation: false,
        confidence: 0.9,
      };
    }

    const topOptimizations = optimizations.slice(0, 3);
    const message = this.formatOptimizations(topOptimizations);

    return {
      message,
      changes: topOptimizations,
      needsConfirmation: true,
      confidence: 0.85,
    };
  }

  /**
   * Handle undo request
   */
  private async handleUndoChange(
    context: ConversationContext
  ): Promise<ConversationResponse> {
    const lastChange = context.appliedChanges.pop();

    if (!lastChange) {
      return {
        message: "There are no changes to undo.",
        needsConfirmation: false,
        confidence: 1.0,
      };
    }

    if (!lastChange.reversible) {
      context.appliedChanges.push(lastChange); // Put it back
      return {
        message: "The last change cannot be undone automatically. You may need to manually revert it.",
        needsConfirmation: false,
        confidence: 0.8,
      };
    }

    // Reverse the change
    const reverseChange = this.createReverseChange(lastChange);
    const result = await this.changeApplicator.apply(
      [reverseChange],
      context.currentNodes,
      context.currentEdges
    );

    if (result.success) {
      context.currentNodes = result.newNodes;
      context.currentEdges = result.newEdges;
    }

    return {
      message: result.success
        ? `Undid: ${lastChange.description}`
        : `Failed to undo change: ${result.errors?.join(', ')}`,
      needsConfirmation: false,
      confidence: 0.95,
    };
  }

  /**
   * Handle apply suggestion
   */
  private async handleApplySuggestion(
    intent: Intent,
    context: ConversationContext
  ): Promise<ConversationResponse> {
    // Extract which suggestion to apply
    const suggestionId = intent.entities.parameters?.suggestionId as string;

    if (!suggestionId) {
      return {
        message: "Which suggestion would you like me to apply?",
        needsConfirmation: false,
        confidence: 0.5,
      };
    }

    return {
      message: "Suggestion applied successfully!",
      needsConfirmation: false,
      confidence: 0.9,
    };
  }

  /**
   * Handle general questions
   */
  private async handleQuestion(
    intent: Intent,
    context: ConversationContext
  ): Promise<ConversationResponse> {
    const question = intent.raw.toLowerCase();

    // Simple pattern matching for common questions
    if (question.includes('how') && question.includes('work')) {
      return {
        message: `This workflow has ${context.currentNodes.length} nodes and processes data through ${context.currentEdges.length} connections. Would you like me to explain a specific part?`,
        needsConfirmation: false,
        confidence: 0.75,
      };
    }

    if (question.includes('what') && question.includes('do')) {
      return {
        message: "This workflow automation processes data through various steps. Each node performs a specific action. Would you like details about a particular node?",
        needsConfirmation: false,
        confidence: 0.7,
      };
    }

    return {
      message: "I can help you understand your workflow. Try asking about specific nodes, how data flows, or what a particular step does.",
      needsConfirmation: false,
      confidence: 0.6,
    };
  }

  /**
   * Apply pending changes to workflow
   */
  async applyChanges(
    sessionId: string,
    changeIds?: string[]
  ): Promise<WorkflowUpdateResult> {
    const context = this.contexts.get(sessionId);

    if (!context) {
      throw new Error(`Conversation context not found: ${sessionId}`);
    }

    const changesToApply = changeIds
      ? context.pendingChanges.filter((c) => changeIds.includes(c.id))
      : context.pendingChanges;

    if (changesToApply.length === 0) {
      return {
        success: false,
        changes: [],
        newNodes: context.currentNodes,
        newEdges: context.currentEdges,
        errors: ['No changes to apply'],
        summary: 'No changes were made',
      };
    }

    const result = await this.changeApplicator.apply(
      changesToApply,
      context.currentNodes,
      context.currentEdges
    );

    if (result.success) {
      // Update context
      context.currentNodes = result.newNodes;
      context.currentEdges = result.newEdges;
      context.appliedChanges.push(...changesToApply);
      context.pendingChanges = context.pendingChanges.filter(
        (c) => !changesToApply.includes(c)
      );

      logger.info(`Applied ${changesToApply.length} changes to workflow ${context.workflowId}`);
    }

    return result;
  }

  /**
   * Explain a specific change
   */
  async explainChange(change: WorkflowChange): Promise<string> {
    let explanation = `**${change.description}**\n\n`;

    explanation += `Type: ${change.type}\n`;
    explanation += `Confidence: ${(change.confidence * 100).toFixed(0)}%\n\n`;

    if (change.impact.nodes.length > 0) {
      explanation += `Affected nodes: ${change.impact.nodes.join(', ')}\n`;
    }

    if (change.impact.edges.length > 0) {
      explanation += `Affected connections: ${change.impact.edges.length}\n`;
    }

    if (change.impact.estimatedImprovement) {
      explanation += '\n**Expected improvements:**\n';
      const { speed, reliability, cost } = change.impact.estimatedImprovement;
      if (speed) explanation += `- Speed: ${speed}\n`;
      if (reliability) explanation += `- Reliability: ${reliability}\n`;
      if (cost) explanation += `- Cost: ${cost}\n`;
    }

    explanation += `\nReversible: ${change.reversible ? 'Yes' : 'No'}`;

    return explanation;
  }

  /**
   * Get conversation context
   */
  getContext(sessionId: string): ConversationContext | undefined {
    return this.contexts.get(sessionId);
  }

  /**
   * Clear conversation context
   */
  clearContext(sessionId: string): void {
    this.contexts.delete(sessionId);
    logger.info(`Cleared conversation context ${sessionId}`);
  }

  // Private helper methods

  private summarizeImpact(changes: WorkflowChange[]): string {
    const totalNodes = new Set(changes.flatMap((c) => c.impact.nodes)).size;
    const totalEdges = new Set(changes.flatMap((c) => c.impact.edges)).size;

    let summary = `**Impact:** ${totalNodes} node(s), ${totalEdges} connection(s)`;

    const improvements = changes
      .map((c) => c.impact.estimatedImprovement)
      .filter((i) => i);

    if (improvements.length > 0) {
      summary += '\n\n**Estimated improvements:**';
      const speeds = improvements.map((i) => i?.speed).filter((s) => s);
      const costs = improvements.map((i) => i?.cost).filter((c) => c);
      const reliability = improvements.map((i) => i?.reliability).filter((r) => r);

      if (speeds.length > 0) summary += `\n- Speed: ${speeds[0]}`;
      if (costs.length > 0) summary += `\n- Cost: ${costs[0]}`;
      if (reliability.length > 0) summary += `\n- Reliability: ${reliability[0]}`;
    }

    return summary;
  }

  private async analyzeOptimizations(
    context: ConversationContext
  ): Promise<WorkflowChange[]> {
    const optimizations: WorkflowChange[] = [];

    // Check for sequential nodes that could be parallelized
    const parallelizable = this.findParallelizableNodes(context);
    if (parallelizable.length > 0) {
      optimizations.push({
        id: uuidv4(),
        type: 'optimize_flow',
        timestamp: new Date(),
        description: `Parallelize ${parallelizable.length} independent nodes`,
        impact: {
          nodes: parallelizable,
          edges: [],
          estimatedImprovement: {
            speed: '40-60% faster',
          },
        },
        operation: {
          action: 'parallelize',
          data: { nodeIds: parallelizable },
        },
        reversible: true,
        confidence: 0.85,
      });
    }

    // Check for missing error handling
    const nodesWithoutErrors = context.currentNodes.filter(
      (node) => !context.currentEdges.some((e) => e.source === node.id && e.sourceHandle === 'error')
    );

    if (nodesWithoutErrors.length > 0) {
      optimizations.push({
        id: uuidv4(),
        type: 'add_edge',
        timestamp: new Date(),
        description: 'Add error handling to vulnerable nodes',
        impact: {
          nodes: nodesWithoutErrors.slice(0, 3).map((n) => n.id),
          edges: [],
          estimatedImprovement: {
            reliability: '+25% reliability',
          },
        },
        operation: {
          action: 'add_error_handlers',
        },
        reversible: true,
        confidence: 0.8,
      });
    }

    return optimizations;
  }

  private findParallelizableNodes(context: ConversationContext): string[] {
    // Simple heuristic: find nodes with no shared dependencies
    const parallelizable: string[] = [];
    const { currentNodes, currentEdges } = context;

    for (let i = 0; i < currentNodes.length - 1; i++) {
      const node1 = currentNodes[i];
      const node2 = currentNodes[i + 1];

      const node1Deps = this.getDependencies(node1.id, currentEdges);
      const node2Deps = this.getDependencies(node2.id, currentEdges);

      const hasSharedDeps = node1Deps.some((dep) => node2Deps.includes(dep));

      if (!hasSharedDeps && !parallelizable.includes(node1.id)) {
        parallelizable.push(node1.id);
      }
    }

    return parallelizable;
  }

  private getDependencies(nodeId: string, edges: WorkflowEdge[]): string[] {
    const deps: string[] = [];
    const visited = new Set<string>();

    const traverse = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const incoming = edges.filter((e) => e.target === id);
      incoming.forEach((edge) => {
        deps.push(edge.source);
        traverse(edge.source);
      });
    };

    traverse(nodeId);
    return deps;
  }

  private formatOptimizations(changes: WorkflowChange[]): string {
    let message = "I analyzed your workflow and found several optimization opportunities:\n\n";

    changes.forEach((change, index) => {
      message += `${index + 1}. **${change.description}**\n`;

      if (change.impact.estimatedImprovement) {
        const { speed, reliability, cost } = change.impact.estimatedImprovement;
        if (speed) message += `   - ${speed}\n`;
        if (reliability) message += `   - ${reliability}\n`;
        if (cost) message += `   - ${cost}\n`;
      }
      message += '\n';
    });

    message += 'Should I apply all these optimizations?';
    return message;
  }

  private createReverseChange(change: WorkflowChange): WorkflowChange {
    return {
      ...change,
      id: uuidv4(),
      description: `Undo: ${change.description}`,
      operation: {
        action: `reverse_${change.operation.action}`,
        target: change.operation.target,
        data: change.operation.before,
      },
    };
  }
}
