/**
 * Supergraph Composer
 * Composes multiple subgraph schemas into a unified supergraph using Apollo Federation 2.x
 */

import { composeServices } from '@apollo/composition';
import { parse, print, DocumentNode } from 'graphql';

/**
 * Subgraph definition for composition
 */
export interface SubgraphDefinition {
  name: string;
  url: string;
  schema: string;
}

/**
 * Composition result
 */
export interface CompositionResult {
  supergraphSdl: string;
  errors: CompositionError[];
  warnings: CompositionWarning[];
  hints: string[];
}

/**
 * Composition error
 */
export interface CompositionError {
  message: string;
  code: string;
  subgraph?: string;
  severity: 'error' | 'warning';
}

/**
 * Composition warning
 */
export interface CompositionWarning {
  message: string;
  subgraph?: string;
}

/**
 * Composition options
 */
export interface CompositionOptions {
  validateSchemas?: boolean;
  allowInvalidFieldNames?: boolean;
  allowInvalidDirectives?: boolean;
  strictMode?: boolean;
}

/**
 * SupergraphComposer handles schema composition for Apollo Federation
 */
export class SupergraphComposer {
  private currentSupergraphSdl: string | null = null;
  private compositionHistory: Array<{
    timestamp: Date;
    supergraphSdl: string;
    subgraphs: string[];
  }> = [];

  /**
   * Compose multiple subgraphs into a supergraph
   */
  async composeSupergraph(
    subgraphs: SubgraphDefinition[],
    options: CompositionOptions = {}
  ): Promise<string> {
    if (subgraphs.length === 0) {
      throw new Error('At least one subgraph is required for composition');
    }

    // Validate all schemas if requested
    if (options.validateSchemas !== false) {
      for (const subgraph of subgraphs) {
        this.validateSchema(subgraph.schema, subgraph.name);
      }
    }

    // Convert to Apollo composition format
    const serviceList = subgraphs.map(sg => ({
      name: sg.name,
      typeDefs: parse(sg.schema),
      url: sg.url
    }));

    try {
      // Compose using Apollo composition library
      const result = composeServices(serviceList);

      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors
          .map(e => `${e.message} (${e.extensions?.code})`)
          .join('\n');
        throw new Error(`Composition failed:\n${errorMessages}`);
      }

      if (!result.supergraphSdl) {
        throw new Error('Composition produced no supergraph SDL');
      }

      // Store supergraph
      this.currentSupergraphSdl = result.supergraphSdl;

      // Add to history
      this.compositionHistory.push({
        timestamp: new Date(),
        supergraphSdl: result.supergraphSdl,
        subgraphs: subgraphs.map(s => s.name)
      });

      // Keep only last 10 compositions
      if (this.compositionHistory.length > 10) {
        this.compositionHistory.shift();
      }

      return result.supergraphSdl;
    } catch (error) {
      throw new Error(`Supergraph composition failed: ${(error as Error).message}`);
    }
  }

  /**
   * Compose with detailed result
   */
  async composeWithDetails(
    subgraphs: SubgraphDefinition[],
    options: CompositionOptions = {}
  ): Promise<CompositionResult> {
    const errors: CompositionError[] = [];
    const warnings: CompositionWarning[] = [];
    const hints: string[] = [];

    try {
      // Validate schemas
      if (options.validateSchemas !== false) {
        for (const subgraph of subgraphs) {
          try {
            this.validateSchema(subgraph.schema, subgraph.name);
          } catch (error) {
            errors.push({
              message: (error as Error).message,
              code: 'INVALID_SCHEMA',
              subgraph: subgraph.name,
              severity: 'error'
            });
          }
        }
      }

      // Check for naming conflicts
      const conflicts = this.detectNamingConflicts(subgraphs);
      for (const conflict of conflicts) {
        warnings.push({
          message: conflict.message,
          subgraph: conflict.subgraph
        });
      }

      // Compose
      const serviceList = subgraphs.map(sg => ({
        name: sg.name,
        typeDefs: parse(sg.schema),
        url: sg.url
      }));

      const result = composeServices(serviceList);

      // Process composition errors
      if (result.errors) {
        for (const error of result.errors) {
          errors.push({
            message: error.message,
            code: error.extensions?.code as string || 'COMPOSITION_ERROR',
            severity: 'error'
          });
        }
      }

      // Add hints for optimization
      hints.push(...this.generateOptimizationHints(subgraphs));

      const supergraphSdl = result.supergraphSdl || '';

      return {
        supergraphSdl,
        errors,
        warnings,
        hints
      };
    } catch (error) {
      errors.push({
        message: (error as Error).message,
        code: 'COMPOSITION_FAILED',
        severity: 'error'
      });

      return {
        supergraphSdl: '',
        errors,
        warnings,
        hints
      };
    }
  }

  /**
   * Get current supergraph SDL
   */
  getSupergraphSDL(): string {
    if (!this.currentSupergraphSdl) {
      throw new Error('No supergraph has been composed yet');
    }

    return this.currentSupergraphSdl;
  }

  /**
   * Validate GraphQL schema
   */
  private validateSchema(schema: string, subgraphName: string): void {
    try {
      parse(schema);
    } catch (error) {
      throw new Error(
        `Invalid GraphQL schema for subgraph "${subgraphName}": ${(error as Error).message}`
      );
    }

    // Check for required federation directives in Federation 2.x
    if (!schema.includes('@link') && !schema.includes('extend schema')) {
      throw new Error(
        `Subgraph "${subgraphName}" missing @link directive. ` +
        'Federation 2.x requires: extend schema @link(url: "https://specs.apollo.dev/federation/v2.0")'
      );
    }
  }

  /**
   * Detect naming conflicts between subgraphs
   */
  private detectNamingConflicts(subgraphs: SubgraphDefinition[]): Array<{
    message: string;
    subgraph: string;
  }> {
    const conflicts: Array<{ message: string; subgraph: string }> = [];
    const typeMap = new Map<string, string[]>();

    for (const subgraph of subgraphs) {
      const types = this.extractTypes(subgraph.schema);

      for (const type of types) {
        const existing = typeMap.get(type) || [];
        existing.push(subgraph.name);
        typeMap.set(type, existing);
      }
    }

    // Check for types defined in multiple subgraphs without @key
    for (const [type, definedIn] of typeMap) {
      if (definedIn.length > 1) {
        // Check if it's an entity (has @key)
        const isEntity = subgraphs.some(sg =>
          sg.schema.includes(`type ${type}`) && sg.schema.includes('@key')
        );

        if (!isEntity) {
          conflicts.push({
            message: `Type "${type}" is defined in multiple subgraphs without @key directive: ${definedIn.join(', ')}`,
            subgraph: definedIn[0]
          });
        }
      }
    }

    return conflicts;
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
   * Generate optimization hints
   */
  private generateOptimizationHints(subgraphs: SubgraphDefinition[]): string[] {
    const hints: string[] = [];

    // Check for potential performance issues
    const totalTypes = subgraphs.reduce(
      (count, sg) => count + this.extractTypes(sg.schema).length,
      0
    );

    if (totalTypes > 100) {
      hints.push(
        'Consider splitting large schemas into smaller subgraphs for better performance'
      );
    }

    // Check for @requires usage
    const hasRequires = subgraphs.some(sg => sg.schema.includes('@requires'));
    if (hasRequires) {
      hints.push(
        '@requires directive detected. Ensure referenced fields are defined in the base entity'
      );
    }

    // Check for @provides usage
    const hasProvides = subgraphs.some(sg => sg.schema.includes('@provides'));
    if (hasProvides) {
      hints.push(
        '@provides directive detected. Consider caching strategy for provided fields'
      );
    }

    return hints;
  }

  /**
   * Get composition history
   */
  getCompositionHistory(): Array<{
    timestamp: Date;
    subgraphs: string[];
  }> {
    return this.compositionHistory.map(h => ({
      timestamp: h.timestamp,
      subgraphs: h.subgraphs
    }));
  }

  /**
   * Rollback to previous composition
   */
  rollbackToPreviousComposition(): string {
    if (this.compositionHistory.length < 2) {
      throw new Error('No previous composition to rollback to');
    }

    // Remove current composition
    this.compositionHistory.pop();

    // Get previous composition
    const previous = this.compositionHistory[this.compositionHistory.length - 1];
    this.currentSupergraphSdl = previous.supergraphSdl;

    return this.currentSupergraphSdl;
  }

  /**
   * Diff two supergraph schemas
   */
  diffSchemas(schemaA: string, schemaB: string): {
    added: string[];
    removed: string[];
    modified: string[];
  } {
    const typesA = new Set(this.extractTypes(schemaA));
    const typesB = new Set(this.extractTypes(schemaB));

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    // Find added types
    for (const type of typesB) {
      if (!typesA.has(type)) {
        added.push(type);
      }
    }

    // Find removed types
    for (const type of typesA) {
      if (!typesB.has(type)) {
        removed.push(type);
      }
    }

    // Find potentially modified types (present in both)
    for (const type of typesB) {
      if (typesA.has(type)) {
        // Simple check: if the type definition differs
        const defA = this.extractTypeDefinition(schemaA, type);
        const defB = this.extractTypeDefinition(schemaB, type);

        if (defA !== defB) {
          modified.push(type);
        }
      }
    }

    return { added, removed, modified };
  }

  /**
   * Extract type definition from schema
   */
  private extractTypeDefinition(schema: string, typeName: string): string {
    const regex = new RegExp(`type\\s+${typeName}[^}]*}`, 's');
    const match = schema.match(regex);
    return match ? match[0] : '';
  }

  /**
   * Validate supergraph SDL
   */
  validateSupergraphSDL(supergraphSdl: string): boolean {
    try {
      parse(supergraphSdl);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear composition state
   */
  clear(): void {
    this.currentSupergraphSdl = null;
    this.compositionHistory = [];
  }
}

export default SupergraphComposer;
