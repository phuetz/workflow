/**
 * Zendesk Integration Types
 * Customer service platform type definitions
 */

export interface ZendeskCredentials {
  subdomain: string;
  email: string;
  apiToken: string;
}

export type ZendeskOperation =
  | 'createTicket'
  | 'updateTicket'
  | 'getTicket'
  | 'deleteTicket'
  | 'listTickets'
  | 'addComment'
  | 'createUser'
  | 'updateUser'
  | 'getUser'
  | 'searchTickets';

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketStatus = 'new' | 'open' | 'pending' | 'hold' | 'solved' | 'closed';
export type TicketType = 'problem' | 'incident' | 'question' | 'task';

export interface ZendeskResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface ZendeskTicket {
  id?: number;
  subject: string;
  description: string;
  status: TicketStatus;
  priority?: TicketPriority;
  type?: TicketType;
  requesterId?: number;
  assigneeId?: number;
  groupId?: number;
  tags?: string[];
  customFields?: ZendeskCustomField[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ZendeskCustomField {
  id: number;
  value: string | number | boolean | string[];
}

export interface ZendeskComment {
  id?: number;
  body: string;
  authorId: number;
  public: boolean;
  attachments?: ZendeskAttachment[];
  createdAt?: Date;
}

export interface ZendeskAttachment {
  id?: number;
  fileName: string;
  contentUrl: string;
  contentType: string;
  size: number;
}

export interface ZendeskUser {
  id?: number;
  name: string;
  email: string;
  phone?: string;
  role?: 'end-user' | 'agent' | 'admin';
  organizationId?: number;
  tags?: string[];
  userFields?: Record<string, unknown>;
  active?: boolean;
  verified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ZendeskOrganization {
  id?: number;
  name: string;
  domainNames?: string[];
  tags?: string[];
  organizationFields?: Record<string, unknown>;
}

export interface ZendeskSearchResult {
  results: Array<ZendeskTicket | ZendeskUser | ZendeskOrganization>;
  count: number;
  nextPage?: string;
  previousPage?: string;
}

export interface ZendeskConfig {
  operation: ZendeskOperation;
  ticketId?: string;
  subject?: string;
  description?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
  ticketType?: TicketType;
  requesterId?: string;
  assigneeId?: string;
  tags?: string;
  comment?: string;
  isPublic?: boolean;
  userName?: string;
  userEmail?: string;
  searchQuery?: string;
}
