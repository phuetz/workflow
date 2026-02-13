/**
 * Notion API Types
 * Official Notion API v1 integration types
 */

export interface NotionCredentials {
  token: string;             // Integration token (internal) or OAuth access token
  workspaceId?: string;      // Workspace ID (optional)
}

export type NotionOperation =
  | 'createPage'
  | 'updatePage'
  | 'getPage'
  | 'archivePage'
  | 'queryDatabase'
  | 'createDatabase'
  | 'updateDatabase'
  | 'getDatabase'
  | 'appendBlockChildren'
  | 'getBlock'
  | 'search';

export interface NotionResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

// Page types
export interface NotionPage {
  object: 'page';
  id: string;
  created_time: string;
  last_edited_time: string;
  created_by: NotionUser;
  last_edited_by: NotionUser;
  cover?: NotionFile | null;
  icon?: NotionEmoji | NotionFile | null;
  parent: NotionParent;
  archived: boolean;
  properties: Record<string, NotionPropertyValue>;
  url: string;
  public_url?: string | null;
}

export interface NotionPropertyValue {
  id: string;
  type: string;
  title?: NotionRichText[];
  rich_text?: NotionRichText[];
  number?: number | null;
  select?: { id: string; name: string; color: string } | null;
  multi_select?: Array<{ id: string; name: string; color: string }>;
  date?: { start: string; end?: string | null; time_zone?: string | null } | null;
  people?: NotionUser[];
  files?: NotionFile[];
  checkbox?: boolean;
  url?: string | null;
  email?: string | null;
  phone_number?: string | null;
  formula?: any;
  relation?: Array<{ id: string }>;
  rollup?: any;
  created_time?: string;
  created_by?: NotionUser;
  last_edited_time?: string;
  last_edited_by?: NotionUser;
}

// Database types
export interface NotionDatabase {
  object: 'database';
  id: string;
  created_time: string;
  created_by: NotionUser;
  last_edited_by: NotionUser;
  last_edited_time: string;
  title: NotionRichText[];
  description: NotionRichText[];
  icon?: NotionEmoji | NotionFile | null;
  cover?: NotionFile | null;
  properties: Record<string, NotionPropertySchema>;
  parent: NotionParent;
  url: string;
  public_url?: string | null;
  archived: boolean;
  is_inline: boolean;
}

export interface NotionPropertySchema {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
}

// Block types
export interface NotionBlock {
  object: 'block';
  id: string;
  parent: NotionParent;
  type: string;
  created_time: string;
  created_by: NotionUser;
  last_edited_time: string;
  last_edited_by: NotionUser;
  archived: boolean;
  has_children: boolean;
  [key: string]: any; // Block-specific properties
}

// Common types
export interface NotionUser {
  object: 'user';
  id: string;
  type?: 'person' | 'bot';
  name?: string | null;
  avatar_url?: string | null;
  person?: {
    email?: string;
  };
  bot?: {
    owner?: {
      type: string;
      workspace?: boolean;
    };
  };
}

export interface NotionParent {
  type: 'database_id' | 'page_id' | 'workspace' | 'block_id';
  database_id?: string;
  page_id?: string;
  workspace?: boolean;
  block_id?: string;
}

export interface NotionRichText {
  type: 'text' | 'mention' | 'equation';
  text?: {
    content: string;
    link?: { url: string } | null;
  };
  mention?: any;
  equation?: { expression: string };
  annotations?: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
  plain_text: string;
  href?: string | null;
}

export interface NotionFile {
  type: 'external' | 'file';
  external?: { url: string };
  file?: { url: string; expiry_time: string };
  name?: string;
}

export interface NotionEmoji {
  type: 'emoji';
  emoji: string;
}

// Query & Search types
export interface NotionDatabaseQuery {
  database_id: string;
  filter?: NotionFilter;
  sorts?: NotionSort[];
  start_cursor?: string;
  page_size?: number;
}

export interface NotionFilter {
  and?: NotionFilter[];
  or?: NotionFilter[];
  property?: string;
  [key: string]: any;
}

export interface NotionSort {
  property?: string;
  timestamp?: 'created_time' | 'last_edited_time';
  direction: 'ascending' | 'descending';
}

export interface NotionSearchParameters {
  query?: string;
  filter?: {
    value: 'page' | 'database';
    property: 'object';
  };
  sort?: {
    direction: 'ascending' | 'descending';
    timestamp: 'last_edited_time';
  };
  start_cursor?: string;
  page_size?: number;
}

// Pagination
export interface NotionPaginatedList<T> {
  object: 'list';
  results: T[];
  next_cursor: string | null;
  has_more: boolean;
  type?: string;
  [key: string]: any;
}
