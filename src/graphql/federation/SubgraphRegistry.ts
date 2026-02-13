/**
 * Subgraph Registry
 * Manages registration and lifecycle of Apollo Federation subgraphs
 */

import { EventEmitter } from 'events';

/**
 * Subgraph metadata
 */
export interface Subgraph {
  name: string;
  url: string;
  schema: string;
  version: string;
  active: boolean;
  healthCheckUrl?: string;
  lastHealthCheck?: Date;
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown';
  metadata?: Record<string, unknown>;
  registeredAt: Date;
  updatedAt: Date;
}

/**
 * Subgraph registration input
 */
export interface SubgraphInput {
  name: string;
  url: string;
  schema: string;
  version: string;
  active?: boolean;
  healthCheckUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * SubgraphRegistry manages subgraph lifecycle
 */
export class SubgraphRegistry extends EventEmitter {
  private subgraphs: Map<string, Subgraph> = new Map();
  private schemaVersions: Map<string, Array<{ version: string; schema: string; timestamp: Date }>> = new Map();

  constructor() {
    super();
  }

  /**
   * Register a new subgraph
   */
  async registerSubgraph(input: SubgraphInput): Promise<Subgraph> {
    // Check if subgraph already exists
    if (this.subgraphs.has(input.name)) {
      throw new Error(`Subgraph ${input.name} already registered`);
    }

    // Validate schema
    await this.validateSchema(input.schema);

    const subgraph: Subgraph = {
      name: input.name,
      url: input.url,
      schema: input.schema,
      version: input.version,
      active: input.active ?? true,
      healthCheckUrl: input.healthCheckUrl,
      healthStatus: 'unknown',
      metadata: input.metadata,
      registeredAt: new Date(),
      updatedAt: new Date()
    };

    this.subgraphs.set(input.name, subgraph);

    // Initialize schema version history
    this.schemaVersions.set(input.name, [
      {
        version: input.version,
        schema: input.schema,
        timestamp: new Date()
      }
    ]);

    this.emit('subgraph:registered', subgraph);

    return subgraph;
  }

  /**
   * Unregister a subgraph
   */
  async unregisterSubgraph(name: string): Promise<void> {
    const subgraph = this.subgraphs.get(name);

    if (!subgraph) {
      throw new Error(`Subgraph ${name} not found`);
    }

    this.subgraphs.delete(name);
    this.schemaVersions.delete(name);

    this.emit('subgraph:unregistered', subgraph);
  }

  /**
   * Update subgraph schema
   */
  async updateSubgraphSchema(name: string, schema: string, version?: string): Promise<Subgraph> {
    const subgraph = this.subgraphs.get(name);

    if (!subgraph) {
      throw new Error(`Subgraph ${name} not found`);
    }

    // Validate new schema
    await this.validateSchema(schema);

    // Check for breaking changes
    const breakingChanges = await this.detectBreakingChanges(
      subgraph.schema,
      schema
    );

    if (breakingChanges.length > 0) {
      this.emit('subgraph:breaking-changes', {
        name,
        changes: breakingChanges
      });
    }

    const oldVersion = subgraph.version;
    const newVersion = version || this.incrementVersion(subgraph.version);

    // Update subgraph
    subgraph.schema = schema;
    subgraph.version = newVersion;
    subgraph.updatedAt = new Date();

    this.subgraphs.set(name, subgraph);

    // Add to version history
    const versions = this.schemaVersions.get(name) || [];
    versions.push({
      version: newVersion,
      schema,
      timestamp: new Date()
    });

    // Keep only last 10 versions
    if (versions.length > 10) {
      versions.shift();
    }

    this.schemaVersions.set(name, versions);

    this.emit('subgraph:schema-updated', {
      name,
      oldVersion,
      newVersion,
      breakingChanges
    });

    return subgraph;
  }

  /**
   * Get a subgraph by name
   */
  async getSubgraph(name: string): Promise<Subgraph | null> {
    return this.subgraphs.get(name) || null;
  }

  /**
   * List all subgraphs
   */
  async listSubgraphs(filter?: { active?: boolean }): Promise<Subgraph[]> {
    let subgraphs = Array.from(this.subgraphs.values());

    if (filter?.active !== undefined) {
      subgraphs = subgraphs.filter(s => s.active === filter.active);
    }

    return subgraphs;
  }

  /**
   * Activate a subgraph
   */
  async activateSubgraph(name: string): Promise<Subgraph> {
    const subgraph = this.subgraphs.get(name);

    if (!subgraph) {
      throw new Error(`Subgraph ${name} not found`);
    }

    subgraph.active = true;
    subgraph.updatedAt = new Date();

    this.subgraphs.set(name, subgraph);

    this.emit('subgraph:activated', subgraph);

    return subgraph;
  }

  /**
   * Deactivate a subgraph
   */
  async deactivateSubgraph(name: string): Promise<Subgraph> {
    const subgraph = this.subgraphs.get(name);

    if (!subgraph) {
      throw new Error(`Subgraph ${name} not found`);
    }

    subgraph.active = false;
    subgraph.updatedAt = new Date();

    this.subgraphs.set(name, subgraph);

    this.emit('subgraph:deactivated', subgraph);

    return subgraph;
  }

  /**
   * Update health status
   */
  async updateHealthStatus(
    name: string,
    status: 'healthy' | 'unhealthy'
  ): Promise<void> {
    const subgraph = this.subgraphs.get(name);

    if (!subgraph) {
      throw new Error(`Subgraph ${name} not found`);
    }

    const oldStatus = subgraph.healthStatus;
    subgraph.healthStatus = status;
    subgraph.lastHealthCheck = new Date();

    this.subgraphs.set(name, subgraph);

    if (oldStatus !== status) {
      this.emit('subgraph:health-changed', {
        name,
        oldStatus,
        newStatus: status
      });

      // Auto-deactivate if unhealthy
      if (status === 'unhealthy' && subgraph.active) {
        await this.deactivateSubgraph(name);
      }
    }
  }

  /**
   * Get schema version history
   */
  async getSchemaVersionHistory(name: string): Promise<Array<{
    version: string;
    schema: string;
    timestamp: Date;
  }>> {
    return this.schemaVersions.get(name) || [];
  }

  /**
   * Rollback to a previous schema version
   */
  async rollbackSchema(name: string, version: string): Promise<Subgraph> {
    const versions = this.schemaVersions.get(name);

    if (!versions) {
      throw new Error(`No version history for subgraph ${name}`);
    }

    const targetVersion = versions.find(v => v.version === version);

    if (!targetVersion) {
      throw new Error(`Version ${version} not found for subgraph ${name}`);
    }

    return this.updateSubgraphSchema(name, targetVersion.schema, version);
  }

  /**
   * Validate GraphQL schema
   */
  private async validateSchema(schema: string): Promise<void> {
    if (!schema || schema.trim().length === 0) {
      throw new Error('Schema cannot be empty');
    }

    // Basic validation - check for required directives
    if (!schema.includes('extend schema') && !schema.includes('type Query')) {
      throw new Error('Invalid GraphQL schema: must contain Query type or extend schema');
    }

    // Additional validation can be added here
    // e.g., parse with GraphQL.js and check for syntax errors
  }

  /**
   * Detect breaking changes between schemas
   */
  private async detectBreakingChanges(
    oldSchema: string,
    newSchema: string
  ): Promise<string[]> {
    const breakingChanges: string[] = [];

    // Simple breaking change detection
    // In production, use @graphql-inspector or similar tool

    // Check for removed types
    const oldTypes = this.extractTypes(oldSchema);
    const newTypes = this.extractTypes(newSchema);

    for (const type of oldTypes) {
      if (!newTypes.includes(type)) {
        breakingChanges.push(`Type "${type}" was removed`);
      }
    }

    // Check for removed fields
    const oldFields = this.extractFields(oldSchema);
    const newFields = this.extractFields(newSchema);

    for (const field of oldFields) {
      if (!newFields.includes(field)) {
        breakingChanges.push(`Field "${field}" was removed`);
      }
    }

    return breakingChanges;
  }

  /**
   * Extract type names from schema
   */
  private extractTypes(schema: string): string[] {
    const typeRegex = /type\s+(\w+)/g;
    const types: string[] = [];
    let match;

    while ((match = typeRegex.exec(schema)) !== null) {
      types.push(match[1]);
    }

    return types;
  }

  /**
   * Extract field names from schema
   */
  private extractFields(schema: string): string[] {
    const fieldRegex = /\s+(\w+)\s*:/g;
    const fields: string[] = [];
    let match;

    while ((match = fieldRegex.exec(schema)) !== null) {
      fields.push(match[1]);
    }

    return fields;
  }

  /**
   * Increment semantic version
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.');
    if (parts.length !== 3) {
      return '1.0.1';
    }

    const [major, minor, patch] = parts.map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  /**
   * Get registry statistics
   */
  getStatistics(): {
    totalSubgraphs: number;
    activeSubgraphs: number;
    inactiveSubgraphs: number;
    healthySubgraphs: number;
    unhealthySubgraphs: number;
  } {
    const all = Array.from(this.subgraphs.values());

    return {
      totalSubgraphs: all.length,
      activeSubgraphs: all.filter(s => s.active).length,
      inactiveSubgraphs: all.filter(s => !s.active).length,
      healthySubgraphs: all.filter(s => s.healthStatus === 'healthy').length,
      unhealthySubgraphs: all.filter(s => s.healthStatus === 'unhealthy').length
    };
  }

  /**
   * Export registry state
   */
  exportState(): Record<string, Subgraph> {
    return Object.fromEntries(this.subgraphs);
  }

  /**
   * Import registry state
   */
  async importState(state: Record<string, Subgraph>): Promise<void> {
    for (const [name, subgraph] of Object.entries(state)) {
      this.subgraphs.set(name, subgraph);

      // Initialize version history
      if (!this.schemaVersions.has(name)) {
        this.schemaVersions.set(name, [
          {
            version: subgraph.version,
            schema: subgraph.schema,
            timestamp: subgraph.updatedAt
          }
        ]);
      }
    }

    this.emit('registry:imported', { count: Object.keys(state).length });
  }

  /**
   * Clear all subgraphs
   */
  async clear(): Promise<void> {
    this.subgraphs.clear();
    this.schemaVersions.clear();
    this.emit('registry:cleared');
  }
}

export default SubgraphRegistry;
