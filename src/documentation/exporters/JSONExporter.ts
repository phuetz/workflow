/**
 * JSON Exporter
 * Export workflow documentation as structured JSON
 */

import type { WorkflowAnalysis, DocumentationConfig, GeneratedDocumentation } from '../../types/workflowDocumentation';

export class JSONExporter {
  /**
   * Export to JSON
   */
  export(analysis: WorkflowAnalysis, config: DocumentationConfig): string {
    const documentation = this.buildDocumentationObject(analysis, config);
    return JSON.stringify(documentation, null, 2);
  }

  /**
   * Export to compact JSON
   */
  exportCompact(analysis: WorkflowAnalysis, config: DocumentationConfig): string {
    const documentation = this.buildDocumentationObject(analysis, config);
    return JSON.stringify(documentation);
  }

  /**
   * Build documentation object
   */
  private buildDocumentationObject(analysis: WorkflowAnalysis, config: DocumentationConfig): any {
    return {
      $schema: 'https://workflow-automation.dev/schema/workflow-documentation.json',
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      workflow: {
        metadata: this.serializeMetadata(analysis),
        nodes: this.serializeNodes(analysis, config),
        connections: this.serializeConnections(analysis),
        variables: config.includeVariables ? this.serializeVariables(analysis) : undefined,
        statistics: this.serializeStatistics(analysis),
        structure: this.serializeStructure(analysis),
        dependencies: this.serializeDependencies(analysis),
      },
      configuration: {
        includeNodeDetails: config.includeNodeDetails,
        includeVariables: config.includeVariables,
        includeExamples: config.includeExamples,
        includeAPISpecs: config.includeAPISpecs,
      },
    };
  }

  /**
   * Serialize metadata
   */
  private serializeMetadata(analysis: WorkflowAnalysis): any {
    return {
      id: analysis.metadata.id,
      name: analysis.metadata.name,
      description: analysis.metadata.description,
      version: analysis.metadata.version,
      author: analysis.metadata.author,
      organization: analysis.metadata.organization,
      tags: analysis.metadata.tags,
      category: analysis.metadata.category,
      status: analysis.metadata.status,
      timestamps: {
        created: analysis.metadata.createdAt.toISOString(),
        updated: analysis.metadata.updatedAt.toISOString(),
        lastExecuted: analysis.metadata.lastExecutedAt?.toISOString(),
      },
      executionCount: analysis.metadata.executionCount,
    };
  }

  /**
   * Serialize nodes
   */
  private serializeNodes(analysis: WorkflowAnalysis, config: DocumentationConfig): any[] {
    return analysis.nodes.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      category: node.category,
      description: node.description,
      position: node.position,
      configuration: config.includeNodeDetails ? node.config : undefined,
      connections: {
        inputs: node.inputs.map((i) => ({
          from: i.sourceNode,
          handle: i.sourceHandle,
          type: i.type,
        })),
        outputs: node.outputs.map((o) => ({
          to: o.targetNode,
          handle: o.targetHandle,
          label: o.label,
          type: o.type,
        })),
      },
      examples: config.includeExamples
        ? {
            input: node.exampleInput,
            output: node.exampleOutput,
          }
        : undefined,
      status: node.status,
      performance: {
        executionTime: node.executionTime,
      },
      notes: node.notes,
      warnings: node.warnings,
    }));
  }

  /**
   * Serialize connections
   */
  private serializeConnections(analysis: WorkflowAnalysis): any[] {
    return analysis.connections.map((conn) => ({
      id: conn.id,
      source: {
        node: conn.sourceNode,
        handle: conn.sourceHandle,
      },
      target: {
        node: conn.targetNode,
        handle: conn.targetHandle,
      },
      label: conn.label,
      type: conn.type,
    }));
  }

  /**
   * Serialize variables
   */
  private serializeVariables(analysis: WorkflowAnalysis): any[] {
    return analysis.variables.map((variable) => ({
      name: variable.name,
      type: variable.type,
      description: variable.description,
      defaultValue: variable.defaultValue,
      scope: variable.scope,
      usedIn: variable.usedIn,
    }));
  }

  /**
   * Serialize statistics
   */
  private serializeStatistics(analysis: WorkflowAnalysis): any {
    return {
      totalNodes: analysis.statistics.totalNodes,
      totalConnections: analysis.statistics.totalConnections,
      maxDepth: analysis.statistics.maxDepth,
      avgExecutionTime: analysis.statistics.avgExecutionTime,
      nodesByCategory: analysis.statistics.nodesByCategory,
    };
  }

  /**
   * Serialize structure
   */
  private serializeStructure(analysis: WorkflowAnalysis): any {
    return {
      entryPoints: analysis.structure.entryPoints,
      exitPoints: analysis.structure.exitPoints,
      branches: analysis.structure.branches.map((branch) => ({
        id: branch.id,
        startNode: branch.startNode,
        condition: branch.condition,
        paths: branch.branches.map((b) => ({
          nodes: b.path,
          condition: b.condition,
        })),
      })),
      loops: analysis.structure.loops.map((loop) => ({
        id: loop.id,
        startNode: loop.startNode,
        endNode: loop.endNode,
        path: loop.path,
        maxIterations: loop.maxIterations,
      })),
    };
  }

  /**
   * Serialize dependencies
   */
  private serializeDependencies(analysis: WorkflowAnalysis): any {
    return {
      credentials: analysis.dependencies.credentials,
      integrations: analysis.dependencies.integrations,
      subWorkflows: analysis.dependencies.subWorkflows,
    };
  }

  /**
   * Export with schema for validation
   */
  exportWithSchema(analysis: WorkflowAnalysis, config: DocumentationConfig): { data: string; schema: string } {
    const data = this.export(analysis, config);
    const schema = this.generateJSONSchema();

    return {
      data,
      schema,
    };
  }

  /**
   * Generate JSON Schema for validation
   */
  private generateJSONSchema(): string {
    const schema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'Workflow Documentation',
      type: 'object',
      required: ['version', 'generatedAt', 'workflow'],
      properties: {
        $schema: { type: 'string' },
        version: { type: 'string' },
        generatedAt: { type: 'string', format: 'date-time' },
        workflow: {
          type: 'object',
          required: ['metadata', 'nodes', 'connections', 'statistics'],
          properties: {
            metadata: { type: 'object' },
            nodes: { type: 'array', items: { type: 'object' } },
            connections: { type: 'array', items: { type: 'object' } },
            variables: { type: 'array', items: { type: 'object' } },
            statistics: { type: 'object' },
            structure: { type: 'object' },
            dependencies: { type: 'object' },
          },
        },
        configuration: { type: 'object' },
      },
    };

    return JSON.stringify(schema, null, 2);
  }
}

export default JSONExporter;
