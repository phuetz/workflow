/**
 * Query Executor
 * Database-specific query execution
 */

import type { PgClient, MySQLConnection } from './types';

/**
 * PostgreSQL Query Executor
 */
export class PostgreSQLQueryExecutor {
  async executeQuery(
    connection: unknown,
    query: string,
    params: unknown[]
  ): Promise<unknown[]> {
    const client = connection as PgClient;
    const result = await client.query(query, params);
    return result.rows;
  }

  async executeQueryWithMetadata(
    connection: unknown,
    query: string,
    params: unknown[]
  ): Promise<{ rows: unknown[]; rowCount: number }> {
    const client = connection as PgClient;
    const result = await client.query(query, params);
    return { rows: result.rows, rowCount: result.rowCount };
  }

  async setQueryTimeout(connection: unknown, timeout: number): Promise<void> {
    const client = connection as PgClient;
    await client.query(`SET statement_timeout = ${timeout}`);
  }

  async beginTransaction(connection: unknown): Promise<void> {
    const client = connection as PgClient;
    await client.query('BEGIN');
  }

  async commit(connection: unknown): Promise<void> {
    const client = connection as PgClient;
    await client.query('COMMIT');
  }

  async rollback(connection: unknown): Promise<void> {
    const client = connection as PgClient;
    await client.query('ROLLBACK');
  }
}

/**
 * MySQL Query Executor
 */
export class MySQLQueryExecutor {
  async executeQuery(
    connection: unknown,
    query: string,
    params: unknown[]
  ): Promise<unknown[]> {
    const mysqlConn = connection as MySQLConnection;
    const [rows] = await mysqlConn.execute(query, params);
    return rows as unknown[];
  }

  async executeQueryRaw(
    connection: unknown,
    query: string,
    params: unknown[]
  ): Promise<unknown[]> {
    const mysqlConn = connection as MySQLConnection;
    const [rows] = await mysqlConn.query(query, params);
    return rows as unknown[];
  }

  async setQueryTimeout(connection: unknown, timeout: number): Promise<void> {
    const mysqlConn = connection as MySQLConnection;
    const timeoutSeconds = Math.ceil(timeout / 1000);
    await mysqlConn.query(`SET SESSION max_execution_time = ${timeoutSeconds * 1000}`);
  }

  async beginTransaction(connection: unknown): Promise<void> {
    const mysqlConn = connection as MySQLConnection;
    await mysqlConn.beginTransaction();
  }

  async commit(connection: unknown): Promise<void> {
    const mysqlConn = connection as MySQLConnection;
    await mysqlConn.commit();
  }

  async rollback(connection: unknown): Promise<void> {
    const mysqlConn = connection as MySQLConnection;
    await mysqlConn.rollback();
  }

  async ping(connection: unknown): Promise<boolean> {
    try {
      const mysqlConn = connection as MySQLConnection;
      await mysqlConn.ping();
      return true;
    } catch {
      return false;
    }
  }
}
