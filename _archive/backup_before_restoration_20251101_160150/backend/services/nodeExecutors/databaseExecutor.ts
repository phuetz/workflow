/**
 * Database Node Executor
 * Executes database queries with connection pooling
 */

import { Node } from 'reactflow';
import { NodeExecutor } from './index';
import { logger } from '../../../services/LoggingService';

export const databaseExecutor: NodeExecutor = {
  async execute(node: Node, context: unknown): Promise<unknown> {
    const {
      connectionString,
      query,
      parameters = {},
      operation = 'query'
    } = config;

    if (!connectionString) {
      throw new Error('Database connection string is required');
    }

    if (!query && operation === 'query') {
      throw new Error('Query is required');
    }

    try {
      // Process parameters from context

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
          return this.simulateQuery(query, processedParams);
        
        case 'insert':
          return this.simulateInsert(config.table, processedParams);
        
        case 'update':
          return this.simulateUpdate(config.table, processedParams, config.where);
        
        case 'delete':
          return this.simulateDelete(config.table, config.where);
        
        default:
          throw new Error(`Unknown database operation: ${operation}`);
      }

    } catch (error) {
      throw new Error(`Database operation failed: ${error.message}`);
    }
  },

  validate(node: Node): string[] {
    const errors: string[] = [];

    if (!config.connectionString) {
      errors.push('Database connection string is required');
    }

    if (config.operation === 'query' && !config.query) {
      errors.push('Query is required for query operation');
    }

    if (['insert', 'update', 'delete'].includes(config.operation) && !config.table) {
      errors.push('Table name is required for this operation');
    }

    return errors;
  },

  // Helper methods
  processParameters(parameters: unknown, context: unknown): unknown {
    const processed: unknown = {};

    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        // Extract value from context
        processed[key] = this.getValueFromPath(context, path);
      } else {
        processed[key] = value;
      }
    }

    return processed;
  },

  getValueFromPath(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  },

  // Simulation methods (replace with actual database operations)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async simulateQuery(query: string, params: unknown): Promise<unknown> {
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
  },

  async simulateInsert(table: string, data: unknown): Promise<unknown> {
    return {
      id: Math.floor(Math.random() * 1000),
      ...data,
      created_at: new Date(),
      rowCount: 1
    };
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async simulateUpdate(table: string, data: unknown, where: unknown): Promise<unknown> {
    return {
      rowCount: 1,
      updated: true
    };
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async simulateDelete(table: string, where: unknown): Promise<unknown> {
    return {
      rowCount: 1,
      deleted: true
    };
  }
};