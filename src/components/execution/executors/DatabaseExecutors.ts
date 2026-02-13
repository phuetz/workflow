/**
 * Database node executors: SQL, MongoDB, Google Sheets, S3
 */

import type { WorkflowNode, NodeConfig } from '../types';

/**
 * Execute SQL database node (MySQL, PostgreSQL)
 */
export async function executeDatabase(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const operation = config.operation || 'select';
  const query = config.query || 'SELECT * FROM users LIMIT 10';

  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2024-01-01' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: '2024-01-02' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', created_at: '2024-01-03' }
  ];

  return {
    operation,
    query,
    rowsAffected: mockData.length,
    data: operation === 'select' ? mockData : null,
    executionTime: Math.floor(Math.random() * 100) + 10
  };
}

/**
 * Execute MongoDB node
 */
export async function executeMongoDB(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const operation = (config.operation as string) || 'find';
  const collection = (config.collection as string) || 'users';

  return {
    operation,
    collection,
    database: config.database,
    result: {
      acknowledged: true,
      insertedCount: operation.includes('insert') ? 1 : undefined,
      matchedCount: operation.includes('update') ? 1 : undefined,
      modifiedCount: operation.includes('update') ? 1 : undefined
    }
  };
}

/**
 * Execute Google Sheets node
 */
export async function executeGoogleSheets(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const operation = (config.operation as string) || 'read';
  const spreadsheetId = (config.spreadsheetId as string) || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
  const range = (config.range as string) || 'A1:D10';

  return {
    operation,
    spreadsheetId,
    range,
    data: operation === 'read' ? [
      ['Name', 'Email', 'Score', 'Date'],
      ['John Doe', 'john@example.com', '95', '2024-01-01'],
      ['Jane Smith', 'jane@example.com', '87', '2024-01-02']
    ] : null,
    rowsAffected: operation === 'write' ? 1 : undefined
  };
}

/**
 * Execute S3 node
 */
export async function executeS3(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const operation = (config.operation as string) || 'upload';
  const bucket = (config.bucket as string) || 'my-bucket';

  return {
    operation,
    bucket,
    region: (config.region as string) || 'us-east-1',
    key: `file-${Date.now()}.json`,
    size: Math.floor(Math.random() * 10000) + 1000,
    etag: Math.random().toString(36).substring(2, 34)
  };
}
