/**
 * Security Analytics - Handles lineage tracking, metrics collection, and schema evolution
 */

import type {
  DataLineage,
  LineageNode,
  LineageEdge,
  TableSchema,
  ColumnDefinition,
  CatalogEntry,
  IngestResult,
  QueryResult,
  CompactionResult,
  StorageOptimizationResult,
  DataLakeMetrics,
  SchemaEvolutionMode,
} from './types';

// =============================================================================
// Lineage Tracker
// =============================================================================

export class LineageTracker {
  private lineageGraph: Map<string, DataLineage> = new Map();

  /**
   * Initialize lineage for a new table
   */
  initializeLineage(nodeId: string): void {
    this.lineageGraph.set(nodeId, {
      nodeId,
      upstream: [],
      downstream: [],
      edges: [],
    });
  }

  /**
   * Track lineage edge
   */
  trackEdge(
    nodeId: string,
    edge: Omit<LineageEdge, 'timestamp'> & { timestamp?: Date }
  ): void {
    const lineage = this.lineageGraph.get(nodeId) || {
      nodeId,
      upstream: [],
      downstream: [],
      edges: [],
    };

    const fullEdge: LineageEdge = {
      ...edge,
      timestamp: edge.timestamp || new Date(),
    };

    lineage.edges.push(fullEdge);

    // Update upstream references
    if (edge.sourceId !== nodeId && !lineage.upstream.find(n => n.id === edge.sourceId)) {
      lineage.upstream.push({
        id: edge.sourceId,
        type: 'table',
        name: edge.sourceId.split(':')[1] || edge.sourceId,
      });
    }

    // Update downstream references
    if (edge.targetId !== nodeId && !lineage.downstream.find(n => n.id === edge.targetId)) {
      lineage.downstream.push({
        id: edge.targetId,
        type: 'table',
        name: edge.targetId.split(':')[1] || edge.targetId,
      });
    }

    this.lineageGraph.set(nodeId, lineage);
  }

  /**
   * Get lineage for a node
   */
  getLineage(nodeId: string): DataLineage | null {
    return this.lineageGraph.get(nodeId) || null;
  }

  /**
   * Get upstream nodes
   */
  getUpstream(nodeId: string): LineageNode[] {
    return this.lineageGraph.get(nodeId)?.upstream || [];
  }

  /**
   * Get downstream nodes
   */
  getDownstream(nodeId: string): LineageNode[] {
    return this.lineageGraph.get(nodeId)?.downstream || [];
  }

  /**
   * Get all edges for a node
   */
  getEdges(nodeId: string): LineageEdge[] {
    return this.lineageGraph.get(nodeId)?.edges || [];
  }

  /**
   * Calculate impacted tables from a source
   */
  calculateImpact(sourceNodeId: string, visited = new Set<string>()): string[] {
    if (visited.has(sourceNodeId)) return [];
    visited.add(sourceNodeId);

    const impacted: string[] = [];
    const downstream = this.getDownstream(sourceNodeId);

    for (const node of downstream) {
      impacted.push(node.id);
      impacted.push(...this.calculateImpact(node.id, visited));
    }

    return impacted;
  }

  /**
   * Clear lineage for a node
   */
  clearLineage(nodeId: string): void {
    this.lineageGraph.delete(nodeId);
  }

  /**
   * Clear all lineage
   */
  clearAll(): void {
    this.lineageGraph.clear();
  }
}

// =============================================================================
// Metrics Collector
// =============================================================================

export class MetricsCollector {
  private metrics: DataLakeMetrics = {
    operations: {},
    ingestions: { total: 0, errors: 0, duplicates: 0 },
    queries: { total: 0, cacheHits: 0, bytesScanned: 0 },
    compactions: { total: 0, bytesCompacted: 0 },
    optimizations: { total: 0, bytesMoved: 0, savings: 0 },
  };

  /**
   * Record an operation
   */
  recordOperation(type: string, dataLake: string): void {
    const key = `${type}:${dataLake}`;
    this.metrics.operations[key] = (this.metrics.operations[key] || 0) + 1;
  }

  /**
   * Record ingestion metrics
   */
  recordIngestion(_dataLake: string, _table: string, result: IngestResult): void {
    this.metrics.ingestions.total += result.ingested;
    this.metrics.ingestions.errors += result.errors;
    this.metrics.ingestions.duplicates += result.duplicates;
  }

  /**
   * Record query metrics
   */
  recordQuery(_dataLake: string, result: QueryResult): void {
    this.metrics.queries.total++;
    this.metrics.queries.bytesScanned += result.bytesScanned;
  }

  /**
   * Record cache hit
   */
  recordCacheHit(_dataLake: string): void {
    this.metrics.queries.cacheHits++;
  }

  /**
   * Record compaction metrics
   */
  recordCompaction(_dataLake: string, result: CompactionResult): void {
    this.metrics.compactions.total++;
    this.metrics.compactions.bytesCompacted +=
      result.originalSizeBytes - result.compactedSizeBytes;
  }

  /**
   * Record optimization metrics
   */
  recordOptimization(_dataLake: string, result: StorageOptimizationResult): void {
    this.metrics.optimizations.total++;
    this.metrics.optimizations.bytesMoved +=
      result.bytesMovedToWarm + result.bytesMovedToCold + result.bytesMovedToArchive;
    this.metrics.optimizations.savings += result.estimatedSavings;
  }

  /**
   * Get all metrics
   */
  getMetrics(): DataLakeMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = {
      operations: {},
      ingestions: { total: 0, errors: 0, duplicates: 0 },
      queries: { total: 0, cacheHits: 0, bytesScanned: 0 },
      compactions: { total: 0, bytesCompacted: 0 },
      optimizations: { total: 0, bytesMoved: 0, savings: 0 },
    };
  }
}

// =============================================================================
// Schema Registry
// =============================================================================

export class SchemaRegistry {
  private schemas: Map<string, TableSchema[]> = new Map();

  /**
   * Register initial schema
   */
  register(key: string, schema: TableSchema): void {
    this.schemas.set(key, [{ ...schema }]);
  }

  /**
   * Get all versions of a schema
   */
  getVersions(key: string): TableSchema[] {
    return this.schemas.get(key) || [];
  }

  /**
   * Get latest schema version
   */
  getLatest(key: string): TableSchema | undefined {
    const versions = this.schemas.get(key);
    return versions?.[versions.length - 1];
  }

  /**
   * Evolve schema with changes
   */
  evolve(
    key: string,
    changes: {
      addColumns?: ColumnDefinition[];
      dropColumns?: string[];
      renameColumns?: { from: string; to: string }[];
    },
    mode: SchemaEvolutionMode = 'additive'
  ): TableSchema {
    const versions = this.schemas.get(key);

    if (!versions?.length) {
      throw new Error(`Schema not found for key '${key}'`);
    }

    if (mode === 'strict') {
      throw new Error('Schema evolution not allowed in strict mode');
    }

    if (
      mode === 'additive' &&
      (changes.dropColumns?.length || changes.renameColumns?.length)
    ) {
      throw new Error('Only additive changes allowed in additive mode');
    }

    const currentSchema = {
      ...versions[versions.length - 1],
      columns: [...versions[versions.length - 1].columns],
    };

    if (changes.addColumns) {
      currentSchema.columns.push(...changes.addColumns);
    }

    if (changes.dropColumns) {
      currentSchema.columns = currentSchema.columns.filter(
        c => !changes.dropColumns!.includes(c.name)
      );
    }

    if (changes.renameColumns) {
      for (const { from, to } of changes.renameColumns) {
        const col = currentSchema.columns.find(c => c.name === from);
        if (col) col.name = to;
      }
    }

    versions.push(currentSchema);
    return currentSchema;
  }

  /**
   * Clear schema versions
   */
  clear(key: string): void {
    this.schemas.delete(key);
  }

  /**
   * Clear all schemas
   */
  clearAll(): void {
    this.schemas.clear();
  }
}

// =============================================================================
// Catalog Manager
// =============================================================================

export class CatalogManager {
  private catalog: Map<string, CatalogEntry> = new Map();

  /**
   * Add or update catalog entry
   */
  set(key: string, entry: CatalogEntry): void {
    this.catalog.set(key, entry);
  }

  /**
   * Get catalog entry
   */
  get(key: string): CatalogEntry | undefined {
    return this.catalog.get(key);
  }

  /**
   * Delete catalog entry
   */
  delete(key: string): boolean {
    return this.catalog.delete(key);
  }

  /**
   * Get all entries
   */
  getAll(): CatalogEntry[] {
    return Array.from(this.catalog.values());
  }

  /**
   * Filter entries by criteria
   */
  filter(options?: {
    dataLake?: string;
    tags?: string[];
    format?: string;
    minRows?: number;
    maxRows?: number;
  }): CatalogEntry[] {
    let entries = Array.from(this.catalog.values());

    if (options?.dataLake) {
      entries = entries.filter(e =>
        this.catalog.has(`${options.dataLake}:${e.tableName}`)
      );
    }

    if (options?.tags?.length) {
      entries = entries.filter(e =>
        options.tags!.some(tag => e.tags.includes(tag))
      );
    }

    if (options?.format) {
      entries = entries.filter(e => e.format === options.format);
    }

    if (options?.minRows !== undefined) {
      entries = entries.filter(e => e.rowCount >= options.minRows!);
    }

    if (options?.maxRows !== undefined) {
      entries = entries.filter(e => e.rowCount <= options.maxRows!);
    }

    return entries;
  }

  /**
   * Update statistics for an entry
   */
  updateStats(
    key: string,
    updates: Partial<{ rowCount: number; sizeBytes: number; lastModified: Date }>
  ): void {
    const entry = this.catalog.get(key);
    if (entry) {
      if (updates.rowCount !== undefined) entry.rowCount = updates.rowCount;
      if (updates.sizeBytes !== undefined) entry.sizeBytes = updates.sizeBytes;
      if (updates.lastModified !== undefined) entry.lastModified = updates.lastModified;
    }
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.catalog.clear();
  }
}
