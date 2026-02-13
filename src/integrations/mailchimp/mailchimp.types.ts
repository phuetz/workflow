/**
 * Mailchimp Integration Types
 * Email marketing platform for lists and campaigns
 */

export interface MailchimpCredentials {
  apiKey: string;
  server?: string; // e.g., 'us1', 'us2', extracted from API key
}

export type MailchimpOperation =
  | 'addSubscriber'
  | 'updateSubscriber'
  | 'getSubscriber'
  | 'createCampaign'
  | 'sendCampaign'
  | 'getCampaign'
  | 'createList'
  | 'getList'
  | 'getCampaignStats';

export interface MailchimpResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface MailchimpSubscriber {
  id?: string;
  email_address: string;
  status: 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending';
  merge_fields?: Record<string, string>;
  interests?: Record<string, boolean>;
  tags?: string[];
  timestamp_signup?: string;
  timestamp_opt?: string;
}

export interface MailchimpList {
  id?: string;
  name: string;
  contact: {
    company: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  permission_reminder: string;
  campaign_defaults: {
    from_name: string;
    from_email: string;
    subject: string;
    language: string;
  };
  email_type_option: boolean;
  date_created?: string;
  stats?: {
    member_count?: number;
    unsubscribe_count?: number;
  };
}

export interface MailchimpCampaign {
  id?: string;
  type: 'regular' | 'plaintext' | 'absplit' | 'rss' | 'variate';
  recipients: {
    list_id: string;
    segment_opts?: {
      match?: 'any' | 'all';
      conditions?: Array<{
        condition_type: string;
        field: string;
        op: string;
        value: string;
      }>;
    };
  };
  settings: {
    subject_line: string;
    preview_text?: string;
    title: string;
    from_name: string;
    reply_to: string;
    to_name?: string;
  };
  content_type?: 'html' | 'template';
  status?: 'save' | 'paused' | 'schedule' | 'sending' | 'sent';
  create_time?: string;
  send_time?: string;
}

export interface MailchimpCampaignStats {
  opens?: number;
  unique_opens?: number;
  open_rate?: number;
  clicks?: number;
  unique_clicks?: number;
  click_rate?: number;
  unsubscribed?: number;
  bounces?: number;
}
