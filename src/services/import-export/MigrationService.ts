/**
 * Migration Service
 * Handles workflow migration between versions and formats
 */

import type {
  WorkflowExport,
  WorkflowMigration,
  MigrationRule,
  WorkflowNode,
  WorkflowEdge,
  ExportedCredential,
  ExportFormat
} from './types';
import { BaseService } from '../BaseService';

export class MigrationService extends BaseService {
  constructor() {
    super('MigrationService');
  }

  /**
   * Migrates a workflow according to the migration rules
   */
  async migrateWorkflow(
    workflow: WorkflowExport,
    migration: WorkflowMigration,
    getConverter: (from: string, to: string) => { convert: (data: unknown) => Promise<unknown> } | null
  ): Promise<WorkflowExport> {
    this.logger.info('Migrating workflow', {
      workflowId: workflow.id,
      fromFormat: migration.fromFormat,
      toFormat: migration.toFormat
    });

    let migratedWorkflow = { ...workflow };

    // Apply migration rules
    for (const rule of migration.rules) {
      migratedWorkflow = await this.applyMigrationRule(migratedWorkflow, rule, migration);
    }

    // Convert format
    if (migration.fromFormat !== migration.toFormat) {
      const converter = getConverter(migration.fromFormat, migration.toFormat);
      if (converter) {
        migratedWorkflow = await converter.convert(migratedWorkflow) as WorkflowExport;
      }
    }

    migratedWorkflow.version = migration.toVersion;
    return migratedWorkflow;
  }

  /**
   * Applies a migration rule to transform workflow data
   */
  private async applyMigrationRule(
    workflow: WorkflowExport,
    rule: MigrationRule,
    migration: WorkflowMigration
  ): Promise<WorkflowExport> {
    const result = { ...workflow };

    const pattern = rule.pattern instanceof RegExp
      ? rule.pattern
      : new RegExp(rule.pattern);

    switch (rule.type) {
      case 'node':
        result.nodes = this.applyNodeMigration(result.nodes, pattern, rule, migration);
        break;

      case 'edge':
        result.edges = this.applyEdgeMigration(result.edges, pattern, rule, migration);
        break;

      case 'credential':
        if (result.credentials) {
          result.credentials = this.applyCredentialMigration(result.credentials, pattern, rule, migration);
        }
        break;

      case 'expression':
        result.nodes = this.applyExpressionMigration(result.nodes, pattern, rule, migration);
        break;
    }

    return result;
  }

  /**
   * Applies migration rules to nodes
   */
  private applyNodeMigration(
    nodes: WorkflowNode[],
    pattern: RegExp,
    rule: MigrationRule,
    migration: WorkflowMigration
  ): WorkflowNode[] {
    return nodes.map(node => {
      if (!pattern.test(node.type)) {
        return node;
      }

      switch (rule.action) {
        case 'rename':
          const renameConfig = rule.config as { newType?: string } | undefined;
          return {
            ...node,
            type: renameConfig?.newType || node.type.replace(pattern, String(renameConfig?.newType || ''))
          };

        case 'replace':
          const replaceConfig = rule.config as { replacement?: Partial<WorkflowNode> } | undefined;
          return {
            ...node,
            ...replaceConfig?.replacement,
            id: node.id,
            position: node.position
          };

        case 'transform':
          const transformConfig = rule.config as { transformerName?: string } | undefined;
          const transformer = transformConfig?.transformerName
            ? migration.customTransformers[transformConfig.transformerName]
            : null;

          if (transformer) {
            return transformer.transform(node, {
              workflow: { ...migration } as unknown as WorkflowExport,
              node,
              options: { format: migration.toFormat }
            }) as WorkflowNode;
          }
          return node;

        case 'remove':
          return { ...node, _removed: true } as WorkflowNode;

        default:
          return node;
      }
    }).filter(node => !(node as unknown as { _removed?: boolean })._removed);
  }

  /**
   * Applies migration rules to edges
   */
  private applyEdgeMigration(
    edges: WorkflowEdge[],
    pattern: RegExp,
    rule: MigrationRule,
    migration: WorkflowMigration
  ): WorkflowEdge[] {
    return edges.map(edge => {
      const edgeIdentifier = `${edge.source}->${edge.target}`;
      if (!pattern.test(edgeIdentifier)) {
        return edge;
      }

      switch (rule.action) {
        case 'rename':
          const renameConfig = rule.config as { sourceMapping?: Record<string, string>; targetMapping?: Record<string, string> } | undefined;
          return {
            ...edge,
            source: renameConfig?.sourceMapping?.[edge.source] || edge.source,
            target: renameConfig?.targetMapping?.[edge.target] || edge.target
          };

        case 'transform':
          const transformConfig = rule.config as { transformerName?: string } | undefined;
          const transformer = transformConfig?.transformerName
            ? migration.customTransformers[transformConfig.transformerName]
            : null;

          if (transformer) {
            return transformer.transform(edge, {
              workflow: { ...migration } as unknown as WorkflowExport,
              edge,
              options: { format: migration.toFormat }
            }) as WorkflowEdge;
          }
          return edge;

        case 'remove':
          return { ...edge, _removed: true } as WorkflowEdge;

        default:
          return edge;
      }
    }).filter(edge => !(edge as unknown as { _removed?: boolean })._removed);
  }

  /**
   * Applies migration rules to credentials
   */
  private applyCredentialMigration(
    credentials: ExportedCredential[],
    pattern: RegExp,
    rule: MigrationRule,
    migration: WorkflowMigration
  ): ExportedCredential[] {
    return credentials.map(cred => {
      if (!pattern.test(cred.type)) {
        return cred;
      }

      switch (rule.action) {
        case 'rename':
          const renameConfig = rule.config as { newType?: string } | undefined;
          return {
            ...cred,
            type: renameConfig?.newType || cred.type.replace(pattern, String(renameConfig?.newType || ''))
          };

        case 'transform':
          const transformConfig = rule.config as { transformerName?: string } | undefined;
          const transformer = transformConfig?.transformerName
            ? migration.customTransformers[transformConfig.transformerName]
            : null;

          if (transformer) {
            return transformer.transform(cred, {
              workflow: { ...migration } as unknown as WorkflowExport,
              options: { format: migration.toFormat }
            }) as ExportedCredential;
          }
          return cred;

        case 'remove':
          return { ...cred, _removed: true } as ExportedCredential;

        default:
          return cred;
      }
    }).filter(cred => !(cred as unknown as { _removed?: boolean })._removed);
  }

  /**
   * Applies migration rules to expressions within nodes
   */
  private applyExpressionMigration(
    nodes: WorkflowNode[],
    pattern: RegExp,
    rule: MigrationRule,
    migration: WorkflowMigration
  ): WorkflowNode[] {
    return nodes.map(node => {
      const newData = JSON.parse(JSON.stringify(node.data));
      this.processExpressions(newData, pattern, rule, migration);

      return {
        ...node,
        data: newData
      };
    });
  }

  /**
   * Recursively processes expressions in an object
   */
  private processExpressions(
    obj: unknown,
    pattern: RegExp,
    rule: MigrationRule,
    migration: WorkflowMigration
  ): void {
    if (obj === null || obj === undefined) return;

    if (typeof obj === 'object') {
      const record = obj as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        const value = record[key];

        if (typeof value === 'string' && pattern.test(value)) {
          switch (rule.action) {
            case 'rename':
              const renameConfig = rule.config as { replacement?: string } | undefined;
              record[key] = value.replace(pattern, renameConfig?.replacement || '');
              break;

            case 'transform':
              const transformConfig = rule.config as { transformerName?: string } | undefined;
              const transformer = transformConfig?.transformerName
                ? migration.customTransformers[transformConfig.transformerName]
                : null;

              if (transformer) {
                record[key] = transformer.transform(value, {
                  workflow: { ...migration } as unknown as WorkflowExport,
                  options: { format: migration.toFormat }
                });
              }
              break;
          }
        } else if (typeof value === 'object') {
          this.processExpressions(value, pattern, rule, migration);
        }
      }
    }
  }
}

export const migrationService = new MigrationService();
