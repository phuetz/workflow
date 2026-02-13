/**
 * Schema Registry
 * Version control and management for GraphQL schemas with breaking change detection
 */

import { parse, printSchema, buildSchema, GraphQLSchema } from 'graphql';
import { findBreakingChanges, findDangerousChanges, BreakingChange, DangerousChange } from 'graphql/utilities';
import { EventEmitter } from 'events';

/**
 * Schema version metadata
 */
export interface SchemaVersion {
  id: string;
  version: string;
  schema: string;
  hash: string;
  createdAt: Date;
  createdBy: string;
  description?: string;
  tags: string[];
  breaking: boolean;
  breakingChanges: BreakingChange[];
  dangerousChanges: DangerousChange[];
}

/**
 * Schema registration input
 */
export interface SchemaRegistrationInput {
  schema: string;
  version: string;
  createdBy: string;
  description?: string;
  tags?: string[];
}

/**
 * Schema comparison result
 */
export interface SchemaComparisonResult {
  breakingChanges: BreakingChange[];
  dangerousChanges: DangerousChange[];
  compatible: boolean;
  diff: SchemaDiff;
}

/**
 * Schema diff
 */
export interface SchemaDiff {
  added: string[];
  removed: string[];
  modified: string[];
}

/**
 * SchemaRegistry manages schema versions and compatibility
 */
export class SchemaRegistry extends EventEmitter {
  private versions: Map<string, SchemaVersion> = new Map();
  private versionsBySubgraph: Map<string, string[]> = new Map();
  private currentVersion: SchemaVersion | null = null;

  constructor() {
    super();
  }

  /**
   * Register a new schema version
   */
  async registerSchema(
    subgraph: string,
    input: SchemaRegistrationInput
  ): Promise<SchemaVersion> {
    // Validate schema
    this.validateSchema(input.schema);

    // Generate schema hash
    const hash = this.generateHash(input.schema);

    // Check for duplicate
    const existing = Array.from(this.versions.values()).find(
      v => v.hash === hash
    );

    if (existing) {
      throw new Error('Schema with identical content already registered');
    }

    // Get previous version for comparison
    const previousVersion = await this.getLatestVersion(subgraph);
    let breakingChanges: BreakingChange[] = [];
    let dangerousChanges: DangerousChange[] = [];
    let breaking = false;

    if (previousVersion) {
      const comparison = await this.compareSchemas(
        previousVersion.schema,
        input.schema
      );
      breakingChanges = comparison.breakingChanges;
      dangerousChanges = comparison.dangerousChanges;
      breaking = !comparison.compatible;
    }

    // Create version
    const versionId = `${subgraph}-${input.version}`;
    const schemaVersion: SchemaVersion = {
      id: versionId,
      version: input.version,
      schema: input.schema,
      hash,
      createdAt: new Date(),
      createdBy: input.createdBy,
      description: input.description,
      tags: input.tags || [],
      breaking,
      breakingChanges,
      dangerousChanges
    };

    // Store version
    this.versions.set(versionId, schemaVersion);

    // Update subgraph versions
    const subgraphVersions = this.versionsBySubgraph.get(subgraph) || [];
    subgraphVersions.push(versionId);
    this.versionsBySubgraph.set(subgraph, subgraphVersions);

    // Set as current if first or explicit
    if (!this.currentVersion || previousVersion?.id === this.currentVersion.id) {
      this.currentVersion = schemaVersion;
    }

    this.emit('schema:registered', {
      subgraph,
      version: schemaVersion,
      breaking
    });

    if (breaking) {
      this.emit('schema:breaking-change', {
        subgraph,
        changes: breakingChanges
      });
    }

    return schemaVersion;
  }

  /**
   * Get a specific schema version
   */
  async getVersion(versionId: string): Promise<SchemaVersion | null> {
    return this.versions.get(versionId) || null;
  }

  /**
   * Get latest version for a subgraph
   */
  async getLatestVersion(subgraph: string): Promise<SchemaVersion | null> {
    const versionIds = this.versionsBySubgraph.get(subgraph);

    if (!versionIds || versionIds.length === 0) {
      return null;
    }

    const latestId = versionIds[versionIds.length - 1];
    return this.versions.get(latestId) || null;
  }

  /**
   * List all versions for a subgraph
   */
  async listVersions(
    subgraph: string,
    options?: { limit?: number; offset?: number }
  ): Promise<SchemaVersion[]> {
    const versionIds = this.versionsBySubgraph.get(subgraph) || [];
    const { limit = 10, offset = 0 } = options || {};

    const slice = versionIds.slice(offset, offset + limit);
    const versions = slice
      .map(id => this.versions.get(id))
      .filter((v): v is SchemaVersion => v !== null);

    return versions;
  }

  /**
   * Compare two schemas
   */
  async compareSchemas(
    oldSchema: string,
    newSchema: string
  ): Promise<SchemaComparisonResult> {
    const oldGraphQLSchema = buildSchema(oldSchema);
    const newGraphQLSchema = buildSchema(newSchema);

    const breakingChanges = findBreakingChanges(
      oldGraphQLSchema,
      newGraphQLSchema
    );
    const dangerousChanges = findDangerousChanges(
      oldGraphQLSchema,
      newGraphQLSchema
    );

    const compatible = breakingChanges.length === 0;

    const diff = this.computeSchemaDiff(oldSchema, newSchema);

    return {
      breakingChanges,
      dangerousChanges,
      compatible,
      diff
    };
  }

  /**
   * Check backward compatibility
   */
  async checkBackwardCompatibility(
    subgraph: string,
    newSchema: string
  ): Promise<{
    compatible: boolean;
    breakingChanges: BreakingChange[];
    dangerousChanges: DangerousChange[];
  }> {
    const latestVersion = await this.getLatestVersion(subgraph);

    if (!latestVersion) {
      return {
        compatible: true,
        breakingChanges: [],
        dangerousChanges: []
      };
    }

    const comparison = await this.compareSchemas(
      latestVersion.schema,
      newSchema
    );

    return {
      compatible: comparison.compatible,
      breakingChanges: comparison.breakingChanges,
      dangerousChanges: comparison.dangerousChanges
    };
  }

  /**
   * Rollback to a previous version
   */
  async rollbackToVersion(versionId: string): Promise<SchemaVersion> {
    const version = this.versions.get(versionId);

    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    this.currentVersion = version;

    this.emit('schema:rollback', { version });

    return version;
  }

  /**
   * Validate GraphQL schema
   */
  private validateSchema(schema: string): void {
    try {
      buildSchema(schema);
    } catch (error) {
      throw new Error(`Invalid GraphQL schema: ${(error as Error).message}`);
    }
  }

  /**
   * Generate schema hash
   */
  private generateHash(schema: string): string {
    // Simple hash function (in production, use crypto)
    let hash = 0;
    for (let i = 0; i < schema.length; i++) {
      const char = schema.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Compute schema diff
   */
  private computeSchemaDiff(oldSchema: string, newSchema: string): SchemaDiff {
    const oldTypes = this.extractTypes(oldSchema);
    const newTypes = this.extractTypes(newSchema);

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    // Find added types
    for (const type of newTypes) {
      if (!oldTypes.includes(type)) {
        added.push(type);
      }
    }

    // Find removed types
    for (const type of oldTypes) {
      if (!newTypes.includes(type)) {
        removed.push(type);
      }
    }

    // Find modified types
    for (const type of newTypes) {
      if (oldTypes.includes(type)) {
        const oldDef = this.extractTypeDefinition(oldSchema, type);
        const newDef = this.extractTypeDefinition(newSchema, type);

        if (oldDef !== newDef) {
          modified.push(type);
        }
      }
    }

    return { added, removed, modified };
  }

  /**
   * Extract type names from schema
   */
  private extractTypes(schema: string): string[] {
    const typeRegex = /(?:type|interface|enum|union)\s+(\w+)/g;
    const types: string[] = [];
    let match;

    while ((match = typeRegex.exec(schema)) !== null) {
      types.push(match[1]);
    }

    return types;
  }

  /**
   * Extract type definition from schema
   */
  private extractTypeDefinition(schema: string, typeName: string): string {
    const regex = new RegExp(
      `(?:type|interface|enum|union)\\s+${typeName}[^}]*}`,
      's'
    );
    const match = schema.match(regex);
    return match ? match[0] : '';
  }

  /**
   * Get schema diff visualization
   */
  async getSchemaVisualDiff(
    versionIdA: string,
    versionIdB: string
  ): Promise<{
    versionA: SchemaVersion;
    versionB: SchemaVersion;
    diff: SchemaDiff;
    breakingChanges: BreakingChange[];
    dangerousChanges: DangerousChange[];
  }> {
    const versionA = this.versions.get(versionIdA);
    const versionB = this.versions.get(versionIdB);

    if (!versionA || !versionB) {
      throw new Error('One or both versions not found');
    }

    const comparison = await this.compareSchemas(
      versionA.schema,
      versionB.schema
    );

    return {
      versionA,
      versionB,
      diff: comparison.diff,
      breakingChanges: comparison.breakingChanges,
      dangerousChanges: comparison.dangerousChanges
    };
  }

  /**
   * Tag a version
   */
  async tagVersion(versionId: string, tags: string[]): Promise<SchemaVersion> {
    const version = this.versions.get(versionId);

    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    version.tags = [...new Set([...version.tags, ...tags])];
    this.versions.set(versionId, version);

    this.emit('schema:tagged', { version, tags });

    return version;
  }

  /**
   * Search versions by tag
   */
  async searchByTag(tag: string): Promise<SchemaVersion[]> {
    return Array.from(this.versions.values()).filter(v =>
      v.tags.includes(tag)
    );
  }

  /**
   * Get current version
   */
  getCurrentVersion(): SchemaVersion | null {
    return this.currentVersion;
  }

  /**
   * Get registry statistics
   */
  getStatistics(): {
    totalVersions: number;
    totalSubgraphs: number;
    breakingVersions: number;
    averageVersionsPerSubgraph: number;
  } {
    const totalVersions = this.versions.size;
    const totalSubgraphs = this.versionsBySubgraph.size;
    const breakingVersions = Array.from(this.versions.values()).filter(
      v => v.breaking
    ).length;

    const averageVersionsPerSubgraph =
      totalSubgraphs > 0 ? totalVersions / totalSubgraphs : 0;

    return {
      totalVersions,
      totalSubgraphs,
      breakingVersions,
      averageVersionsPerSubgraph
    };
  }

  /**
   * Export registry state
   */
  exportState(): {
    versions: Record<string, SchemaVersion>;
    versionsBySubgraph: Record<string, string[]>;
    currentVersionId: string | null;
  } {
    return {
      versions: Object.fromEntries(this.versions),
      versionsBySubgraph: Object.fromEntries(this.versionsBySubgraph),
      currentVersionId: this.currentVersion?.id || null
    };
  }

  /**
   * Import registry state
   */
  async importState(state: {
    versions: Record<string, SchemaVersion>;
    versionsBySubgraph: Record<string, string[]>;
    currentVersionId: string | null;
  }): Promise<void> {
    this.versions = new Map(Object.entries(state.versions));
    this.versionsBySubgraph = new Map(Object.entries(state.versionsBySubgraph));

    if (state.currentVersionId) {
      this.currentVersion = this.versions.get(state.currentVersionId) || null;
    }

    this.emit('registry:imported', {
      versionCount: this.versions.size,
      subgraphCount: this.versionsBySubgraph.size
    });
  }

  /**
   * Clear registry
   */
  clear(): void {
    this.versions.clear();
    this.versionsBySubgraph.clear();
    this.currentVersion = null;
    this.emit('registry:cleared');
  }
}

export default SchemaRegistry;
