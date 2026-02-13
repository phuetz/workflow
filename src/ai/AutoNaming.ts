/**
 * Auto-Naming Service for Workflow Nodes
 *
 * Generates intelligent, context-aware names for workflow nodes
 * based on node type, configuration, and workflow context.
 */

import { WorkflowNode, WorkflowEdge, NodeData } from '../types/workflow';
import { NAMING_PATTERNS, generateSequentialName, checkNamingConsistency } from './NamingPatterns';
import { contextAnalyzer, WorkflowContext, NodeContext } from './ContextAnalyzer';
import { logger } from '../services/SimpleLogger';

export interface AutoNamingOptions {
  useContextPrefix?: boolean;
  ensureUniqueness?: boolean;
  followWorkflowConventions?: boolean;
  maxLength?: number;
}

export interface AutoNamingResult {
  suggestedName: string;
  confidence: number;
  reasoning: string;
  alternatives: string[];
}

export interface BulkRenamePreview {
  nodeId: string;
  currentName: string;
  suggestedName: string;
  confidence: number;
}

export class AutoNamingService {
  private namingCache = new Map<string, AutoNamingResult>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate intelligent name for a node
   */
  generateNodeName(
    node: WorkflowNode,
    allNodes: WorkflowNode[],
    edges: WorkflowEdge[],
    options: AutoNamingOptions = {}
  ): AutoNamingResult {
    const defaultOptions: AutoNamingOptions = {
      useContextPrefix: true,
      ensureUniqueness: true,
      followWorkflowConventions: true,
      maxLength: 50,
      ...options
    };

    try {
      // Check cache
      const cacheKey = this.generateCacheKey(node, allNodes, edges);
      const cached = this.namingCache.get(cacheKey);

      if (cached) {
        return cached;
      }

      // Analyze context
      const context = contextAnalyzer.analyzeNodeContext({
        nodes: allNodes,
        edges,
        currentNode: node
      });

      // Generate base name from patterns
      const baseName = this.generateBaseName(node, context);

      // Apply context prefix if needed
      let finalName = baseName;

      if (defaultOptions.useContextPrefix && context.position === 'first') {
        finalName = contextAnalyzer.suggestPositionPrefix(context.position) + baseName;
      }

      // Ensure uniqueness
      if (defaultOptions.ensureUniqueness) {
        const existingNames = allNodes
          .filter(n => n.id !== node.id)
          .map(n => n.data.label);

        finalName = generateSequentialName(finalName, existingNames);
      }

      // Truncate if needed
      if (defaultOptions.maxLength && finalName.length > defaultOptions.maxLength) {
        finalName = finalName.substring(0, defaultOptions.maxLength - 3) + '...';
      }

      // Generate alternatives
      const alternatives = this.generateAlternativeNames(node, context, baseName);

      // Calculate confidence
      const confidence = this.calculateConfidence(node, context, finalName);

      const result: AutoNamingResult = {
        suggestedName: finalName,
        confidence,
        reasoning: this.generateReasoning(node, context, finalName),
        alternatives
      };

      // Cache result
      this.namingCache.set(cacheKey, result);
      setTimeout(() => this.namingCache.delete(cacheKey), this.cacheTimeout);

      return result;
    } catch (error) {
      logger.error('Auto-naming failed:', error);

      return {
        suggestedName: node.type.charAt(0).toUpperCase() + node.type.slice(1),
        confidence: 0,
        reasoning: 'Fallback to default naming',
        alternatives: []
      };
    }
  }

  /**
   * Generate base name from patterns
   */
  private generateBaseName(node: WorkflowNode, context: NodeContext): string {
    const patterns = NAMING_PATTERNS[node.type];

    if (!patterns) {
      // Fallback to type-based naming
      return this.generateFallbackName(node, context);
    }

    // Sort patterns by priority
    const sortedPatterns = [...patterns.patterns].sort((a, b) => b.priority - a.priority);

    // Find first matching pattern
    const config = node.data.config || {};

    for (const pattern of sortedPatterns) {
      if (pattern.condition(config)) {
        return pattern.template(config);
      }
    }

    // Fallback to last pattern (lowest priority)
    return sortedPatterns[sortedPatterns.length - 1]?.template(config) || node.type;
  }

  /**
   * Generate fallback name when no patterns match
   */
  private generateFallbackName(node: WorkflowNode, context: NodeContext): string {
    // Use node type with better formatting
    const typeName = node.type
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();

    // Add context-based prefix
    if (context.isInLoop) {
      return `Process ${typeName}`;
    }

    if (context.isInConditional) {
      return `Check ${typeName}`;
    }

    return typeName;
  }

  /**
   * Generate alternative name suggestions
   */
  private generateAlternativeNames(
    node: WorkflowNode,
    context: NodeContext,
    baseName: string
  ): string[] {
    const alternatives: string[] = [];

    // Short version
    const shortName = baseName.split(' ').slice(0, 2).join(' ');
    if (shortName !== baseName) {
      alternatives.push(shortName);
    }

    // Detailed version
    if (node.data.config) {
      const config = node.data.config;

      if (config.url) {
        alternatives.push(`${baseName} (${this.extractDomain(config.url as string)})`);
      }

      if (config.table) {
        alternatives.push(`${baseName} - ${config.table}`);
      }
    }

    // Position-based variant
    if (context.depth > 0) {
      alternatives.push(`Step ${context.depth + 1}: ${baseName}`);
    }

    // Type-explicit variant
    alternatives.push(`${node.type}: ${baseName}`);

    return alternatives.slice(0, 3); // Limit to 3 alternatives
  }

  /**
   * Calculate confidence score (0-100)
   */
  private calculateConfidence(
    node: WorkflowNode,
    context: NodeContext,
    suggestedName: string
  ): number {
    let confidence = 50; // Base confidence

    // Higher confidence if we have config data
    if (node.data.config && Object.keys(node.data.config).length > 0) {
      confidence += 20;
    }

    // Higher confidence if pattern matched
    const patterns = NAMING_PATTERNS[node.type];
    if (patterns) {
      confidence += 15;
    }

    // Higher confidence if name is specific (not generic)
    const genericTerms = ['data', 'process', 'handle', 'execute'];
    const isGeneric = genericTerms.some(term =>
      suggestedName.toLowerCase().includes(term)
    );

    if (!isGeneric) {
      confidence += 10;
    }

    // Higher confidence if we have context
    if (context.previousNodes.length > 0 || context.nextNodes.length > 0) {
      confidence += 5;
    }

    return Math.min(confidence, 100);
  }

  /**
   * Generate reasoning for the suggested name
   */
  private generateReasoning(
    node: WorkflowNode,
    context: NodeContext,
    suggestedName: string
  ): string {
    const reasons: string[] = [];

    // Node type reasoning
    reasons.push(`Based on node type: ${node.type}`);

    // Config-based reasoning
    if (node.data.config) {
      const config = node.data.config;

      if (config.method) {
        reasons.push(`HTTP method: ${config.method}`);
      }

      if (config.url) {
        reasons.push(`API endpoint detected`);
      }

      if (config.table) {
        reasons.push(`Database table: ${config.table}`);
      }
    }

    // Context-based reasoning
    if (context.position === 'first') {
      reasons.push('First node in workflow (trigger)');
    }

    if (context.isInLoop) {
      reasons.push('Inside loop structure');
    }

    if (context.previousNodes.length > 0) {
      const prevTypes = context.previousNodes.map(n => n.type).join(', ');
      reasons.push(`Following: ${prevTypes}`);
    }

    return reasons.join('; ');
  }

  /**
   * Preview bulk rename for entire workflow
   */
  previewBulkRename(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): BulkRenamePreview[] {
    const previews: BulkRenamePreview[] = [];

    for (const node of nodes) {
      const result = this.generateNodeName(node, nodes, edges);

      previews.push({
        nodeId: node.id,
        currentName: node.data.label,
        suggestedName: result.suggestedName,
        confidence: result.confidence
      });
    }

    return previews;
  }

  /**
   * Apply bulk rename to workflow
   */
  applyBulkRename(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    updateNode: (nodeId: string, updates: Partial<NodeData>) => void
  ): { renamed: number; skipped: number } {
    let renamed = 0;
    let skipped = 0;

    const previews = this.previewBulkRename(nodes, edges);

    for (const preview of previews) {
      // Skip if confidence is too low
      if (preview.confidence < 50) {
        skipped++;
        continue;
      }

      // Skip if name didn't change
      if (preview.currentName === preview.suggestedName) {
        skipped++;
        continue;
      }

      // Apply rename
      updateNode(preview.nodeId, {
        label: preview.suggestedName
      });

      renamed++;
    }

    return { renamed, skipped };
  }

  /**
   * Check and suggest improvements for workflow naming
   */
  analyzeWorkflowNaming(nodes: WorkflowNode[]): {
    score: number;
    issues: string[];
    suggestions: Array<{
      nodeId: string;
      currentName: string;
      suggestion: string;
      reason: string;
    }>;
  } {
    const issues: string[] = [];
    const suggestions: Array<{
      nodeId: string;
      currentName: string;
      suggestion: string;
      reason: string;
    }> = [];

    // Check naming consistency
    const names = nodes.map(n => n.data.label);
    const consistency = checkNamingConsistency(names);

    if (!consistency.consistent) {
      issues.push(...consistency.issues);
    }

    // Check for generic names
    const genericNames = names.filter(n =>
      ['node', 'new node', 'untitled'].includes(n.toLowerCase())
    );

    if (genericNames.length > 0) {
      issues.push(`${genericNames.length} nodes have generic names`);
    }

    // Check for anti-patterns in each node
    for (const node of nodes) {
      const antiPatterns = contextAnalyzer.detectAntiPatterns(node.data.label);

      if (antiPatterns.length > 0) {
        const improvement = contextAnalyzer.suggestNameImprovement(
          node.data.label,
          node.type
        );

        if (improvement) {
          suggestions.push({
            nodeId: node.id,
            currentName: node.data.label,
            suggestion: improvement,
            reason: antiPatterns.join('; ')
          });
        }
      }
    }

    // Calculate score (0-100)
    const score = Math.max(0, 100 - (issues.length * 10) - (suggestions.length * 5));

    return { score, issues, suggestions };
  }

  /**
   * Helper: Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'API';
    }
  }

  /**
   * Helper: Generate cache key
   */
  private generateCacheKey(
    node: WorkflowNode,
    allNodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): string {
    const configHash = JSON.stringify(node.data.config || {});
    const contextHash = `${allNodes.length}-${edges.length}`;
    return `${node.id}-${node.type}-${configHash}-${contextHash}`;
  }

  /**
   * Clear naming cache
   */
  clearCache(): void {
    this.namingCache.clear();
  }
}

// Singleton instance
export const autoNamingService = new AutoNamingService();
