/**
 * Database Node Executor
 * Executes database queries with connection pooling
 */

import { Node } from '@xyflow/react';
import { NodeExecutor } from './index';
import { logger } from '../../../services/SimpleLogger';

// Helper functions for database operations
function processParameters(
  parameters: Record<string, unknown>,
  context: Record<string, unknown>
): Record<string, unknown> {
  const processed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(parameters)) {
    if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
      // Extract path from expression
      const path = value.slice(2, -2).trim();
      // Extract value from context
      processed[key] = getValueFromPath(context, path);
    } else {
      processed[key] = value;
    }
  }

  return processed;
}

function getValueFromPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// Simulation methods (replace with actual database operations)
async function simulateQuery(query: string, _params: Record<string, unknown>): Promise<unknown> {
  // Simulate SELECT query
  if (query.toLowerCase().includes('select')) {
    return {
      rows: [
        { id: 1, name: 'Sample Record 1', created_at: new Date() },
        { id: 2, name: 'Sample Record 2', created_at: new Date() }
      ],
      rowCount: 2
    };
  }

  // Simulate other queries
  return {
    rowCount: 1,
    success: true
  };
}

async function simulateInsert(table: string, data: Record<string, unknown>): Promise<unknown> {
  return {
    id: Math.floor(Math.random() * 1000),
    table,
    ...data,
    created_at: new Date(),
    rowCount: 1
  };
}

async function simulateUpdate(
  table: string,
  data: Record<string, unknown>,
  _where: Record<string, unknown>
): Promise<unknown> {
  return {
    table,
    data,
    rowCount: 1,
    updated: true
  };
}

async function simulateDelete(table: string, _where: Record<string, unknown>): Promise<unknown> {
  return {
    table,
    rowCount: 1,
    deleted: true
  };
}

export const databaseExecutor: NodeExecutor = {
  async execute(node: Node, context: unknown): Promise<unknown> {
    // Extract config from node data
    const config = (node.data?.config || {}) as Record<string, unknown>;

    const connectionString = config.connectionString as string | undefined;
    const query = config.query as string | undefined;
    const parameters = (config.parameters || {}) as Record<string, unknown>;
    const operation = (config.operation || 'query') as string;
    const table = config.table as string | undefined;
    const where = (config.where || {}) as Record<string, unknown>;

    if (!connectionString) {
      throw new Error('Database connection string is required');
    }

    if (!query && operation === 'query') {
      throw new Error('Query is required');
    }

    try {
      // Process parameters from context
      const contextRecord = (context || {}) as Record<string, unknown>;
      const processedParams = processParameters(parameters, contextRecord);

      // In production, use actual database drivers (pg, mysql2, etc.)
      // For now, simulate database operations
      logger.info('🗄️ Executing database query:', {
        operation,
        query: query?.substring(0, 100) + '...',
        parameters: processedParams
      });

      // Simulate different operations
      switch (operation) {
        case 'query':
          if (!query) {
            throw new Error('Query is required for query operation');
          }
          return await simulateQuery(query, processedParams);

        case 'insert':
          if (!table) {
            throw new Error('Table name is required for insert operation');
          }
          return await simulateInsert(table, processedParams);

        case 'update':
          if (!table) {
            throw new Error('Table name is required for update operation');
          }
          return await simulateUpdate(table, processedParams, where);

        case 'delete':
          if (!table) {
            throw new Error('Table name is required for delete operation');
          }
          return await simulateDelete(table, where);

        default:
          throw new Error(`Unknown database operation: ${operation}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Database operation failed: ${errorMessage}`);
    }
  },

  validate(node: Node): string[] {
    const errors: string[] = [];
    const config = (node.data?.config || {}) as Record<string, unknown>;

    if (!config.connectionString) {
      errors.push('Database connection string is required');
    }

    if (config.operation === 'query' && !config.query) {
      errors.push('Query is required for query operation');
    }

    if (['insert', 'update', 'delete'].includes(config.operation as string) && !config.table) {
      errors.push('Table name is required for this operation');
    }

    return errors;
  }
};