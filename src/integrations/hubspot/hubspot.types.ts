/**
 * HubSpot Integration Types
 * CRM for contacts, deals, companies, and tickets
 */

export interface HubSpotCredentials {
  apiKey?: string;
  accessToken?: string;
}

export type HubSpotOperation =
  | 'createContact'
  | 'updateContact'
  | 'getContact'
  | 'searchContacts'
  | 'createDeal'
  | 'updateDeal'
  | 'getDeal'
  | 'createCompany'
  | 'updateCompany'
  | 'getCompany';

export interface HubSpotResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface HubSpotContact {
  id?: string;
  properties: {
    email?: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    company?: string;
    website?: string;
    lifecyclestage?: string;
    [key: string]: unknown;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface HubSpotDeal {
  id?: string;
  properties: {
    dealname?: string;
    amount?: string;
    closedate?: string;
    dealstage?: string;
    pipeline?: string;
    [key: string]: unknown;
  };
  associations?: {
    contacts?: string[];
    companies?: string[];
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface HubSpotCompany {
  id?: string;
  properties: {
    name?: string;
    domain?: string;
    city?: string;
    industry?: string;
    phone?: string;
    [key: string]: unknown;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface HubSpotSearchRequest {
  filterGroups: Array<{
    filters: Array<{
      propertyName: string;
      operator: 'EQ' | 'NEQ' | 'LT' | 'GT' | 'CONTAINS' | 'IN';
      value: string;
    }>;
  }>;
  properties?: string[];
  limit?: number;
  after?: string;
}

export interface HubSpotSearchResponse<T> {
  results: T[];
  total: number;
  paging?: {
    next?: {
      after: string;
    };
  };
}
