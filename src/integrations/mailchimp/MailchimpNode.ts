/**
 * Mailchimp Integration Node
 * Complete email marketing integration with Mailchimp API
 */

import { NodeType, WorkflowNode } from '../../types/workflow';
import { NodeExecutor } from '../../types/nodeExecutor';
import { createHash } from 'crypto';
import { Node } from '@xyflow/react';
import { WorkflowContext } from '../../types/common';

export interface MailchimpNodeConfig {
  action: 'add_subscriber' | 'update_subscriber' | 'remove_subscriber' | 'get_subscriber' | 'create_campaign' | 'send_campaign' | 'create_segment' | 'add_tag' | 'remove_tag' | 'get_lists' | 'get_templates' | 'get_reports';
  apiKey?: string;
  server?: string;
  // List parameters
  listId?: string;
  // Subscriber parameters
  email?: string;
  status?: 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending' | 'transactional';
  mergeFields?: Record<string, any>;
  tags?: string[];
  vip?: boolean;
  language?: string;
  emailType?: 'html' | 'text';
  // Campaign parameters
  campaignId?: string;
  campaignType?: 'regular' | 'plaintext' | 'rss' | 'variate';
  subject?: string;
  previewText?: string;
  title?: string;
  fromName?: string;
  replyTo?: string;
  templateId?: number;
  segmentId?: number;
  // Segment parameters
  segmentName?: string;
  conditions?: Array<{
    condition_type: string;
    field: string;
    op: string;
    value: any;
  }>;
  // Tag parameters
  tagName?: string;
  // Report parameters
  reportType?: 'summary' | 'clicks' | 'opens' | 'unsubscribes';
}

export const mailchimpNodeType: NodeType = {
  type: 'mailchimp',
  label: 'Mailchimp',
  icon: 'Mail',
  color: 'bg-yellow-600',
  category: 'marketing',
  inputs: 1,
  outputs: 2,
  description: 'Manage email lists, campaigns, and subscribers with Mailchimp',
  errorHandle: true
};

export class MailchimpNodeExecutor implements NodeExecutor {
  [key: string]: unknown;
  private apiKey: string = '';
  private server: string = '';
  private baseUrl: string = '';

  private initializeApi(config: MailchimpNodeConfig): void {
    this.apiKey = config.apiKey || process.env.MAILCHIMP_API_KEY || '';

    // Extract server from API key or use provided
    if (!config.server && this.apiKey) {
      const parts = this.apiKey.split('-');
      this.server = parts[parts.length - 1];
    } else {
      this.server = config.server || process.env.MAILCHIMP_SERVER || '';
    }

    this.baseUrl = `https://${this.server}.api.mailchimp.com/3.0`;
  }

  validate(node: Node): string[] {
    const errors: string[] = [];
    const config = node.data?.config as MailchimpNodeConfig | undefined;

    if (!config) {
      errors.push('Node configuration is missing');
      return errors;
    }

    if (!config.action) {
      errors.push('Action is required');
    }

    return errors;
  }

  async execute(node: Node, context: WorkflowContext): Promise<any> {
    const config = node.data?.config as MailchimpNodeConfig;
    const inputData = context.input;
    
    this.initializeApi(config);

    try {
      switch (config.action) {
        case 'add_subscriber':
          return await this.addSubscriber(config, inputData);
        
        case 'update_subscriber':
          return await this.updateSubscriber(config, inputData);
        
        case 'remove_subscriber':
          return await this.removeSubscriber(config, inputData);
        
        case 'get_subscriber':
          return await this.getSubscriber(config, inputData);
        
        case 'create_campaign':
          return await this.createCampaign(config, inputData);
        
        case 'send_campaign':
          return await this.sendCampaign(config, inputData);
        
        case 'create_segment':
          return await this.createSegment(config, inputData);
        
        case 'add_tag':
          return await this.addTag(config, inputData);
        
        case 'remove_tag':
          return await this.removeTag(config, inputData);
        
        case 'get_lists':
          return await this.getLists(config, inputData);
        
        case 'get_templates':
          return await this.getTemplates(config, inputData);
        
        case 'get_reports':
          return await this.getReports(config, inputData);
        
        default:
          throw new Error(`Unknown Mailchimp action: ${config.action}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: (error as any).code || 'MAILCHIMP_ERROR'
      };
    }
  }

  private async addSubscriber(config: MailchimpNodeConfig, inputData: any): Promise<any> {
    const listId = config.listId || inputData.listId;
    const email = config.email || inputData.email;
    const status = config.status || inputData.status || 'subscribed';
    const mergeFields = config.mergeFields || inputData.mergeFields || {};
    const tags = config.tags || inputData.tags || [];

    if (!listId || !email) {
      throw new Error('List ID and email are required');
    }

    const subscriberHash = this.getSubscriberHash(email);
    
    const payload = {
      email_address: email,
      status,
      merge_fields: mergeFields,
      tags,
      vip: config.vip || inputData.vip || false,
      language: config.language || inputData.language || 'en',
      email_type: config.emailType || inputData.emailType || 'html'
    };

    // Try to update first, if fails then create
    const response = await fetch(`${this.baseUrl}/lists/${listId}/members/${subscriberHash}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok && response.status !== 400) {
      throw new Error(result.detail || 'Failed to add subscriber');
    }

    return {
      success: true,
      subscriberId: result.id,
      email: result.email_address,
      status: result.status,
      listId,
      tags: result.tags,
      createdAt: result.timestamp_signup,
      updatedAt: result.last_changed
    };
  }

  private async updateSubscriber(config: MailchimpNodeConfig, inputData: any): Promise<any> {
    const listId = config.listId || inputData.listId;
    const email = config.email || inputData.email;
    const updates = inputData.updates || {};

    if (!listId || !email) {
      throw new Error('List ID and email are required');
    }

    const subscriberHash = this.getSubscriberHash(email);
    
    const payload = {
      ...updates,
      status: config.status || updates.status,
      merge_fields: config.mergeFields || updates.mergeFields,
      vip: config.vip !== undefined ? config.vip : updates.vip,
      language: config.language || updates.language,
      email_type: config.emailType || updates.emailType
    };

    const response = await fetch(`${this.baseUrl}/lists/${listId}/members/${subscriberHash}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || 'Failed to update subscriber');
    }

    return {
      success: true,
      subscriberId: result.id,
      email: result.email_address,
      status: result.status,
      listId,
      updatedAt: result.last_changed
    };
  }

  private async removeSubscriber(config: MailchimpNodeConfig, inputData: any): Promise<any> {
    const listId = config.listId || inputData.listId;
    const email = config.email || inputData.email;
    const permanent = inputData.permanent || false;

    if (!listId || !email) {
      throw new Error('List ID and email are required');
    }

    const subscriberHash = this.getSubscriberHash(email);

    if (permanent) {
      // Permanently delete subscriber
      const response = await fetch(`${this.baseUrl}/lists/${listId}/members/${subscriberHash}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok && response.status !== 204) {
        const result = await response.json();
        throw new Error(result.detail || 'Failed to remove subscriber');
      }

      return {
        success: true,
        email,
        listId,
        action: 'deleted'
      };
    } else {
      // Unsubscribe (soft delete)
      return await this.updateSubscriber(
        { ...config, status: 'unsubscribed' },
        inputData
      );
    }
  }

  private async getSubscriber(config: MailchimpNodeConfig, inputData: any): Promise<any> {
    const listId = config.listId || inputData.listId;
    const email = config.email || inputData.email;

    if (!listId || !email) {
      throw new Error('List ID and email are required');
    }

    const subscriberHash = this.getSubscriberHash(email);

    const response = await fetch(`${this.baseUrl}/lists/${listId}/members/${subscriberHash}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || 'Failed to get subscriber');
    }

    return {
      success: true,
      subscriber: {
        id: result.id,
        email: result.email_address,
        status: result.status,
        mergeFields: result.merge_fields,
        stats: result.stats,
        tags: result.tags,
        listId: result.list_id,
        createdAt: result.timestamp_signup,
        updatedAt: result.last_changed
      }
    };
  }

  private async createCampaign(config: MailchimpNodeConfig, inputData: any): Promise<any> {
    const type = config.campaignType || inputData.type || 'regular';
    const listId = config.listId || inputData.listId;
    const subject = config.subject || inputData.subject;
    const title = config.title || inputData.title || subject;
    const fromName = config.fromName || inputData.fromName;
    const replyTo = config.replyTo || inputData.replyTo;

    if (!listId || !subject || !fromName || !replyTo) {
      throw new Error('List ID, subject, from name, and reply-to are required');
    }

    const payload: any = {
      type,
      recipients: {
        list_id: listId
      },
      settings: {
        subject_line: subject,
        preview_text: config.previewText || inputData.previewText,
        title,
        from_name: fromName,
        reply_to: replyTo,
        use_conversation: false,
        to_name: '*|FNAME|*',
        folder_id: inputData.folderId,
        authenticate: true,
        auto_footer: false,
        inline_css: false,
        auto_tweet: false,
        fb_comments: true,
        timewarp: false,
        template_id: config.templateId || inputData.templateId
      }
    };

    // Add segment if provided
    if (config.segmentId || inputData.segmentId) {
      payload.recipients.segment_opts = {
        saved_segment_id: config.segmentId || inputData.segmentId
      };
    }

    const response = await fetch(`${this.baseUrl}/campaigns`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || 'Failed to create campaign');
    }

    return {
      success: true,
      campaignId: result.id,
      webId: result.web_id,
      type: result.type,
      status: result.status,
      emailsSent: result.emails_sent,
      createTime: result.create_time,
      archiveUrl: result.archive_url
    };
  }

  private async sendCampaign(config: MailchimpNodeConfig, inputData: any): Promise<any> {
    const campaignId = config.campaignId || inputData.campaignId;

    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }

    // First check campaign status
    const checkResponse = await fetch(`${this.baseUrl}/campaigns/${campaignId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    const campaign = await checkResponse.json();

    if (!checkResponse.ok) {
      throw new Error(campaign.detail || 'Failed to get campaign');
    }

    if (campaign.status === 'sent' || campaign.status === 'sending') {
      return {
        success: false,
        error: 'Campaign has already been sent',
        status: campaign.status
      };
    }

    // Send the campaign
    const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}/actions/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (response.status === 204) {
      return {
        success: true,
        campaignId,
        status: 'sent',
        message: 'Campaign sent successfully'
      };
    }

    const result = await response.json();
    throw new Error(result.detail || 'Failed to send campaign');
  }

  private async createSegment(config: MailchimpNodeConfig, inputData: any): Promise<any> {
    const listId = config.listId || inputData.listId;
    const name = config.segmentName || inputData.name;
    const conditions = config.conditions || inputData.conditions || [];

    if (!listId || !name) {
      throw new Error('List ID and segment name are required');
    }

    const payload = {
      name,
      static_segment: inputData.static || [],
      options: {
        match: inputData.match || 'all',
        conditions
      }
    };

    const response = await fetch(`${this.baseUrl}/lists/${listId}/segments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || 'Failed to create segment');
    }

    return {
      success: true,
      segmentId: result.id,
      name: result.name,
      memberCount: result.member_count,
      type: result.type,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      listId: result.list_id
    };
  }

  private async addTag(config: MailchimpNodeConfig, inputData: any): Promise<any> {
    const listId = config.listId || inputData.listId;
    const email = config.email || inputData.email;
    const tagName = config.tagName || inputData.tagName;

    if (!listId || !email || !tagName) {
      throw new Error('List ID, email, and tag name are required');
    }

    const subscriberHash = this.getSubscriberHash(email);

    const payload = {
      tags: [
        {
          name: tagName,
          status: 'active'
        }
      ]
    };

    const response = await fetch(`${this.baseUrl}/lists/${listId}/members/${subscriberHash}/tags`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 204) {
      return {
        success: true,
        email,
        tagName,
        action: 'added'
      };
    }

    const result = await response.json();
    throw new Error(result.detail || 'Failed to add tag');
  }

  private async removeTag(config: MailchimpNodeConfig, inputData: any): Promise<any> {
    const listId = config.listId || inputData.listId;
    const email = config.email || inputData.email;
    const tagName = config.tagName || inputData.tagName;

    if (!listId || !email || !tagName) {
      throw new Error('List ID, email, and tag name are required');
    }

    const subscriberHash = this.getSubscriberHash(email);

    const payload = {
      tags: [
        {
          name: tagName,
          status: 'inactive'
        }
      ]
    };

    const response = await fetch(`${this.baseUrl}/lists/${listId}/members/${subscriberHash}/tags`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 204) {
      return {
        success: true,
        email,
        tagName,
        action: 'removed'
      };
    }

    const result = await response.json();
    throw new Error(result.detail || 'Failed to remove tag');
  }

  private async getLists(config: MailchimpNodeConfig, inputData: any): Promise<any> {
    const count = inputData.count || 100;
    const offset = inputData.offset || 0;

    const response = await fetch(`${this.baseUrl}/lists?count=${count}&offset=${offset}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || 'Failed to get lists');
    }

    return {
      success: true,
      lists: result.lists.map((list: any) => ({
        id: list.id,
        name: list.name,
        memberCount: list.stats.member_count,
        unsubscribeCount: list.stats.unsubscribe_count,
        openRate: list.stats.open_rate,
        clickRate: list.stats.click_rate,
        createdAt: list.date_created
      })),
      totalItems: result.total_items
    };
  }

  private async getTemplates(config: MailchimpNodeConfig, inputData: any): Promise<any> {
    const count = inputData.count || 100;
    const offset = inputData.offset || 0;
    const type = inputData.type || 'user'; // user, base, gallery

    const response = await fetch(`${this.baseUrl}/templates?count=${count}&offset=${offset}&type=${type}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || 'Failed to get templates');
    }

    return {
      success: true,
      templates: result.templates.map((template: any) => ({
        id: template.id,
        type: template.type,
        name: template.name,
        category: template.category,
        createdBy: template.created_by,
        createdAt: template.date_created,
        active: template.active
      })),
      totalItems: result.total_items
    };
  }

  private async getReports(config: MailchimpNodeConfig, inputData: any): Promise<any> {
    const campaignId = config.campaignId || inputData.campaignId;

    if (campaignId) {
      // Get specific campaign report
      const response = await fetch(`${this.baseUrl}/reports/${campaignId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to get campaign report');
      }

      return {
        success: true,
        report: {
          campaignId: result.id,
          campaignTitle: result.campaign_title,
          emailsSent: result.emails_sent,
          opens: result.opens,
          clicks: result.clicks,
          subscriberActivity: result.subscriber_activity,
          bounces: result.bounces,
          unsubscribed: result.unsubscribed,
          abusReports: result.abuse_reports
        }
      };
    } else {
      // Get all campaign reports
      const count = inputData.count || 100;
      const offset = inputData.offset || 0;

      const response = await fetch(`${this.baseUrl}/reports?count=${count}&offset=${offset}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to get reports');
      }

      return {
        success: true,
        reports: result.reports.map((report: any) => ({
          campaignId: report.id,
          campaignTitle: report.campaign_title,
          emailsSent: report.emails_sent,
          openRate: report.opens.open_rate,
          clickRate: report.clicks.click_rate,
          sendTime: report.send_time
        })),
        totalItems: result.total_items
      };
    }
  }

  private getSubscriberHash(email: string): string {
    return createHash('md5').update(email.toLowerCase()).digest('hex');
  }
}

// Configuration UI schema for the node
export const mailchimpNodeConfigSchema = {
  action: {
    type: 'select',
    label: 'Action',
    options: [
      { value: 'add_subscriber', label: 'Add Subscriber' },
      { value: 'update_subscriber', label: 'Update Subscriber' },
      { value: 'remove_subscriber', label: 'Remove Subscriber' },
      { value: 'get_subscriber', label: 'Get Subscriber' },
      { value: 'create_campaign', label: 'Create Campaign' },
      { value: 'send_campaign', label: 'Send Campaign' },
      { value: 'create_segment', label: 'Create Segment' },
      { value: 'add_tag', label: 'Add Tag' },
      { value: 'remove_tag', label: 'Remove Tag' },
      { value: 'get_lists', label: 'Get Lists' },
      { value: 'get_templates', label: 'Get Templates' },
      { value: 'get_reports', label: 'Get Reports' }
    ],
    default: 'add_subscriber'
  },
  listId: {
    type: 'string',
    label: 'List ID',
    showWhen: { action: ['add_subscriber', 'update_subscriber', 'remove_subscriber', 'get_subscriber', 'create_campaign', 'create_segment', 'add_tag', 'remove_tag'] }
  },
  email: {
    type: 'string',
    label: 'Email Address',
    showWhen: { action: ['add_subscriber', 'update_subscriber', 'remove_subscriber', 'get_subscriber', 'add_tag', 'remove_tag'] }
  },
  status: {
    type: 'select',
    label: 'Subscription Status',
    options: [
      { value: 'subscribed', label: 'Subscribed' },
      { value: 'unsubscribed', label: 'Unsubscribed' },
      { value: 'cleaned', label: 'Cleaned' },
      { value: 'pending', label: 'Pending' },
      { value: 'transactional', label: 'Transactional' }
    ],
    default: 'subscribed',
    showWhen: { action: ['add_subscriber', 'update_subscriber'] }
  },
  campaignType: {
    type: 'select',
    label: 'Campaign Type',
    options: [
      { value: 'regular', label: 'Regular' },
      { value: 'plaintext', label: 'Plain Text' },
      { value: 'rss', label: 'RSS' },
      { value: 'variate', label: 'A/B Test' }
    ],
    default: 'regular',
    showWhen: { action: 'create_campaign' }
  },
  subject: {
    type: 'string',
    label: 'Subject Line',
    showWhen: { action: 'create_campaign' }
  },
  apiKey: {
    type: 'credential',
    label: 'API Key'
  }
};