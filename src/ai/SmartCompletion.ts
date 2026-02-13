/**
 * Smart Completion Service
 *
 * Provides intelligent autocomplete suggestions for expressions,
 * parameters, and configuration values based on context.
 */

import { WorkflowNode, WorkflowEdge } from '../types/workflow';

export interface CompletionItem {
  label: string;
  value: string;
  description: string;
  type: 'variable' | 'function' | 'constant' | 'node-output' | 'custom';
  score: number;
  icon?: string;
  insertText?: string;
}

export interface CompletionContext {
  text: string;
  cursorPosition: number;
  currentNode: WorkflowNode;
  allNodes: WorkflowNode[];
  edges: WorkflowEdge[];
  field?: string;
}

export class SmartCompletionService {
  private recentlyUsed: Map<string, number> = new Map();
  private usageCount = new Map<string, number>();

  /**
   * Get autocomplete suggestions for current context
   */
  getSuggestions(context: CompletionContext): CompletionItem[] {
    const { text, cursorPosition, field } = context;

    // Detect what kind of completion is needed
    const completionType = this.detectCompletionType(text, cursorPosition);

    let suggestions: CompletionItem[] = [];

    switch (completionType) {
      case 'expression':
        suggestions = this.getExpressionSuggestions(context);
        break;
      case 'node-reference':
        suggestions = this.getNodeReferenceSuggestions(context);
        break;
      case 'function':
        suggestions = this.getFunctionSuggestions(context);
        break;
      case 'url':
        suggestions = this.getUrlSuggestions(context);
        break;
      case 'email':
        suggestions = this.getEmailSuggestions(context);
        break;
      case 'header':
        suggestions = this.getHeaderSuggestions(context);
        break;
      default:
        suggestions = this.getGenericSuggestions(context);
    }

    // Apply scoring and filtering
    return this.rankSuggestions(suggestions, text);
  }

  /**
   * Detect type of completion needed
   */
  private detectCompletionType(text: string, cursor: number): string {
    const beforeCursor = text.substring(0, cursor);

    // Expression completion: {{
    if (beforeCursor.includes('{{') && !beforeCursor.endsWith('}}')) {
      return 'expression';
    }

    // Node reference: $node[
    if (beforeCursor.includes('$node[') || beforeCursor.includes('$json.')) {
      return 'node-reference';
    }

    // Function: after dot or opening paren
    if (beforeCursor.match(/\.\w*$/) || beforeCursor.match(/\(\w*$/)) {
      return 'function';
    }

    // URL: starts with http or contains ://
    if (beforeCursor.match(/https?:\/\//)) {
      return 'url';
    }

    // Email field
    if (text.includes('@')) {
      return 'email';
    }

    // Header field
    if (beforeCursor.toLowerCase().includes('header')) {
      return 'header';
    }

    return 'generic';
  }

  /**
   * Get expression autocomplete suggestions
   */
  private getExpressionSuggestions(context: CompletionContext): CompletionItem[] {
    const suggestions: CompletionItem[] = [];

    // Add variables from previous nodes
    suggestions.push(...this.getAvailableVariables(context));

    // Add built-in functions
    suggestions.push(...this.getBuiltInFunctions());

    // Add node outputs
    suggestions.push(...this.getNodeOutputs(context));

    return suggestions;
  }

  /**
   * Get available variables from previous nodes
   */
  private getAvailableVariables(context: CompletionContext): CompletionItem[] {
    const { currentNode, allNodes, edges } = context;
    const suggestions: CompletionItem[] = [];

    // Find previous nodes
    const previousNodeIds = edges
      .filter(e => e.target === currentNode.id)
      .map(e => e.source);

    const previousNodes = allNodes.filter(n => previousNodeIds.includes(n.id));

    // Add variables from previous nodes
    for (const node of previousNodes) {
      suggestions.push({
        label: `$node["${node.data.label}"]`,
        value: `$node["${node.data.label}"].json`,
        description: `Output from ${node.data.label}`,
        type: 'node-output',
        score: 90,
        icon: '📦',
        insertText: `$node["${node.data.label}"].json`
      });

      // Add common fields if we know the structure
      if (node.type === 'httpRequest') {
        suggestions.push({
          label: `${node.data.label}.statusCode`,
          value: `$node["${node.data.label}"].json.statusCode`,
          description: 'HTTP status code',
          type: 'node-output',
          score: 85,
          icon: '🔢'
        });
      }
    }

    // Add $json (current node input)
    suggestions.push({
      label: '$json',
      value: '$json',
      description: 'Current node input data',
      type: 'variable',
      score: 95,
      icon: '📥'
    });

    return suggestions;
  }

  /**
   * Get built-in function suggestions
   */
  private getBuiltInFunctions(): CompletionItem[] {
    return [
      {
        label: 'now()',
        value: 'now()',
        description: 'Current timestamp',
        type: 'function',
        score: 80,
        icon: '🕐',
        insertText: 'now()'
      },
      {
        label: 'uuid()',
        value: 'uuid()',
        description: 'Generate UUID',
        type: 'function',
        score: 75,
        icon: '🔑',
        insertText: 'uuid()'
      },
      {
        label: 'base64()',
        value: 'base64()',
        description: 'Base64 encode',
        type: 'function',
        score: 70,
        icon: '🔐',
        insertText: 'base64(${1:text})'
      },
      {
        label: 'toLowerCase()',
        value: 'toLowerCase()',
        description: 'Convert to lowercase',
        type: 'function',
        score: 70,
        icon: '🔡',
        insertText: 'toLowerCase()'
      },
      {
        label: 'toUpperCase()',
        value: 'toUpperCase()',
        description: 'Convert to uppercase',
        type: 'function',
        score: 70,
        icon: '🔠',
        insertText: 'toUpperCase()'
      },
      {
        label: 'trim()',
        value: 'trim()',
        description: 'Remove whitespace',
        type: 'function',
        score: 68,
        icon: '✂️',
        insertText: 'trim()'
      },
      {
        label: 'parseJson()',
        value: 'parseJson()',
        description: 'Parse JSON string',
        type: 'function',
        score: 75,
        icon: '📋',
        insertText: 'parseJson(${1:jsonString})'
      },
      {
        label: 'stringify()',
        value: 'stringify()',
        description: 'Convert to JSON string',
        type: 'function',
        score: 72,
        icon: '📝',
        insertText: 'stringify(${1:object})'
      },
      {
        label: 'formatDate()',
        value: 'formatDate()',
        description: 'Format date',
        type: 'function',
        score: 78,
        icon: '📅',
        insertText: 'formatDate(${1:date}, ${2:format})'
      }
    ];
  }

  /**
   * Get node output suggestions
   */
  private getNodeOutputs(context: CompletionContext): CompletionItem[] {
    const { currentNode, allNodes, edges } = context;
    const suggestions: CompletionItem[] = [];

    // Get all accessible nodes (previous in flow)
    const accessibleNodes = this.getAccessibleNodes(currentNode, allNodes, edges);

    for (const node of accessibleNodes) {
      suggestions.push({
        label: node.data.label,
        value: `$node["${node.data.label}"].json`,
        description: `Data from ${node.data.label}`,
        type: 'node-output',
        score: 85,
        icon: node.data.icon || '📦'
      });
    }

    return suggestions;
  }

  /**
   * Get node reference suggestions
   */
  private getNodeReferenceSuggestions(context: CompletionContext): CompletionItem[] {
    return this.getNodeOutputs(context);
  }

  /**
   * Get function suggestions
   */
  private getFunctionSuggestions(context: CompletionContext): CompletionItem[] {
    return this.getBuiltInFunctions();
  }

  /**
   * Get URL suggestions
   */
  private getUrlSuggestions(context: CompletionContext): CompletionItem[] {
    const suggestions: CompletionItem[] = [];

    // Add environment variables
    suggestions.push({
      label: '{{$env.API_BASE_URL}}',
      value: '{{$env.API_BASE_URL}}',
      description: 'API base URL from environment',
      type: 'variable',
      score: 90,
      icon: '🌐'
    });

    // Add recent URLs (would come from usage history)
    const recentUrls = this.getRecentUrls();
    for (const url of recentUrls) {
      suggestions.push({
        label: url,
        value: url,
        description: 'Recently used URL',
        type: 'custom',
        score: 80,
        icon: '🔗'
      });
    }

    return suggestions;
  }

  /**
   * Get email suggestions
   */
  private getEmailSuggestions(context: CompletionContext): CompletionItem[] {
    return [
      {
        label: 'Email Template: Welcome',
        value: 'Welcome to our service!',
        description: 'Standard welcome email',
        type: 'custom',
        score: 85,
        icon: '📧'
      },
      {
        label: 'Email Template: Reset Password',
        value: 'Click here to reset your password: {{resetLink}}',
        description: 'Password reset email',
        type: 'custom',
        score: 85,
        icon: '🔑'
      },
      {
        label: 'Email Template: Order Confirmation',
        value: 'Your order #{{orderId}} has been confirmed.',
        description: 'Order confirmation email',
        type: 'custom',
        score: 80,
        icon: '🛒'
      }
    ];
  }

  /**
   * Get HTTP header suggestions
   */
  private getHeaderSuggestions(context: CompletionContext): CompletionItem[] {
    return [
      {
        label: 'Content-Type: application/json',
        value: 'application/json',
        description: 'JSON content type',
        type: 'constant',
        score: 95,
        icon: '📋'
      },
      {
        label: 'Authorization: Bearer {{token}}',
        value: 'Bearer {{$env.API_TOKEN}}',
        description: 'Bearer token authentication',
        type: 'constant',
        score: 90,
        icon: '🔐'
      },
      {
        label: 'Content-Type: application/x-www-form-urlencoded',
        value: 'application/x-www-form-urlencoded',
        description: 'Form data content type',
        type: 'constant',
        score: 85,
        icon: '📝'
      },
      {
        label: 'Accept: application/json',
        value: 'application/json',
        description: 'Accept JSON response',
        type: 'constant',
        score: 85,
        icon: '✅'
      },
      {
        label: 'User-Agent',
        value: 'WorkflowAutomation/1.0',
        description: 'User agent header',
        type: 'constant',
        score: 70,
        icon: '🤖'
      }
    ];
  }

  /**
   * Get generic suggestions
   */
  private getGenericSuggestions(context: CompletionContext): CompletionItem[] {
    // Return mix of common suggestions
    return [
      ...this.getAvailableVariables(context).slice(0, 3),
      ...this.getBuiltInFunctions().slice(0, 3)
    ];
  }

  /**
   * Rank and filter suggestions based on relevance
   */
  private rankSuggestions(suggestions: CompletionItem[], text: string): CompletionItem[] {
    const query = text.toLowerCase();

    // Apply fuzzy matching and scoring
    const scored = suggestions.map(item => {
      let score = item.score;

      // Exact match bonus
      if (item.label.toLowerCase() === query) {
        score += 50;
      }

      // Starts with bonus
      if (item.label.toLowerCase().startsWith(query)) {
        score += 30;
      }

      // Contains bonus
      if (item.label.toLowerCase().includes(query)) {
        score += 15;
      }

      // Recently used bonus
      const lastUsed = this.recentlyUsed.get(item.value);
      if (lastUsed) {
        const timeSince = Date.now() - lastUsed;
        const recencyBonus = Math.max(0, 20 - (timeSince / 60000)); // Decay over minutes
        score += recencyBonus;
      }

      // Usage frequency bonus
      const usageCount = this.usageCount.get(item.value) || 0;
      score += Math.min(usageCount * 2, 20);

      return { ...item, score };
    });

    // Sort by score and return top results
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  /**
   * Get accessible nodes (all nodes that come before current node)
   */
  private getAccessibleNodes(
    currentNode: WorkflowNode,
    allNodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): WorkflowNode[] {
    const accessible = new Set<string>();
    const queue = [currentNode.id];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const nodeId = queue.shift()!;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const incoming = edges.filter(e => e.target === nodeId);

      for (const edge of incoming) {
        if (edge.source !== currentNode.id) {
          accessible.add(edge.source);
          queue.push(edge.source);
        }
      }
    }

    return allNodes.filter(n => accessible.has(n.id));
  }

  /**
   * Track usage of suggestion
   */
  trackUsage(value: string): void {
    this.recentlyUsed.set(value, Date.now());
    this.usageCount.set(value, (this.usageCount.get(value) || 0) + 1);
  }

  /**
   * Get recent URLs from usage history
   */
  private getRecentUrls(): string[] {
    // This would be populated from actual usage
    return [
      'https://api.example.com/users',
      'https://api.stripe.com/v1/charges',
      'https://hooks.slack.com/services/'
    ];
  }

  /**
   * Clear usage tracking
   */
  clearHistory(): void {
    this.recentlyUsed.clear();
    this.usageCount.clear();
  }
}

export const smartCompletionService = new SmartCompletionService();
