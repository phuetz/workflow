/**
 * Data Pinning System
 * Capture, store, and replay execution data for testing and debugging
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// Types
export interface PinnedData {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  workflowId: string;
  executionId?: string;
  data: PinnedNodeData;
  metadata: PinMetadata;
  comparison?: ComparisonResult;
  createdAt: Date;
  updatedAt: Date;
}

export interface PinnedNodeData {
  input: any;
  output: any;
  error?: any;
  context?: ExecutionContext;
  timing?: TimingInfo;
}

export interface ExecutionContext {
  variables: { [key: string]: any };
  credentials?: { [key: string]: string };
  environment?: string;
  mode?: 'production' | 'test' | 'development';
  trigger?: TriggerInfo;
}

export interface TriggerInfo {
  type: string;
  data: any;
  timestamp: Date;
  source?: string;
}

export interface TimingInfo {
  startTime: Date;
  endTime: Date;
  duration: number;
  cpuTime?: number;
  memoryUsed?: number;
}

export interface PinMetadata {
  description?: string;
  tags?: string[];
  version?: string;
  author?: string;
  locked?: boolean;
  expires?: Date;
  checksum?: string;
  size?: number;
}

export interface ComparisonResult {
  match: boolean;
  differences: Difference[];
  similarity: number;
  timestamp: Date;
}

export interface Difference {
  path: string;
  type: 'added' | 'removed' | 'changed' | 'type';
  expected: any;
  actual: any;
  message?: string;
}

export interface PinConfiguration {
  enabled: boolean;
  mode: PinMode;
  scope: PinScope;
  filters?: PinFilters;
  storage?: StorageOptions;
  comparison?: ComparisonOptions;
}

export type PinMode = 
  | 'capture'    // Capture new data
  | 'replay'     // Use pinned data
  | 'compare'    // Compare with pinned data
  | 'hybrid';    // Capture if missing, replay if exists

export type PinScope = 
  | 'all'        // Pin all nodes
  | 'selected'   // Pin selected nodes only
  | 'errors'     // Pin only error cases
  | 'custom';    // Custom filter function

export interface PinFilters {
  nodeTypes?: string[];
  nodeIds?: string[];
  workflows?: string[];
  tags?: string[];
  minDuration?: number;
  hasError?: boolean;
}

export interface StorageOptions {
  location: 'memory' | 'file' | 'database' | 's3';
  path?: string;
  encryption?: boolean;
  compression?: boolean;
  maxSize?: number;
  ttl?: number;
}

export interface ComparisonOptions {
  strict?: boolean;
  ignoreFields?: string[];
  tolerance?: number;
  deepCompare?: boolean;
  orderMatters?: boolean;
}

export interface PinSnapshot {
  id: string;
  name: string;
  description?: string;
  workflowId: string;
  pins: PinnedData[];
  metadata: SnapshotMetadata;
  createdAt: Date;
}

export interface SnapshotMetadata {
  totalPins: number;
  totalSize: number;
  coverage: number;
  nodesCovered: string[];
  executionId?: string;
  environment?: string;
  tags?: string[];
}

export interface DataReplay {
  snapshotId: string;
  mode: 'sequential' | 'parallel' | 'manual';
  speed?: number;
  loop?: boolean;
  breakpoints?: string[];
  callbacks?: ReplayCallbacks;
}

export interface ReplayCallbacks {
  onNodeStart?: (nodeId: string, data: PinnedNodeData) => void;
  onNodeComplete?: (nodeId: string, result: any) => void;
  onNodeError?: (nodeId: string, error: any) => void;
  onComplete?: (results: ReplayResults) => void;
}

export interface ReplayResults {
  success: boolean;
  nodesReplayed: number;
  matches: number;
  mismatches: number;
  errors: ReplayError[];
  duration: number;
}

export interface ReplayError {
  nodeId: string;
  type: 'missing_pin' | 'execution_error' | 'comparison_mismatch';
  message: string;
  details?: any;
}

export interface PinStatistics {
  totalPins: number;
  totalSize: number;
  byNode: { [nodeId: string]: NodePinStats };
  byWorkflow: { [workflowId: string]: number };
  oldestPin?: Date;
  newestPin?: Date;
  averageSize: number;
}

export interface NodePinStats {
  count: number;
  size: number;
  lastPinned: Date;
  averageDuration?: number;
  errorRate?: number;
}

// Main System Class
export class DataPinningSystem extends EventEmitter {
  private static instance: DataPinningSystem;
  private pins: Map<string, PinnedData> = new Map();
  private snapshots: Map<string, PinSnapshot> = new Map();
  private configuration: PinConfiguration;
  private storage: DataStorage;
  private comparator: DataComparator;
  private replayer: DataReplayer;
  private currentExecution?: string;
  private captureBuffer: Map<string, PinnedNodeData> = new Map();
  private readonly MAX_PIN_SIZE = 5 * 1024 * 1024; // 5MB per pin
  private readonly MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB total

  private constructor() {
    super();
    this.configuration = this.getDefaultConfiguration();
    this.storage = new MemoryDataStorage();
    this.comparator = new DataComparator();
    this.replayer = new DataReplayer(this);
    this.startCleanupScheduler();
  }

  public static getInstance(): DataPinningSystem {
    if (!DataPinningSystem.instance) {
      DataPinningSystem.instance = new DataPinningSystem();
    }
    return DataPinningSystem.instance;
  }

  // Configuration
  public configure(config: Partial<PinConfiguration>): void {
    this.configuration = { ...this.configuration, ...config };
    
    // Update storage if changed
    if (config.storage) {
      this.storage = this.createStorage(config.storage);
    }
    
    this.emit('configuration:updated', this.configuration);
  }

  public getConfiguration(): PinConfiguration {
    return { ...this.configuration };
  }

  public setMode(mode: PinMode): void {
    this.configuration.mode = mode;
    this.emit('mode:changed', mode);
  }

  public enable(): void {
    this.configuration.enabled = true;
    this.emit('pinning:enabled');
  }

  public disable(): void {
    this.configuration.enabled = false;
    this.emit('pinning:disabled');
  }

  // Data Capture
  public async captureNodeExecution(
    nodeId: string,
    nodeName: string,
    nodeType: string,
    workflowId: string,
    data: PinnedNodeData,
    metadata?: Partial<PinMetadata>
  ): Promise<PinnedData | null> {
    try {
      if (!this.shouldCapture(nodeId, nodeType, workflowId, data)) {
        return null;
      }

      this.emit('capture:start', { nodeId, workflowId });

      // Check size limit
      const dataSize = this.calculateDataSize(data);
      if (dataSize > this.MAX_PIN_SIZE) {
        this.emit('capture:oversized', { nodeId, size: dataSize });
        
        // Try to compress
        data = await this.compressData(data);
      }

      // Create pinned data
      const pin: PinnedData = {
        id: this.generatePinId(),
        nodeId,
        nodeName,
        nodeType,
        workflowId,
        executionId: this.currentExecution,
        data: this.sanitizeData(data),
        metadata: {
          ...metadata,
          checksum: this.calculateChecksum(data),
          size: dataSize,
          locked: metadata?.locked ?? false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Check if we should compare with existing pin
      if (this.configuration.mode === 'compare' || this.configuration.mode === 'hybrid') {
        const existing = await this.getPinForNode(nodeId, workflowId);
        if (existing) {
          pin.comparison = await this.comparator.compare(
            existing.data,
            data,
            this.configuration.comparison
          );
          
          if (!pin.comparison.match) {
            this.emit('comparison:mismatch', {
              nodeId,
              differences: pin.comparison.differences
            });
          }
        }
      }

      // Store pin
      await this.storage.store(pin);
      this.pins.set(pin.id, pin);

      // Update buffer for snapshot
      if (this.currentExecution) {
        this.captureBuffer.set(nodeId, data);
      }

      // Check total size limit
      await this.enforceStorageLimits();

      this.emit('capture:complete', { pin });
      return pin;
    } catch (error) {
      this.emit('capture:error', { nodeId, error });
      throw error;
    }
  }

  public async pinNode(
    nodeId: string,
    workflowId: string,
    data: any
  ): Promise<PinnedData> {
    // Manual pinning of specific data
    const nodeInfo = await this.getNodeInfo(nodeId, workflowId);
    
    return this.captureNodeExecution(
      nodeId,
      nodeInfo.name,
      nodeInfo.type,
      workflowId,
      {
        input: data.input || {},
        output: data.output || data,
        context: data.context
      },
      {
        description: 'Manually pinned',
        locked: true
      }
    ) as Promise<PinnedData>;
  }

  public async unpinNode(nodeId: string, workflowId: string): Promise<void> {
    const pins = Array.from(this.pins.values()).filter(
      p => p.nodeId === nodeId && p.workflowId === workflowId && !p.metadata.locked
    );
    
    for (const pin of pins) {
      await this.deletePin(pin.id);
    }
    
    this.emit('node:unpinned', { nodeId, workflowId });
  }

  // Data Retrieval
  public async getPinForNode(
    nodeId: string,
    workflowId: string
  ): Promise<PinnedData | null> {
    // Get most recent pin for node
    const pins = Array.from(this.pins.values())
      .filter(p => p.nodeId === nodeId && p.workflowId === workflowId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return pins[0] || null;
  }

  public async getPinsForWorkflow(workflowId: string): Promise<PinnedData[]> {
    return Array.from(this.pins.values())
      .filter(p => p.workflowId === workflowId)
      .sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  }

  public async getPinById(pinId: string): Promise<PinnedData | null> {
    const pin = this.pins.get(pinId);
    if (pin) {
      return pin;
    }
    
    // Try to load from storage
    return this.storage.retrieve(pinId);
  }

  public async searchPins(filters: {
    nodeId?: string;
    nodeType?: string;
    workflowId?: string;
    tags?: string[];
    startDate?: Date;
    endDate?: Date;
  }): Promise<PinnedData[]> {
    let results = Array.from(this.pins.values());
    
    if (filters.nodeId) {
      results = results.filter(p => p.nodeId === filters.nodeId);
    }
    
    if (filters.nodeType) {
      results = results.filter(p => p.nodeType === filters.nodeType);
    }
    
    if (filters.workflowId) {
      results = results.filter(p => p.workflowId === filters.workflowId);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(p => 
        filters.tags!.some(tag => p.metadata.tags?.includes(tag))
      );
    }
    
    if (filters.startDate) {
      results = results.filter(p => p.createdAt >= filters.startDate!);
    }
    
    if (filters.endDate) {
      results = results.filter(p => p.createdAt <= filters.endDate!);
    }
    
    return results;
  }

  // Snapshot Management
  public async createSnapshot(
    name: string,
    workflowId: string,
    options: {
      description?: string;
      tags?: string[];
      includeAll?: boolean;
    } = {}
  ): Promise<PinSnapshot> {
    const pins = options.includeAll
      ? Array.from(this.pins.values()).filter(p => p.workflowId === workflowId)
      : Array.from(this.captureBuffer.entries()).map(([nodeId, data]) => {
          const existing = Array.from(this.pins.values()).find(
            p => p.nodeId === nodeId && p.workflowId === workflowId
          );
          return existing || this.createTemporaryPin(nodeId, workflowId, data);
        });
    
    const snapshot: PinSnapshot = {
      id: this.generateSnapshotId(),
      name,
      description: options.description,
      workflowId,
      pins,
      metadata: {
        totalPins: pins.length,
        totalSize: pins.reduce((sum, p) => sum + (p.metadata.size || 0), 0),
        coverage: await this.calculateCoverage(workflowId, pins),
        nodesCovered: [...new Set(pins.map(p => p.nodeId))],
        executionId: this.currentExecution,
        environment: this.getEnvironment(),
        tags: options.tags
      },
      createdAt: new Date()
    };
    
    this.snapshots.set(snapshot.id, snapshot);
    await this.storage.storeSnapshot(snapshot);
    
    this.emit('snapshot:created', { snapshot });
    return snapshot;
  }

  public async loadSnapshot(snapshotId: string): Promise<void> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }
    
    // Clear current pins for workflow
    const workflowPins = Array.from(this.pins.values())
      .filter(p => p.workflowId === snapshot.workflowId);
    
    for (const pin of workflowPins) {
      this.pins.delete(pin.id);
    }
    
    // Load snapshot pins
    for (const pin of snapshot.pins) {
      this.pins.set(pin.id, pin);
    }
    
    this.emit('snapshot:loaded', { snapshotId });
  }

  public async deleteSnapshot(snapshotId: string): Promise<void> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }
    
    this.snapshots.delete(snapshotId);
    await this.storage.deleteSnapshot(snapshotId);
    
    this.emit('snapshot:deleted', { snapshotId });
  }

  public async listSnapshots(workflowId?: string): Promise<PinSnapshot[]> {
    let snapshots = Array.from(this.snapshots.values());
    
    if (workflowId) {
      snapshots = snapshots.filter(s => s.workflowId === workflowId);
    }
    
    return snapshots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Data Replay
  public async replayData(
    snapshotId: string,
    options: DataReplay
  ): Promise<ReplayResults> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }
    
    this.emit('replay:start', { snapshotId });
    
    const results = await this.replayer.replay(snapshot, options);
    
    this.emit('replay:complete', { results });
    return results;
  }

  public async replayNode(
    nodeId: string,
    workflowId: string
  ): Promise<any> {
    const pin = await this.getPinForNode(nodeId, workflowId);
    if (!pin) {
      throw new Error(`No pinned data found for node ${nodeId}`);
    }
    
    return pin.data.output;
  }

  // Data Comparison
  public async compareExecutions(
    executionId1: string,
    executionId2: string
  ): Promise<ComparisonResult> {
    const pins1 = Array.from(this.pins.values())
      .filter(p => p.executionId === executionId1);
    const pins2 = Array.from(this.pins.values())
      .filter(p => p.executionId === executionId2);
    
    const differences: Difference[] = [];
    let matches = 0;
    let total = 0;
    
    for (const pin1 of pins1) {
      const pin2 = pins2.find(p => p.nodeId === pin1.nodeId);
      total++;
      
      if (!pin2) {
        differences.push({
          path: pin1.nodeId,
          type: 'removed',
          expected: pin1.data,
          actual: null,
          message: `Node ${pin1.nodeId} not found in execution 2`
        });
      } else {
        const comparison = await this.comparator.compare(
          pin1.data,
          pin2.data,
          this.configuration.comparison
        );
        
        if (comparison.match) {
          matches++;
        } else {
          differences.push(...comparison.differences);
        }
      }
    }
    
    // Check for added nodes in execution 2
    for (const pin2 of pins2) {
      if (!pins1.find(p => p.nodeId === pin2.nodeId)) {
        differences.push({
          path: pin2.nodeId,
          type: 'added',
          expected: null,
          actual: pin2.data,
          message: `Node ${pin2.nodeId} added in execution 2`
        });
      }
    }
    
    return {
      match: differences.length === 0,
      differences,
      similarity: total > 0 ? matches / total : 0,
      timestamp: new Date()
    };
  }

  public async compareWithBaseline(
    workflowId: string,
    baselineSnapshotId: string
  ): Promise<ComparisonResult> {
    const baseline = this.snapshots.get(baselineSnapshotId);
    if (!baseline) {
      throw new Error(`Baseline snapshot ${baselineSnapshotId} not found`);
    }
    
    const currentPins = await this.getPinsForWorkflow(workflowId);
    const baselinePins = baseline.pins;
    
    const differences: Difference[] = [];
    let matches = 0;
    
    for (const baselinePin of baselinePins) {
      const currentPin = currentPins.find(p => p.nodeId === baselinePin.nodeId);
      
      if (!currentPin) {
        differences.push({
          path: baselinePin.nodeId,
          type: 'removed',
          expected: baselinePin.data,
          actual: null
        });
      } else {
        const comparison = await this.comparator.compare(
          baselinePin.data,
          currentPin.data,
          this.configuration.comparison
        );
        
        if (comparison.match) {
          matches++;
        } else {
          differences.push(...comparison.differences);
        }
      }
    }
    
    return {
      match: differences.length === 0,
      differences,
      similarity: baselinePins.length > 0 ? matches / baselinePins.length : 0,
      timestamp: new Date()
    };
  }

  // Data Management
  public async updatePin(
    pinId: string,
    updates: Partial<PinnedData>
  ): Promise<PinnedData> {
    const pin = this.pins.get(pinId);
    if (!pin) {
      throw new Error(`Pin ${pinId} not found`);
    }
    
    if (pin.metadata.locked) {
      throw new Error('Cannot update locked pin');
    }
    
    const updatedPin = {
      ...pin,
      ...updates,
      updatedAt: new Date()
    };
    
    this.pins.set(pinId, updatedPin);
    await this.storage.store(updatedPin);
    
    this.emit('pin:updated', { pin: updatedPin });
    return updatedPin;
  }

  public async deletePin(pinId: string): Promise<void> {
    const pin = this.pins.get(pinId);
    if (!pin) {
      throw new Error(`Pin ${pinId} not found`);
    }
    
    if (pin.metadata.locked) {
      throw new Error('Cannot delete locked pin');
    }
    
    this.pins.delete(pinId);
    await this.storage.delete(pinId);
    
    this.emit('pin:deleted', { pinId });
  }

  public async clearPins(workflowId?: string): Promise<void> {
    const pins = workflowId
      ? Array.from(this.pins.values()).filter(p => p.workflowId === workflowId)
      : Array.from(this.pins.values());
    
    for (const pin of pins) {
      if (!pin.metadata.locked) {
        await this.deletePin(pin.id);
      }
    }
    
    this.emit('pins:cleared', { workflowId });
  }

  // Import/Export
  public async exportPins(
    workflowId?: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const pins = workflowId
      ? await this.getPinsForWorkflow(workflowId)
      : Array.from(this.pins.values());
    
    if (format === 'csv') {
      return this.exportAsCSV(pins);
    }
    
    return JSON.stringify(pins, null, 2);
  }

  public async importPins(
    data: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<number> {
    let pins: PinnedData[];
    
    if (format === 'csv') {
      pins = this.parseCSV(data);
    } else {
      pins = JSON.parse(data);
    }
    
    let imported = 0;
    for (const pin of pins) {
      try {
        await this.storage.store(pin);
        this.pins.set(pin.id, pin);
        imported++;
      } catch (error) {
        this.emit('import:error', { pin, error });
      }
    }
    
    this.emit('pins:imported', { count: imported });
    return imported;
  }

  // Statistics
  public async getStatistics(): Promise<PinStatistics> {
    const pins = Array.from(this.pins.values());
    const stats: PinStatistics = {
      totalPins: pins.length,
      totalSize: pins.reduce((sum, p) => sum + (p.metadata.size || 0), 0),
      byNode: {},
      byWorkflow: {},
      averageSize: 0
    };
    
    for (const pin of pins) {
      // By node
      if (!stats.byNode[pin.nodeId]) {
        stats.byNode[pin.nodeId] = {
          count: 0,
          size: 0,
          lastPinned: pin.createdAt
        };
      }
      stats.byNode[pin.nodeId].count++;
      stats.byNode[pin.nodeId].size += pin.metadata.size || 0;
      if (pin.createdAt > stats.byNode[pin.nodeId].lastPinned) {
        stats.byNode[pin.nodeId].lastPinned = pin.createdAt;
      }
      
      // By workflow
      stats.byWorkflow[pin.workflowId] = (stats.byWorkflow[pin.workflowId] || 0) + 1;
      
      // Dates
      if (!stats.oldestPin || pin.createdAt < stats.oldestPin) {
        stats.oldestPin = pin.createdAt;
      }
      if (!stats.newestPin || pin.createdAt > stats.newestPin) {
        stats.newestPin = pin.createdAt;
      }
    }
    
    stats.averageSize = pins.length > 0 ? stats.totalSize / pins.length : 0;
    
    return stats;
  }

  // Execution Context
  public startExecution(executionId: string): void {
    this.currentExecution = executionId;
    this.captureBuffer.clear();
    this.emit('execution:started', { executionId });
  }

  public endExecution(): void {
    const executionId = this.currentExecution;
    this.currentExecution = undefined;
    this.captureBuffer.clear();
    this.emit('execution:ended', { executionId });
  }

  // Helper Methods
  private shouldCapture(
    nodeId: string,
    nodeType: string,
    workflowId: string,
    data: PinnedNodeData
  ): boolean {
    if (!this.configuration.enabled) {
      return false;
    }
    
    if (this.configuration.mode === 'replay') {
      return false;
    }
    
    const filters = this.configuration.filters;
    if (!filters) {
      return this.configuration.scope === 'all';
    }
    
    if (filters.nodeIds && !filters.nodeIds.includes(nodeId)) {
      return false;
    }
    
    if (filters.nodeTypes && !filters.nodeTypes.includes(nodeType)) {
      return false;
    }
    
    if (filters.workflows && !filters.workflows.includes(workflowId)) {
      return false;
    }
    
    if (filters.hasError !== undefined) {
      const hasError = !!data.error;
      if (filters.hasError !== hasError) {
        return false;
      }
    }
    
    if (filters.minDuration && data.timing) {
      if (data.timing.duration < filters.minDuration) {
        return false;
      }
    }
    
    return true;
  }

  private sanitizeData(data: PinnedNodeData): PinnedNodeData {
    // Remove sensitive information
    const sanitized = { ...data };
    
    if (sanitized.context?.credentials) {
      sanitized.context.credentials = Object.keys(sanitized.context.credentials)
        .reduce((acc, key) => {
          acc[key] = '***REDACTED***';
          return acc;
        }, {} as any);
    }
    
    return sanitized;
  }

  private async compressData(data: PinnedNodeData): Promise<PinnedNodeData> {
    // Compress large data fields
    const compressed = { ...data };
    
    if (compressed.input) {
      compressed.input = await this.compressValue(compressed.input);
    }
    
    if (compressed.output) {
      compressed.output = await this.compressValue(compressed.output);
    }
    
    return compressed;
  }

  private async compressValue(value: any): Promise<any> {
    const json = JSON.stringify(value);
    if (json.length < 1000) {
      return value;
    }
    
    // Simple compression placeholder
    return {
      __compressed: true,
      data: json.substring(0, 1000) + '...',
      originalSize: json.length
    };
  }

  private calculateDataSize(data: any): number {
    return Buffer.byteLength(JSON.stringify(data), 'utf8');
  }

  private calculateChecksum(data: any): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  private async enforceStorageLimits(): Promise<void> {
    const stats = await this.getStatistics();
    
    if (stats.totalSize > this.MAX_TOTAL_SIZE) {
      // Remove oldest unlocked pins
      const pins = Array.from(this.pins.values())
        .filter(p => !p.metadata.locked)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      
      let removedSize = 0;
      for (const pin of pins) {
        await this.deletePin(pin.id);
        removedSize += pin.metadata.size || 0;
        
        if (stats.totalSize - removedSize <= this.MAX_TOTAL_SIZE * 0.8) {
          break;
        }
      }
    }
  }

  private async getNodeInfo(nodeId: string, workflowId: string): Promise<any> {
    // Get node information from workflow
    return {
      name: `Node ${nodeId}`,
      type: 'unknown'
    };
  }

  private createTemporaryPin(
    nodeId: string,
    workflowId: string,
    data: PinnedNodeData
  ): PinnedData {
    return {
      id: this.generatePinId(),
      nodeId,
      nodeName: `Node ${nodeId}`,
      nodeType: 'unknown',
      workflowId,
      data,
      metadata: {
        size: this.calculateDataSize(data)
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async calculateCoverage(
    workflowId: string,
    pins: PinnedData[]
  ): Promise<number> {
    // Calculate workflow coverage
    // This would get total nodes from workflow
    const totalNodes = 10; // Placeholder
    const coveredNodes = new Set(pins.map(p => p.nodeId)).size;
    return (coveredNodes / totalNodes) * 100;
  }

  private getEnvironment(): string {
    return process.env.NODE_ENV || 'development';
  }

  private createStorage(options: StorageOptions): DataStorage {
    switch (options.location) {
      case 'file':
        return new FileDataStorage(options);
      case 'database':
        return new DatabaseDataStorage(options);
      case 's3':
        return new S3DataStorage(options);
      default:
        return new MemoryDataStorage();
    }
  }

  private exportAsCSV(pins: PinnedData[]): string {
    const headers = ['ID', 'Node ID', 'Node Name', 'Workflow ID', 'Created At', 'Size'];
    const rows = pins.map(p => [
      p.id,
      p.nodeId,
      p.nodeName,
      p.workflowId,
      p.createdAt.toISOString(),
      p.metadata.size || 0
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private parseCSV(data: string): PinnedData[] {
    // Simple CSV parsing
    const lines = data.split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return {
        id: values[0],
        nodeId: values[1],
        nodeName: values[2],
        nodeType: 'unknown',
        workflowId: values[3],
        data: { input: {}, output: {} },
        metadata: { size: parseInt(values[5]) },
        createdAt: new Date(values[4]),
        updatedAt: new Date(values[4])
      };
    });
  }

  private generatePinId(): string {
    return `pin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSnapshotId(): string {
    return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultConfiguration(): PinConfiguration {
    return {
      enabled: false,
      mode: 'capture',
      scope: 'selected',
      storage: {
        location: 'memory',
        maxSize: this.MAX_TOTAL_SIZE
      },
      comparison: {
        strict: false,
        deepCompare: true
      }
    };
  }

  private startCleanupScheduler(): void {
    // Clean up expired pins every hour
    setInterval(() => {
      const now = new Date();
      const pins = Array.from(this.pins.values());
      
      for (const pin of pins) {
        if (pin.metadata.expires && pin.metadata.expires < now && !pin.metadata.locked) {
          this.deletePin(pin.id).catch(error => {
            this.emit('cleanup:error', { pinId: pin.id, error });
          });
        }
      }
    }, 60 * 60 * 1000);
  }
}

// Support Classes
interface DataStorage {
  store(pin: PinnedData): Promise<void>;
  retrieve(pinId: string): Promise<PinnedData | null>;
  delete(pinId: string): Promise<void>;
  storeSnapshot(snapshot: PinSnapshot): Promise<void>;
  retrieveSnapshot(snapshotId: string): Promise<PinSnapshot | null>;
  deleteSnapshot(snapshotId: string): Promise<void>;
}

class MemoryDataStorage implements DataStorage {
  private data: Map<string, PinnedData> = new Map();
  private snapshots: Map<string, PinSnapshot> = new Map();

  async store(pin: PinnedData): Promise<void> {
    this.data.set(pin.id, pin);
  }

  async retrieve(pinId: string): Promise<PinnedData | null> {
    return this.data.get(pinId) || null;
  }

  async delete(pinId: string): Promise<void> {
    this.data.delete(pinId);
  }

  async storeSnapshot(snapshot: PinSnapshot): Promise<void> {
    this.snapshots.set(snapshot.id, snapshot);
  }

  async retrieveSnapshot(snapshotId: string): Promise<PinSnapshot | null> {
    return this.snapshots.get(snapshotId) || null;
  }

  async deleteSnapshot(snapshotId: string): Promise<void> {
    this.snapshots.delete(snapshotId);
  }
}

class FileDataStorage implements DataStorage {
  constructor(private options: StorageOptions) {}

  async store(pin: PinnedData): Promise<void> {
    // File storage implementation
  }

  async retrieve(pinId: string): Promise<PinnedData | null> {
    // File storage implementation
    return null;
  }

  async delete(pinId: string): Promise<void> {
    // File storage implementation
  }

  async storeSnapshot(snapshot: PinSnapshot): Promise<void> {
    // File storage implementation
  }

  async retrieveSnapshot(snapshotId: string): Promise<PinSnapshot | null> {
    // File storage implementation
    return null;
  }

  async deleteSnapshot(snapshotId: string): Promise<void> {
    // File storage implementation
  }
}

class DatabaseDataStorage implements DataStorage {
  constructor(private options: StorageOptions) {}

  async store(pin: PinnedData): Promise<void> {
    // Database storage implementation
  }

  async retrieve(pinId: string): Promise<PinnedData | null> {
    // Database storage implementation
    return null;
  }

  async delete(pinId: string): Promise<void> {
    // Database storage implementation
  }

  async storeSnapshot(snapshot: PinSnapshot): Promise<void> {
    // Database storage implementation
  }

  async retrieveSnapshot(snapshotId: string): Promise<PinSnapshot | null> {
    // Database storage implementation
    return null;
  }

  async deleteSnapshot(snapshotId: string): Promise<void> {
    // Database storage implementation
  }
}

class S3DataStorage implements DataStorage {
  constructor(private options: StorageOptions) {}

  async store(pin: PinnedData): Promise<void> {
    // S3 storage implementation
  }

  async retrieve(pinId: string): Promise<PinnedData | null> {
    // S3 storage implementation
    return null;
  }

  async delete(pinId: string): Promise<void> {
    // S3 storage implementation
  }

  async storeSnapshot(snapshot: PinSnapshot): Promise<void> {
    // S3 storage implementation
  }

  async retrieveSnapshot(snapshotId: string): Promise<PinSnapshot | null> {
    // S3 storage implementation
    return null;
  }

  async deleteSnapshot(snapshotId: string): Promise<void> {
    // S3 storage implementation
  }
}

class DataComparator {
  async compare(
    expected: any,
    actual: any,
    options?: ComparisonOptions
  ): Promise<ComparisonResult> {
    const differences: Difference[] = [];
    const strict = options?.strict ?? false;
    const ignoreFields = options?.ignoreFields || [];
    
    this.compareValues(expected, actual, '', differences, {
      strict,
      ignoreFields,
      tolerance: options?.tolerance || 0,
      deepCompare: options?.deepCompare ?? true,
      orderMatters: options?.orderMatters ?? false
    });
    
    return {
      match: differences.length === 0,
      differences,
      similarity: this.calculateSimilarity(expected, actual, differences),
      timestamp: new Date()
    };
  }

  private compareValues(
    expected: any,
    actual: any,
    path: string,
    differences: Difference[],
    options: any
  ): void {
    // Skip ignored fields
    if (options.ignoreFields.includes(path)) {
      return;
    }

    // Type check
    if (typeof expected !== typeof actual) {
      differences.push({
        path,
        type: 'type',
        expected: typeof expected,
        actual: typeof actual
      });
      return;
    }

    // Null/undefined check
    if (expected === null || expected === undefined) {
      if (expected !== actual) {
        differences.push({
          path,
          type: 'changed',
          expected,
          actual
        });
      }
      return;
    }

    // Primitive comparison
    if (typeof expected !== 'object') {
      if (typeof expected === 'number' && options.tolerance > 0) {
        if (Math.abs(expected - actual) > options.tolerance) {
          differences.push({
            path,
            type: 'changed',
            expected,
            actual
          });
        }
      } else if (expected !== actual) {
        differences.push({
          path,
          type: 'changed',
          expected,
          actual
        });
      }
      return;
    }

    // Array comparison
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) {
        differences.push({
          path,
          type: 'type',
          expected: 'array',
          actual: typeof actual
        });
        return;
      }

      if (options.orderMatters) {
        for (let i = 0; i < Math.max(expected.length, actual.length); i++) {
          if (i >= expected.length) {
            differences.push({
              path: `${path}[${i}]`,
              type: 'added',
              expected: undefined,
              actual: actual[i]
            });
          } else if (i >= actual.length) {
            differences.push({
              path: `${path}[${i}]`,
              type: 'removed',
              expected: expected[i],
              actual: undefined
            });
          } else {
            this.compareValues(
              expected[i],
              actual[i],
              `${path}[${i}]`,
              differences,
              options
            );
          }
        }
      } else {
        // Compare arrays without order
        const expectedSet = new Set(expected.map(e => JSON.stringify(e)));
        const actualSet = new Set(actual.map(a => JSON.stringify(a)));
        
        for (const item of expectedSet) {
          if (!actualSet.has(item)) {
            differences.push({
              path,
              type: 'removed',
              expected: JSON.parse(item),
              actual: undefined
            });
          }
        }
        
        for (const item of actualSet) {
          if (!expectedSet.has(item)) {
            differences.push({
              path,
              type: 'added',
              expected: undefined,
              actual: JSON.parse(item)
            });
          }
        }
      }
      return;
    }

    // Object comparison
    if (options.deepCompare) {
      const expectedKeys = Object.keys(expected);
      const actualKeys = Object.keys(actual);
      const allKeys = new Set([...expectedKeys, ...actualKeys]);
      
      for (const key of allKeys) {
        const newPath = path ? `${path}.${key}` : key;
        
        if (!(key in expected)) {
          differences.push({
            path: newPath,
            type: 'added',
            expected: undefined,
            actual: actual[key]
          });
        } else if (!(key in actual)) {
          differences.push({
            path: newPath,
            type: 'removed',
            expected: expected[key],
            actual: undefined
          });
        } else {
          this.compareValues(
            expected[key],
            actual[key],
            newPath,
            differences,
            options
          );
        }
      }
    } else {
      // Shallow comparison
      if (JSON.stringify(expected) !== JSON.stringify(actual)) {
        differences.push({
          path,
          type: 'changed',
          expected,
          actual
        });
      }
    }
  }

  private calculateSimilarity(
    expected: any,
    actual: any,
    differences: Difference[]
  ): number {
    if (differences.length === 0) {
      return 1;
    }

    // Calculate similarity based on the number of differences
    const expectedStr = JSON.stringify(expected);
    const actualStr = JSON.stringify(actual);
    
    if (expectedStr === actualStr) {
      return 1;
    }

    // Simple similarity calculation
    const maxLength = Math.max(expectedStr.length, actualStr.length);
    const diffCount = differences.length;
    
    return Math.max(0, 1 - (diffCount * 0.1));
  }
}

class DataReplayer {
  constructor(private system: DataPinningSystem) {}

  async replay(
    snapshot: PinSnapshot,
    options: DataReplay
  ): Promise<ReplayResults> {
    const results: ReplayResults = {
      success: true,
      nodesReplayed: 0,
      matches: 0,
      mismatches: 0,
      errors: [],
      duration: 0
    };

    const startTime = Date.now();

    try {
      if (options.mode === 'sequential') {
        for (const pin of snapshot.pins) {
          await this.replayPin(pin, options, results);
        }
      } else if (options.mode === 'parallel') {
        await Promise.all(
          snapshot.pins.map(pin => this.replayPin(pin, options, results))
        );
      }

      results.duration = Date.now() - startTime;
      results.success = results.errors.length === 0;

      if (options.callbacks?.onComplete) {
        options.callbacks.onComplete(results);
      }
    } catch (error: any) {
      results.success = false;
      results.errors.push({
        nodeId: '',
        type: 'execution_error',
        message: error.message,
        details: error
      });
    }

    return results;
  }

  private async replayPin(
    pin: PinnedData,
    options: DataReplay,
    results: ReplayResults
  ): Promise<void> {
    try {
      if (options.callbacks?.onNodeStart) {
        options.callbacks.onNodeStart(pin.nodeId, pin.data);
      }

      // Simulate replay with delay
      if (options.speed) {
        await new Promise(resolve => setTimeout(resolve, 1000 / options.speed!));
      }

      results.nodesReplayed++;
      results.matches++;

      if (options.callbacks?.onNodeComplete) {
        options.callbacks.onNodeComplete(pin.nodeId, pin.data.output);
      }
    } catch (error: any) {
      results.errors.push({
        nodeId: pin.nodeId,
        type: 'execution_error',
        message: error.message,
        details: error
      });

      if (options.callbacks?.onNodeError) {
        options.callbacks.onNodeError(pin.nodeId, error);
      }
    }
  }
}

// Export singleton instance
export default DataPinningSystem.getInstance();