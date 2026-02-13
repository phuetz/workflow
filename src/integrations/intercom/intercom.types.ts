/**
 * Intercom Integration Types
 * Customer messaging platform type definitions
 */

export interface IntercomCredentials {
  accessToken: string;
  workspaceId?: string;
}

export type IntercomOperation =
  | 'sendMessage'
  | 'createContact'
  | 'updateContact'
  | 'findContact'
  | 'createConversation'
  | 'replyToConversation'
  | 'tagContact'
  | 'createNote'
  | 'listContacts'
  | 'getConversation';

export interface IntercomResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface IntercomContact {
  id?: string;
  email?: string;
  phone?: string;
  name?: string;
  userId?: string;
  role?: 'user' | 'lead';
  customAttributes?: Record<string, unknown>;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IntercomMessage {
  id?: string;
  body: string;
  messageType: 'comment' | 'note' | 'email';
  authorId?: string;
  attachments?: IntercomAttachment[];
}

export interface IntercomAttachment {
  type: 'upload' | 'image' | 'file';
  name: string;
  url: string;
  contentType?: string;
  filesize?: number;
}

export interface IntercomConversation {
  id: string;
  title?: string;
  state: 'open' | 'closed' | 'snoozed';
  read: boolean;
  priority?: 'priority' | 'not_priority';
  createdAt: Date;
  updatedAt: Date;
  contacts?: IntercomContact[];
  messages?: IntercomMessage[];
}

export interface IntercomTag {
  id: string;
  name: string;
}

export interface IntercomNote {
  id?: string;
  body: string;
  authorId: string;
  contactId: string;
  createdAt?: Date;
}

export interface IntercomConfig {
  operation: IntercomOperation;
  email?: string;
  userId?: string;
  name?: string;
  message?: string;
  conversationId?: string;
  tagName?: string;
  noteBody?: string;
  customAttributes?: string;
}
