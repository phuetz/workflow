/**
 * Data Pinning Service
 * Allows pinning test data to nodes for debugging and development
 */

import { logger } from '../services/SimpleLogger';
import { WorkflowNode } from '../types/workflow';
import { SafeObject } from '../utils/TypeSafetyUtils';

export interface PinnedData {
  nodeId: string;
  data: SafeObject;
  timestamp: string;
  source: 'manual' | 'execution' | 'import';
  description?: string;
  schema?: PinnedDataSchema;
}

export interface PinnedDataSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, PinnedDataSchema>;
  items?: PinnedDataSchema;
  required?: string[];
}

export interface DataPinningOptions {
  autoValidate?: boolean;
  maxDataSize?: number; // in bytes
  enableSchemaInference?: boolean;
}

/**
 * Data Pinning Manager
 */
export class DataPinningService {
  private pinnedDataMap = new Map<string, PinnedData>();
  private readonly maxDataSize: number;
  private readonly autoValidate: boolean;
  private readonly enableSchemaInference: boolean;

  constructor(options: DataPinningOptions = {}) {
    this.maxDataSize = options.maxDataSize || 1024 * 1024; // 1MB default
    this.autoValidate = options.autoValidate !== false;
    this.enableSchemaInference = options.enableSchemaInference !== false;
  }

  /**
   * Pin data to a node
   */
  pinData(
    nodeId: string,
    data: SafeObject,
    source: 'manual' | 'execution' | 'import' = 'manual',
    description?: string
  ): PinnedData {

    logger.info(`📌 Pinning data to node: ${nodeId}`);

    // Validate data size
    const dataSize = this.calculateDataSize(data);
    if (dataSize > this.maxDataSize) {
      throw new Error(`Data size (${dataSize} bytes) exceeds maximum allowed size (${this.maxDataSize} bytes)`);
    }

    // Validate data structure
    if (this.autoValidate) {
      this.validateData(data);
    }

    // Infer schema if enabled
    const schema = this.enableSchemaInference
      ? this.inferSchema(data)
      : undefined;

    const pinnedData: PinnedData = {
      nodeId,
      data: this.cloneData(data),
      timestamp: new Date().toISOString(),
      source,
      description,
      schema
    };

    this.pinnedDataMap.set(nodeId, pinnedData);

    logger.debug(`Data pinned to node ${nodeId}:`, {
      size: dataSize,
      hasSchema: !!schema
    });

    return pinnedData;
  }

  /**
   * Unpin data from a node
   */
  unpinData(nodeId: string): boolean {
    const existed = this.pinnedDataMap.has(nodeId);

    if (existed) {
      this.pinnedDataMap.delete(nodeId);
      logger.info(`📍 Unpinned data from node: ${nodeId}`);
    }

    return existed;
  }

  /**
   * Get pinned data for a node
   */
  getPinnedData(nodeId: string): PinnedData | undefined {
    return this.pinnedDataMap.get(nodeId);
  }

  /**
   * Check if node has pinned data
   */
  hasPinnedData(nodeId: string): boolean {
    return this.pinnedDataMap.has(nodeId);
  }

  /**
   * Get all pinned data
   */
  getAllPinnedData(): Map<string, PinnedData> {
    return new Map(this.pinnedDataMap);
  }

  /**
   * Update pinned data for a node
   */
  updatePinnedData(
    nodeId: string,
    data: SafeObject,
    description?: string
  ): PinnedData {

    const existing = this.pinnedDataMap.get(nodeId);

    if (!existing) {
      throw new Error(`No pinned data found for node: ${nodeId}`);
    }

    return this.pinData(
      nodeId,
      data,
      existing.source,
      description || existing.description
    );
  }

  /**
   * Clear all pinned data
   */
  clearAll(): void {
    const count = this.pinnedDataMap.size;
    this.pinnedDataMap.clear();
    logger.info(`🗑️ Cleared ${count} pinned data entries`);
  }

  /**
   * Export pinned data
   */
  exportPinnedData(): Record<string, PinnedData> {
    const exported: Record<string, PinnedData> = {};

    for (const [nodeId, pinnedData] of Array.from(this.pinnedDataMap.entries())) {
      exported[nodeId] = pinnedData;
    }

    logger.info(`📤 Exported ${Object.keys(exported).length} pinned data entries`);
    return exported;
  }

  /**
   * Import pinned data
   */
  importPinnedData(data: Record<string, PinnedData>): number {
    let importedCount = 0;

    for (const [nodeId, pinnedData] of Object.entries(data)) {
      try {
        this.pinnedDataMap.set(nodeId, {
          ...pinnedData,
          source: 'import',
          timestamp: new Date().toISOString()
        });
        importedCount++;
      } catch (error) {
        logger.error(`Failed to import pinned data for node ${nodeId}:`, error);
      }
    }

    logger.info(`📥 Imported ${importedCount} pinned data entries`);
    return importedCount;
  }

  /**
   * Pin data from execution result
   */
  pinFromExecution(
    nodeId: string,
    executionResult: SafeObject,
    description?: string
  ): PinnedData {
    return this.pinData(nodeId, executionResult, 'execution', description);
  }

  /**
   * Generate sample data based on node type
   */
  generateSampleData(nodeType: string): SafeObject {
    const sampleData: Record<string, SafeObject> = {
      'http-request': {
        method: 'GET',
        url: 'https://api.example.com/data',
        headers: {
          'Content-Type': 'application/json'
        },
        response: {
          status: 200,
          data: {
            message: 'Sample response',
            items: [
              { id: 1, name: 'Item 1' },
              { id: 2, name: 'Item 2' }
            ]
          }
        }
      },
      'email': {
        to: 'user@example.com',
        subject: 'Test Email',
        body: 'This is a test email',
        sent: true
      },
      'database': {
        query: 'SELECT * FROM users WHERE active = true',
        rows: [
          { id: 1, name: 'John Doe', email: 'john@example.com' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
        ],
        rowCount: 2
      },
      'filter': {
        input: [1, 2, 3, 4, 5],
        condition: 'value > 2',
        output: [3, 4, 5]
      },
      'transform': {
        input: { firstName: 'John', lastName: 'Doe' },
        mapping: { name: '{{firstName}} {{lastName}}' },
        output: { name: 'John Doe' }
      },
      'slack': {
        channel: '#general',
        message: 'Test message',
        posted: true,
        timestamp: new Date().toISOString()
      }
    };

    return sampleData[nodeType] || {
      message: 'Sample data',
      timestamp: new Date().toISOString(),
      success: true
    };
  }

  /**
   * Validate data structure
   */
  private validateData(data: unknown): void {
    if (data === null || data === undefined) {
      throw new Error('Data cannot be null or undefined');
    }

    // Check for circular references
    const seen = new WeakSet();
    const checkCircular = (obj: unknown): void => {
      if (obj !== null && typeof obj === 'object') {
        if (seen.has(obj)) {
          throw new Error('Circular reference detected in data');
        }
        seen.add(obj);

        if (Array.isArray(obj)) {
          obj.forEach(checkCircular);
        } else {
          Object.values(obj).forEach(checkCircular);
        }
      }
    };

    checkCircular(data);
  }

  /**
   * Calculate data size in bytes
   */
  private calculateDataSize(data: unknown): number {
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString]).size;
  }

  /**
   * Deep clone data
   */
  private cloneData(data: SafeObject): SafeObject {
    return JSON.parse(JSON.stringify(data));
  }

  /**
   * Infer schema from data
   */
  private inferSchema(data: unknown): PinnedDataSchema {
    if (data === null || data === undefined) {
      return { type: 'object' };
    }

    if (Array.isArray(data)) {
      const itemSchema: PinnedDataSchema = data.length > 0
        ? this.inferSchema(data[0])
        : { type: 'object' };

      return {
        type: 'array',
        items: itemSchema
      };
    }

    if (typeof data === 'object') {
      const properties: Record<string, PinnedDataSchema> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(data)) {
        properties[key] = this.inferSchema(value);
        if (value !== null && value !== undefined) {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined
      };
    }

    if (typeof data === 'string') {
      return { type: 'string' };
    }

    if (typeof data === 'number') {
      return { type: 'number' };
    }

    if (typeof data === 'boolean') {
      return { type: 'boolean' };
    }

    return { type: 'object' };
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalPinned: number;
    bySource: Record<string, number>;
    totalDataSize: number;
  } {
    const bySource: Record<string, number> = {
      manual: 0,
      execution: 0,
      import: 0
    };

    let totalDataSize = 0;

    for (const pinnedData of Array.from(this.pinnedDataMap.values())) {
      bySource[pinnedData.source]++;
      totalDataSize += this.calculateDataSize(pinnedData.data);
    }

    return {
      totalPinned: this.pinnedDataMap.size,
      bySource,
      totalDataSize
    };
  }
}

/**
 * Singleton instance
 */
export const dataPinningService = new DataPinningService();
