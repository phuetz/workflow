/**
 * Metadata Manager - Centralized metadata repository
 *
 * Manages all metadata including technical, business, and operational
 * metadata for data assets across the organization.
 *
 * @module semantic/MetadataManager
 */

import {
  MetadataEntry,
  TechnicalMetadata,
  BusinessMetadata,
  OperationalMetadata,
  CatalogEntry
} from './types/semantic';

/**
 * MetadataManager provides centralized metadata management
 */
export class MetadataManager {
  private metadata: Map<string, MetadataEntry> = new Map();
  private index: MetadataIndex = new MetadataIndex();
  private versionHistory: Map<string, MetadataVersion[]> = new Map();

  // ============================================================================
  // METADATA MANAGEMENT
  // ============================================================================

  /**
   * Store metadata for a target
   */
  async storeMetadata(entry: MetadataEntry): Promise<void> {
    this.validateMetadata(entry);

    // Version existing metadata
    const existing = this.metadata.get(entry.targetId);
    if (existing) {
      this.versionMetadata(existing);
    }

    // Update version
    entry.version = (existing?.version || 0) + 1;
    entry.updatedAt = new Date();

    if (!existing) {
      entry.createdAt = new Date();
    }

    // Store metadata
    this.metadata.set(entry.targetId, entry);

    // Index for search
    this.index.indexMetadata(entry);
  }

  /**
   * Get metadata for target
   */
  getMetadata(targetId: string): MetadataEntry | undefined {
    return this.metadata.get(targetId);
  }

  /**
   * Get metadata by type
   */
  getMetadataByType(targetType: string): MetadataEntry[] {
    return Array.from(this.metadata.values()).filter(
      m => m.targetType === targetType
    );
  }

  /**
   * Update metadata
   */
  async updateMetadata(
    targetId: string,
    updates: Partial<MetadataEntry>
  ): Promise<void> {
    const metadata = this.metadata.get(targetId);
    if (!metadata) {
      throw new Error(`Metadata not found for: ${targetId}`);
    }

    // Version before update
    this.versionMetadata(metadata);

    // Apply updates
    const updated = { ...metadata, ...updates };
    updated.version = metadata.version + 1;
    updated.updatedAt = new Date();

    // Store
    this.metadata.set(targetId, updated);

    // Reindex
    this.index.reindexMetadata(updated);
  }

  /**
   * Delete metadata
   */
  deleteMetadata(targetId: string): void {
    const metadata = this.metadata.get(targetId);
    if (metadata) {
      this.metadata.delete(targetId);
      this.index.removeMetadata(metadata);
    }
  }

  /**
   * Validate metadata entry
   */
  private validateMetadata(entry: MetadataEntry): void {
    if (!entry.targetId || !entry.targetType) {
      throw new Error('Metadata must have targetId and targetType');
    }
  }

  // ============================================================================
  // TECHNICAL METADATA
  // ============================================================================

  /**
   * Update technical metadata
   */
  async updateTechnicalMetadata(
    targetId: string,
    technical: Partial<TechnicalMetadata>
  ): Promise<void> {
    const metadata = this.metadata.get(targetId);
    if (!metadata) {
      throw new Error(`Metadata not found for: ${targetId}`);
    }

    const updated = { ...metadata.technical, ...technical };
    await this.updateMetadata(targetId, { technical: updated });
  }

  /**
   * Get technical metadata
   */
  getTechnicalMetadata(targetId: string): TechnicalMetadata | undefined {
    const metadata = this.metadata.get(targetId);
    return metadata?.technical;
  }

  // ============================================================================
  // BUSINESS METADATA
  // ============================================================================

  /**
   * Update business metadata
   */
  async updateBusinessMetadata(
    targetId: string,
    business: Partial<BusinessMetadata>
  ): Promise<void> {
    const metadata = this.metadata.get(targetId);
    if (!metadata) {
      throw new Error(`Metadata not found for: ${targetId}`);
    }

    const updated = { ...metadata.business, ...business };
    await this.updateMetadata(targetId, { business: updated });
  }

  /**
   * Get business metadata
   */
  getBusinessMetadata(targetId: string): BusinessMetadata | undefined {
    const metadata = this.metadata.get(targetId);
    return metadata?.business;
  }

  /**
   * Search by business terms
   */
  searchByBusinessTerms(terms: string[]): MetadataEntry[] {
    return Array.from(this.metadata.values()).filter(m =>
      terms.some(term =>
        m.business.businessTerms.some(bt =>
          bt.toLowerCase().includes(term.toLowerCase())
        )
      )
    );
  }

  /**
   * Get metadata by domain
   */
  getMetadataByDomain(domain: string): MetadataEntry[] {
    return Array.from(this.metadata.values()).filter(
      m => m.business.domain === domain
    );
  }

  /**
   * Get metadata by owner
   */
  getMetadataByOwner(owner: string): MetadataEntry[] {
    return Array.from(this.metadata.values()).filter(
      m => m.business.owner === owner
    );
  }

  // ============================================================================
  // OPERATIONAL METADATA
  // ============================================================================

  /**
   * Update operational metadata
   */
  async updateOperationalMetadata(
    targetId: string,
    operational: Partial<OperationalMetadata>
  ): Promise<void> {
    const metadata = this.metadata.get(targetId);
    if (!metadata) {
      throw new Error(`Metadata not found for: ${targetId}`);
    }

    const updated = { ...metadata.operational, ...operational };
    await this.updateMetadata(targetId, { operational: updated });
  }

  /**
   * Get operational metadata
   */
  getOperationalMetadata(targetId: string): OperationalMetadata | undefined {
    const metadata = this.metadata.get(targetId);
    return metadata?.operational;
  }

  /**
   * Record access
   */
  async recordAccess(targetId: string, accessTime: number): Promise<void> {
    const metadata = this.metadata.get(targetId);
    if (!metadata) return;

    const operational = metadata.operational;
    operational.accessCount++;
    operational.avgAccessTime =
      (operational.avgAccessTime * (operational.accessCount - 1) + accessTime) /
      operational.accessCount;
    operational.lastAccessedAt = new Date();

    await this.updateMetadata(targetId, { operational });
  }

  // ============================================================================
  // VERSIONING
  // ============================================================================

  /**
   * Version metadata before update
   */
  private versionMetadata(metadata: MetadataEntry): void {
    const versions = this.versionHistory.get(metadata.targetId) || [];

    versions.push({
      version: metadata.version,
      metadata: { ...metadata },
      timestamp: new Date()
    });

    // Keep only last 100 versions
    if (versions.length > 100) {
      versions.shift();
    }

    this.versionHistory.set(metadata.targetId, versions);
  }

  /**
   * Get version history
   */
  getVersionHistory(targetId: string): MetadataVersion[] {
    return this.versionHistory.get(targetId) || [];
  }

  /**
   * Get specific version
   */
  getVersion(targetId: string, version: number): MetadataEntry | undefined {
    const versions = this.versionHistory.get(targetId);
    if (!versions) return undefined;

    const found = versions.find(v => v.version === version);
    return found?.metadata;
  }

  /**
   * Rollback to previous version
   */
  async rollback(targetId: string, version: number): Promise<void> {
    const versionData = this.getVersion(targetId, version);
    if (!versionData) {
      throw new Error(`Version ${version} not found for ${targetId}`);
    }

    await this.storeMetadata(versionData);
  }

  // ============================================================================
  // SEARCH
  // ============================================================================

  /**
   * Search metadata
   */
  search(query: MetadataSearchQuery): MetadataEntry[] {
    let results = Array.from(this.metadata.values());

    // Text search
    if (query.text) {
      results = this.index.search(query.text);
    }

    // Filter by target type
    if (query.targetType) {
      results = results.filter(m => m.targetType === query.targetType);
    }

    // Filter by domain
    if (query.domain) {
      results = results.filter(m => m.business.domain === query.domain);
    }

    // Filter by owner
    if (query.owner) {
      results = results.filter(m => m.business.owner === query.owner);
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter(m =>
        query.tags!.some(tag => m.business.tags.includes(tag))
      );
    }

    // Filter by criticality
    if (query.criticality) {
      results = results.filter(
        m => m.business.businessCriticality === query.criticality
      );
    }

    // Filter by freshness
    if (query.maxAgeHours !== undefined) {
      const cutoff = new Date(Date.now() - query.maxAgeHours * 3600000);
      results = results.filter(m => m.updatedAt >= cutoff);
    }

    return results;
  }

  // ============================================================================
  // METADATA PROPAGATION
  // ============================================================================

  /**
   * Propagate metadata changes to related entities
   */
  async propagateMetadata(
    sourceId: string,
    targetIds: string[],
    fields: string[]
  ): Promise<void> {
    const source = this.metadata.get(sourceId);
    if (!source) {
      throw new Error(`Source metadata not found: ${sourceId}`);
    }

    for (const targetId of targetIds) {
      const target = this.metadata.get(targetId);
      if (!target) continue;

      // Copy specified fields
      const updates: Partial<MetadataEntry> = {};

      for (const field of fields) {
        if (field.startsWith('technical.')) {
          const techField = field.substring(10);
          if (!updates.technical) {
            updates.technical = { ...target.technical };
          }
          (updates.technical as any)[techField] = (source.technical as any)[techField];
        } else if (field.startsWith('business.')) {
          const bizField = field.substring(9);
          if (!updates.business) {
            updates.business = { ...target.business };
          }
          (updates.business as any)[bizField] = (source.business as any)[bizField];
        }
      }

      if (Object.keys(updates).length > 0) {
        await this.updateMetadata(targetId, updates);
      }
    }
  }

  // ============================================================================
  // METADATA ENRICHMENT
  // ============================================================================

  /**
   * Enrich metadata with AI-generated insights
   */
  async enrichMetadata(targetId: string): Promise<void> {
    const metadata = this.metadata.get(targetId);
    if (!metadata) {
      throw new Error(`Metadata not found: ${targetId}`);
    }

    // AI-based enrichment would happen here
    // For now, we'll add placeholder enrichments

    const enrichments: Partial<BusinessMetadata> = {
      // Auto-generated description
      description: metadata.business.description || 'Auto-generated description',

      // Auto-detected business terms
      businessTerms: [
        ...metadata.business.businessTerms,
        ...this.detectBusinessTerms(metadata)
      ]
    };

    await this.updateBusinessMetadata(targetId, enrichments);
  }

  /**
   * Detect business terms from metadata
   */
  private detectBusinessTerms(metadata: MetadataEntry): string[] {
    const terms: string[] = [];

    // Analyze technical metadata
    if (metadata.technical.dataType) {
      terms.push(metadata.technical.dataType);
    }

    // Analyze display name
    const words = metadata.business.displayName.split(/\s+/);
    terms.push(...words.filter(w => w.length > 3));

    return [...new Set(terms)];
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get metadata coverage statistics
   */
  getCoverageStatistics(): MetadataCoverage {
    const all = Array.from(this.metadata.values());

    const withDescription = all.filter(m => m.business.description).length;
    const withOwner = all.filter(m => m.business.owner).length;
    const withTags = all.filter(m => m.business.tags.length > 0).length;
    const withBusinessTerms = all.filter(m => m.business.businessTerms.length > 0).length;

    return {
      totalEntries: all.length,
      withDescription,
      withOwner,
      withTags,
      withBusinessTerms,
      descriptionCoverage: all.length > 0 ? withDescription / all.length : 0,
      ownerCoverage: all.length > 0 ? withOwner / all.length : 0,
      tagCoverage: all.length > 0 ? withTags / all.length : 0,
      businessTermCoverage: all.length > 0 ? withBusinessTerms / all.length : 0
    };
  }

  /**
   * Get metadata statistics
   */
  getStatistics(): MetadataStatistics {
    const all = Array.from(this.metadata.values());

    const byType: Record<string, number> = {};
    const byDomain: Record<string, number> = {};
    const byCriticality: Record<string, number> = {};

    for (const m of all) {
      byType[m.targetType] = (byType[m.targetType] || 0) + 1;
      byDomain[m.business.domain] = (byDomain[m.business.domain] || 0) + 1;
      byCriticality[m.business.businessCriticality] =
        (byCriticality[m.business.businessCriticality] || 0) + 1;
    }

    return {
      totalEntries: all.length,
      totalVersions: Array.from(this.versionHistory.values()).reduce(
        (sum, versions) => sum + versions.length,
        0
      ),
      byType,
      byDomain,
      byCriticality,
      coverage: this.getCoverageStatistics()
    };
  }
}

// ============================================================================
// METADATA INDEX
// ============================================================================

class MetadataIndex {
  private index: Map<string, Set<string>> = new Map();
  private entries: Map<string, MetadataEntry> = new Map();

  /**
   * Index metadata entry
   */
  indexMetadata(entry: MetadataEntry): void {
    this.entries.set(entry.targetId, entry);

    // Index searchable fields
    this.indexText(entry.targetId, entry.business.displayName);
    this.indexText(entry.targetId, entry.business.description);
    entry.business.tags.forEach(tag => this.indexText(entry.targetId, tag));
    entry.business.businessTerms.forEach(term => this.indexText(entry.targetId, term));
  }

  /**
   * Reindex metadata entry
   */
  reindexMetadata(entry: MetadataEntry): void {
    this.removeMetadata(entry);
    this.indexMetadata(entry);
  }

  /**
   * Remove metadata from index
   */
  removeMetadata(entry: MetadataEntry): void {
    this.entries.delete(entry.targetId);
    for (const ids of this.index.values()) {
      ids.delete(entry.targetId);
    }
  }

  /**
   * Index text for entry
   */
  private indexText(targetId: string, text: string): void {
    if (!text) return;

    const tokens = text
      .toLowerCase()
      .split(/\W+/)
      .filter(t => t.length > 2);

    for (const token of tokens) {
      if (!this.index.has(token)) {
        this.index.set(token, new Set());
      }
      this.index.get(token)!.add(targetId);
    }
  }

  /**
   * Search index
   */
  search(query: string): MetadataEntry[] {
    const tokens = query
      .toLowerCase()
      .split(/\W+/)
      .filter(t => t.length > 2);

    if (tokens.length === 0) {
      return Array.from(this.entries.values());
    }

    // Get IDs matching all tokens
    const matchingSets = tokens.map(token => this.index.get(token) || new Set<string>());
    const matchingIds = this.intersectSets(matchingSets);

    return Array.from(matchingIds)
      .map(id => this.entries.get(id))
      .filter((e): e is MetadataEntry => e !== undefined);
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
// HELPER TYPES
// ============================================================================

interface MetadataVersion {
  version: number;
  metadata: MetadataEntry;
  timestamp: Date;
}

interface MetadataSearchQuery {
  text?: string;
  targetType?: string;
  domain?: string;
  owner?: string;
  tags?: string[];
  criticality?: 'low' | 'medium' | 'high' | 'critical';
  maxAgeHours?: number;
}

interface MetadataCoverage {
  totalEntries: number;
  withDescription: number;
  withOwner: number;
  withTags: number;
  withBusinessTerms: number;
  descriptionCoverage: number;
  ownerCoverage: number;
  tagCoverage: number;
  businessTermCoverage: number;
}

interface MetadataStatistics {
  totalEntries: number;
  totalVersions: number;
  byType: Record<string, number>;
  byDomain: Record<string, number>;
  byCriticality: Record<string, number>;
  coverage: MetadataCoverage;
}

// Singleton instance
let metadataManagerInstance: MetadataManager | null = null;

export function getMetadataManager(): MetadataManager {
  if (!metadataManagerInstance) {
    metadataManagerInstance = new MetadataManager();
  }
  return metadataManagerInstance;
}
