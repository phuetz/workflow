/**
 * Salesforce Integration Node
 * Complete CRM integration with Salesforce API
 */

import { NodeType, WorkflowNode } from '../../types/workflow';
import { NodeExecutor } from '../../types/nodeExecutor';
// @ts-ignore - jsforce may not have type definitions
import jsforce from 'jsforce';
import { logger } from '../../services/SimpleLogger';

export interface SalesforceNodeConfig {
  action: 'create' | 'read' | 'update' | 'delete' | 'query' | 'bulk_operation' | 'report';
  instanceUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  securityToken?: string;
  apiVersion?: string;
  // Object parameters
  objectType?: 'Lead' | 'Contact' | 'Account' | 'Opportunity' | 'Case' | 'Task' | 'Custom';
  customObject?: string;
  // Query parameters
  soqlQuery?: string;
  fields?: string[];
  conditions?: Record<string, any>;
  limit?: number;
  // Bulk parameters
  operation?: 'insert' | 'update' | 'upsert' | 'delete';
  externalIdField?: string;
  concurrencyMode?: 'Parallel' | 'Serial';
}

export const salesforceNodeType: NodeType = {
  type: 'salesforce',
  label: 'Salesforce',
  icon: 'Cloud',
  color: 'bg-blue-600',
  category: 'crm',
  inputs: 1,
  outputs: 2,
  description: 'Interact with Salesforce CRM - manage leads, contacts, opportunities and more',
  errorHandle: true
};

// Default configuration for the node
export const salesforceDefaultConfig: SalesforceNodeConfig = {
  action: 'query',
  objectType: 'Lead',
  apiVersion: '58.0'
};

export class SalesforceNodeExecutor implements NodeExecutor {
  private conn: jsforce.Connection | null = null;
  [key: string]: unknown;

  validate(node: WorkflowNode): string[] {
    const errors: string[] = [];
    const config = node.data.config as unknown as SalesforceNodeConfig | undefined;

    if (!config) {
      errors.push('Salesforce configuration is required');
      return errors;
    }

    if (!config.action) {
      errors.push('Action is required');
    }

    if (!config.instanceUrl && !process.env.SALESFORCE_INSTANCE_URL) {
      errors.push('Instance URL is required');
    }

    if (!config.accessToken && !config.username) {
      errors.push('Either access token or username/password is required for authentication');
    }

    if (config.username && !config.password) {
      errors.push('Password is required when using username authentication');
    }

    if (config.objectType === 'Custom' && !config.customObject) {
      errors.push('Custom object name is required when using Custom object type');
    }

    return errors;
  }

  private async initConnection(config: SalesforceNodeConfig): Promise<jsforce.Connection> {
    const conn = new jsforce.Connection({
      instanceUrl: config.instanceUrl || process.env.SALESFORCE_INSTANCE_URL,
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
      oauth2: config.clientId ? {
        clientId: config.clientId || process.env.SALESFORCE_CLIENT_ID,
        clientSecret: config.clientSecret || process.env.SALESFORCE_CLIENT_SECRET,
        redirectUri: process.env.SALESFORCE_REDIRECT_URI || 'http://localhost:3000/oauth/callback'
      } : undefined,
      version: config.apiVersion || '58.0'
    });

    // If using username/password authentication
    if (config.username && config.password) {
      await conn.login(
        config.username,
        config.password + (config.securityToken || '')
      );
    }

    return conn;
  }

  async execute(node: WorkflowNode, context: any): Promise<any> {
    const config = node.data.config as unknown as SalesforceNodeConfig;
    const inputData = context.inputData || context;
    
    try {
      this.conn = await this.initConnection(config);

      switch (config.action) {
        case 'create':
          return await this.createRecord(config, inputData);
        
        case 'read':
          return await this.readRecord(config, inputData);
        
        case 'update':
          return await this.updateRecord(config, inputData);
        
        case 'delete':
          return await this.deleteRecord(config, inputData);
        
        case 'query':
          return await this.queryRecords(config, inputData);
        
        case 'bulk_operation':
          return await this.bulkOperation(config, inputData);
        
        case 'report':
          return await this.runReport(config, inputData);
        
        default:
          throw new Error(`Unknown Salesforce action: ${config.action}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: (error as any).errorCode || 'SALESFORCE_ERROR'
      };
    } finally {
      if (this.conn) {
        await this.conn.logout();
      }
    }
  }

  private getObjectName(config: SalesforceNodeConfig): string {
    return config.objectType === 'Custom' 
      ? (config.customObject || '') 
      : (config.objectType || 'Lead');
  }

  private async createRecord(config: SalesforceNodeConfig, inputData: any): Promise<any> {
    const objectName = this.getObjectName(config);
    const recordData = inputData.record || inputData;

    const result = await this.conn!.sobject(objectName).create(recordData);

    return {
      success: result.success,
      id: result.id,
      errors: result.errors,
      created: true,
      object: objectName,
      data: recordData
    };
  }

  private async readRecord(config: SalesforceNodeConfig, inputData: any): Promise<any> {
    const objectName = this.getObjectName(config);
    const recordId = inputData.id || inputData.recordId;

    if (!recordId) {
      throw new Error('Record ID is required for read operation');
    }

    const record = await this.conn!.sobject(objectName).retrieve(recordId);

    return {
      success: true,
      record,
      id: recordId,
      object: objectName
    };
  }

  private async updateRecord(config: SalesforceNodeConfig, inputData: any): Promise<any> {
    const objectName = this.getObjectName(config);
    const recordId = inputData.id || inputData.recordId;
    const updateData = inputData.updates || inputData.record || inputData;

    if (!recordId) {
      throw new Error('Record ID is required for update operation');
    }

    // Remove id from update data if present
    const { id, ...dataWithoutId } = updateData;

    const result = await this.conn!.sobject(objectName).update({
      Id: recordId,
      ...dataWithoutId
    });

    return {
      success: result.success,
      id: result.id,
      errors: result.errors,
      updated: true,
      object: objectName,
      data: dataWithoutId
    };
  }

  private async deleteRecord(config: SalesforceNodeConfig, inputData: any): Promise<any> {
    const objectName = this.getObjectName(config);
    const recordId = inputData.id || inputData.recordId;

    if (!recordId) {
      throw new Error('Record ID is required for delete operation');
    }

    const result = await this.conn!.sobject(objectName).destroy(recordId);

    return {
      success: result.success,
      id: result.id,
      errors: result.errors,
      deleted: true,
      object: objectName
    };
  }

  private async queryRecords(config: SalesforceNodeConfig, inputData: any): Promise<any> {
    let query: string;

    if (config.soqlQuery) {
      // Use provided SOQL query
      query = config.soqlQuery;
    } else {
      // Build query from config
      const objectName = this.getObjectName(config);
      const fields = config.fields || inputData.fields || ['Id', 'Name'];
      const conditions = config.conditions || inputData.conditions || {};
      const limit = config.limit || inputData.limit || 100;

      // Build WHERE clause
      const whereClause = Object.entries(conditions)
        .map(([field, value]) => {
          if (typeof value === 'string') {
            return `${field} = '${value}'`;
          } else if (typeof value === 'number') {
            return `${field} = ${value}`;
          } else if (value === null) {
            return `${field} = NULL`;
          } else {
            return `${field} = '${JSON.stringify(value)}'`;
          }
        })
        .join(' AND ');

      query = `SELECT ${fields.join(', ')} FROM ${objectName}`;
      if (whereClause) {
        query += ` WHERE ${whereClause}`;
      }
      query += ` LIMIT ${limit}`;
    }

    const result = await this.conn!.query(query);

    return {
      success: true,
      records: result.records,
      totalSize: result.totalSize,
      done: result.done,
      query,
      object: this.getObjectName(config)
    };
  }

  private async bulkOperation(config: SalesforceNodeConfig, inputData: any): Promise<any> {
    const objectName = this.getObjectName(config);
    const operation = config.operation || 'insert';
    const records = inputData.records || [inputData];

    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('Records array is required for bulk operation');
    }

    const job = this.conn!.bulk.createJob(objectName, operation, {
      concurrencyMode: config.concurrencyMode || 'Parallel',
      externalIdFieldName: config.externalIdField
    });

    const batch = job.createBatch();
    
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const errors: any[] = [];

      batch.on('error', (err) => {
        reject(err);
      });

      batch.on('queue', (batchInfo) => {
        logger.debug('Batch queued:', batchInfo.id);
      });

      batch.on('response', (responses) => {
        responses.forEach((res: any) => {
          if (res.success) {
            results.push(res);
          } else {
            errors.push(res);
          }
        });

        resolve({
          success: errors.length === 0,
          results,
          errors,
          totalProcessed: results.length + errors.length,
          successCount: results.length,
          errorCount: errors.length,
          operation,
          object: objectName
        });
      });

      batch.execute(records);
    });
  }

  private async runReport(config: SalesforceNodeConfig, inputData: any): Promise<any> {
    const reportId = inputData.reportId;
    
    if (!reportId) {
      throw new Error('Report ID is required');
    }

    const report = await this.conn!.analytics.report(reportId);
    const result = await report.execute();

    return {
      success: true,
      reportId,
      reportMetadata: result.reportMetadata,
      factMap: result.factMap,
      aggregates: result.aggregates,
      groupingsDown: result.groupingsDown,
      groupingsAcross: result.groupingsAcross
    };
  }
}

// Configuration UI schema for the node
export const salesforceNodeConfigSchema = {
  action: {
    type: 'select',
    label: 'Action',
    options: [
      { value: 'create', label: 'Create Record' },
      { value: 'read', label: 'Read Record' },
      { value: 'update', label: 'Update Record' },
      { value: 'delete', label: 'Delete Record' },
      { value: 'query', label: 'Query Records (SOQL)' },
      { value: 'bulk_operation', label: 'Bulk Operation' },
      { value: 'report', label: 'Run Report' }
    ],
    default: 'query'
  },
  objectType: {
    type: 'select',
    label: 'Object Type',
    options: [
      { value: 'Lead', label: 'Lead' },
      { value: 'Contact', label: 'Contact' },
      { value: 'Account', label: 'Account' },
      { value: 'Opportunity', label: 'Opportunity' },
      { value: 'Case', label: 'Case' },
      { value: 'Task', label: 'Task' },
      { value: 'Custom', label: 'Custom Object' }
    ],
    default: 'Lead',
    showWhen: { action: ['create', 'read', 'update', 'delete', 'query', 'bulk_operation'] }
  },
  customObject: {
    type: 'string',
    label: 'Custom Object Name',
    placeholder: 'CustomObject__c',
    showWhen: { objectType: 'Custom' }
  },
  soqlQuery: {
    type: 'code',
    label: 'SOQL Query',
    language: 'sql',
    placeholder: 'SELECT Id, Name FROM Lead WHERE Status = \'New\' LIMIT 10',
    showWhen: { action: 'query' }
  },
  operation: {
    type: 'select',
    label: 'Bulk Operation',
    options: [
      { value: 'insert', label: 'Insert' },
      { value: 'update', label: 'Update' },
      { value: 'upsert', label: 'Upsert' },
      { value: 'delete', label: 'Delete' }
    ],
    showWhen: { action: 'bulk_operation' }
  },
  instanceUrl: {
    type: 'string',
    label: 'Instance URL',
    placeholder: 'https://your-instance.salesforce.com'
  },
  username: {
    type: 'string',
    label: 'Username',
    placeholder: 'user@example.com'
  },
  password: {
    type: 'credential',
    label: 'Password'
  },
  securityToken: {
    type: 'credential',
    label: 'Security Token'
  },
  limit: {
    type: 'number',
    label: 'Query Limit',
    default: 100,
    showWhen: { action: 'query' }
  }
};