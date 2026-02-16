/**
 * Database Node Executor
 * Executes real database queries via pg and mysql2
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';
import { logger } from '../../../services/SimpleLogger';

function processParameters(
  parameters: Record<string, unknown>,
  context: Record<string, unknown>
): Record<string, unknown> {
  const processed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parameters)) {
    if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
      const path = value.slice(2, -2).trim();
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

function detectDbType(credentials: Record<string, any>): string {
  if (credentials.dbType) return credentials.dbType;
  const cs = (credentials.connectionString || credentials.host || '') as string;
  if (cs.startsWith('postgres') || cs.includes('5432')) return 'postgresql';
  if (cs.startsWith('mysql') || cs.includes('3306')) return 'mysql';
  return 'postgresql';
}

async function executePostgres(
  credentials: Record<string, any>,
  operation: string,
  query: string | undefined,
  table: string | undefined,
  params: Record<string, unknown>,
  where: Record<string, unknown>
): Promise<any> {
  const pg = await import('pg');
  const poolConfig: any = {};

  if (credentials.connectionString) {
    poolConfig.connectionString = credentials.connectionString;
  } else {
    poolConfig.host = credentials.host;
    poolConfig.port = credentials.port || 5432;
    poolConfig.database = credentials.database;
    poolConfig.user = credentials.user || credentials.username;
    poolConfig.password = credentials.password;
    poolConfig.ssl = credentials.ssl ? { rejectUnauthorized: false } : undefined;
  }

  const pool = new pg.default.Pool(poolConfig);

  try {
    switch (operation) {
      case 'query': {
        if (!query) throw new Error('Query is required for query operation');
        // Convert named params to positional ($1, $2, ...)
        const paramValues = Object.values(params);
        const result = await pool.query(query, paramValues.length > 0 ? paramValues : undefined);
        return { rows: result.rows, rowCount: result.rowCount };
      }
      case 'insert': {
        if (!table) throw new Error('Table name is required for insert');
        const columns = Object.keys(params);
        const values = Object.values(params);
        const placeholders = columns.map((_, i) => `$${i + 1}`);
        const sql = `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
        const result = await pool.query(sql, values);
        return { rows: result.rows, rowCount: result.rowCount };
      }
      case 'update': {
        if (!table) throw new Error('Table name is required for update');
        const setCols = Object.keys(params);
        const setVals = Object.values(params);
        const whereCols = Object.keys(where);
        const whereVals = Object.values(where);
        let idx = 1;
        const setClause = setCols.map(c => `"${c}" = $${idx++}`).join(', ');
        const whereClause = whereCols.map(c => `"${c}" = $${idx++}`).join(' AND ');
        const sql = `UPDATE "${table}" SET ${setClause}${whereClause ? ` WHERE ${whereClause}` : ''} RETURNING *`;
        const result = await pool.query(sql, [...setVals, ...whereVals]);
        return { rows: result.rows, rowCount: result.rowCount };
      }
      case 'delete': {
        if (!table) throw new Error('Table name is required for delete');
        const wCols = Object.keys(where);
        const wVals = Object.values(where);
        let wIdx = 1;
        const wClause = wCols.map(c => `"${c}" = $${wIdx++}`).join(' AND ');
        const sql = `DELETE FROM "${table}"${wClause ? ` WHERE ${wClause}` : ''} RETURNING *`;
        const result = await pool.query(sql, wVals);
        return { rows: result.rows, rowCount: result.rowCount };
      }
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } finally {
    await pool.end();
  }
}

async function executeMysql(
  credentials: Record<string, any>,
  operation: string,
  query: string | undefined,
  table: string | undefined,
  params: Record<string, unknown>,
  where: Record<string, unknown>
): Promise<any> {
  const mysql = await import('mysql2/promise');
  const connConfig: any = {};

  if (credentials.connectionString) {
    connConfig.uri = credentials.connectionString;
  } else {
    connConfig.host = credentials.host;
    connConfig.port = credentials.port || 3306;
    connConfig.database = credentials.database;
    connConfig.user = credentials.user || credentials.username;
    connConfig.password = credentials.password;
  }

  const connection = await mysql.createConnection(connConfig);

  try {
    switch (operation) {
      case 'query': {
        if (!query) throw new Error('Query is required for query operation');
        const paramValues = Object.values(params);
        const [rows, fields] = await connection.execute(query, paramValues.length > 0 ? paramValues : undefined);
        return { rows, fields, rowCount: Array.isArray(rows) ? rows.length : (rows as any).affectedRows };
      }
      case 'insert': {
        if (!table) throw new Error('Table name is required for insert');
        const columns = Object.keys(params);
        const values = Object.values(params);
        const placeholders = columns.map(() => '?');
        const sql = `INSERT INTO \`${table}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders.join(', ')})`;
        const [result] = await connection.execute(sql, values);
        return { insertId: (result as any).insertId, rowCount: (result as any).affectedRows };
      }
      case 'update': {
        if (!table) throw new Error('Table name is required for update');
        const setCols = Object.keys(params);
        const setVals = Object.values(params);
        const whereCols = Object.keys(where);
        const whereVals = Object.values(where);
        const setClause = setCols.map(c => `\`${c}\` = ?`).join(', ');
        const whereClause = whereCols.map(c => `\`${c}\` = ?`).join(' AND ');
        const sql = `UPDATE \`${table}\` SET ${setClause}${whereClause ? ` WHERE ${whereClause}` : ''}`;
        const [result] = await connection.execute(sql, [...setVals, ...whereVals]);
        return { rowCount: (result as any).affectedRows };
      }
      case 'delete': {
        if (!table) throw new Error('Table name is required for delete');
        const wCols = Object.keys(where);
        const wVals = Object.values(where);
        const wClause = wCols.map(c => `\`${c}\` = ?`).join(' AND ');
        const sql = `DELETE FROM \`${table}\`${wClause ? ` WHERE ${wClause}` : ''}`;
        const [result] = await connection.execute(sql, wVals);
        return { rowCount: (result as any).affectedRows };
      }
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } finally {
    await connection.end();
  }
}

export const databaseExecutor: NodeExecutor = {
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = context.config || {};
    const credentials = context.credentials || {};

    const operation = (config.operation || 'query') as string;
    const query = config.query as string | undefined;
    const parameters = (config.parameters || {}) as Record<string, unknown>;
    const table = config.table as string | undefined;
    const where = (config.where || {}) as Record<string, unknown>;

    // Allow connectionString from credentials or config
    if (!credentials.connectionString && !credentials.host && !config.connectionString) {
      throw new Error('Database connection details are required (provide via credentials)');
    }

    // Merge config-level connectionString into credentials if needed
    const resolvedCreds = { ...credentials };
    if (!resolvedCreds.connectionString && config.connectionString) {
      resolvedCreds.connectionString = config.connectionString;
    }

    const inputContext = (context.input || {}) as Record<string, unknown>;
    const processedParams = processParameters(parameters, inputContext);

    const dbType = detectDbType(resolvedCreds);

    logger.info('Executing database operation', { operation, dbType, table });

    try {
      let result: any;
      if (dbType === 'mysql') {
        result = await executeMysql(resolvedCreds, operation, query, table, processedParams, where);
      } else {
        result = await executePostgres(resolvedCreds, operation, query, table, processedParams, where);
      }

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Database operation failed: ${errorMessage}`);
    }
  },
};
