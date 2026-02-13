/**
 * Airtable Integration Types
 * Spreadsheet-database hybrid with flexible records
 */

export interface AirtableCredentials {
  apiKey?: string;
  accessToken?: string;
  baseId: string;
}

export type AirtableOperation =
  | 'create'
  | 'update'
  | 'get'
  | 'list'
  | 'delete'
  | 'search';

export interface AirtableResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface AirtableRecord {
  id?: string;
  fields: Record<string, unknown>;
  createdTime?: string;
}

export interface AirtableListResponse {
  records: AirtableRecord[];
  offset?: string;
}

export interface AirtableListParams {
  maxRecords?: number;
  pageSize?: number;
  offset?: string;
  view?: string;
  sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  filterByFormula?: string;
  fields?: string[];
}

export interface AirtableCreateRequest {
  records: Array<{
    fields: Record<string, unknown>;
  }>;
  typecast?: boolean;
}

export interface AirtableUpdateRequest {
  records: Array<{
    id: string;
    fields: Record<string, unknown>;
  }>;
  typecast?: boolean;
}

export interface AirtableDeleteResponse {
  deleted: boolean;
  id: string;
}
