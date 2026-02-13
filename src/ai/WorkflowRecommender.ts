/**
 * Workflow Recommender - AI-powered workflow suggestions
 *
 * Provides intelligent recommendations for next nodes, workflow templates,
 * optimizations, and best practices based on current workflow state.
 */

import { WorkflowNode, WorkflowEdge, NodeType } from '../types/workflow';
import { patternMatcher, PatternMatch } from './PatternMatcher';
import { logger } from '../services/SimpleLogger';

export interface NextNodeSuggestion {
  nodeType: string;
  label: string;
  description: string;
  confidence: number;
  reason: string;
  icon: string;
  color: string;
}

export interface TemplateSuggestion {
  templateId: string;
  name: string;
  description: string;
  relevanceScore: number;
  matchingNodes: string[];
}

export interface OptimizationSuggestion {
  type: 'performance' | 'cost' | 'reliability' | 'security';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  estimatedImprovement: string;
  affectedNodes: string[];
  action: string;
}

export interface RecommendationContext {
  currentNode?: WorkflowNode;
  allNodes: WorkflowNode[];
  edges: WorkflowEdge[];
  availableNodeTypes: NodeType[];
}

export class WorkflowRecommender {
  private suggestionCache = new Map<string, NextNodeSuggestion[]>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Suggest next nodes based on current workflow state
   */
  suggestNextNodes(context: RecommendationContext): NextNodeSuggestion[] {
    const { currentNode, allNodes, edges } = context;

    if (!currentNode) {
      return this.suggestStartingNodes(context);
    }

    // Check cache
    const cacheKey = `${currentNode.id}-${currentNode.type}`;
    const cached = this.suggestionCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const suggestions: NextNodeSuggestion[] = [];

    // Type-specific suggestions
    suggestions.push(...this.getTypeSpecificSuggestions(currentNode));

    // Context-based suggestions
    suggestions.push(...this.getContextBasedSuggestions(currentNode, allNodes, edges));

    // Pattern-based suggestions
    suggestions.push(...this.getPatternBasedSuggestions(allNodes, edges));

    // Sort by confidence and take top 5
    const sorted = suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    // Cache results
    this.suggestionCache.set(cacheKey, sorted);
    setTimeout(() => this.suggestionCache.delete(cacheKey), this.cacheTimeout);

    return sorted;
  }

  /**
   * Suggest starting nodes for empty workflow
   */
  private suggestStartingNodes(context: RecommendationContext): NextNodeSuggestion[] {
    return [
      {
        nodeType: 'webhook',
        label: 'Webhook Trigger',
        description: 'Start workflow when HTTP request received',
        confidence: 90,
        reason: 'Most common trigger type',
        icon: '🔗',
        color: '#3b82f6'
      },
      {
        nodeType: 'schedule',
        label: 'Schedule Trigger',
        description: 'Run workflow on schedule (cron)',
        confidence: 85,
        reason: 'Popular for automated tasks',
        icon: '⏰',
        color: '#8b5cf6'
      },
      {
        nodeType: 'httpRequest',
        label: 'HTTP Request',
        description: 'Fetch data from API',
        confidence: 80,
        reason: 'Common first action',
        icon: '🌐',
        color: '#10b981'
      },
      {
        nodeType: 'database',
        label: 'Database Query',
        description: 'Query database for data',
        confidence: 75,
        reason: 'Useful for data-driven workflows',
        icon: '🗄️',
        color: '#f59e0b'
      }
    ];
  }

  /**
   * Get suggestions based on current node type
   */
  private getTypeSpecificSuggestions(node: WorkflowNode): NextNodeSuggestion[] {
    const suggestions: NextNodeSuggestion[] = [];

    switch (node.type) {
      case 'httpRequest':
        suggestions.push(
          {
            nodeType: 'if',
            label: 'Conditional Branch',
            description: 'Check response status or data',
            confidence: 90,
            reason: 'Common to validate API responses',
            icon: '🔀',
            color: '#ec4899'
          },
          {
            nodeType: 'set',
            label: 'Transform Data',
            description: 'Extract and transform API response',
            confidence: 85,
            reason: 'Process API data before next step',
            icon: '🔧',
            color: '#6366f1'
          },
          {
            nodeType: 'forEach',
            label: 'Loop Over Items',
            description: 'Process each item from API response',
            confidence: 75,
            reason: 'Common for list responses',
            icon: '🔁',
            color: '#8b5cf6'
          }
        );
        break;

      case 'database':
        suggestions.push(
          {
            nodeType: 'forEach',
            label: 'Process Each Record',
            description: 'Loop through database results',
            confidence: 85,
            reason: 'Common for processing query results',
            icon: '🔁',
            color: '#8b5cf6'
          },
          {
            nodeType: 'set',
            label: 'Transform Records',
            description: 'Format database data',
            confidence: 80,
            reason: 'Prepare data for next step',
            icon: '🔧',
            color: '#6366f1'
          },
          {
            nodeType: 'slack',
            label: 'Send Notification',
            description: 'Notify about query results',
            confidence: 70,
            reason: 'Useful for monitoring queries',
            icon: '💬',
            color: '#10b981'
          }
        );
        break;

      case 'webhook':
        suggestions.push(
          {
            nodeType: 'if',
            label: 'Validate Webhook Data',
            description: 'Verify webhook payload is valid',
            confidence: 95,
            reason: 'Security best practice',
            icon: '🔀',
            color: '#ec4899'
          },
          {
            nodeType: 'set',
            label: 'Parse Webhook Data',
            description: 'Extract data from webhook',
            confidence: 90,
            reason: 'Process incoming webhook data',
            icon: '🔧',
            color: '#6366f1'
          },
          {
            nodeType: 'httpRequest',
            label: 'Call External API',
            description: 'Process webhook with API call',
            confidence: 80,
            reason: 'Common webhook response pattern',
            icon: '🌐',
            color: '#10b981'
          }
        );
        break;

      case 'if':
        suggestions.push(
          {
            nodeType: 'httpRequest',
            label: 'HTTP Request',
            description: 'Call API based on condition',
            confidence: 85,
            reason: 'Common conditional action',
            icon: '🌐',
            color: '#10b981'
          },
          {
            nodeType: 'email',
            label: 'Send Email',
            description: 'Send notification based on condition',
            confidence: 80,
            reason: 'Alert on specific conditions',
            icon: '📧',
            color: '#ef4444'
          },
          {
            nodeType: 'database',
            label: 'Update Database',
            description: 'Store result based on condition',
            confidence: 75,
            reason: 'Conditional data persistence',
            icon: '🗄️',
            color: '#f59e0b'
          }
        );
        break;

      case 'forEach':
        suggestions.push(
          {
            nodeType: 'httpRequest',
            label: 'HTTP Request',
            description: 'Call API for each item',
            confidence: 85,
            reason: 'Process items with external service',
            icon: '🌐',
            color: '#10b981'
          },
          {
            nodeType: 'set',
            label: 'Transform Item',
            description: 'Modify each item in loop',
            confidence: 80,
            reason: 'Common data transformation',
            icon: '🔧',
            color: '#6366f1'
          },
          {
            nodeType: 'database',
            label: 'Database Operation',
            description: 'Store/update each item',
            confidence: 75,
            reason: 'Persist loop results',
            icon: '🗄️',
            color: '#f59e0b'
          }
        );
        break;

      default:
        suggestions.push(
          {
            nodeType: 'set',
            label: 'Transform Data',
            description: 'Process and format data',
            confidence: 70,
            reason: 'Generic data processing',
            icon: '🔧',
            color: '#6366f1'
          }
        );
    }

    return suggestions;
  }

  /**
   * Get suggestions based on workflow context
   */
  private getContextBasedSuggestions(
    node: WorkflowNode,
    allNodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): NextNodeSuggestion[] {
    const suggestions: NextNodeSuggestion[] = [];

    // Check if workflow has error handling
    const hasErrorHandling = edges.some(e => e.sourceHandle === 'error');

    if (!hasErrorHandling && this.isErrorProneNode(node)) {
      suggestions.push({
        nodeType: 'tryCatch',
        label: 'Error Handler',
        description: 'Add error handling for reliability',
        confidence: 88,
        reason: 'No error handling detected',
        icon: '⚠️',
        color: '#ef4444'
      });
    }

    // Check if workflow needs logging
    const hasLogging = allNodes.some(n => n.type === 'log');
    const isCritical = this.isCriticalNode(node);

    if (!hasLogging && isCritical) {
      suggestions.push({
        nodeType: 'log',
        label: 'Add Logging',
        description: 'Log for debugging and monitoring',
        confidence: 75,
        reason: 'Critical operation without logging',
        icon: '📝',
        color: '#6366f1'
      });
    }

    return suggestions;
  }

  /**
   * Get suggestions based on detected patterns
   */
  private getPatternBasedSuggestions(
    allNodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): NextNodeSuggestion[] {
    const suggestions: NextNodeSuggestion[] = [];

    const patterns = patternMatcher.detectPatterns(allNodes, edges);

    // Convert patterns to suggestions
    for (const pattern of patterns.slice(0, 2)) { // Top 2 patterns
      if (pattern.pattern === 'no-error-handling') {
        suggestions.push({
          nodeType: 'tryCatch',
          label: 'Error Handler',
          description: pattern.suggestion,
          confidence: pattern.confidence,
          reason: 'Detected missing error handling',
          icon: '⚠️',
          color: '#ef4444'
        });
      }
    }

    return suggestions;
  }

  /**
   * Suggest relevant workflow templates
   */
  suggestTemplates(context: RecommendationContext): TemplateSuggestion[] {
    const { allNodes } = context;
    const nodeTypes = allNodes.map(n => n.type);

    const suggestions: TemplateSuggestion[] = [];

    // E-commerce pattern
    if (this.hasNodeTypes(nodeTypes, ['stripe', 'database', 'email'])) {
      suggestions.push({
        templateId: 'payment-processing',
        name: 'Payment Processing Workflow',
        description: 'Complete payment processing with confirmation emails',
        relevanceScore: 95,
        matchingNodes: ['stripe', 'database', 'email']
      });
    }

    // Monitoring pattern
    if (this.hasNodeTypes(nodeTypes, ['database', 'slack']) ||
        this.hasNodeTypes(nodeTypes, ['httpRequest', 'slack'])) {
      suggestions.push({
        templateId: 'monitoring-alerts',
        name: 'Monitoring & Alerts',
        description: 'Monitor data and send alerts to Slack',
        relevanceScore: 90,
        matchingNodes: ['database', 'slack']
      });
    }

    // Data sync pattern
    if (this.hasNodeTypes(nodeTypes, ['googleSheets', 'database']) ||
        this.hasNodeTypes(nodeTypes, ['airtable', 'database'])) {
      suggestions.push({
        templateId: 'data-sync',
        name: 'Data Synchronization',
        description: 'Sync data between systems',
        relevanceScore: 88,
        matchingNodes: ['googleSheets', 'database']
      });
    }

    return suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Generate optimization suggestions
   */
  suggestOptimizations(context: RecommendationContext): OptimizationSuggestion[] {
    const { allNodes, edges } = context;
    const suggestions: OptimizationSuggestion[] = [];

    const patterns = patternMatcher.detectPatterns(allNodes, edges);

    for (const pattern of patterns) {
      const suggestion = this.patternToOptimization(pattern);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  /**
   * Convert pattern match to optimization suggestion
   */
  private patternToOptimization(pattern: PatternMatch): OptimizationSuggestion | null {
    const typeMap: Record<string, 'performance' | 'cost' | 'reliability' | 'security'> = {
      'performance': 'performance',
      'optimization': 'cost',
      'best-practice': 'reliability',
      'security': 'security'
    };

    const type = typeMap[pattern.category] || 'reliability';

    let impact: 'low' | 'medium' | 'high' = 'medium';
    if (pattern.confidence > 85) impact = 'high';
    if (pattern.confidence < 70) impact = 'low';

    let estimatedImprovement = '';
    switch (pattern.pattern) {
      case 'api-in-loop':
        estimatedImprovement = '10-100x faster execution';
        break;
      case 'parallelizable-sequence':
        estimatedImprovement = '50% faster execution time';
        break;
      case 'no-caching':
        estimatedImprovement = '90% cost reduction';
        break;
      case 'no-error-handling':
        estimatedImprovement = 'Prevent workflow failures';
        break;
      default:
        estimatedImprovement = 'Improved reliability';
    }

    return {
      type,
      title: this.getPatternTitle(pattern.pattern),
      description: pattern.suggestion,
      impact,
      estimatedImprovement,
      affectedNodes: pattern.nodes,
      action: this.getPatternAction(pattern.pattern)
    };
  }

  /**
   * Helper: Get pattern title
   */
  private getPatternTitle(pattern: string): string {
    const titles: Record<string, string> = {
      'api-in-loop': 'API Calls Inside Loop',
      'parallelizable-sequence': 'Sequential Nodes Can Run in Parallel',
      'no-caching': 'Missing Caching for Expensive Operation',
      'no-error-handling': 'Missing Error Handling',
      'webhook-no-validation': 'Webhook Missing Input Validation',
      'credentials-in-config': 'Credentials Not Using Secure Storage',
      'no-logging': 'Missing Logging for Critical Operations',
      'duplicate-api-calls': 'Duplicate API Calls Detected',
      'generic-names': 'Generic Node Names Detected',
      'http-not-https': 'Using HTTP Instead of HTTPS'
    };

    return titles[pattern] || 'Optimization Opportunity';
  }

  /**
   * Helper: Get pattern action
   */
  private getPatternAction(pattern: string): string {
    const actions: Record<string, string> = {
      'api-in-loop': 'Enable batch API calls',
      'parallelizable-sequence': 'Enable parallel execution',
      'no-caching': 'Enable caching',
      'no-error-handling': 'Add error handler node',
      'webhook-no-validation': 'Add validation node',
      'credentials-in-config': 'Move to credentials manager',
      'no-logging': 'Add logging nodes',
      'duplicate-api-calls': 'Add caching or deduplicate',
      'generic-names': 'Use auto-naming feature',
      'http-not-https': 'Update URL to use HTTPS'
    };

    return actions[pattern] || 'Review and optimize';
  }

  /**
   * Helper: Check if node is error-prone
   */
  private isErrorProneNode(node: WorkflowNode): boolean {
    return ['httpRequest', 'database', 'webhook', 'email', 'stripe'].includes(node.type);
  }

  /**
   * Helper: Check if node is critical
   */
  private isCriticalNode(node: WorkflowNode): boolean {
    return ['database', 'payment', 'stripe', 'paypal', 'email'].includes(node.type);
  }

  /**
   * Helper: Check if workflow has specific node types
   */
  private hasNodeTypes(nodeTypes: string[], requiredTypes: string[]): boolean {
    return requiredTypes.every(type => nodeTypes.includes(type));
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.suggestionCache.clear();
  }
}

export const workflowRecommender = new WorkflowRecommender();
