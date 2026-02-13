/**
 * SendGrid Integration Types
 * Email delivery and marketing platform
 */

export interface SendGridCredentials {
  apiKey: string;
}

export type SendGridOperation =
  | 'sendEmail'
  | 'sendTemplate'
  | 'addContact'
  | 'updateContact'
  | 'createList'
  | 'addContactToList';

export interface SendGridResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface SendGridEmail {
  personalizations: Array<{
    to: Array<{ email: string; name?: string }>;
    cc?: Array<{ email: string; name?: string }>;
    bcc?: Array<{ email: string; name?: string }>;
    subject?: string;
    dynamic_template_data?: Record<string, unknown>;
  }>;
  from: { email: string; name?: string };
  reply_to?: { email: string; name?: string };
  subject?: string;
  content?: Array<{
    type: 'text/plain' | 'text/html';
    value: string;
  }>;
  template_id?: string;
  attachments?: Array<{
    content: string; // base64
    filename: string;
    type?: string;
    disposition?: 'inline' | 'attachment';
  }>;
}

export interface SendGridContact {
  id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  custom_fields?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface SendGridList {
  id?: string;
  name: string;
  contact_count?: number;
  _metadata?: {
    self?: string;
  };
}
