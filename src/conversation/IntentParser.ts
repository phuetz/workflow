/**
 * IntentParser - Natural Language Understanding for workflow operations
 */

import { Intent, IntentType, ConversationContext, WorkflowChange } from './types';
import { v4 as uuidv4 } from 'uuid';

const INTENT_PATTERNS: Record<IntentType, RegExp[]> = {
  add_node: [
    /add\s+(?:a\s+)?(\w+[\s\w]*?)\s+node/i,
    /create\s+(?:a\s+)?(\w+[\s\w]*?)\s+node/i,
    /insert\s+(?:a\s+)?(\w+[\s\w]*)/i,
    /new\s+(\w+[\s\w]*?)\s+node/i,
  ],
  remove_node: [
    /remove\s+(?:the\s+)?node\s+(.+)/i,
    /delete\s+(?:the\s+)?node\s+(.+)/i,
    /get rid of\s+(.+)/i,
  ],
  configure_node: [
    /configure\s+(.+)\s+(?:to|with)\s+(.+)/i,
    /set\s+(.+)\s+to\s+(.+)/i,
    /update\s+(.+)\s+with\s+(.+)/i,
  ],
  connect_nodes: [
    /connect\s+(.+)\s+to\s+(.+)/i,
    /link\s+(.+)\s+(?:with|to)\s+(.+)/i,
  ],
  optimize_workflow: [
    /optimize/i,
    /make\s+(?:it|this)\s+faster/i,
    /improve\s+performance/i,
    /speed\s+up/i,
  ],
  debug_workflow: [
    /why\s+(?:did|is)\s+(.+)\s+fail/i,
    /debug\s+(.+)/i,
    /what's wrong/i,
  ],
  explain_workflow: [
    /explain\s+(?:this|the)\s+workflow/i,
    /how\s+does\s+(?:this|it)\s+work/i,
    /what\s+does\s+(?:this|it)\s+do/i,
  ],
  undo_change: [
    /undo/i,
    /revert/i,
    /go back/i,
  ],
  apply_suggestion: [
    /apply\s+(?:suggestion|that)/i,
    /yes/i,
    /do\s+it/i,
  ],
  ask_question: [
    /what|how|why|when|where/i,
  ],
  modify_workflow: [],
  unknown: [],
};

export class IntentParser {
  /**
   * Parse natural language into intent
   */
  async parse(message: string, context: ConversationContext): Promise<Intent> {
    const normalized = message.trim();

    // Try pattern matching first
    for (const [type, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        const match = normalized.match(pattern);
        if (match) {
          return this.buildIntent(type as IntentType, match, normalized, context);
        }
      }
    }

    // Fallback to keyword-based detection
    return this.keywordDetection(normalized);
  }

  /**
   * Extract workflow changes from intent
   */
  async extractChanges(
    intent: Intent,
    context: ConversationContext
  ): Promise<WorkflowChange[]> {
    const changes: WorkflowChange[] = [];

    switch (intent.type) {
      case 'add_node':
        if (intent.entities.nodeTypes) {
          changes.push(...intent.entities.nodeTypes.map((type) => ({
            id: uuidv4(),
            type: 'add_node' as const,
            timestamp: new Date(),
            description: `Add ${type} node`,
            impact: {
              nodes: [],
              edges: [],
            },
            operation: {
              action: 'create_node',
              data: { type },
            },
            reversible: true,
            confidence: intent.confidence,
          })));
        }
        break;

      case 'remove_node':
        if (intent.entities.nodeIds) {
          changes.push(...intent.entities.nodeIds.map((nodeId) => ({
            id: uuidv4(),
            type: 'remove_node' as const,
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
          })));
        }
        break;
    }

    return changes;
  }

  private buildIntent(
    type: IntentType,
    match: RegExpMatchArray,
    raw: string,
    context: ConversationContext
  ): Intent {
    const intent: Intent = {
      type,
      confidence: 0.8,
      raw,
      entities: {},
    };

    switch (type) {
      case 'add_node':
        if (match[1]) {
          intent.entities.nodeTypes = [this.normalizeNodeType(match[1])];
        }
        break;

      case 'remove_node':
        if (match[1]) {
          const nodeId = this.findNodeId(match[1], context);
          if (nodeId) {
            intent.entities.nodeIds = [nodeId];
          }
        }
        break;

      case 'configure_node':
        if (match[1] && match[2]) {
          const nodeId = this.findNodeId(match[1], context);
          if (nodeId) {
            intent.entities.nodeIds = [nodeId];
            intent.entities.parameters = this.parseParameters(match[2]);
          }
        }
        break;

      case 'connect_nodes':
        if (match[1] && match[2]) {
          const source = this.findNodeId(match[1], context);
          const target = this.findNodeId(match[2], context);
          if (source && target) {
            intent.entities.nodeIds = [source, target];
          }
        }
        break;
    }

    return intent;
  }

  private keywordDetection(message: string): Intent {
    const lower = message.toLowerCase();

    if (lower.includes('add') || lower.includes('create')) {
      return {
        type: 'add_node',
        confidence: 0.5,
        raw: message,
        entities: {},
      };
    }

    if (lower.includes('explain')) {
      return {
        type: 'explain_workflow',
        confidence: 0.6,
        raw: message,
        entities: {},
      };
    }

    return {
      type: 'unknown',
      confidence: 0.1,
      raw: message,
      entities: {},
    };
  }

  private normalizeNodeType(raw: string): string {
    const aliases: Record<string, string> = {
      'http': 'http-request',
      'api': 'http-request',
      'db': 'database',
      'sql': 'database',
      'mail': 'email',
    };

    const normalized = raw.toLowerCase().trim();
    return aliases[normalized] || normalized;
  }

  private findNodeId(query: string, context: ConversationContext): string | null {
    const node = context.currentNodes.find(
      (n) =>
        n.id === query ||
        n.data.label?.toLowerCase() === query.toLowerCase() ||
        n.data.label?.toLowerCase().includes(query.toLowerCase())
    );
    return node?.id || null;
  }

  private parseParameters(raw: string): Record<string, unknown> {
    // Simple key-value parsing
    const params: Record<string, unknown> = {};
    
    // Try to parse as JSON first
    try {
      return JSON.parse(raw);
    } catch {
      // Fallback to simple parsing
      params.value = raw;
      return params;
    }
  }
}
