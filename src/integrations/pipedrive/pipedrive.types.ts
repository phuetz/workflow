/**
 * Pipedrive Integration Types
 * Sales CRM for deals, persons, and organizations
 */

export interface PipedriveCredentials {
  apiToken: string;
  domain?: string; // e.g., 'mycompany.pipedrive.com' or just 'mycompany'
}

export type PipedriveOperation =
  | 'createDeal'
  | 'updateDeal'
  | 'getDeal'
  | 'listDeals'
  | 'createPerson'
  | 'updatePerson'
  | 'getPerson'
  | 'listPersons'
  | 'createOrganization'
  | 'updateOrganization';

export interface PipedriveResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface PipedriveDeal {
  id?: number;
  title: string;
  value?: number;
  currency?: string;
  status?: 'open' | 'won' | 'lost' | 'deleted';
  stage_id?: number;
  person_id?: number;
  org_id?: number;
  user_id?: number;
  pipeline_id?: number;
  expected_close_date?: string;
  probability?: number;
  visible_to?: '1' | '3' | '5' | '7'; // owner, followers, everyone, custom
  add_time?: string;
  update_time?: string;
  [key: string]: unknown;
}

export interface PipedrivePerson {
  id?: number;
  name: string;
  email?: Array<{ value: string; primary: boolean; label?: string }>;
  phone?: Array<{ value: string; primary: boolean; label?: string }>;
  org_id?: number;
  visible_to?: '1' | '3' | '5' | '7';
  add_time?: string;
  update_time?: string;
  [key: string]: unknown;
}

export interface PipedriveOrganization {
  id?: number;
  name: string;
  address?: string;
  visible_to?: '1' | '3' | '5' | '7';
  owner_id?: number;
  add_time?: string;
  update_time?: string;
  [key: string]: unknown;
}

export interface PipedriveListResponse<T> {
  success: boolean;
  data?: T[];
  additional_data?: {
    pagination?: {
      start: number;
      limit: number;
      more_items_in_collection: boolean;
      next_start?: number;
    };
  };
}
