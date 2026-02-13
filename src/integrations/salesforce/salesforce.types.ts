/**
 * Salesforce Integration Types
 * PROJET SAUVÉ - Phase 6: CRM Batch
 */

export interface SalesforceCredentials {
  accessToken?: string;
  instanceUrl?: string;
  clientId?: string;
  clientSecret?: string;
}

export type SalesforceOperation = 'query' | 'create' | 'update' | 'get' | 'delete';

export interface SalesforceResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface SalesforceQueryResult {
  totalSize: number;
  done: boolean;
  records: Array<Record<string, unknown>>;
}
