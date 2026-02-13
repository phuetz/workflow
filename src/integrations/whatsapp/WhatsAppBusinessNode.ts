/**
 * WhatsApp Business Integration Node
 * Complete messaging integration with WhatsApp Business API
 */

import { NodeType, WorkflowNode } from '../../types/workflow';
import { NodeExecutor } from '../../types/nodeExecutor';
import { WorkflowContext } from '../../types/common';
import { Node } from '@xyflow/react';

export interface WhatsAppNodeConfig {
  action: 'send_message' | 'send_template' | 'send_media' | 'send_location' | 'send_contact' | 'send_interactive' | 'get_profile' | 'webhook';
  apiUrl?: string;
  accessToken?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  // Message parameters
  to?: string;
  message?: string;
  templateName?: string;
  templateLanguage?: string;
  templateParameters?: any[];
  // Media parameters
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
  mediaCaption?: string;
  // Location parameters
  latitude?: number;
  longitude?: number;
  name?: string;
  address?: string;
  // Contact parameters
  contacts?: Array<{
    name: { first_name: string; last_name?: string };
    phones?: Array<{ phone: string; type?: string }>;
    emails?: Array<{ email: string; type?: string }>;
  }>;
  // Interactive parameters
  interactiveType?: 'button' | 'list' | 'product' | 'product_list';
  header?: any;
  body?: string;
  footer?: string;
  buttons?: Array<{ id: string; title: string }>;
  sections?: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
  // Webhook parameters
  webhookUrl?: string;
  verifyToken?: string;
}

export const whatsappNodeType: NodeType = {
  type: 'whatsapp',
  label: 'WhatsApp Business',
  icon: 'MessageCircle',
  color: 'bg-green-600',
  category: 'communication',
  inputs: 1,
  outputs: 2,
  description: 'Send messages, media, and interactive content via WhatsApp Business',
  errorHandle: true
};

export class WhatsAppNodeExecutor implements NodeExecutor {
  [key: string]: unknown;
  private apiUrl: string;
  private accessToken: string;

  async execute(node: Node, context: WorkflowContext): Promise<unknown> {
    const config = (node.data as any).config as WhatsAppNodeConfig;
    const inputData = context.input;
    
    this.apiUrl = config.apiUrl || process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0';
    this.accessToken = config.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || '';

    try {
      switch (config.action) {
        case 'send_message':
          return await this.sendMessage(config, inputData);
        
        case 'send_template':
          return await this.sendTemplate(config, inputData);
        
        case 'send_media':
          return await this.sendMedia(config, inputData);
        
        case 'send_location':
          return await this.sendLocation(config, inputData);
        
        case 'send_contact':
          return await this.sendContact(config, inputData);
        
        case 'send_interactive':
          return await this.sendInteractive(config, inputData);
        
        case 'get_profile':
          return await this.getProfile(config, inputData);
        
        case 'webhook':
          return await this.handleWebhook(config, inputData);
        
        default:
          throw new Error(`Unknown WhatsApp action: ${config.action}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: (error as any).code || 'WHATSAPP_ERROR'
      };
    }
  }

  private async sendMessage(config: WhatsAppNodeConfig, inputData: any): Promise<any> {
    const to = config.to || inputData.to;
    const message = config.message || inputData.message;
    const phoneNumberId = config.phoneNumberId || inputData.phoneNumberId;

    if (!to || !message || !phoneNumberId) {
      throw new Error('Recipient number, message, and phone number ID are required');
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: 'text',
      text: {
        preview_url: true,
        body: message
      }
    };

    const response = await fetch(`${this.apiUrl}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to send message');
    }

    return {
      success: true,
      messageId: result.messages[0].id,
      to,
      status: 'sent',
      timestamp: new Date().toISOString()
    };
  }

  private async sendTemplate(config: WhatsAppNodeConfig, inputData: any): Promise<any> {
    const to = config.to || inputData.to;
    const templateName = config.templateName || inputData.templateName;
    const templateLanguage = config.templateLanguage || inputData.templateLanguage || 'en';
    const templateParameters = config.templateParameters || inputData.templateParameters || [];
    const phoneNumberId = config.phoneNumberId || inputData.phoneNumberId;

    if (!to || !templateName || !phoneNumberId) {
      throw new Error('Recipient, template name, and phone number ID are required');
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: this.formatPhoneNumber(to),
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: templateLanguage
        },
        components: templateParameters.length > 0 ? [
          {
            type: 'body',
            parameters: templateParameters.map((param: any) => ({
              type: param.type || 'text',
              text: param.text || param
            }))
          }
        ] : undefined
      }
    };

    const response = await fetch(`${this.apiUrl}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to send template message');
    }

    return {
      success: true,
      messageId: result.messages[0].id,
      to,
      template: templateName,
      status: 'sent'
    };
  }

  private async sendMedia(config: WhatsAppNodeConfig, inputData: any): Promise<any> {
    const to = config.to || inputData.to;
    const mediaType = config.mediaType || inputData.mediaType;
    const mediaUrl = config.mediaUrl || inputData.mediaUrl;
    const caption = config.mediaCaption || inputData.caption;
    const phoneNumberId = config.phoneNumberId || inputData.phoneNumberId;

    if (!to || !mediaType || !mediaUrl || !phoneNumberId) {
      throw new Error('Recipient, media type, media URL, and phone number ID are required');
    }

    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: mediaType
    };

    // Add media object based on type
    payload[mediaType] = {
      link: mediaUrl
    };

    if (caption && (mediaType === 'image' || mediaType === 'video' || mediaType === 'document')) {
      payload[mediaType].caption = caption;
    }

    const response = await fetch(`${this.apiUrl}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to send media');
    }

    return {
      success: true,
      messageId: result.messages[0].id,
      to,
      mediaType,
      mediaUrl,
      status: 'sent'
    };
  }

  private async sendLocation(config: WhatsAppNodeConfig, inputData: any): Promise<any> {
    const to = config.to || inputData.to;
    const latitude = config.latitude || inputData.latitude;
    const longitude = config.longitude || inputData.longitude;
    const name = config.name || inputData.name;
    const address = config.address || inputData.address;
    const phoneNumberId = config.phoneNumberId || inputData.phoneNumberId;

    if (!to || !latitude || !longitude || !phoneNumberId) {
      throw new Error('Recipient, latitude, longitude, and phone number ID are required');
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: this.formatPhoneNumber(to),
      type: 'location',
      location: {
        latitude,
        longitude,
        name,
        address
      }
    };

    const response = await fetch(`${this.apiUrl}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to send location');
    }

    return {
      success: true,
      messageId: result.messages[0].id,
      to,
      location: { latitude, longitude, name, address },
      status: 'sent'
    };
  }

  private async sendContact(config: WhatsAppNodeConfig, inputData: any): Promise<any> {
    const to = config.to || inputData.to;
    const contacts = config.contacts || inputData.contacts;
    const phoneNumberId = config.phoneNumberId || inputData.phoneNumberId;

    if (!to || !contacts || !phoneNumberId) {
      throw new Error('Recipient, contacts, and phone number ID are required');
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: this.formatPhoneNumber(to),
      type: 'contacts',
      contacts: contacts.map((contact: any) => ({
        name: {
          formatted_name: `${contact.name.first_name} ${contact.name.last_name || ''}`.trim(),
          first_name: contact.name.first_name,
          last_name: contact.name.last_name
        },
        phones: contact.phones,
        emails: contact.emails
      }))
    };

    const response = await fetch(`${this.apiUrl}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to send contact');
    }

    return {
      success: true,
      messageId: result.messages[0].id,
      to,
      contactsCount: contacts.length,
      status: 'sent'
    };
  }

  private async sendInteractive(config: WhatsAppNodeConfig, inputData: any): Promise<any> {
    const to = config.to || inputData.to;
    const interactiveType = config.interactiveType || inputData.interactiveType;
    const body = config.body || inputData.body;
    const phoneNumberId = config.phoneNumberId || inputData.phoneNumberId;

    if (!to || !interactiveType || !body || !phoneNumberId) {
      throw new Error('Recipient, interactive type, body, and phone number ID are required');
    }

    const interactive: any = {
      type: interactiveType,
      body: { text: body }
    };

    // Add header if provided
    if (config.header || inputData.header) {
      interactive.header = config.header || inputData.header;
    }

    // Add footer if provided
    if (config.footer || inputData.footer) {
      interactive.footer = { text: config.footer || inputData.footer };
    }

    // Add action based on type
    if (interactiveType === 'button') {
      interactive.action = {
        buttons: (config.buttons || inputData.buttons || []).map((btn: any) => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title
          }
        }))
      };
    } else if (interactiveType === 'list') {
      interactive.action = {
        button: 'Select Option',
        sections: config.sections || inputData.sections || []
      };
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: 'interactive',
      interactive
    };

    const response = await fetch(`${this.apiUrl}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to send interactive message');
    }

    return {
      success: true,
      messageId: result.messages[0].id,
      to,
      interactiveType,
      status: 'sent'
    };
  }

  private async getProfile(config: WhatsAppNodeConfig, inputData: any): Promise<any> {
    const phoneNumber = config.to || inputData.phoneNumber;
    const businessAccountId = config.businessAccountId || inputData.businessAccountId;

    if (!phoneNumber || !businessAccountId) {
      throw new Error('Phone number and business account ID are required');
    }

    const response = await fetch(
      `${this.apiUrl}/${businessAccountId}/phone_numbers?access_token=${this.accessToken}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to get profile');
    }

    return {
      success: true,
      profile: result.data[0],
      phoneNumber
    };
  }

  private async handleWebhook(config: WhatsAppNodeConfig, inputData: any): Promise<any> {
    // Verify webhook if needed
    if (inputData.hub && inputData['hub.verify_token']) {
      const verifyToken = config.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN;
      
      if (inputData['hub.verify_token'] === verifyToken) {
        return {
          success: true,
          challenge: inputData['hub.challenge']
        };
      } else {
        throw new Error('Invalid verify token');
      }
    }

    // Process incoming message
    const entry = inputData.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.messages) {
      const message = value.messages[0];
      
      return {
        success: true,
        messageId: message.id,
        from: message.from,
        type: message.type,
        timestamp: message.timestamp,
        text: message.text?.body,
        media: message[message.type],
        context: message.context
      };
    }

    if (value?.statuses) {
      const status = value.statuses[0];
      
      return {
        success: true,
        messageId: status.id,
        status: status.status,
        timestamp: status.timestamp,
        recipient: status.recipient_id,
        errors: status.errors
      };
    }

    return {
      success: true,
      data: inputData
    };
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // Add country code if not present (assuming US as default)
    if (cleaned.length === 10) {
      cleaned = '1' + cleaned;
    }

    return cleaned;
  }

  validate(node: Node): string[] {
    const errors: string[] = [];
    const config = (node.data as any).config as WhatsAppNodeConfig;

    if (!config) {
      errors.push('Configuration is required');
      return errors;
    }

    if (!config.action) {
      errors.push('Action is required');
    }

    if (!config.phoneNumberId && !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      errors.push('Phone Number ID is required');
    }

    if (!config.accessToken && !process.env.WHATSAPP_ACCESS_TOKEN) {
      errors.push('Access Token is required');
    }

    // Validate based on action type
    switch (config.action) {
      case 'send_message':
        if (!config.to && !config.message) {
          errors.push('Recipient and message are required for send_message action');
        }
        break;
      case 'send_template':
        if (!config.to && !config.templateName) {
          errors.push('Recipient and template name are required for send_template action');
        }
        break;
      case 'send_media':
        if (!config.to && !config.mediaType && !config.mediaUrl) {
          errors.push('Recipient, media type, and media URL are required for send_media action');
        }
        break;
      case 'send_location':
        if (!config.to && !config.latitude && !config.longitude) {
          errors.push('Recipient, latitude, and longitude are required for send_location action');
        }
        break;
      case 'send_contact':
        if (!config.to && !config.contacts) {
          errors.push('Recipient and contacts are required for send_contact action');
        }
        break;
      case 'send_interactive':
        if (!config.to && !config.interactiveType && !config.body) {
          errors.push('Recipient, interactive type, and body are required for send_interactive action');
        }
        break;
      case 'get_profile':
        if (!config.businessAccountId) {
          errors.push('Business Account ID is required for get_profile action');
        }
        break;
    }

    return errors;
  }
}

// Configuration UI schema for the node
export const whatsappNodeConfigSchema = {
  action: {
    type: 'select',
    label: 'Action',
    options: [
      { value: 'send_message', label: 'Send Text Message' },
      { value: 'send_template', label: 'Send Template Message' },
      { value: 'send_media', label: 'Send Media' },
      { value: 'send_location', label: 'Send Location' },
      { value: 'send_contact', label: 'Send Contact' },
      { value: 'send_interactive', label: 'Send Interactive Message' },
      { value: 'get_profile', label: 'Get Profile' },
      { value: 'webhook', label: 'Handle Webhook' }
    ],
    default: 'send_message'
  },
  to: {
    type: 'string',
    label: 'Recipient Phone Number',
    placeholder: '+1234567890',
    showWhen: { action: ['send_message', 'send_template', 'send_media', 'send_location', 'send_contact', 'send_interactive'] }
  },
  message: {
    type: 'textarea',
    label: 'Message',
    showWhen: { action: 'send_message' }
  },
  templateName: {
    type: 'string',
    label: 'Template Name',
    showWhen: { action: 'send_template' }
  },
  mediaType: {
    type: 'select',
    label: 'Media Type',
    options: [
      { value: 'image', label: 'Image' },
      { value: 'video', label: 'Video' },
      { value: 'audio', label: 'Audio' },
      { value: 'document', label: 'Document' }
    ],
    showWhen: { action: 'send_media' }
  },
  mediaUrl: {
    type: 'string',
    label: 'Media URL',
    showWhen: { action: 'send_media' }
  },
  phoneNumberId: {
    type: 'credential',
    label: 'Phone Number ID'
  },
  accessToken: {
    type: 'credential',
    label: 'Access Token'
  }
};