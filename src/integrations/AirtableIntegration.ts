/**
 * Airtable Integration Service
 * Complete Airtable REST API integration for n8n parity
 */

import { logger } from '../services/SimpleLogger';
import { integrationRateLimiter } from '../backend/security/RateLimitService';

export interface AirtableCredentials {
  apiKey: string; // Personal Access Token or API Key
  baseId?: string; // Default base ID
}

export interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
}

export interface AirtableTable {
  id: string;
  name: string;
  primaryFieldId: string;
  fields: AirtableField[];
  views: AirtableView[];
}

export interface AirtableField {
  id: string;
  name: string;
  type: string;
  description?: string;
  options?: Record<string, unknown>;
}

export interface AirtableView {
  id: string;
  name: string;
  type: string;
}

export interface AirtableBase {
  id: string;
  name: string;
  permissionLevel: 'none' | 'read' | 'comment' | 'edit' | 'create';
}

export interface AirtableListOptions {
  pageSize?: number;
  offset?: string;
  view?: string;
  filterByFormula?: string;
  sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  fields?: string[];
  maxRecords?: number;
  cellFormat?: 'json' | 'string';
  timeZone?: string;
  userLocale?: string;
  returnFieldsByFieldId?: boolean;
}

export interface AirtableCreateOptions {
  typecast?: boolean;
  returnFieldsByFieldId?: boolean;
}

export interface AirtableUpdateOptions {
  typecast?: boolean;
  returnFieldsByFieldId?: boolean;
  performUpsert?: {
    fieldsToMergeOn: string[];
  };
}

interface AirtableApiResponse<T = unknown> {
  records?: T[];
  offset?: string;
  error?: {
    type: string;
    message: string;
  };
}

export class AirtableIntegration {
  private credentials: AirtableCredentials;
  private baseUrl = 'https://api.airtable.com/v0';
  private metaUrl = 'https://api.airtable.com/v0/meta';

  constructor(credentials: AirtableCredentials) {
    this.credentials = credentials;
    logger.info('AirtableIntegration initialized');
  }

  // ===================
  // RECORD OPERATIONS
  // ===================

  /**
   * List records from a table
   */
  async listRecords(
    baseId: string,
    tableIdOrName: string,
    options: AirtableListOptions = {}
  ): Promise<{ records: AirtableRecord[]; offset?: string }> {
    await this.checkRateLimit('airtable:list');

    const params = new URLSearchParams();

    if (options.pageSize) params.append('pageSize', String(options.pageSize));
    if (options.offset) params.append('offset', options.offset);
    if (options.view) params.append('view', options.view);
    if (options.filterByFormula) params.append('filterByFormula', options.filterByFormula);
    if (options.maxRecords) params.append('maxRecords', String(options.maxRecords));
    if (options.cellFormat) params.append('cellFormat', options.cellFormat);
    if (options.timeZone) params.append('timeZone', options.timeZone);
    if (options.userLocale) params.append('userLocale', options.userLocale);
    if (options.returnFieldsByFieldId) params.append('returnFieldsByFieldId', 'true');

    if (options.fields) {
      options.fields.forEach(field => params.append('fields[]', field));
    }

    if (options.sort) {
      options.sort.forEach((sortItem, index) => {
        params.append(`sort[${index}][field]`, sortItem.field);
        params.append(`sort[${index}][direction]`, sortItem.direction);
      });
    }

    const queryString = params.toString();
    const url = `${this.baseUrl}/${baseId}/${encodeURIComponent(tableIdOrName)}${queryString ? `?${queryString}` : ''}`;

    const response = await this.apiCall<{ records: AirtableRecord[]; offset?: string }>('GET', url);

    logger.debug('Airtable records listed', {
      baseId,
      table: tableIdOrName,
      count: response.records?.length
    });

    return {
      records: response.records || [],
      offset: response.offset
    };
  }

  /**
   * Get all records (handles pagination automatically)
   */
  async getAllRecords(
    baseId: string,
    tableIdOrName: string,
    options: Omit<AirtableListOptions, 'offset'> = {}
  ): Promise<AirtableRecord[]> {
    const allRecords: AirtableRecord[] = [];
    let offset: string | undefined;

    do {
      const result = await this.listRecords(baseId, tableIdOrName, {
        ...options,
        offset
      });

      allRecords.push(...result.records);
      offset = result.offset;
    } while (offset);

    return allRecords;
  }

  /**
   * Get a single record by ID
   */
  async getRecord(
    baseId: string,
    tableIdOrName: string,
    recordId: string,
    options: { returnFieldsByFieldId?: boolean } = {}
  ): Promise<AirtableRecord> {
    await this.checkRateLimit('airtable:get');

    const params = new URLSearchParams();
    if (options.returnFieldsByFieldId) params.append('returnFieldsByFieldId', 'true');

    const queryString = params.toString();
    const url = `${this.baseUrl}/${baseId}/${encodeURIComponent(tableIdOrName)}/${recordId}${queryString ? `?${queryString}` : ''}`;

    const response = await this.apiCall<AirtableRecord>('GET', url);

    logger.debug('Airtable record retrieved', { baseId, recordId });
    return response;
  }

  /**
   * Create one or more records
   */
  async createRecords(
    baseId: string,
    tableIdOrName: string,
    records: Array<{ fields: Record<string, unknown> }>,
    options: AirtableCreateOptions = {}
  ): Promise<AirtableRecord[]> {
    await this.checkRateLimit('airtable:create');

    // Airtable limits batch operations to 10 records
    const results: AirtableRecord[] = [];
    const batches = this.chunkArray(records, 10);

    for (const batch of batches) {
      const url = `${this.baseUrl}/${baseId}/${encodeURIComponent(tableIdOrName)}`;

      const response = await this.apiCall<{ records: AirtableRecord[] }>('POST', url, {
        records: batch,
        typecast: options.typecast,
        returnFieldsByFieldId: options.returnFieldsByFieldId
      });

      if (response.records) {
        results.push(...response.records);
      }
    }

    logger.debug('Airtable records created', {
      baseId,
      table: tableIdOrName,
      count: results.length
    });

    return results;
  }

  /**
   * Create a single record
   */
  async createRecord(
    baseId: string,
    tableIdOrName: string,
    fields: Record<string, unknown>,
    options: AirtableCreateOptions = {}
  ): Promise<AirtableRecord> {
    const results = await this.createRecords(baseId, tableIdOrName, [{ fields }], options);
    return results[0];
  }

  /**
   * Update records (PATCH - partial update)
   */
  async updateRecords(
    baseId: string,
    tableIdOrName: string,
    records: Array<{ id: string; fields: Record<string, unknown> }>,
    options: AirtableUpdateOptions = {}
  ): Promise<AirtableRecord[]> {
    await this.checkRateLimit('airtable:update');

    const results: AirtableRecord[] = [];
    const batches = this.chunkArray(records, 10);

    for (const batch of batches) {
      const url = `${this.baseUrl}/${baseId}/${encodeURIComponent(tableIdOrName)}`;

      const body: Record<string, unknown> = {
        records: batch,
        typecast: options.typecast,
        returnFieldsByFieldId: options.returnFieldsByFieldId
      };

      if (options.performUpsert) {
        body.performUpsert = options.performUpsert;
      }

      const response = await this.apiCall<{ records: AirtableRecord[] }>('PATCH', url, body);

      if (response.records) {
        results.push(...response.records);
      }
    }

    logger.debug('Airtable records updated', {
      baseId,
      table: tableIdOrName,
      count: results.length
    });

    return results;
  }

  /**
   * Update a single record
   */
  async updateRecord(
    baseId: string,
    tableIdOrName: string,
    recordId: string,
    fields: Record<string, unknown>,
    options: AirtableUpdateOptions = {}
  ): Promise<AirtableRecord> {
    const results = await this.updateRecords(
      baseId,
      tableIdOrName,
      [{ id: recordId, fields }],
      options
    );
    return results[0];
  }

  /**
   * Replace records (PUT - full replacement)
   */
  async replaceRecords(
    baseId: string,
    tableIdOrName: string,
    records: Array<{ id: string; fields: Record<string, unknown> }>,
    options: AirtableUpdateOptions = {}
  ): Promise<AirtableRecord[]> {
    await this.checkRateLimit('airtable:update');

    const results: AirtableRecord[] = [];
    const batches = this.chunkArray(records, 10);

    for (const batch of batches) {
      const url = `${this.baseUrl}/${baseId}/${encodeURIComponent(tableIdOrName)}`;

      const body: Record<string, unknown> = {
        records: batch,
        typecast: options.typecast,
        returnFieldsByFieldId: options.returnFieldsByFieldId
      };

      if (options.performUpsert) {
        body.performUpsert = options.performUpsert;
      }

      const response = await this.apiCall<{ records: AirtableRecord[] }>('PUT', url, body);

      if (response.records) {
        results.push(...response.records);
      }
    }

    logger.debug('Airtable records replaced', {
      baseId,
      table: tableIdOrName,
      count: results.length
    });

    return results;
  }

  /**
   * Delete records
   */
  async deleteRecords(
    baseId: string,
    tableIdOrName: string,
    recordIds: string[]
  ): Promise<Array<{ id: string; deleted: boolean }>> {
    await this.checkRateLimit('airtable:delete');

    const results: Array<{ id: string; deleted: boolean }> = [];
    const batches = this.chunkArray(recordIds, 10);

    for (const batch of batches) {
      const params = batch.map(id => `records[]=${id}`).join('&');
      const url = `${this.baseUrl}/${baseId}/${encodeURIComponent(tableIdOrName)}?${params}`;

      const response = await this.apiCall<{ records: Array<{ id: string; deleted: boolean }> }>('DELETE', url);

      if (response.records) {
        results.push(...response.records);
      }
    }

    logger.debug('Airtable records deleted', {
      baseId,
      table: tableIdOrName,
      count: results.length
    });

    return results;
  }

  /**
   * Delete a single record
   */
  async deleteRecord(
    baseId: string,
    tableIdOrName: string,
    recordId: string
  ): Promise<{ id: string; deleted: boolean }> {
    const results = await this.deleteRecords(baseId, tableIdOrName, [recordId]);
    return results[0];
  }

  // ===================
  // SEARCH & FILTER
  // ===================

  /**
   * Search records using a formula filter
   */
  async searchRecords(
    baseId: string,
    tableIdOrName: string,
    formula: string,
    options: Omit<AirtableListOptions, 'filterByFormula'> = {}
  ): Promise<AirtableRecord[]> {
    return this.getAllRecords(baseId, tableIdOrName, {
      ...options,
      filterByFormula: formula
    });
  }

  /**
   * Find records by field value
   */
  async findByField(
    baseId: string,
    tableIdOrName: string,
    fieldName: string,
    value: string | number | boolean
  ): Promise<AirtableRecord[]> {
    let formula: string;

    if (typeof value === 'string') {
      // Escape single quotes in string values
      const escapedValue = value.replace(/'/g, "\\'");
      formula = `{${fieldName}} = '${escapedValue}'`;
    } else {
      formula = `{${fieldName}} = ${value}`;
    }

    return this.searchRecords(baseId, tableIdOrName, formula);
  }

  // ===================
  // BASE & TABLE METADATA
  // ===================

  /**
   * List all bases the user has access to
   */
  async listBases(): Promise<{ bases: AirtableBase[]; offset?: string }> {
    await this.checkRateLimit('airtable:meta');

    const url = `${this.metaUrl}/bases`;
    const response = await this.apiCall<{ bases: AirtableBase[]; offset?: string }>('GET', url);

    logger.debug('Airtable bases listed', { count: response.bases?.length });
    return {
      bases: response.bases || [],
      offset: response.offset
    };
  }

  /**
   * Get base schema (tables and fields)
   */
  async getBaseSchema(baseId: string): Promise<{ tables: AirtableTable[] }> {
    await this.checkRateLimit('airtable:meta');

    const url = `${this.metaUrl}/bases/${baseId}/tables`;
    const response = await this.apiCall<{ tables: AirtableTable[] }>('GET', url);

    logger.debug('Airtable base schema retrieved', {
      baseId,
      tableCount: response.tables?.length
    });

    return { tables: response.tables || [] };
  }

  /**
   * Get table schema
   */
  async getTableSchema(baseId: string, tableIdOrName: string): Promise<AirtableTable | undefined> {
    const schema = await this.getBaseSchema(baseId);
    return schema.tables.find(
      t => t.id === tableIdOrName || t.name === tableIdOrName
    );
  }

  // ===================
  // TABLE OPERATIONS (Enterprise)
  // ===================

  /**
   * Create a new table
   */
  async createTable(
    baseId: string,
    name: string,
    fields: Array<{ name: string; type: string; description?: string; options?: Record<string, unknown> }>,
    description?: string
  ): Promise<AirtableTable> {
    await this.checkRateLimit('airtable:create');

    const url = `${this.metaUrl}/bases/${baseId}/tables`;

    const response = await this.apiCall<AirtableTable>('POST', url, {
      name,
      description,
      fields
    });

    logger.info('Airtable table created', { baseId, tableName: name });
    return response;
  }

  /**
   * Update table metadata
   */
  async updateTable(
    baseId: string,
    tableIdOrName: string,
    updates: { name?: string; description?: string }
  ): Promise<AirtableTable> {
    await this.checkRateLimit('airtable:update');

    const url = `${this.metaUrl}/bases/${baseId}/tables/${encodeURIComponent(tableIdOrName)}`;

    const response = await this.apiCall<AirtableTable>('PATCH', url, updates);

    logger.debug('Airtable table updated', { baseId, table: tableIdOrName });
    return response;
  }

  // ===================
  // FIELD OPERATIONS (Enterprise)
  // ===================

  /**
   * Create a new field in a table
   */
  async createField(
    baseId: string,
    tableIdOrName: string,
    field: { name: string; type: string; description?: string; options?: Record<string, unknown> }
  ): Promise<AirtableField> {
    await this.checkRateLimit('airtable:create');

    const url = `${this.metaUrl}/bases/${baseId}/tables/${encodeURIComponent(tableIdOrName)}/fields`;

    const response = await this.apiCall<AirtableField>('POST', url, field);

    logger.info('Airtable field created', {
      baseId,
      table: tableIdOrName,
      fieldName: field.name
    });

    return response;
  }

  /**
   * Update a field in a table
   */
  async updateField(
    baseId: string,
    tableIdOrName: string,
    fieldIdOrName: string,
    updates: { name?: string; description?: string }
  ): Promise<AirtableField> {
    await this.checkRateLimit('airtable:update');

    const url = `${this.metaUrl}/bases/${baseId}/tables/${encodeURIComponent(tableIdOrName)}/fields/${encodeURIComponent(fieldIdOrName)}`;

    const response = await this.apiCall<AirtableField>('PATCH', url, updates);

    logger.debug('Airtable field updated', {
      baseId,
      table: tableIdOrName,
      field: fieldIdOrName
    });

    return response;
  }

  // ===================
  // WEBHOOK OPERATIONS
  // ===================

  /**
   * List webhooks for a base
   */
  async listWebhooks(baseId: string): Promise<{ webhooks: Array<{ id: string; macSecretBase64: string; notificationUrl: string; specification: unknown }> }> {
    await this.checkRateLimit('airtable:meta');

    const url = `${this.baseUrl}/bases/${baseId}/webhooks`;
    const response = await this.apiCall<{ webhooks: Array<{ id: string; macSecretBase64: string; notificationUrl: string; specification: unknown }> }>('GET', url);

    return { webhooks: response.webhooks || [] };
  }

  /**
   * Create a webhook
   */
  async createWebhook(
    baseId: string,
    notificationUrl: string,
    specification: {
      options: {
        filters: {
          dataTypes?: string[];
          recordChangeScope?: string;
          sourceOptions?: { formId?: string };
        };
      };
    }
  ): Promise<{ id: string; macSecretBase64: string; expirationTime: string }> {
    await this.checkRateLimit('airtable:create');

    const url = `${this.baseUrl}/bases/${baseId}/webhooks`;

    const response = await this.apiCall<{ id: string; macSecretBase64: string; expirationTime: string }>('POST', url, {
      notificationUrl,
      specification
    });

    logger.info('Airtable webhook created', { baseId, webhookId: response.id });
    return response;
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(baseId: string, webhookId: string): Promise<void> {
    await this.checkRateLimit('airtable:delete');

    const url = `${this.baseUrl}/bases/${baseId}/webhooks/${webhookId}`;
    await this.apiCall('DELETE', url);

    logger.info('Airtable webhook deleted', { baseId, webhookId });
  }

  /**
   * Refresh a webhook (extend expiration)
   */
  async refreshWebhook(baseId: string, webhookId: string): Promise<{ expirationTime: string }> {
    await this.checkRateLimit('airtable:update');

    const url = `${this.baseUrl}/bases/${baseId}/webhooks/${webhookId}/refresh`;
    const response = await this.apiCall<{ expirationTime: string }>('POST', url);

    logger.debug('Airtable webhook refreshed', { baseId, webhookId });
    return response;
  }

  /**
   * List webhook payloads
   */
  async listWebhookPayloads(
    baseId: string,
    webhookId: string,
    cursor?: string
  ): Promise<{ payloads: unknown[]; cursor?: string; mightHaveMore: boolean }> {
    await this.checkRateLimit('airtable:list');

    let url = `${this.baseUrl}/bases/${baseId}/webhooks/${webhookId}/payloads`;
    if (cursor) {
      url += `?cursor=${cursor}`;
    }

    const response = await this.apiCall<{ payloads: unknown[]; cursor?: string; mightHaveMore: boolean }>('GET', url);

    return {
      payloads: response.payloads || [],
      cursor: response.cursor,
      mightHaveMore: response.mightHaveMore ?? false
    };
  }

  // ===================
  // COMMENTS OPERATIONS
  // ===================

  /**
   * List comments on a record
   */
  async listComments(
    baseId: string,
    tableIdOrName: string,
    recordId: string,
    options: { offset?: string; pageSize?: number } = {}
  ): Promise<{ comments: Array<{ id: string; author: unknown; text: string; createdTime: string }>; offset?: string }> {
    await this.checkRateLimit('airtable:list');

    const params = new URLSearchParams();
    if (options.offset) params.append('offset', options.offset);
    if (options.pageSize) params.append('pageSize', String(options.pageSize));

    const queryString = params.toString();
    const url = `${this.baseUrl}/${baseId}/${encodeURIComponent(tableIdOrName)}/${recordId}/comments${queryString ? `?${queryString}` : ''}`;

    const response = await this.apiCall<{ comments: Array<{ id: string; author: unknown; text: string; createdTime: string }>; offset?: string }>('GET', url);

    return {
      comments: response.comments || [],
      offset: response.offset
    };
  }

  /**
   * Create a comment on a record
   */
  async createComment(
    baseId: string,
    tableIdOrName: string,
    recordId: string,
    text: string
  ): Promise<{ id: string; author: unknown; text: string; createdTime: string }> {
    await this.checkRateLimit('airtable:create');

    const url = `${this.baseUrl}/${baseId}/${encodeURIComponent(tableIdOrName)}/${recordId}/comments`;

    const response = await this.apiCall<{ id: string; author: unknown; text: string; createdTime: string }>('POST', url, { text });

    logger.debug('Airtable comment created', { baseId, recordId });
    return response;
  }

  // ===================
  // ATTACHMENT HELPERS
  // ===================

  /**
   * Format attachment field value
   */
  formatAttachment(url: string, filename?: string): { url: string; filename?: string } {
    return { url, filename };
  }

  /**
   * Format multiple attachments
   */
  formatAttachments(attachments: Array<{ url: string; filename?: string }>): Array<{ url: string; filename?: string }> {
    return attachments.map(a => this.formatAttachment(a.url, a.filename));
  }

  // ===================
  // FORMULA HELPERS
  // ===================

  /**
   * Build an AND formula
   */
  buildAndFormula(conditions: string[]): string {
    if (conditions.length === 0) return '';
    if (conditions.length === 1) return conditions[0];
    return `AND(${conditions.join(', ')})`;
  }

  /**
   * Build an OR formula
   */
  buildOrFormula(conditions: string[]): string {
    if (conditions.length === 0) return '';
    if (conditions.length === 1) return conditions[0];
    return `OR(${conditions.join(', ')})`;
  }

  /**
   * Build a comparison formula
   */
  buildComparison(field: string, operator: '=' | '!=' | '>' | '<' | '>=' | '<=', value: string | number): string {
    if (typeof value === 'string') {
      const escapedValue = value.replace(/'/g, "\\'");
      return `{${field}} ${operator} '${escapedValue}'`;
    }
    return `{${field}} ${operator} ${value}`;
  }

  /**
   * Build a SEARCH formula (contains)
   */
  buildSearchFormula(field: string, searchValue: string): string {
    const escapedValue = searchValue.replace(/"/g, '\\"');
    return `SEARCH("${escapedValue}", {${field}})`;
  }

  // ===================
  // PRIVATE METHODS
  // ===================

  private async apiCall<T>(method: string, url: string, body?: unknown): Promise<T> {
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
        'Content-Type': 'application/json'
      }
    };

    if (body && method !== 'GET' && method !== 'DELETE') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter, 10) : 30;
      logger.warn('Airtable rate limit hit, waiting', { waitTime });
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      return this.apiCall<T>(method, url, body);
    }

    const data = await response.json() as AirtableApiResponse<T>;

    if (data.error) {
      logger.error('Airtable API error', {
        method,
        url,
        error: data.error.message,
        type: data.error.type
      });
      throw new Error(`Airtable API error: ${data.error.message}`);
    }

    return data as unknown as T;
  }

  private async checkRateLimit(endpoint: string): Promise<void> {
    const result = await integrationRateLimiter.checkIntegrationLimit(
      endpoint,
      'airtable-integration'
    );

    if (!result.allowed) {
      const waitTime = result.retryAfter || 1;
      logger.warn('Airtable rate limit hit, waiting', { waitTime });
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Factory function
export function createAirtableIntegration(credentials: AirtableCredentials): AirtableIntegration {
  return new AirtableIntegration(credentials);
}

export default AirtableIntegration;
