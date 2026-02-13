/**
 * n8n Workflow Importer
 * Converts n8n workflow JSON format to our internal format
 *
 * n8n workflow format documentation:
 * - nodes: Array of n8n nodes with type, parameters, position
 * - connections: Object mapping node names to their connections
 * - settings: Workflow settings (timezone, etc.)
 */

import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { nodeTypes } from '../data/nodeTypes';
import type {
  ImportResult,
  ImportError,
  ImportWarning,
  ImportOptions,
  ImportMappings,
  ImportStatistics,
} from '../types/importExport';

/**
 * n8n workflow format types
 */
export interface N8nWorkflow {
  id?: string;
  name: string;
  active?: boolean;
  nodes: N8nNode[];
  connections: N8nConnections;
  settings?: N8nSettings;
  staticData?: unknown;
  pinData?: Record<string, unknown[]>;
  tags?: N8nTag[];
  createdAt?: string;
  updatedAt?: string;
  versionId?: string;
}

export interface N8nNode {
  id?: string;
  name: string;
  type: string;
  typeVersion?: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, N8nCredentialRef>;
  disabled?: boolean;
  notes?: string;
  notesInFlow?: boolean;
  executeOnce?: boolean;
  alwaysOutputData?: boolean;
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
  continueOnFail?: boolean;
  onError?: 'stopWorkflow' | 'continueRegularOutput' | 'continueErrorOutput';
  color?: string;
}

export interface N8nCredentialRef {
  id: string;
  name: string;
}

export interface N8nConnections {
  [nodeName: string]: {
    main?: N8nConnectionItem[][];
    ai_languageModel?: N8nConnectionItem[][];
    ai_tool?: N8nConnectionItem[][];
    ai_memory?: N8nConnectionItem[][];
    ai_outputParser?: N8nConnectionItem[][];
  };
}

export interface N8nConnectionItem {
  node: string;
  type: string;
  index: number;
}

export interface N8nSettings {
  executionOrder?: 'v0' | 'v1';
  saveDataErrorExecution?: 'all' | 'none';
  saveDataSuccessExecution?: 'all' | 'none';
  saveManualExecutions?: boolean;
  callerPolicy?: 'any' | 'workflowsFromSameOwner' | 'none';
  timezone?: string;
  errorWorkflow?: string;
}

export interface N8nTag {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Node type mapping from n8n to our format
 */
const N8N_NODE_TYPE_MAPPING: Record<string, string> = {
  // Triggers
  'n8n-nodes-base.manualTrigger': 'manual-trigger',
  'n8n-nodes-base.scheduleTrigger': 'schedule',
  'n8n-nodes-base.webhook': 'webhook',
  'n8n-nodes-base.emailTrigger': 'email-trigger',
  'n8n-nodes-base.httpRequest': 'http-request',
  'n8n-nodes-base.httpRequestTool': 'http-request',

  // Code & Script
  'n8n-nodes-base.code': 'code',
  'n8n-nodes-base.function': 'code',
  'n8n-nodes-base.functionItem': 'code',
  'n8n-nodes-base.executeCommand': 'ssh',

  // Control Flow
  'n8n-nodes-base.if': 'condition',
  'n8n-nodes-base.switch': 'switch',
  'n8n-nodes-base.splitInBatches': 'batch',
  'n8n-nodes-base.merge': 'merge',
  'n8n-nodes-base.wait': 'delay',
  'n8n-nodes-base.noOp': 'pass-through',
  'n8n-nodes-base.set': 'set-variable',

  // Data Transformation
  'n8n-nodes-base.itemLists': 'data-transform',
  'n8n-nodes-base.crypto': 'crypto',
  'n8n-nodes-base.dateTime': 'date-time',
  'n8n-nodes-base.html': 'html-parse',
  'n8n-nodes-base.xml': 'xml-parse',
  'n8n-nodes-base.markdown': 'markdown',
  'n8n-nodes-base.spreadsheetFile': 'excel',
  'n8n-nodes-base.csv': 'csv',
  'n8n-nodes-base.compression': 'compression',

  // Communication
  'n8n-nodes-base.slack': 'slack',
  'n8n-nodes-base.discord': 'discord',
  'n8n-nodes-base.telegram': 'telegram',
  'n8n-nodes-base.emailSend': 'email',
  'n8n-nodes-base.msteams': 'teams',
  'n8n-nodes-base.twilio': 'twilio',

  // Databases
  'n8n-nodes-base.postgres': 'postgresql',
  'n8n-nodes-base.mysql': 'mysql',
  'n8n-nodes-base.mongoDb': 'mongodb',
  'n8n-nodes-base.redis': 'redis',
  'n8n-nodes-base.elasticsearch': 'elasticsearch',

  // Cloud Storage
  'n8n-nodes-base.awsS3': 's3',
  'n8n-nodes-base.googleDrive': 'google-drive',
  'n8n-nodes-base.dropbox': 'dropbox',
  'n8n-nodes-base.oneDrive': 'onedrive',
  'n8n-nodes-base.ftp': 'ftp',

  // CRM & Business
  'n8n-nodes-base.hubspot': 'hubspot',
  'n8n-nodes-base.salesforce': 'salesforce',
  'n8n-nodes-base.pipedrive': 'pipedrive',
  'n8n-nodes-base.zendesk': 'zendesk',
  'n8n-nodes-base.intercom': 'intercom',

  // Project Management
  'n8n-nodes-base.jira': 'jira',
  'n8n-nodes-base.asana': 'asana',
  'n8n-nodes-base.trello': 'trello',
  'n8n-nodes-base.clickUp': 'clickup',
  'n8n-nodes-base.linear': 'linear',
  'n8n-nodes-base.notion': 'notion',
  'n8n-nodes-base.airtable': 'airtable',

  // AI/ML
  'n8n-nodes-base.openAi': 'openai',
  '@n8n/n8n-nodes-langchain.openAi': 'openai',
  '@n8n/n8n-nodes-langchain.lmChatOpenAi': 'openai-chat',
  '@n8n/n8n-nodes-langchain.lmChatAnthropic': 'anthropic',
  '@n8n/n8n-nodes-langchain.agent': 'ai-agent',
  '@n8n/n8n-nodes-langchain.chainLlm': 'llm-chain',
  '@n8n/n8n-nodes-langchain.vectorStoreInMemory': 'vector-store',
  '@n8n/n8n-nodes-langchain.embeddingsOpenAi': 'embeddings',

  // Google Services
  'n8n-nodes-base.googleSheets': 'google-sheets',
  'n8n-nodes-base.gmail': 'gmail',
  'n8n-nodes-base.googleCalendar': 'google-calendar',
  'n8n-nodes-base.googleAnalytics': 'google-analytics',

  // Microsoft
  'n8n-nodes-base.microsoftExcel': 'excel',
  'n8n-nodes-base.microsoftOutlook': 'outlook',
  'n8n-nodes-base.microsoftOneDrive': 'onedrive',

  // Other
  'n8n-nodes-base.github': 'github',
  'n8n-nodes-base.gitlab': 'gitlab',
  'n8n-nodes-base.stripe': 'stripe',
  'n8n-nodes-base.twitter': 'twitter',
  'n8n-nodes-base.wordpress': 'wordpress',
  'n8n-nodes-base.rss': 'rss',
  'n8n-nodes-base.shopify': 'shopify',
  'n8n-nodes-base.sendGrid': 'sendgrid',
  'n8n-nodes-base.mailchimp': 'mailchimp',
  'n8n-nodes-base.stickyNote': 'sticky-note',

  // Error handling
  'n8n-nodes-base.errorTrigger': 'error-trigger',
  'n8n-nodes-base.stopAndError': 'error',

  // Workflow control
  'n8n-nodes-base.executeWorkflow': 'sub-workflow',
  'n8n-nodes-base.start': 'manual-trigger',
};

/**
 * N8n Workflow Importer Class
 */
export class N8nImporter {
  private nodeIdMap: Map<string, string> = new Map();
  private warnings: ImportWarning[] = [];
  private errors: ImportError[] = [];

  /**
   * Import n8n workflow
   */
  async import(
    n8nWorkflow: N8nWorkflow,
    options: ImportOptions = { format: 'n8n' }
  ): Promise<ExtendedImportResult> {
    const startTime = Date.now();
    this.nodeIdMap.clear();
    this.warnings = [];
    this.errors = [];

    try {
      // Validate workflow structure
      if (!this.validateN8nWorkflow(n8nWorkflow)) {
        return this.createErrorResult('Invalid n8n workflow format');
      }

      // Convert nodes
      const nodes = this.convertNodes(n8nWorkflow.nodes, options.mappings);

      // Convert connections to edges
      const edges = this.convertConnections(n8nWorkflow.connections, n8nWorkflow.nodes);

      // Apply position adjustments
      this.adjustPositions(nodes);

      const statistics: ImportStatistics = {
        totalNodes: n8nWorkflow.nodes.length,
        importedNodes: nodes.length,
        totalEdges: this.countConnections(n8nWorkflow.connections),
        importedEdges: edges.length,
        totalCredentials: this.countCredentials(n8nWorkflow.nodes),
        importedCredentials: 0, // Credentials need manual setup
        executionTime: Date.now() - startTime,
      };

      // Add credential warning if any credentials were found
      if (statistics.totalCredentials > 0) {
        this.warnings.push({
          type: 'credential_not_found',
          message: `${statistics.totalCredentials} credential(s) need to be configured manually`,
          suggestion: 'Set up credentials in the Credentials Manager',
        });
      }

      return {
        success: this.errors.length === 0,
        workflowId: undefined, // Will be set when saved
        errors: this.errors,
        warnings: this.warnings,
        statistics,
        mappingsApplied: options.mappings || {},
        nodes,
        edges,
        metadata: {
          name: n8nWorkflow.name,
          description: `Imported from n8n workflow`,
          tags: n8nWorkflow.tags?.map(t => t.name) || [],
          settings: n8nWorkflow.settings,
        },
      };
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown import error'
      );
    }
  }

  /**
   * Validate n8n workflow structure
   */
  private validateN8nWorkflow(workflow: unknown): workflow is N8nWorkflow {
    if (!workflow || typeof workflow !== 'object') {
      this.errors.push({
        type: 'invalid_format',
        message: 'Workflow must be an object',
      });
      return false;
    }

    const w = workflow as Record<string, unknown>;

    if (!w.name || typeof w.name !== 'string') {
      this.errors.push({
        type: 'invalid_format',
        message: 'Workflow must have a name',
      });
      return false;
    }

    if (!Array.isArray(w.nodes)) {
      this.errors.push({
        type: 'invalid_format',
        message: 'Workflow must have a nodes array',
      });
      return false;
    }

    if (!w.connections || typeof w.connections !== 'object') {
      this.errors.push({
        type: 'invalid_format',
        message: 'Workflow must have a connections object',
      });
      return false;
    }

    return true;
  }

  /**
   * Convert n8n nodes to our format
   */
  private convertNodes(
    n8nNodes: N8nNode[],
    mappings?: ImportMappings
  ): WorkflowNode[] {
    const nodes: WorkflowNode[] = [];

    for (const n8nNode of n8nNodes) {
      const node = this.convertNode(n8nNode, mappings);
      if (node) {
        nodes.push(node);
      }
    }

    return nodes;
  }

  /**
   * Convert a single n8n node
   */
  private convertNode(n8nNode: N8nNode, mappings?: ImportMappings): WorkflowNode | null {
    // Generate new ID
    const newId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    this.nodeIdMap.set(n8nNode.name, newId);

    // Map node type
    let ourType = this.mapNodeType(n8nNode.type, mappings);

    // Check if node type exists in our system
    const nodeTypeExists = ourType in nodeTypes || Object.values(nodeTypes).some(nt => nt.type === ourType);

    if (!nodeTypeExists) {
      // Try to find a similar node or use generic
      ourType = this.findSimilarNodeType(n8nNode.type) || 'code';

      this.warnings.push({
        type: 'deprecated_node',
        nodeId: newId,
        message: `Node type "${n8nNode.type}" not found, using "${ourType}"`,
        suggestion: 'Review node configuration after import',
      });
    }

    // Convert parameters
    const data = this.convertParameters(n8nNode, ourType);

    const node: WorkflowNode = {
      id: newId,
      type: 'custom',
      position: {
        x: n8nNode.position[0],
        y: n8nNode.position[1],
      },
      data: {
        id: newId,
        type: ourType,
        label: n8nNode.name,
        position: {
          x: n8nNode.position[0],
          y: n8nNode.position[1],
        },
        icon: '',
        color: n8nNode.color || '#94a3b8',
        inputs: 1,
        outputs: 1,
        config: {
          ...data,
          disabled: n8nNode.disabled || false,
          notes: n8nNode.notes,
          continueOnFail: n8nNode.continueOnFail || false,
          retryOnFail: n8nNode.retryOnFail || false,
          maxTries: n8nNode.maxTries || 3,
          waitBetweenTries: n8nNode.waitBetweenTries || 1000,
          onError: this.mapOnError(n8nNode.onError),
          // Preserve original n8n data for reference
          _n8n: {
            originalType: n8nNode.type,
            typeVersion: n8nNode.typeVersion,
            credentials: n8nNode.credentials,
          },
        },
      },
    };

    return node;
  }

  /**
   * Map n8n node type to our type
   */
  private mapNodeType(n8nType: string, mappings?: ImportMappings): string {
    // Check custom mappings first
    if (mappings?.nodeTypes?.[n8nType]) {
      return mappings.nodeTypes[n8nType];
    }

    // Check built-in mappings
    if (N8N_NODE_TYPE_MAPPING[n8nType]) {
      return N8N_NODE_TYPE_MAPPING[n8nType];
    }

    // Try to extract a meaningful type from the n8n type
    const parts = n8nType.split('.');
    const baseName = parts[parts.length - 1];

    // Convert camelCase to kebab-case
    return baseName
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
  }

  /**
   * Find similar node type in our system
   */
  private findSimilarNodeType(n8nType: string): string | null {
    const typeLower = n8nType.toLowerCase();

    // Search for similar node types
    for (const nodeType of Object.values(nodeTypes)) {
      if (typeLower.includes(nodeType.type.replace(/-/g, ''))) {
        return nodeType.type;
      }
    }

    // Category-based fallbacks
    if (typeLower.includes('trigger')) return 'webhook';
    if (typeLower.includes('email')) return 'email';
    if (typeLower.includes('http')) return 'http-request';
    if (typeLower.includes('database') || typeLower.includes('db')) return 'postgresql';
    if (typeLower.includes('ai') || typeLower.includes('llm') || typeLower.includes('chat')) return 'openai';
    if (typeLower.includes('condition') || typeLower.includes('if')) return 'condition';
    if (typeLower.includes('transform') || typeLower.includes('set')) return 'set-variable';

    return null;
  }

  /**
   * Convert n8n parameters to our data format
   */
  private convertParameters(n8nNode: N8nNode, ourType: string): Record<string, unknown> {
    const params = n8nNode.parameters;
    const data: Record<string, unknown> = {};

    // Common parameter conversions
    switch (ourType) {
      case 'http-request':
        data.url = params.url;
        data.method = params.method || params.requestMethod || 'GET';
        data.headers = this.convertHeaders(params.headerParameters || params.headers);
        data.body = params.body || params.bodyParameters;
        data.authentication = params.authentication;
        data.timeout = params.timeout || 10000;
        break;

      case 'webhook':
        data.path = params.path;
        data.method = params.httpMethod || 'GET';
        data.authentication = params.authentication;
        data.responseMode = params.responseMode;
        break;

      case 'schedule':
        data.rule = params.rule;
        data.cronExpression = params.cronExpression;
        data.interval = params.interval;
        data.unit = params.unit;
        break;

      case 'code':
        data.code = params.jsCode || params.functionCode || params.code;
        data.language = params.language || 'javascript';
        break;

      case 'condition':
        data.conditions = this.convertConditions(params.conditions);
        data.combineConditions = params.combineConditions || 'AND';
        break;

      case 'slack':
        data.channel = params.channel;
        data.text = params.text || params.message;
        data.operation = params.operation || params.resource;
        break;

      case 'email':
        data.to = params.toEmail || params.to;
        data.subject = params.subject;
        data.body = params.text || params.html || params.body;
        data.attachments = params.attachments;
        break;

      case 'postgresql':
      case 'mysql':
        data.query = params.query;
        data.operation = params.operation;
        data.table = params.table;
        break;

      case 'openai':
        data.model = params.model || 'gpt-4';
        data.prompt = params.prompt || params.text;
        data.temperature = params.temperature || 0.7;
        data.maxTokens = params.maxTokens;
        break;

      case 'set-variable':
        data.values = this.convertSetValues(params.values || params.assignments);
        data.mode = params.mode || 'manual';
        break;

      case 'merge':
        data.mode = params.mode || 'append';
        data.outputDataFrom = params.outputDataFrom;
        break;

      case 'delay':
        data.amount = params.value || params.amount || 1;
        data.unit = params.unit || 'seconds';
        break;

      default:
        // Copy all parameters as-is for unknown types
        Object.assign(data, params);
    }

    return data;
  }

  /**
   * Convert n8n headers format
   */
  private convertHeaders(
    headers: unknown
  ): Record<string, string> | undefined {
    if (!headers) return undefined;

    if (Array.isArray(headers)) {
      const result: Record<string, string> = {};
      for (const header of headers) {
        if (header.name && header.value) {
          result[header.name] = header.value;
        }
      }
      return result;
    }

    if (typeof headers === 'object') {
      return headers as Record<string, string>;
    }

    return undefined;
  }

  /**
   * Convert n8n conditions
   */
  private convertConditions(conditions: unknown): unknown[] {
    if (!conditions) return [];

    if (Array.isArray(conditions)) {
      return conditions.map(c => ({
        field: c.value1 || c.leftValue,
        operator: this.mapOperator(c.operation || c.operator),
        value: c.value2 || c.rightValue,
      }));
    }

    return [];
  }

  /**
   * Map n8n operator to our format
   */
  private mapOperator(op: string): string {
    const operatorMap: Record<string, string> = {
      'equal': 'equals',
      'notEqual': 'not_equals',
      'contains': 'contains',
      'notContains': 'not_contains',
      'startsWith': 'starts_with',
      'endsWith': 'ends_with',
      'isEmpty': 'is_empty',
      'isNotEmpty': 'is_not_empty',
      'regex': 'matches_regex',
      'larger': 'greater_than',
      'smaller': 'less_than',
      'largerEqual': 'greater_than_or_equal',
      'smallerEqual': 'less_than_or_equal',
    };

    return operatorMap[op] || op;
  }

  /**
   * Convert n8n set values
   */
  private convertSetValues(values: unknown): unknown[] {
    if (!values) return [];

    if (Array.isArray(values)) {
      return values.map(v => ({
        name: v.name || v.key,
        value: v.value,
        type: v.type || 'string',
      }));
    }

    return [];
  }

  /**
   * Map n8n onError setting
   */
  private mapOnError(onError?: string): string {
    const errorMap: Record<string, string> = {
      'stopWorkflow': 'stop',
      'continueRegularOutput': 'continue',
      'continueErrorOutput': 'error-output',
    };

    return errorMap[onError || ''] || 'stop';
  }

  /**
   * Convert n8n connections to our edge format
   */
  private convertConnections(
    connections: N8nConnections,
    nodes: N8nNode[]
  ): WorkflowEdge[] {
    const edges: WorkflowEdge[] = [];

    for (const [sourceName, outputs] of Object.entries(connections)) {
      const sourceId = this.nodeIdMap.get(sourceName);
      if (!sourceId) continue;

      // Handle main connections
      if (outputs.main) {
        for (let outputIndex = 0; outputIndex < outputs.main.length; outputIndex++) {
          const outputConnections = outputs.main[outputIndex];
          if (!outputConnections) continue;

          for (const conn of outputConnections) {
            const targetId = this.nodeIdMap.get(conn.node);
            if (!targetId) {
              this.warnings.push({
                type: 'missing_optional_field',
                message: `Target node "${conn.node}" not found for connection`,
                nodeId: sourceId,
              });
              continue;
            }

            const edge: WorkflowEdge = {
              id: `edge_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
              source: sourceId,
              target: targetId,
              sourceHandle: outputIndex > 0 ? `output_${outputIndex}` : undefined,
              targetHandle: conn.index > 0 ? `input_${conn.index}` : undefined,
              animated: true,
              style: {
                stroke: '#94a3b8',
                strokeWidth: 2,
              },
            };

            edges.push(edge);
          }
        }
      }

      // Handle AI connections (langchain nodes)
      const aiConnTypes = ['ai_languageModel', 'ai_tool', 'ai_memory', 'ai_outputParser'] as const;
      for (const connType of aiConnTypes) {
        if (outputs[connType]) {
          for (const outputConnections of outputs[connType]) {
            if (!outputConnections) continue;
            for (const conn of outputConnections) {
              const targetId = this.nodeIdMap.get(conn.node);
              if (!targetId) continue;

              const edge: WorkflowEdge = {
                id: `edge_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                source: sourceId,
                target: targetId,
                sourceHandle: connType,
                targetHandle: connType,
                animated: true,
                data: {
                  condition: connType.replace('ai_', ''),
                },
                style: {
                  stroke: '#8b5cf6', // Purple for AI connections
                  strokeWidth: 2,
                },
              };

              edges.push(edge);
            }
          }
        }
      }
    }

    return edges;
  }

  /**
   * Adjust node positions for better layout
   */
  private adjustPositions(nodes: WorkflowNode[]): void {
    // Find min position
    let minX = Infinity;
    let minY = Infinity;

    for (const node of nodes) {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
    }

    // Offset all nodes to start from (100, 100)
    const offsetX = 100 - minX;
    const offsetY = 100 - minY;

    for (const node of nodes) {
      node.position.x += offsetX;
      node.position.y += offsetY;
    }
  }

  /**
   * Count total connections in n8n format
   */
  private countConnections(connections: N8nConnections): number {
    let count = 0;

    for (const outputs of Object.values(connections)) {
      if (outputs.main) {
        for (const outputConnections of outputs.main) {
          if (outputConnections) {
            count += outputConnections.length;
          }
        }
      }
    }

    return count;
  }

  /**
   * Count credentials in nodes
   */
  private countCredentials(nodes: N8nNode[]): number {
    let count = 0;

    for (const node of nodes) {
      if (node.credentials) {
        count += Object.keys(node.credentials).length;
      }
    }

    return count;
  }

  /**
   * Create error result
   */
  private createErrorResult(message: string): ExtendedImportResult {
    return {
      success: false,
      errors: [{ type: 'invalid_format', message }],
      warnings: [],
      statistics: {
        totalNodes: 0,
        importedNodes: 0,
        totalEdges: 0,
        importedEdges: 0,
        totalCredentials: 0,
        importedCredentials: 0,
        executionTime: 0,
      },
      mappingsApplied: {},
    };
  }

  /**
   * Parse n8n workflow from JSON string
   */
  static parseN8nWorkflow(json: string): N8nWorkflow {
    const parsed = JSON.parse(json);

    // Handle n8n export format variations
    if (parsed.workflow) {
      return parsed.workflow;
    }

    if (parsed.data?.workflow) {
      return parsed.data.workflow;
    }

    return parsed;
  }

  /**
   * Detect if JSON is n8n workflow format
   */
  static isN8nWorkflow(json: unknown): boolean {
    if (!json || typeof json !== 'object') return false;

    const obj = json as Record<string, unknown>;

    // Check for n8n workflow structure
    return (
      (Array.isArray(obj.nodes) && typeof obj.connections === 'object') ||
      (obj.workflow && typeof obj.workflow === 'object' && Array.isArray((obj.workflow as Record<string, unknown>).nodes))
    );
  }
}

// Extended ImportResult for our use
interface ExtendedImportResult extends ImportResult {
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  metadata?: {
    name: string;
    description: string;
    tags: string[];
    settings?: N8nSettings;
  };
}

export type { ExtendedImportResult };

// Singleton instance
export const n8nImporter = new N8nImporter();
