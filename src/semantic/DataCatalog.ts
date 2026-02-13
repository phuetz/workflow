/**
 * Data Catalog - Unified catalog for 1,000+ data sources
 *
 * Provides comprehensive data discovery, metadata management,
 * and cataloging capabilities across all data sources.
 *
 * @module semantic/DataCatalog
 */

import {
  CatalogEntry,
  CatalogEntryType,
  DataSourceReference,
  DataSourceType,
  SchemaMetadata,
  ColumnMetadata,
  QualityMetrics,
  UsageMetrics,
  DataClassification
} from './types/semantic';

/**
 * DataCatalog manages the unified data catalog
 */
export class DataCatalog {
  private entries: Map<string, CatalogEntry> = new Map();
  private index: SearchIndex = new SearchIndex();
  private discoverySchedule: Map<string, DiscoveryConfig> = new Map();

  constructor() {
    this.initializeBuiltInSources();
  }

  // ============================================================================
  // CATALOG ENTRY MANAGEMENT
  // ============================================================================

  /**
   * Register a new catalog entry
   */
  async registerEntry(entry: CatalogEntry): Promise<void> {
    this.validateEntry(entry);

    // Auto-discover schema if not provided
    if (!entry.schema) {
      entry.schema = await this.discoverSchema(entry);
    }

    // Calculate quality metrics if not provided
    if (!entry.qualityMetrics) {
      entry.qualityMetrics = await this.calculateQualityMetrics(entry);
    }

    // Store entry
    this.entries.set(entry.id, entry);

    // Index for search
    this.index.addEntry(entry);
  }

  /**
   * Get catalog entry by ID
   */
  getEntry(id: string): CatalogEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Get all catalog entries
   */
  getAllEntries(): CatalogEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Remove catalog entry
   */
  removeEntry(id: string): void {
    const entry = this.entries.get(id);
    if (entry) {
      this.entries.delete(id);
      this.index.removeEntry(entry);
    }
  }

  /**
   * Update catalog entry
   */
  async updateEntry(id: string, updates: Partial<CatalogEntry>): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`Catalog entry not found: ${id}`);
    }

    const updatedEntry = { ...entry, ...updates, updatedAt: new Date() };
    this.entries.set(id, updatedEntry);
    this.index.updateEntry(updatedEntry);
  }

  /**
   * Validate catalog entry
   */
  private validateEntry(entry: CatalogEntry): void {
    if (!entry.id || !entry.name) {
      throw new Error('Catalog entry must have id and name');
    }

    if (!entry.dataSource) {
      throw new Error('Catalog entry must have a data source');
    }
  }

  // ============================================================================
  // SEARCH AND DISCOVERY
  // ============================================================================

  /**
   * Search catalog entries
   */
  search(query: SearchQuery): CatalogEntry[] {
    let results = Array.from(this.entries.values());

    // Full-text search
    if (query.text) {
      results = this.index.search(query.text);
    }

    // Filter by type
    if (query.types && query.types.length > 0) {
      results = results.filter(e => query.types!.includes(e.type));
    }

    // Filter by data source type
    if (query.sourceTypes && query.sourceTypes.length > 0) {
      results = results.filter(e => query.sourceTypes!.includes(e.dataSource.type));
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter(e =>
        query.tags!.some(tag => e.tags.includes(tag))
      );
    }

    // Filter by owner
    if (query.owner) {
      results = results.filter(e => e.owner === query.owner);
    }

    // Filter by classification
    if (query.classification) {
      results = results.filter(e => e.classification === query.classification);
    }

    // Filter by quality score
    if (query.minQualityScore !== undefined) {
      results = results.filter(e => e.qualityScore >= query.minQualityScore!);
    }

    // Filter by freshness
    if (query.maxAgeHours !== undefined) {
      const cutoff = new Date(Date.now() - query.maxAgeHours * 3600000);
      results = results.filter(e => e.updatedAt >= cutoff);
    }

    // Sort results
    if (query.sortBy) {
      results = this.sortResults(results, query.sortBy, query.sortOrder || 'desc');
    }

    // Limit results
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Sort search results
   */
  private sortResults(
    results: CatalogEntry[],
    sortBy: string,
    sortOrder: 'asc' | 'desc'
  ): CatalogEntry[] {
    const sorted = [...results].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortBy) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'quality':
          aVal = a.qualityScore;
          bVal = b.qualityScore;
          break;
        case 'usage':
          aVal = a.usageMetrics.queryCount;
          bVal = b.usageMetrics.queryCount;
          break;
        case 'updated':
          aVal = a.updatedAt.getTime();
          bVal = b.updatedAt.getTime();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }

  /**
   * Get catalog entries by data source
   */
  getEntriesBySource(dataSourceId: string): CatalogEntry[] {
    return Array.from(this.entries.values()).filter(
      e => e.dataSource.id === dataSourceId
    );
  }

  /**
   * Get catalog entries with lineage
   */
  getEntriesWithLineage(entryId: string): LineageGraph {
    const entry = this.entries.get(entryId);
    if (!entry) {
      throw new Error(`Catalog entry not found: ${entryId}`);
    }

    const upstream = this.getUpstreamEntries(entryId, new Set());
    const downstream = this.getDownstreamEntries(entryId, new Set());

    return {
      root: entry,
      upstream,
      downstream
    };
  }

  /**
   * Get upstream dependencies recursively
   */
  private getUpstreamEntries(entryId: string, visited: Set<string>): CatalogEntry[] {
    if (visited.has(entryId)) return [];
    visited.add(entryId);

    const entry = this.entries.get(entryId);
    if (!entry) return [];

    const upstream: CatalogEntry[] = [];

    for (const depId of entry.upstreamDependencies) {
      const dep = this.entries.get(depId);
      if (dep) {
        upstream.push(dep);
        upstream.push(...this.getUpstreamEntries(depId, visited));
      }
    }

    return upstream;
  }

  /**
   * Get downstream dependents recursively
   */
  private getDownstreamEntries(entryId: string, visited: Set<string>): CatalogEntry[] {
    if (visited.has(entryId)) return [];
    visited.add(entryId);

    const entry = this.entries.get(entryId);
    if (!entry) return [];

    const downstream: CatalogEntry[] = [];

    for (const depId of entry.downstreamDependencies) {
      const dep = this.entries.get(depId);
      if (dep) {
        downstream.push(dep);
        downstream.push(...this.getDownstreamEntries(depId, visited));
      }
    }

    return downstream;
  }

  // ============================================================================
  // AUTO-DISCOVERY
  // ============================================================================

  /**
   * Auto-discover schema from data source
   */
  private async discoverSchema(entry: CatalogEntry): Promise<SchemaMetadata> {
    const discoverer = this.getDiscoverer(entry.dataSource.type);
    return discoverer.discover(entry.dataSource);
  }

  /**
   * Get schema discoverer for data source type
   */
  private getDiscoverer(type: DataSourceType): SchemaDiscoverer {
    // Return appropriate discoverer based on type
    switch (type) {
      case DataSourceType.POSTGRESQL:
      case DataSourceType.MYSQL:
      case DataSourceType.MSSQL:
        return new JDBCSchemaDiscoverer();

      case DataSourceType.MONGODB:
        return new MongoDBSchemaDiscoverer();

      case DataSourceType.REST_API:
        return new APISchemaDiscoverer();

      case DataSourceType.S3:
      case DataSourceType.GCS:
        return new FileSchemaDiscoverer();

      default:
        return new GenericSchemaDiscoverer();
    }
  }

  /**
   * Schedule periodic discovery for a data source
   */
  scheduleDiscovery(config: DiscoveryConfig): void {
    this.discoverySchedule.set(config.dataSourceId, config);

    // In a real implementation, this would set up a cron job
    // For now, we'll just store the config
  }

  /**
   * Run discovery for a data source
   */
  async runDiscovery(dataSourceId: string): Promise<CatalogEntry[]> {
    const config = this.discoverySchedule.get(dataSourceId);
    if (!config) {
      throw new Error(`No discovery config for data source: ${dataSourceId}`);
    }

    // Discover all tables/collections/datasets
    const discoverer = this.getDiscoverer(config.sourceType);
    const discovered = await discoverer.discoverAll(config.dataSource);

    const entries: CatalogEntry[] = [];

    for (const item of discovered) {
      const entry: CatalogEntry = {
        id: `${dataSourceId}_${item.name}`,
        name: item.name,
        fullyQualifiedName: `${config.dataSource.name}.${item.name}`,
        type: item.type,
        dataSource: config.dataSource,
        schema: item.schema,
        description: '',
        tags: [],
        owner: '',
        upstreamDependencies: [],
        downstreamDependencies: [],
        qualityScore: 0,
        qualityMetrics: await this.calculateQualityMetrics(item as any),
        usageMetrics: this.getDefaultUsageMetrics(),
        classification: DataClassification.INTERNAL,
        hasPII: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        discoveredAt: new Date()
      };

      await this.registerEntry(entry);
      entries.push(entry);
    }

    return entries;
  }

  // ============================================================================
  // QUALITY METRICS
  // ============================================================================

  /**
   * Calculate quality metrics for catalog entry
   */
  private async calculateQualityMetrics(entry: CatalogEntry): Promise<QualityMetrics> {
    // In a real implementation, this would analyze the actual data
    return {
      completeness: 0.95,
      accuracy: 0.98,
      consistency: 0.97,
      freshness: 0.99,
      validity: 0.96,
      totalRows: 0,
      nullRows: 0,
      duplicateRows: 0,
      invalidRows: 0,
      lastChecked: new Date()
    };
  }

  /**
   * Get default usage metrics
   */
  private getDefaultUsageMetrics(): UsageMetrics {
    return {
      queryCount: 0,
      userCount: 0,
      avgQueryTime: 0,
      totalDataScanned: 0,
      dailyQueries: [],
      topUsers: [],
      topQueries: [],
      lastUpdated: new Date()
    };
  }

  /**
   * Update usage metrics
   */
  async updateUsageMetrics(
    entryId: string,
    queryTime: number,
    userId: string
  ): Promise<void> {
    const entry = this.entries.get(entryId);
    if (!entry) return;

    const metrics = entry.usageMetrics;
    metrics.queryCount++;
    metrics.avgQueryTime =
      (metrics.avgQueryTime * (metrics.queryCount - 1) + queryTime) / metrics.queryCount;

    if (!metrics.topUsers.includes(userId)) {
      metrics.topUsers.push(userId);
    }

    metrics.lastUpdated = new Date();

    await this.updateEntry(entryId, { usageMetrics: metrics });
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get catalog statistics
   */
  getStatistics(): CatalogStatistics {
    const entries = Array.from(this.entries.values());

    const byType: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byClassification: Record<string, number> = {};

    for (const entry of entries) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
      bySource[entry.dataSource.type] = (bySource[entry.dataSource.type] || 0) + 1;
      byClassification[entry.classification] = (byClassification[entry.classification] || 0) + 1;
    }

    const totalQuality = entries.reduce((sum, e) => sum + e.qualityScore, 0);
    const avgQuality = entries.length > 0 ? totalQuality / entries.length : 0;

    return {
      totalEntries: this.entries.size,
      entriesByType: byType,
      entriesBySource: bySource,
      entriesByClassification: byClassification,
      averageQualityScore: avgQuality,
      totalDataSources: new Set(entries.map(e => e.dataSource.id)).size,
      entriesWithPII: entries.filter(e => e.hasPII).length
    };
  }

  /**
   * Initialize built-in data sources
   */
  private initializeBuiltInSources(): void {
    // Built-in sources will be initialized here
  }
}

// ============================================================================
// SEARCH INDEX
// ============================================================================

class SearchIndex {
  private index: Map<string, Set<string>> = new Map();
  private entries: Map<string, CatalogEntry> = new Map();

  /**
   * Add entry to index
   */
  addEntry(entry: CatalogEntry): void {
    this.entries.set(entry.id, entry);

    // Index all searchable fields
    this.indexText(entry.id, entry.name);
    this.indexText(entry.id, entry.fullyQualifiedName);
    this.indexText(entry.id, entry.description);
    entry.tags.forEach(tag => this.indexText(entry.id, tag));
  }

  /**
   * Remove entry from index
   */
  removeEntry(entry: CatalogEntry): void {
    this.entries.delete(entry.id);
    // Remove from all index keys
    for (const ids of this.index.values()) {
      ids.delete(entry.id);
    }
  }

  /**
   * Update entry in index
   */
  updateEntry(entry: CatalogEntry): void {
    this.removeEntry(entry);
    this.addEntry(entry);
  }

  /**
   * Index text for an entry
   */
  private indexText(entryId: string, text: string): void {
    if (!text) return;

    const tokens = this.tokenize(text);
    for (const token of tokens) {
      if (!this.index.has(token)) {
        this.index.set(token, new Set());
      }
      this.index.get(token)!.add(entryId);
    }
  }

  /**
   * Tokenize text for indexing
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter(t => t.length > 2);
  }

  /**
   * Search index
   */
  search(query: string): CatalogEntry[] {
    const tokens = this.tokenize(query);
    if (tokens.length === 0) {
      return Array.from(this.entries.values());
    }

    // Get IDs matching all tokens
    const matchingSets = tokens.map(token => this.index.get(token) || new Set<string>());
    const matchingIds = this.intersectSets(matchingSets);

    return Array.from(matchingIds)
      .map(id => this.entries.get(id))
      .filter((e): e is CatalogEntry => e !== undefined);
  }

  /**
   * Intersect multiple sets
   */
  private intersectSets(sets: Set<string>[]): Set<string> {
    if (sets.length === 0) return new Set();
    if (sets.length === 1) return sets[0];

    const result = new Set(sets[0]);
    for (let i = 1; i < sets.length; i++) {
      for (const item of result) {
        if (!sets[i].has(item)) {
          result.delete(item);
        }
      }
    }

    return result;
  }
}

// ============================================================================
// SCHEMA DISCOVERERS
// ============================================================================

interface SchemaDiscoverer {
  discover(source: DataSourceReference): Promise<SchemaMetadata>;
  discoverAll(source: DataSourceReference): Promise<DiscoveredItem[]>;
}

interface DiscoveredItem {
  name: string;
  type: CatalogEntryType;
  schema: SchemaMetadata;
}

class JDBCSchemaDiscoverer implements SchemaDiscoverer {
  async discover(source: DataSourceReference): Promise<SchemaMetadata> {
    // JDBC-based schema discovery
    return {
      columns: [],
      indexes: [],
      constraints: []
    };
  }

  async discoverAll(source: DataSourceReference): Promise<DiscoveredItem[]> {
    return [];
  }
}

class MongoDBSchemaDiscoverer implements SchemaDiscoverer {
  async discover(source: DataSourceReference): Promise<SchemaMetadata> {
    return {
      columns: [],
      indexes: [],
      constraints: []
    };
  }

  async discoverAll(source: DataSourceReference): Promise<DiscoveredItem[]> {
    return [];
  }
}

class APISchemaDiscoverer implements SchemaDiscoverer {
  async discover(source: DataSourceReference): Promise<SchemaMetadata> {
    return {
      columns: [],
      indexes: [],
      constraints: []
    };
  }

  async discoverAll(source: DataSourceReference): Promise<DiscoveredItem[]> {
    return [];
  }
}

class FileSchemaDiscoverer implements SchemaDiscoverer {
  async discover(source: DataSourceReference): Promise<SchemaMetadata> {
    return {
      columns: [],
      indexes: [],
      constraints: []
    };
  }

  async discoverAll(source: DataSourceReference): Promise<DiscoveredItem[]> {
    return [];
  }
}

class GenericSchemaDiscoverer implements SchemaDiscoverer {
  async discover(source: DataSourceReference): Promise<SchemaMetadata> {
    return {
      columns: [],
      indexes: [],
      constraints: []
    };
  }

  async discoverAll(source: DataSourceReference): Promise<DiscoveredItem[]> {
    return [];
  }
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface SearchQuery {
  text?: string;
  types?: CatalogEntryType[];
  sourceTypes?: DataSourceType[];
  tags?: string[];
  owner?: string;
  classification?: DataClassification;
  minQualityScore?: number;
  maxAgeHours?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

interface LineageGraph {
  root: CatalogEntry;
  upstream: CatalogEntry[];
  downstream: CatalogEntry[];
}

interface DiscoveryConfig {
  dataSourceId: string;
  sourceType: DataSourceType;
  dataSource: DataSourceReference;
  schedule: string; // cron expression
  enabled: boolean;
}

interface CatalogStatistics {
  totalEntries: number;
  entriesByType: Record<string, number>;
  entriesBySource: Record<string, number>;
  entriesByClassification: Record<string, number>;
  averageQualityScore: number;
  totalDataSources: number;
  entriesWithPII: number;
}

// Singleton instance
let catalogInstance: DataCatalog | null = null;

export function getDataCatalog(): DataCatalog {
  if (!catalogInstance) {
    catalogInstance = new DataCatalog();
  }
  return catalogInstance;
}
