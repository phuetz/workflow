/** Monday.com Types - GraphQL API v2023-10 */

export interface MondayCredentials {
  apiToken: string;
  accountId?: string;
}

export type MondayOperation =
  | 'createItem'
  | 'updateItem'
  | 'getItem'
  | 'deleteItem'
  | 'createBoard'
  | 'getBoard'
  | 'createColumn'
  | 'updateColumn'
  | 'createUpdate'
  | 'getUpdates';

export interface MondayResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  errors?: Array<{ message: string; locations?: any[]; extensions?: any }>;
}

export interface MondayItem {
  id: string;
  name: string;
  board?: MondayBoard;
  group?: MondayGroup;
  column_values?: MondayColumnValue[];
  created_at?: string;
  updated_at?: string;
  state?: 'active' | 'archived' | 'deleted';
}

export interface MondayBoard {
  id: string;
  name: string;
  description?: string;
  board_kind: 'public' | 'private' | 'share';
  state?: 'active' | 'archived' | 'deleted';
  columns?: MondayColumn[];
  groups?: MondayGroup[];
  items?: MondayItem[];
  workspace_id?: string;
}

export interface MondayColumn {
  id: string;
  title: string;
  type: string; // text, numbers, status, date, people, etc.
  settings_str?: string;
  archived?: boolean;
}

export interface MondayGroup {
  id: string;
  title: string;
  color?: string;
  position?: string;
  archived?: boolean;
}

export interface MondayColumnValue {
  id: string;
  title?: string;
  type?: string;
  value?: string;
  text?: string;
}

export interface MondayUpdate {
  id: string;
  item_id?: string;
  body: string;
  text_body?: string;
  creator_id?: string;
  created_at?: string;
  updated_at?: string;
  replies?: MondayUpdate[];
}

export interface MondayUser {
  id: string;
  name: string;
  email: string;
  photo_original?: string;
  is_guest?: boolean;
  enabled?: boolean;
}

export interface MondayCreateItemInput {
  board_id: string;
  group_id?: string;
  item_name: string;
  column_values?: Record<string, any>;
}

export interface MondayUpdateItemInput {
  item_id: string;
  board_id?: string;
  column_values?: Record<string, any>;
}

export interface MondayCreateBoardInput {
  board_name: string;
  board_kind: 'public' | 'private' | 'share';
  workspace_id?: string;
  description?: string;
  folder_id?: string;
}
