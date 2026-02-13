/**
 * N8n Importer
 * Handles import of workflows from n8n format
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
  SchemaValidationResult,
  N8nWorkflow,
  N8nNode,
  N8nConnections,
  NodeTypeMapping
} from './types';

/**
 * Mapping of n8n node types to internal node types
 */
const N8N_NODE_TYPE_MAPPINGS: NodeTypeMapping[] = [
  // Triggers
  { sourceType: 'n8n-nodes-base.webhook', targetType: 'webhook' },
  { sourceType: 'n8n-nodes-base.cron', targetType: 'schedule' },
  { sourceType: 'n8n-nodes-base.scheduleTrigger', targetType: 'schedule' },
  { sourceType: 'n8n-nodes-base.emailTrigger', targetType: 'email-trigger' },
  { sourceType: 'n8n-nodes-base.manualTrigger', targetType: 'trigger' },
  { sourceType: 'n8n-nodes-base.start', targetType: 'start' },

  // HTTP & API
  { sourceType: 'n8n-nodes-base.httpRequest', targetType: 'http' },
  { sourceType: 'n8n-nodes-base.webhook', targetType: 'webhook' },

  // Communication
  { sourceType: 'n8n-nodes-base.slack', targetType: 'slack' },
  { sourceType: 'n8n-nodes-base.discord', targetType: 'discord' },
  { sourceType: 'n8n-nodes-base.microsoftTeams', targetType: 'teams' },
  { sourceType: 'n8n-nodes-base.emailSend', targetType: 'email' },
  { sourceType: 'n8n-nodes-base.gmail', targetType: 'email' },
  { sourceType: 'n8n-nodes-base.twilio', targetType: 'sms' },

  // Data Processing
  { sourceType: 'n8n-nodes-base.if', targetType: 'if' },
  { sourceType: 'n8n-nodes-base.switch', targetType: 'switch' },
  { sourceType: 'n8n-nodes-base.merge', targetType: 'merge' },
  { sourceType: 'n8n-nodes-base.splitInBatches', targetType: 'split' },
  { sourceType: 'n8n-nodes-base.filter', targetType: 'filter' },
  { sourceType: 'n8n-nodes-base.sort', targetType: 'sort' },
  { sourceType: 'n8n-nodes-base.aggregate', targetType: 'aggregate' },
  { sourceType: 'n8n-nodes-base.set', targetType: 'transform' },
  { sourceType: 'n8n-nodes-base.function', targetType: 'function' },
  { sourceType: 'n8n-nodes-base.functionItem', targetType: 'function' },
  { sourceType: 'n8n-nodes-base.code', targetType: 'code' },
  { sourceType: 'n8n-nodes-base.wait', targetType: 'wait' },

  // Databases
  { sourceType: 'n8n-nodes-base.postgres', targetType: 'postgres' },
  { sourceType: 'n8n-nodes-base.mysql', targetType: 'mysql' },
  { sourceType: 'n8n-nodes-base.mongodb', targetType: 'mongodb' },
  { sourceType: 'n8n-nodes-base.redis', targetType: 'redis' },
  { sourceType: 'n8n-nodes-base.elasticsearch', targetType: 'elasticsearch' },

  // Cloud Storage
  { sourceType: 'n8n-nodes-base.awsS3', targetType: 's3' },
  { sourceType: 'n8n-nodes-base.googleDrive', targetType: 'google-drive' },
  { sourceType: 'n8n-nodes-base.dropbox', targetType: 'dropbox' },
  { sourceType: 'n8n-nodes-base.oneDrive', targetType: 'onedrive' },

  // CRM
  { sourceType: 'n8n-nodes-base.salesforce', targetType: 'salesforce' },
  { sourceType: 'n8n-nodes-base.hubspot', targetType: 'hubspot' },
  { sourceType: 'n8n-nodes-base.pipedrive', targetType: 'pipedrive' },
  { sourceType: 'n8n-nodes-base.zendesk', targetType: 'zendesk' },

  // Project Management
  { sourceType: 'n8n-nodes-base.jira', targetType: 'jira' },
  { sourceType: 'n8n-nodes-base.asana', targetType: 'asana' },
  { sourceType: 'n8n-nodes-base.trello', targetType: 'trello' },
  { sourceType: 'n8n-nodes-base.notion', targetType: 'notion' },
  { sourceType: 'n8n-nodes-base.airtable', targetType: 'airtable' },

  // AI/ML
  { sourceType: 'n8n-nodes-base.openAi', targetType: 'openai' },
  { sourceType: '@n8n/n8n-nodes-langchain.openAi', targetType: 'openai' },

  // Utility
  { sourceType: 'n8n-nodes-base.noOp', targetType: 'note' },
  { sourceType: 'n8n-nodes-base.stickyNote', targetType: 'note' },
  { sourceType: 'n8n-nodes-base.executeWorkflow', targetType: 'subworkflow' }
];

/**
 * Importer for n8n workflow format
 */
export class N8nImporter implements WorkflowImporter {
  private readonly nodeTypeMappings: Map<string, NodeTypeMapping>;

  constructor() {
    this.nodeTypeMappings = new Map();
    for (const mapping of N8N_NODE_TYPE_MAPPINGS) {
      this.nodeTypeMappings.set(mapping.sourceType, mapping);
    }
  }

  /**
   * Get the format identifier
   */
  getFormat(): string {
    return 'n8n';
  }

  /**
   * Check if this importer can handle the given data
   */
  canImport(data: unknown): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const obj = data as Record<string, unknown>;

    // n8n format has 'nodes' array and 'connections' object
    const hasNodes = Array.isArray(obj.nodes);
    const hasConnections = obj.connections && typeof obj.connections === 'object';

    // Also check if any node has n8n-style type naming
    if (hasNodes && hasConnections) {
      const nodes = obj.nodes as unknown[];
      const hasN8nNodeTypes = nodes.some((node) => {
        if (node && typeof node === 'object') {
          const n = node as Record<string, unknown>;
          return typeof n.type === 'string' && (
            n.type.startsWith('n8n-nodes-base.') ||
            n.type.startsWith('@n8n/')
          );
        }
        return false;
      });

      // Strong indicator of n8n format
      if (hasN8nNodeTypes) {
        return true;
      }

      // If nodes have position as [x, y] array format, it's likely n8n
      const hasArrayPositions = nodes.some((node) => {
        if (node && typeof node === 'object') {
          const n = node as Record<string, unknown>;
          return Array.isArray(n.position) && n.position.length === 2;
        }
        return false;
      });

      return hasArrayPositions;
    }

    return false;
  }

  /**
   * Validate the data without importing
   */
  async validate(data: unknown): Promise<SchemaValidationResult> {
    const errors: ImportError[] = [];

    if (!data || typeof data !== 'object') {
      errors.push({
        code: 'INVALID_FORMAT',
        message: 'Data must be a non-null object'
      });
      return { valid: false, errors };
    }

    const obj = data as Record<string, unknown>;

    // Validate nodes array
    if (!Array.isArray(obj.nodes)) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'n8n workflow must have a nodes array',
        path: 'nodes'
      });
    } else {
      (obj.nodes as unknown[]).forEach((node, index) => {
        const nodeErrors = this.validateN8nNode(node, index);
        errors.push(...nodeErrors);
      });
    }

    // Validate connections object
    if (!obj.connections || typeof obj.connections !== 'object') {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'n8n workflow must have a connections object',
        path: 'connections'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Import workflow from n8n data
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

    const n8nWorkflow = data as N8nWorkflow;

    // Create node name to ID mapping (n8n uses names for connections)
    const nodeNameToId = new Map<string, string>();

    // Transform n8n nodes to internal format
    const { nodes, nodeWarnings, nodeStats } = this.transformNodes(
      n8nWorkflow.nodes,
      nodeNameToId,
      options
    );
    warnings.push(...nodeWarnings);

    // Transform n8n connections to edges
    const { edges, edgeWarnings, edgeStats } = this.transformConnections(
      n8nWorkflow.connections,
      nodeNameToId
    );
    warnings.push(...edgeWarnings);

    // Generate workflow ID
    const workflowId = options.preserveIds && n8nWorkflow.id
      ? String(n8nWorkflow.id)
      : this.generateId();

    // Build workflow data
    const workflow: WorkflowData = {
      id: workflowId,
      name: n8nWorkflow.name || 'Imported n8n Workflow',
      description: `Imported from n8n workflow${n8nWorkflow.id ? ` (ID: ${n8nWorkflow.id})` : ''}`,
      version: n8nWorkflow.versionId || '1.0.0',
      nodes,
      edges,
      settings: {
        environment: 'default',
        timezone: n8nWorkflow.settings?.timezone,
        variables: {}
      },
      metadata: {
        importedAt: new Date(),
        importedFrom: 'n8n',
        originalFormat: 'n8n',
        originalId: n8nWorkflow.id ? String(n8nWorkflow.id) : undefined
      }
    };

    // Build statistics
    const statistics: ImportStatistics = {
      totalNodes: n8nWorkflow.nodes.length,
      importedNodes: nodeStats.imported,
      failedNodes: nodeStats.failed,
      totalEdges: edgeStats.total,
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
   * Validate a single n8n node
   */
  private validateN8nNode(node: unknown, index: number): ImportError[] {
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

    // n8n nodes require name (used as identifier in connections)
    if (!n.name || typeof n.name !== 'string') {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'n8n node must have a name',
        path: `${path}.name`
      });
    }

    // n8n nodes require type
    if (!n.type || typeof n.type !== 'string') {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'n8n node must have a type',
        path: `${path}.type`
      });
    }

    // n8n nodes have position as [x, y] array
    if (!Array.isArray(n.position) || n.position.length !== 2) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'n8n node must have a position array [x, y]',
        path: `${path}.position`
      });
    }

    return errors;
  }

  /**
   * Transform n8n nodes to internal format
   */
  private transformNodes(
    n8nNodes: N8nNode[],
    nodeNameToId: Map<string, string>,
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

    for (const n8nNode of n8nNodes) {
      try {
        // Generate or preserve ID
        const nodeId = options.preserveIds && n8nNode.id
          ? n8nNode.id
          : this.generateId();

        // Store name to ID mapping for connection resolution
        nodeNameToId.set(n8nNode.name, nodeId);

        // Map n8n node type to internal type
        const { type: mappedType, wasMapped } = this.mapNodeType(
          n8nNode.type,
          options.nodeTypeMappings
        );

        if (wasMapped) {
          mapped++;
        }

        // Check for unmapped types
        if (!wasMapped && n8nNode.type.startsWith('n8n-nodes-base.')) {
          warnings.push({
            code: 'UNKNOWN_NODE_TYPE',
            message: `Unknown n8n node type: ${n8nNode.type}`,
            path: `nodes.${n8nNode.name}`,
            suggestion: `Mapped to generic type. Consider adding a custom mapping.`
          });
        }

        // Transform parameters
        const nodeData = this.transformNodeParameters(n8nNode);

        // Handle disabled nodes
        if (n8nNode.disabled) {
          warnings.push({
            code: 'UNSUPPORTED_FEATURE',
            message: `Node "${n8nNode.name}" was disabled in n8n`,
            path: `nodes.${n8nNode.name}`,
            suggestion: 'The node will be imported but may need to be manually disabled'
          });
        }

        const node: WorkflowNode = {
          id: nodeId,
          type: mappedType,
          position: {
            x: n8nNode.position[0],
            y: n8nNode.position[1]
          },
          data: {
            ...nodeData,
            label: n8nNode.name,
            n8nOriginalType: n8nNode.type,
            notes: n8nNode.notes
          }
        };

        nodes.push(node);
        imported++;
      } catch (error) {
        failed++;
        warnings.push({
          code: 'UNSUPPORTED_FEATURE',
          message: `Failed to import node "${n8nNode.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
          path: `nodes.${n8nNode.name}`
        });
      }
    }

    return { nodes, nodeWarnings: warnings, nodeStats: { imported, failed, mapped } };
  }

  /**
   * Map n8n node type to internal type
   */
  private mapNodeType(
    n8nType: string,
    customMappings?: Record<string, string>
  ): { type: string; wasMapped: boolean } {
    // Check custom mappings first
    if (customMappings && customMappings[n8nType]) {
      return { type: customMappings[n8nType], wasMapped: true };
    }

    // Check built-in mappings
    const mapping = this.nodeTypeMappings.get(n8nType);
    if (mapping) {
      return { type: mapping.targetType, wasMapped: true };
    }

    // Extract base type from n8n naming convention
    // e.g., "n8n-nodes-base.slack" -> "slack"
    if (n8nType.startsWith('n8n-nodes-base.')) {
      const baseType = n8nType.replace('n8n-nodes-base.', '');
      return { type: baseType, wasMapped: false };
    }

    // For @n8n/ prefixed types
    if (n8nType.startsWith('@n8n/')) {
      const parts = n8nType.split('.');
      if (parts.length > 1) {
        return { type: parts[parts.length - 1], wasMapped: false };
      }
    }

    // Return as-is for unknown types
    return { type: n8nType, wasMapped: false };
  }

  /**
   * Transform n8n node parameters to internal format
   */
  private transformNodeParameters(n8nNode: N8nNode): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    // Copy parameters
    if (n8nNode.parameters) {
      // Transform n8n expression syntax to internal format
      for (const [key, value] of Object.entries(n8nNode.parameters)) {
        data[key] = this.transformValue(value);
      }
    }

    // Handle credentials reference
    if (n8nNode.credentials) {
      data.credentials = {};
      for (const [credType, credRef] of Object.entries(n8nNode.credentials)) {
        (data.credentials as Record<string, unknown>)[credType] = {
          id: credRef.id,
          name: credRef.name,
          needsConfiguration: true
        };
      }
    }

    return data;
  }

  /**
   * Transform n8n expression values to internal format
   */
  private transformValue(value: unknown): unknown {
    if (typeof value === 'string') {
      // n8n uses ={{...}} syntax for expressions
      // Convert to internal {{...}} syntax
      return value.replace(/=\{\{/g, '{{').replace(/\}\}/g, '}}');
    }

    if (Array.isArray(value)) {
      return value.map(v => this.transformValue(v));
    }

    if (value && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = this.transformValue(v);
      }
      return result;
    }

    return value;
  }

  /**
   * Transform n8n connections to internal edges
   */
  private transformConnections(
    connections: N8nConnections,
    nodeNameToId: Map<string, string>
  ): {
    edges: WorkflowEdge[];
    edgeWarnings: ImportWarning[];
    edgeStats: { total: number; imported: number };
  } {
    const edges: WorkflowEdge[] = [];
    const warnings: ImportWarning[] = [];
    let total = 0;

    // n8n connections format:
    // { "NodeName": { "main": [[{ node: "TargetNode", type: "main", index: 0 }]] } }
    for (const [sourceName, outputs] of Object.entries(connections)) {
      const sourceId = nodeNameToId.get(sourceName);

      if (!sourceId) {
        warnings.push({
          code: 'UNSUPPORTED_FEATURE',
          message: `Connection references unknown source node: ${sourceName}`,
          path: 'connections'
        });
        continue;
      }

      // Process each output type (usually 'main')
      for (const [outputType, outputArrays] of Object.entries(outputs)) {
        // Each output can have multiple output indices
        outputArrays.forEach((outputConnections, outputIndex) => {
          outputConnections.forEach((conn) => {
            total++;
            const targetId = nodeNameToId.get(conn.node);

            if (!targetId) {
              warnings.push({
                code: 'UNSUPPORTED_FEATURE',
                message: `Connection references unknown target node: ${conn.node}`,
                path: 'connections'
              });
              return;
            }

            const edge: WorkflowEdge = {
              id: this.generateEdgeId(sourceId, targetId, outputIndex, conn.index),
              source: sourceId,
              target: targetId,
              sourceHandle: outputType === 'main' ? `output-${outputIndex}` : `${outputType}-${outputIndex}`,
              targetHandle: `input-${conn.index}`
            };

            edges.push(edge);
          });
        });
      }
    }

    return {
      edges,
      edgeWarnings: warnings,
      edgeStats: { total, imported: edges.length }
    };
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Generate an edge ID
   */
  private generateEdgeId(
    source: string,
    target: string,
    outputIndex: number,
    inputIndex: number
  ): string {
    return `edge-${source}-${target}-${outputIndex}-${inputIndex}-${Math.random().toString(36).substring(2, 7)}`;
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
