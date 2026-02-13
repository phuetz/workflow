/**
 * ExpressionContext - Rich context builder for n8n-compatible expressions
 *
 * Provides access to:
 * - $json - Current item JSON data
 * - $binary - Current item binary data
 * - $node(name) - Access specific node data
 * - $item(n) - Access item by index
 * - $items - All items array
 * - $runIndex - Current run iteration
 * - $workflow - Workflow metadata
 * - $execution - Execution context
 * - $env - Environment variables
 * - $now - Current timestamp
 * - $today - Today's date
 * - $uuid - Generate UUID
 */

import { v4 as uuidv4 } from 'uuid';

export interface WorkflowItem {
  json: Record<string, any>;
  binary?: Record<string, any>;
  pairedItem?: number | number[];
}

export interface NodeData {
  json: any[];
  binary?: any[];
  error?: Error;
}

export interface WorkflowMetadata {
  id: string;
  name: string;
  active: boolean;
  tags?: string[];
  settings?: Record<string, any>;
}

export interface ExecutionMetadata {
  id: string;
  mode: 'manual' | 'trigger' | 'webhook' | 'scheduled';
  startedAt: Date;
  resumeUrl?: string;
}

export interface ExpressionContextOptions {
  currentItem?: WorkflowItem;
  currentItemIndex?: number;
  allItems?: WorkflowItem[];
  nodeData?: Map<string, NodeData>;
  workflow?: WorkflowMetadata;
  execution?: ExecutionMetadata;
  environment?: Record<string, string>;
  runIndex?: number;
  previousNodeName?: string;
}

export class ExpressionContext {
  private currentItem?: WorkflowItem;
  private currentItemIndex: number;
  private allItems: WorkflowItem[];
  private nodeData: Map<string, NodeData>;
  private workflow?: WorkflowMetadata;
  private execution?: ExecutionMetadata;
  private environment: Record<string, string>;
  private runIndex: number;
  private previousNodeName?: string;

  constructor(options: ExpressionContextOptions = {}) {
    this.currentItem = options.currentItem;
    this.currentItemIndex = options.currentItemIndex ?? 0;
    this.allItems = options.allItems ?? [];
    this.nodeData = options.nodeData ?? new Map();
    this.workflow = options.workflow;
    this.execution = options.execution;
    this.environment = options.environment ?? {};
    this.runIndex = options.runIndex ?? 0;
    this.previousNodeName = options.previousNodeName;
  }

  /**
   * Build the complete context object for expression evaluation
   */
  buildContext(): Record<string, any> {
    return {
      // Current item data
      $json: this.get$json(),
      $binary: this.get$binary(),

      // Item access
      $item: this.get$item(),
      $items: this.get$items(),

      // Node access
      $node: this.get$node(),

      // Previous node shorthand
      $prevNode: this.get$prevNode(),

      // Execution context
      $runIndex: this.runIndex,
      $itemIndex: this.currentItemIndex,

      // Workflow metadata
      $workflow: this.get$workflow(),

      // Execution metadata
      $execution: this.get$execution(),

      // Environment
      $env: this.environment,

      // Utilities
      $now: this.get$now(),
      $today: this.get$today(),
      $uuid: this.get$uuid(),

      // Date utilities
      $timestamp: () => Date.now(),
      $dateTime: () => new Date(),

      // Parameter access (for node parameters)
      $parameter: this.get$parameter(),

      // Position in items
      $position: this.currentItemIndex,
      $first: this.currentItemIndex === 0,
      $last: this.currentItemIndex === this.allItems.length - 1,

      // Input data
      $input: this.get$input(),
    };
  }

  /**
   * Get current item's JSON data
   */
  private get$json(): any {
    return this.currentItem?.json ?? {};
  }

  /**
   * Get current item's binary data
   */
  private get$binary(): any {
    return this.currentItem?.binary ?? {};
  }

  /**
   * Get item by index
   * $item(0) - first item
   * $item(1) - second item
   * $item(-1) - last item
   */
  private get$item() {
    return (index: number = 0) => {
      // Handle negative indices
      const actualIndex = index < 0 ? this.allItems.length + index : index;

      if (actualIndex < 0 || actualIndex >= this.allItems.length) {
        return { json: {}, binary: {} };
      }

      return this.allItems[actualIndex];
    };
  }

  /**
   * Get all items
   */
  private get$items(): WorkflowItem[] {
    return this.allItems;
  }

  /**
   * Get data from a specific node
   * $node("HTTP Request").json
   * $node("HTTP Request").json[0]
   * $node("HTTP Request").binary
   */
  private get$node() {
    return (nodeName: string, outputIndex: number = 0, runIndex: number = 0) => {
      const data = this.nodeData.get(nodeName);

      if (!data) {
        return { json: [], binary: [], error: undefined };
      }

      // Return the data structure
      return {
        json: data.json ?? [],
        binary: data.binary ?? [],
        error: data.error,
        // Shorthand for first item
        first: () => ({
          json: data.json?.[0] ?? {},
          binary: data.binary?.[0] ?? {},
        }),
        // Shorthand for last item
        last: () => ({
          json: data.json?.[data.json.length - 1] ?? {},
          binary: data.binary?.[data.binary.length - 1] ?? {},
        }),
      };
    };
  }

  /**
   * Get data from previous node
   */
  private get$prevNode() {
    if (!this.previousNodeName) {
      return { json: [], binary: [] };
    }

    return this.get$node()(this.previousNodeName);
  }

  /**
   * Get workflow metadata
   */
  private get$workflow(): WorkflowMetadata | Record<string, any> {
    return this.workflow ?? {
      id: '',
      name: '',
      active: false,
    };
  }

  /**
   * Get execution metadata
   */
  private get$execution(): ExecutionMetadata | Record<string, any> {
    return this.execution ?? {
      id: '',
      mode: 'manual',
      startedAt: new Date(),
    };
  }

  /**
   * Get current timestamp
   */
  private get$now(): Date {
    return new Date();
  }

  /**
   * Get today's date (midnight)
   */
  private get$today(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  /**
   * Generate UUID
   */
  private get$uuid() {
    return () => uuidv4();
  }

  /**
   * Get parameter value (for node configuration)
   */
  private get$parameter() {
    return (name: string, defaultValue?: any) => {
      // This would be populated by the node configuration
      // For now, return the default value
      return defaultValue;
    };
  }

  /**
   * Get input data (alias for all items)
   */
  private get$input(): { all: () => WorkflowItem[]; first: () => WorkflowItem; last: () => WorkflowItem; item: WorkflowItem } {
    return {
      all: () => this.allItems,
      first: () => this.allItems[0] ?? { json: {}, binary: {} },
      last: () => this.allItems[this.allItems.length - 1] ?? { json: {}, binary: {} },
      item: this.currentItem ?? { json: {}, binary: {} },
    };
  }

  /**
   * Update current item
   */
  setCurrentItem(item: WorkflowItem, index: number): void {
    this.currentItem = item;
    this.currentItemIndex = index;
  }

  /**
   * Update all items
   */
  setAllItems(items: WorkflowItem[]): void {
    this.allItems = items;
  }

  /**
   * Add node data
   */
  addNodeData(nodeName: string, data: NodeData): void {
    this.nodeData.set(nodeName, data);
  }

  /**
   * Update workflow metadata
   */
  setWorkflow(workflow: WorkflowMetadata): void {
    this.workflow = workflow;
  }

  /**
   * Update execution metadata
   */
  setExecution(execution: ExecutionMetadata): void {
    this.execution = execution;
  }

  /**
   * Update environment variables
   */
  setEnvironment(env: Record<string, string>): void {
    this.environment = env;
  }

  /**
   * Update run index
   */
  setRunIndex(index: number): void {
    this.runIndex = index;
  }

  /**
   * Set previous node name
   */
  setPreviousNodeName(name: string): void {
    this.previousNodeName = name;
  }

  /**
   * Create a new context with updated options
   */
  clone(options: Partial<ExpressionContextOptions> = {}): ExpressionContext {
    return new ExpressionContext({
      currentItem: options.currentItem ?? this.currentItem,
      currentItemIndex: options.currentItemIndex ?? this.currentItemIndex,
      allItems: options.allItems ?? this.allItems,
      nodeData: options.nodeData ?? this.nodeData,
      workflow: options.workflow ?? this.workflow,
      execution: options.execution ?? this.execution,
      environment: options.environment ?? this.environment,
      runIndex: options.runIndex ?? this.runIndex,
      previousNodeName: options.previousNodeName ?? this.previousNodeName,
    });
  }

  /**
   * Get context summary for debugging
   */
  getSummary(): Record<string, any> {
    return {
      currentItemIndex: this.currentItemIndex,
      totalItems: this.allItems.length,
      runIndex: this.runIndex,
      availableNodes: Array.from(this.nodeData.keys()),
      workflowId: this.workflow?.id,
      executionId: this.execution?.id,
      environmentVariables: Object.keys(this.environment),
    };
  }
}

export default ExpressionContext;
