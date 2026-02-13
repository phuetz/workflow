import { NodeConfigDefinition } from '../../../types/nodeConfig';

export const whatsappConfig: NodeConfigDefinition = {
  fields: [
    // Authentication Configuration
    {
      label: 'Authentication Method',
      field: 'authMethod',
      type: 'select',
      options: [
        { value: 'access_token', label: 'Access Token (Recommended)' },
        { value: 'system_user', label: 'System User Token' },
        { value: 'app_token', label: 'App Access Token' }
      ],
      required: true,
      defaultValue: 'access_token'
    },
    {
      label: 'Access Token',
      field: 'accessToken',
      type: 'password',
      placeholder: 'EAAB...',
      required: true,
      validation: (value) => {
        if (!value) return 'Access token is required';
        if (typeof value === 'string' && !value.startsWith('EAA')) {
          return 'Invalid access token format (should start with EAA)';
        }
        return null;
      }
    },
    {
      label: 'Phone Number ID',
      field: 'phoneNumberId',
      type: 'text',
      placeholder: '1234567890123456',
      required: (config) => {
        const operation = config?.operation;
        return ['send_message', 'send_media', 'send_template', 'send_location',
                'send_contacts', 'mark_read', 'get_media'].includes(operation as string);
      },
      validation: (value) => {
        if (value && typeof value === 'string' && !/^\d{15,16}$/.test(value)) {
          return 'Invalid Phone Number ID format (should be 15-16 digits)';
        }
        return null;
      }
    },
    {
      label: 'WhatsApp Business Account ID',
      field: 'businessAccountId',
      type: 'text',
      placeholder: '1234567890123456',
      required: (config) => {
        const operation = config?.operation;
        return ['get_business_profile', 'update_business_profile', 'list_phone_numbers',
                'get_message_templates', 'create_message_template'].includes(operation as string);
      },
      validation: (value) => {
        if (value && typeof value === 'string' && !/^\d{15,16}$/.test(value)) {
          return 'Invalid Business Account ID format (should be 15-16 digits)';
        }
        return null;
      }
    },
    {
      label: 'API Version',
      field: 'apiVersion',
      type: 'select',
      options: [
        { value: 'v18.0', label: 'v18.0 (Latest)' },
        { value: 'v17.0', label: 'v17.0' },
        { value: 'v16.0', label: 'v16.0' }
      ],
      defaultValue: 'v18.0',
      required: false
    },

    // Operation Configuration
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      options: [
        // Messaging Operations
        { value: 'send_message', label: 'Send Text Message' },
        { value: 'send_media', label: 'Send Media Message' },
        { value: 'send_template', label: 'Send Template Message' },
        { value: 'send_location', label: 'Send Location' },
        { value: 'send_contacts', label: 'Send Contacts' },
        { value: 'send_interactive', label: 'Send Interactive Message' },
        { value: 'mark_read', label: 'Mark Message as Read' },

        // Media Operations
        { value: 'upload_media', label: 'Upload Media' },
        { value: 'get_media', label: 'Get Media URL' },
        { value: 'delete_media', label: 'Delete Media' },

        // Template Operations
        { value: 'get_message_templates', label: 'Get Message Templates' },
        { value: 'create_message_template', label: 'Create Message Template' },
        { value: 'delete_message_template', label: 'Delete Message Template' },

        // Business Profile Operations
        { value: 'get_business_profile', label: 'Get Business Profile' },
        { value: 'update_business_profile', label: 'Update Business Profile' },

        // Phone Number Operations
        { value: 'list_phone_numbers', label: 'List Phone Numbers' },
        { value: 'get_phone_number', label: 'Get Phone Number Info' },
        { value: 'register_phone_number', label: 'Register Phone Number' },
        { value: 'verify_phone_number', label: 'Verify Phone Number' },

        // Webhook Operations
        { value: 'subscribe_webhooks', label: 'Subscribe to Webhooks' },
        { value: 'unsubscribe_webhooks', label: 'Unsubscribe from Webhooks' },

        // Analytics Operations
        { value: 'get_analytics', label: 'Get Analytics Data' },
        { value: 'get_conversation_analytics', label: 'Get Conversation Analytics' }
      ],
      required: true
    },

    // Recipient Configuration
    {
      label: 'Recipient Phone Number',
      field: 'to',
      type: 'text',
      placeholder: '1234567890',
      required: (config) => {
        const operation = config?.operation;
        return ['send_message', 'send_media', 'send_template', 'send_location',
                'send_contacts', 'send_interactive', 'mark_read'].includes(operation as string);
      },
      validation: (value) => {
        if (value && typeof value === 'string' && !/^\d{10,15}$/.test(value)) {
          return 'Invalid phone number format (10-15 digits, no + or country code)';
        }
        return null;
      }
    },

    // Message Content Configuration
    {
      label: 'Message Text',
      field: 'text',
      type: 'textarea',
      placeholder: 'Your message here...',
      required: (config) => {
        return config?.operation === 'send_message';
      },
      validation: (value) => {
        if (value && typeof value === 'string' && value.length > 4096) {
          return 'Message text too long (maximum 4096 characters)';
        }
        return null;
      }
    },
    {
      label: 'Preview URL',
      field: 'previewUrl',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },

    // Media Configuration
    {
      label: 'Media Type',
      field: 'mediaType',
      type: 'select',
      options: [
        { value: 'image', label: 'Image' },
        { value: 'video', label: 'Video' },
        { value: 'audio', label: 'Audio' },
        { value: 'document', label: 'Document' },
        { value: 'sticker', label: 'Sticker' }
      ],
      required: (config) => {
        const operation = config?.operation;
        return ['send_media', 'upload_media'].includes(operation as string);
      }
    },
    {
      label: 'Media URL or ID',
      field: 'media',
      type: 'text',
      placeholder: 'https://example.com/image.jpg or media_id',
      required: (config) => {
        const operation = config?.operation;
        return ['send_media', 'get_media', 'delete_media'].includes(operation as string);
      },
      validation: (value) => {
        // Validation handled by required field
        return null;
      }
    },
    {
      label: 'Media Caption',
      field: 'caption',
      type: 'textarea',
      placeholder: 'Media caption...',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string' && value.length > 1024) {
          return 'Media caption too long (maximum 1024 characters)';
        }
        return null;
      }
    },
    {
      label: 'Media Filename',
      field: 'filename',
      type: 'text',
      placeholder: 'document.pdf',
      required: (config) => {
        return config?.operation === 'send_media' && config?.mediaType === 'document';
      }
    },

    // Template Configuration
    {
      label: 'Template Name',
      field: 'templateName',
      type: 'text',
      placeholder: 'hello_world',
      required: (config) => {
        return config?.operation === 'send_template';
      },
      validation: (value) => {
        if (value && typeof value === 'string' && !/^[a-z0-9_]+$/.test(value)) {
          return 'Template name can only contain lowercase letters, numbers, and underscores';
        }
        return null;
      }
    },
    {
      label: 'Template Language',
      field: 'templateLanguage',
      type: 'select',
      options: [
        { value: 'en_US', label: 'English (US)' },
        { value: 'en_GB', label: 'English (UK)' },
        { value: 'es_ES', label: 'Spanish (Spain)' },
        { value: 'es_MX', label: 'Spanish (Mexico)' },
        { value: 'fr_FR', label: 'French' },
        { value: 'de_DE', label: 'German' },
        { value: 'it_IT', label: 'Italian' },
        { value: 'pt_BR', label: 'Portuguese (Brazil)' },
        { value: 'pt_PT', label: 'Portuguese (Portugal)' },
        { value: 'ru_RU', label: 'Russian' },
        { value: 'ar_AR', label: 'Arabic' },
        { value: 'hi_IN', label: 'Hindi' },
        { value: 'zh_CN', label: 'Chinese (Simplified)' },
        { value: 'ja_JP', label: 'Japanese' }
      ],
      defaultValue: 'en_US',
      required: (config) => {
        return config?.operation === 'send_template';
      }
    },
    {
      label: 'Template Parameters (JSON)',
      field: 'templateParameters',
      type: 'textarea',
      placeholder: '{"1": "John", "2": "Doe"}',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },

    // Location Configuration
    {
      label: 'Latitude',
      field: 'latitude',
      type: 'number',
      placeholder: '37.7749',
      required: (config) => {
        return config?.operation === 'send_location';
      },
      validation: (value) => {
        if (value != null && typeof value === 'number' && (value < -90 || value > 90)) {
          return 'Latitude must be between -90 and 90';
        }
        return null;
      }
    },
    {
      label: 'Longitude',
      field: 'longitude',
      type: 'number',
      placeholder: '-122.4194',
      required: (config) => {
        return config?.operation === 'send_location';
      },
      validation: (value) => {
        if (value != null && typeof value === 'number' && (value < -180 || value > 180)) {
          return 'Longitude must be between -180 and 180';
        }
        return null;
      }
    },
    {
      label: 'Location Name',
      field: 'locationName',
      type: 'text',
      placeholder: 'San Francisco',
      required: false
    },
    {
      label: 'Location Address',
      field: 'locationAddress',
      type: 'text',
      placeholder: '123 Main St, San Francisco, CA',
      required: false
    },

    // Contacts Configuration
    {
      label: 'Contacts (JSON Array)',
      field: 'contacts',
      type: 'textarea',
      placeholder: '[{"name": {"first_name": "John", "last_name": "Doe"}, "phones": [{"phone": "+1234567890", "type": "MOBILE"}]}]',
      required: (config) => {
        return config?.operation === 'send_contacts';
      },
      validation: (value) => {
        if (value && typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) {
              return 'Contacts must be a JSON array';
            }
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },

    // Interactive Message Configuration
    {
      label: 'Interactive Type',
      field: 'interactiveType',
      type: 'select',
      options: [
        { value: 'button', label: 'Button Message' },
        { value: 'list', label: 'List Message' },
        { value: 'product', label: 'Product Message' },
        { value: 'product_list', label: 'Product List Message' }
      ],
      required: (config) => {
        return config?.operation === 'send_interactive';
      }
    },
    {
      label: 'Interactive Header',
      field: 'interactiveHeader',
      type: 'text',
      placeholder: 'Choose an option',
      required: false
    },
    {
      label: 'Interactive Body',
      field: 'interactiveBody',
      type: 'textarea',
      placeholder: 'Please select one of the following options:',
      required: (config) => {
        return config?.operation === 'send_interactive';
      }
    },
    {
      label: 'Interactive Footer',
      field: 'interactiveFooter',
      type: 'text',
      placeholder: 'Powered by WhatsApp Business',
      required: false
    },
    {
      label: 'Interactive Buttons/Items (JSON)',
      field: 'interactiveButtons',
      type: 'textarea',
      placeholder: '[{"type": "reply", "reply": {"id": "btn1", "title": "Option 1"}}]',
      required: (config) => {
        return config?.operation === 'send_interactive';
      },
      validation: (value) => {
        if (value && typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) {
              return 'Interactive buttons must be a JSON array';
            }
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },

    // Business Profile Configuration
    {
      label: 'Business Description',
      field: 'businessDescription',
      type: 'textarea',
      placeholder: 'Your business description...',
      required: (config) => {
        return config?.operation === 'update_business_profile';
      },
      validation: (value) => {
        if (value && typeof value === 'string' && value.length > 512) {
          return 'Business description too long (maximum 512 characters)';
        }
        return null;
      }
    },
    {
      label: 'Business Email',
      field: 'businessEmail',
      type: 'email',
      placeholder: 'contact@business.com',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Invalid email format';
        }
        return null;
      }
    },
    {
      label: 'Business Website',
      field: 'businessWebsite',
      type: 'text',
      placeholder: 'https://www.business.com',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string') {
          try {
            new URL(value);
          } catch {
            return 'Invalid website URL format';
          }
        }
        return null;
      }
    },
    {
      label: 'Business Industry',
      field: 'businessIndustry',
      type: 'select',
      options: [
        { value: 'AUTOMOTIVE', label: 'Automotive' },
        { value: 'BEAUTY_SPAS_AND_FITNESS', label: 'Beauty, Spas & Fitness' },
        { value: 'CLOTHING_AND_APPAREL', label: 'Clothing & Apparel' },
        { value: 'EDUCATION', label: 'Education' },
        { value: 'ENTERTAINMENT', label: 'Entertainment' },
        { value: 'EVENT_PLANNING_AND_SERVICE', label: 'Event Planning & Service' },
        { value: 'FINANCE_AND_BANKING', label: 'Finance & Banking' },
        { value: 'FOOD_AND_GROCERY', label: 'Food & Grocery' },
        { value: 'PUBLIC_SERVICE', label: 'Public Service' },
        { value: 'HOTEL_AND_LODGING', label: 'Hotel & Lodging' },
        { value: 'MEDICAL_AND_HEALTH', label: 'Medical & Health' },
        { value: 'NON_PROFIT', label: 'Non-Profit' },
        { value: 'PROFESSIONAL_SERVICES', label: 'Professional Services' },
        { value: 'SHOPPING_AND_RETAIL', label: 'Shopping & Retail' },
        { value: 'TRAVEL_AND_TRANSPORTATION', label: 'Travel & Transportation' },
        { value: 'RESTAURANT', label: 'Restaurant' },
        { value: 'OTHER', label: 'Other' }
      ],
      required: false
    },

    // Template Creation Configuration
    {
      label: 'Template Category',
      field: 'templateCategory',
      type: 'select',
      options: [
        { value: 'MARKETING', label: 'Marketing' },
        { value: 'UTILITY', label: 'Utility' },
        { value: 'AUTHENTICATION', label: 'Authentication' }
      ],
      required: (config) => {
        return config?.operation === 'create_message_template';
      }
    },
    {
      label: 'Template Body Text',
      field: 'templateBody',
      type: 'textarea',
      placeholder: 'Hello {{1}}, your order {{2}} is ready for pickup.',
      required: (config) => {
        return config?.operation === 'create_message_template';
      },
      validation: (value) => {
        if (value && typeof value === 'string' && value.length > 1024) {
          return 'Template body too long (maximum 1024 characters)';
        }
        return null;
      }
    },

    // Phone Number Verification
    {
      label: 'Verification Code',
      field: 'verificationCode',
      type: 'text',
      placeholder: '123456',
      required: (config) => {
        return config?.operation === 'verify_phone_number';
      },
      validation: (value) => {
        if (value && typeof value === 'string' && !/^\d{6}$/.test(value)) {
          return 'Verification code must be 6 digits';
        }
        return null;
      }
    },

    // Analytics Configuration
    {
      label: 'Start Date',
      field: 'startDate',
      type: 'datetime',
      required: (config) => {
        const operation = config?.operation;
        return ['get_analytics', 'get_conversation_analytics'].includes(operation as string);
      }
    },
    {
      label: 'End Date',
      field: 'endDate',
      type: 'datetime',
      required: (config) => {
        const operation = config?.operation;
        return ['get_analytics', 'get_conversation_analytics'].includes(operation as string);
      }
    },
    {
      label: 'Granularity',
      field: 'granularity',
      type: 'select',
      options: [
        { value: 'HALF_HOUR', label: 'Half Hour' },
        { value: 'DAY', label: 'Daily' },
        { value: 'MONTH', label: 'Monthly' }
      ],
      defaultValue: 'DAY',
      required: false
    },
    {
      label: 'Product Catalog ID',
      field: 'catalogId',
      type: 'text',
      placeholder: '1234567890123456',
      required: (config) => {
        const operation = config?.operation;
        const interactiveType = config?.interactiveType;
        return ['send_interactive'].includes(operation as string) &&
               ['product', 'product_list'].includes(interactiveType as string);
      }
    },

    // Message Identification
    {
      label: 'Message ID',
      field: 'messageId',
      type: 'text',
      placeholder: 'wamid.xxx',
      required: (config) => {
        return config?.operation === 'mark_read';
      },
      validation: (value) => {
        // Validation handled by required field
        return null;
      }
    },

    // Advanced Options
    {
      label: 'Webhook Verify Token',
      field: 'verifyToken',
      type: 'password',
      placeholder: 'your-verify-token',
      required: (config) => {
        const operation = config?.operation;
        return ['subscribe_webhooks'].includes(operation as string);
      }
    },
    {
      label: 'Webhook URL',
      field: 'webhookUrl',
      type: 'text',
      placeholder: 'https://your-server.com/webhook',
      required: (config) => {
        const operation = config?.operation;
        return ['subscribe_webhooks'].includes(operation as string);
      },
      validation: (value) => {
        if (value && typeof value === 'string') {
          try {
            const url = new URL(value);
            if (url.protocol !== 'https:') {
              return 'Webhook URL must use HTTPS';
            }
          } catch {
            return 'Invalid webhook URL format';
          }
        }
        return null;
      }
    },
    {
      label: 'Webhook Fields',
      field: 'webhookFields',
      type: 'textarea',
      placeholder: '["messages", "message_deliveries", "message_reads"]',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) {
              return 'Webhook fields must be a JSON array';
            }
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },

    // Rate Limiting and Retry Options
    {
      label: 'Retry on Rate Limit',
      field: 'retryOnRateLimit',
      type: 'checkbox',
      defaultValue: true,
      required: false
    },
    {
      label: 'Max Retries',
      field: 'maxRetries',
      type: 'number',
      placeholder: '3',
      defaultValue: 3,
      required: false,
      validation: (value) => {
        if (value != null && typeof value === 'number' && (value < 0 || value > 10)) {
          return 'Max retries must be between 0 and 10';
        }
        return null;
      }
    }
  ],
  examples: [
    {
      name: 'Send Text Message',
      description: 'Send a simple text message',
      config: {
        authMethod: 'access_token',
        accessToken: 'EAABxxxxxxxxxxxxxxxx',
        phoneNumberId: '1234567890123456',
        operation: 'send_message',
        to: '1234567890',
        text: 'Hello! This is a message from WhatsApp Business API.',
        previewUrl: false
      }
    },
    {
      name: 'Send Image with Caption',
      description: 'Send an image message with caption',
      config: {
        authMethod: 'access_token',
        accessToken: 'EAABxxxxxxxxxxxxxxxx',
        phoneNumberId: '1234567890123456',
        operation: 'send_media',
        to: '1234567890',
        mediaType: 'image',
        media: 'https://example.com/image.jpg',
        caption: 'Check out this amazing product!'
      }
    },
    {
      name: 'Send Template Message',
      description: 'Send a pre-approved template message',
      config: {
        authMethod: 'access_token',
        accessToken: 'EAABxxxxxxxxxxxxxxxx',
        phoneNumberId: '1234567890123456',
        operation: 'send_template',
        to: '1234567890',
        templateName: 'hello_world',
        templateLanguage: 'en_US',
        templateParameters: '{"1": "John"}'
      }
    },
    {
      name: 'Send Location',
      description: 'Send location coordinates',
      config: {
        authMethod: 'access_token',
        accessToken: 'EAABxxxxxxxxxxxxxxxx',
        phoneNumberId: '1234567890123456',
        operation: 'send_location',
        to: '1234567890',
        latitude: 37.7749,
        longitude: -122.4194,
        locationName: 'San Francisco',
        locationAddress: 'San Francisco, CA, USA'
      }
    },
    {
      name: 'Send Interactive Button Message',
      description: 'Send message with interactive buttons',
      config: {
        authMethod: 'access_token',
        accessToken: 'EAABxxxxxxxxxxxxxxxx',
        phoneNumberId: '1234567890123456',
        operation: 'send_interactive',
        to: '1234567890',
        interactiveType: 'button',
        interactiveHeader: 'Choose an Option',
        interactiveBody: 'Please select one of the following options:',
        interactiveFooter: 'Powered by WhatsApp Business',
        interactiveButtons: '[{"type": "reply", "reply": {"id": "option1", "title": "Option 1"}}, {"type": "reply", "reply": {"id": "option2", "title": "Option 2"}}]'
      }
    },
    {
      name: 'Get Business Profile',
      description: 'Retrieve business profile information',
      config: {
        authMethod: 'access_token',
        accessToken: 'EAABxxxxxxxxxxxxxxxx',
        businessAccountId: '1234567890123456',
        operation: 'get_business_profile'
      }
    }
  ]
};
