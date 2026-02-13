/**
 * JSON Importer
 * Handles import of workflows in native JSON format
 */

import type { WorkflowNode, WorkflowEdge } from '../../types/workflow';
import type {
  WorkflowImporter,
  ImportOptions,
  ImportResult,
  ImportError,
  ImportWarning,
  ImportStatistics,
  WorkflowData,
  SchemaValidationResult
} from './types';

/**
 * Expected structure of a native JSON workflow export
 */
interface NativeJsonWorkflow {
  id?: string;
  name: string;
  description?: string;
  version?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  settings?: {
    environment?: string;
    timezone?: string;
    variables?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  exportedAt?: string;
  exportedBy?: string;
}

/**
 * Importer for native JSON workflow format
 */
export class JsonImporter implements WorkflowImporter {
  private readonly knownNodeTypes: Set<string>;

  constructor() {
    // Known built-in node types for validation
    this.knownNodeTypes = new Set([
      // Triggers
      'trigger', 'webhook', 'schedule', 'email-trigger', 'file-trigger',
      // Actions
      'http', 'email', 'slack', 'discord', 'teams',
      // Data Processing
      'filter', 'transform', 'merge', 'split', 'aggregate', 'sort',
      // Logic
      'if', 'switch', 'loop', 'wait', 'code', 'function',
      // Databases
      'postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch',
      // Cloud
      'aws', 's3', 'lambda', 'sqs', 'dynamodb',
      'gcp', 'azure', 'cloudflare',
      // AI/ML
      'openai', 'anthropic', 'google-ai', 'azure-openai',
      // CRM
      'salesforce', 'hubspot', 'pipedrive', 'zendesk',
      // Project Management
      'jira', 'asana', 'monday', 'clickup', 'linear',
      // Utility
      'start', 'end', 'note', 'comment', 'subworkflow'
    ]);
  }

  /**
   * Get the format identifier
   */
  getFormat(): string {
    return 'json';
  }

  /**
   * Check if this importer can handle the given data
   */
  canImport(data: unknown): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const obj = data as Record<string, unknown>;

    // Check for native JSON format markers
    // Must have nodes array and either edges array or be identifiable as our format
    const hasNodes = Array.isArray(obj.nodes);
    const hasEdges = Array.isArray(obj.edges);
    const hasName = typeof obj.name === 'string';

    // n8n format has 'connections' instead of 'edges'
    const isNotN8n = !('connections' in obj);

    // Zapier format has 'triggers' and 'actions' structure
    const isNotZapier = !('triggers' in obj && 'actions' in obj);

    return hasNodes && hasEdges && hasName && isNotN8n && isNotZapier;
  }

  /**
   * Validate the data without importing
   */
  async validate(data: unknown): Promise<SchemaValidationResult> {
    const errors: ImportError[] = [];

    // Check basic structure
    if (!data || typeof data !== 'object') {
      errors.push({
        code: 'INVALID_FORMAT',
        message: 'Data must be a non-null object'
      });
      return { valid: false, errors };
    }

    const obj = data as Record<string, unknown>;

    // Check required fields
    if (!obj.name || typeof obj.name !== 'string') {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Workflow name is required',
        path: 'name'
      });
    }

    if (!Array.isArray(obj.nodes)) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Nodes array is required',
        path: 'nodes'
      });
    }

    if (!Array.isArray(obj.edges)) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Edges array is required',
        path: 'edges'
      });
    }

    // Validate nodes structure
    if (Array.isArray(obj.nodes)) {
      const nodeIds = new Set<string>();

      (obj.nodes as unknown[]).forEach((node, index) => {
        const nodeErrors = this.validateNode(node, index, nodeIds);
        errors.push(...nodeErrors);
      });
    }

    // Validate edges structure
    if (Array.isArray(obj.nodes) && Array.isArray(obj.edges)) {
      const nodeIds = new Set((obj.nodes as WorkflowNode[]).map(n => n.id));

      (obj.edges as unknown[]).forEach((edge, index) => {
        const edgeErrors = this.validateEdge(edge, index, nodeIds);
        errors.push(...edgeErrors);
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Import workflow from JSON data
   */
  async import(data: unknown, options: ImportOptions = {}): Promise<ImportResult> {
    const startTime = Date.now();
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];

    // Validate schema if requested
    if (options.validateSchema !== false) {
      const validation = await this.validate(data);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: [],
          statistics: this.createEmptyStatistics(startTime)
        };
      }
    }

    const sourceData = data as NativeJsonWorkflow;

    // Parse and transform nodes
    const { nodes, nodeWarnings, nodeStats } = this.processNodes(
      sourceData.nodes,
      options
    );
    warnings.push(...nodeWarnings);

    // Parse and transform edges
    const nodeIds = new Set(nodes.map(n => n.id));
    const { edges, edgeWarnings, edgeStats } = this.processEdges(
      sourceData.edges,
      nodeIds
    );
    warnings.push(...edgeWarnings);

    // Generate workflow ID
    const workflowId = options.preserveIds && sourceData.id
      ? sourceData.id
      : this.generateId();

    // Build workflow data
    const workflow: WorkflowData = {
      id: workflowId,
      name: sourceData.name,
      description: sourceData.description,
      version: sourceData.version || '1.0.0',
      nodes,
      edges,
      settings: {
        environment: sourceData.settings?.environment || 'default',
        timezone: sourceData.settings?.timezone,
        variables: sourceData.settings?.variables || {}
      },
      metadata: {
        importedAt: new Date(),
        importedFrom: 'json',
        originalFormat: 'json',
        originalId: sourceData.id
      }
    };

    // Build statistics
    const statistics: ImportStatistics = {
      totalNodes: sourceData.nodes.length,
      importedNodes: nodeStats.imported,
      failedNodes: nodeStats.failed,
      totalEdges: sourceData.edges.length,
      importedEdges: edgeStats.imported,
      mappedNodeTypes: nodeStats.mapped,
      importDurationMs: Date.now() - startTime
    };

    return {
      success: errors.length === 0,
      workflow,
      errors,
      warnings,
      statistics
    };
  }

  /**
   * Validate a single node
   */
  private validateNode(
    node: unknown,
    index: number,
    seenIds: Set<string>
  ): ImportError[] {
    const errors: ImportError[] = [];
    const path = `nodes[${index}]`;

    if (!node || typeof node !== 'object') {
      errors.push({
        code: 'INVALID_FORMAT',
        message: `Node at index ${index} must be an object`,
        path
      });
      return errors;
    }

    const n = node as Record<string, unknown>;

    // Check required fields
    if (!n.id || typeof n.id !== 'string') {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Node must have a string id',
        path: `${path}.id`
      });
    } else if (seenIds.has(n.id)) {
      errors.push({
        code: 'DUPLICATE_NODE_ID',
        message: `Duplicate node id: ${n.id}`,
        path: `${path}.id`,
        value: n.id
      });
    } else {
      seenIds.add(n.id);
    }

    if (!n.type || typeof n.type !== 'string') {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Node must have a string type',
        path: `${path}.type`
      });
    }

    if (!n.position || typeof n.position !== 'object') {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Node must have a position object',
        path: `${path}.position`
      });
    } else {
      const pos = n.position as Record<string, unknown>;
      if (typeof pos.x !== 'number' || typeof pos.y !== 'number') {
        errors.push({
          code: 'INVALID_FORMAT',
          message: 'Node position must have numeric x and y properties',
          path: `${path}.position`
        });
      }
    }

    return errors;
  }

  /**
   * Validate a single edge
   */
  private validateEdge(
    edge: unknown,
    index: number,
    nodeIds: Set<string>
  ): ImportError[] {
    const errors: ImportError[] = [];
    const path = `edges[${index}]`;

    if (!edge || typeof edge !== 'object') {
      errors.push({
        code: 'INVALID_FORMAT',
        message: `Edge at index ${index} must be an object`,
        path
      });
      return errors;
    }

    const e = edge as Record<string, unknown>;

    if (!e.source || typeof e.source !== 'string') {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Edge must have a string source',
        path: `${path}.source`
      });
    } else if (!nodeIds.has(e.source)) {
      errors.push({
        code: 'INVALID_CONNECTION',
        message: `Edge source references non-existent node: ${e.source}`,
        path: `${path}.source`,
        value: e.source
      });
    }

    if (!e.target || typeof e.target !== 'string') {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Edge must have a string target',
        path: `${path}.target`
      });
    } else if (!nodeIds.has(e.target)) {
      errors.push({
        code: 'INVALID_CONNECTION',
        message: `Edge target references non-existent node: ${e.target}`,
        path: `${path}.target`,
        value: e.target
      });
    }

    return errors;
  }

  /**
   * Process and transform nodes
   */
  private processNodes(
    sourceNodes: WorkflowNode[],
    options: ImportOptions
  ): {
    nodes: WorkflowNode[];
    nodeWarnings: ImportWarning[];
    nodeStats: { imported: number; failed: number; mapped: number };
  } {
    const nodes: WorkflowNode[] = [];
    const warnings: ImportWarning[] = [];
    let imported = 0;
    let failed = 0;
    let mapped = 0;

    for (const sourceNode of sourceNodes) {
      try {
        const node = this.transformNode(sourceNode, options);

        // Check if node type was mapped
        if (options.nodeTypeMappings && options.nodeTypeMappings[sourceNode.type]) {
          mapped++;
        }

        // Check for unknown node types
        if (!this.isKnownNodeType(node.type)) {
          warnings.push({
            code: 'UNKNOWN_NODE_TYPE',
            message: `Unknown node type: ${node.type}`,
            path: `nodes.${node.id}`,
            suggestion: 'This node type may require a plugin or custom integration'
          });
        }

        nodes.push(node);
        imported++;
      } catch (error) {
        failed++;
        warnings.push({
          code: 'UNSUPPORTED_FEATURE',
          message: `Failed to process node ${sourceNode.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          path: `nodes.${sourceNode.id}`
        });
      }
    }

    return { nodes, nodeWarnings: warnings, nodeStats: { imported, failed, mapped } };
  }

  /**
   * Transform a single node
   */
  private transformNode(
    sourceNode: WorkflowNode,
    options: ImportOptions
  ): WorkflowNode {
    // Apply type mapping if configured
    let nodeType = sourceNode.type;
    if (options.nodeTypeMappings && options.nodeTypeMappings[sourceNode.type]) {
      nodeType = options.nodeTypeMappings[sourceNode.type];
    }

    // Generate new ID if not preserving
    const nodeId = options.preserveIds ? sourceNode.id : this.generateId();

    return {
      ...sourceNode,
      id: nodeId,
      type: nodeType
    };
  }

  /**
   * Process and transform edges
   */
  private processEdges(
    sourceEdges: WorkflowEdge[],
    validNodeIds: Set<string>
  ): {
    edges: WorkflowEdge[];
    edgeWarnings: ImportWarning[];
    edgeStats: { imported: number };
  } {
    const edges: WorkflowEdge[] = [];
    const warnings: ImportWarning[] = [];

    for (const sourceEdge of sourceEdges) {
      // Validate source and target exist
      if (!validNodeIds.has(sourceEdge.source)) {
        warnings.push({
          code: 'UNSUPPORTED_FEATURE',
          message: `Edge references invalid source node: ${sourceEdge.source}`,
          path: `edges`
        });
        continue;
      }

      if (!validNodeIds.has(sourceEdge.target)) {
        warnings.push({
          code: 'UNSUPPORTED_FEATURE',
          message: `Edge references invalid target node: ${sourceEdge.target}`,
          path: `edges`
        });
        continue;
      }

      edges.push({
        ...sourceEdge,
        id: sourceEdge.id || this.generateEdgeId(sourceEdge.source, sourceEdge.target)
      });
    }

    return {
      edges,
      edgeWarnings: warnings,
      edgeStats: { imported: edges.length }
    };
  }

  /**
   * Check if a node type is known
   */
  private isKnownNodeType(nodeType: string): boolean {
    const normalizedType = nodeType.toLowerCase();
    return (
      this.knownNodeTypes.has(normalizedType) ||
      normalizedType.startsWith('custom-') ||
      normalizedType.startsWith('plugin-')
    );
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Generate an edge ID from source and target
   */
  private generateEdgeId(source: string, target: string): string {
    return `edge-${source}-${target}-${Math.random().toString(36).substring(2, 7)}`;
  }

  /**
   * Create empty statistics for failed imports
   */
  private createEmptyStatistics(startTime: number): ImportStatistics {
    return {
      totalNodes: 0,
      importedNodes: 0,
      failedNodes: 0,
      totalEdges: 0,
      importedEdges: 0,
      mappedNodeTypes: 0,
      importDurationMs: Date.now() - startTime
    };
  }
}
