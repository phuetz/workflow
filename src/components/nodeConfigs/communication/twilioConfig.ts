import { NodeConfigDefinition } from '../types';

export const twilioConfig: NodeConfigDefinition = {
  fields: [
    // Authentication Configuration
    {
      label: 'Account SID',
      field: 'accountSid',
      type: 'text',
      placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      required: true,
      validation: (value) => {
        if (!value) return 'Account SID is required';
        const strValue = value as string;
        if (!strValue.startsWith('AC') || strValue.length !== 34) {
          return 'Invalid Account SID format (should start with AC and be 34 characters)';
        }
        return null;
      }
    },
    {
      label: 'Auth Token',
      field: 'authToken',
      type: 'password',
      placeholder: 'your-auth-token',
      required: true,
      validation: (value) => {
        if (!value) return 'Auth Token is required';
        const strValue = value as string;
        if (strValue.length !== 32) {
          return 'Invalid Auth Token format (should be 32 characters)';
        }
        return null;
      }
    },

    // Operation Configuration
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      options: [
        // SMS Operations
        { value: 'send_sms', label: 'Send SMS' },
        { value: 'get_message', label: 'Get Message' },
        { value: 'list_messages', label: 'List Messages' },
        { value: 'delete_message', label: 'Delete Message' },
        
        // Voice Call Operations
        { value: 'make_call', label: 'Make Voice Call' },
        { value: 'get_call', label: 'Get Call Details' },
        { value: 'list_calls', label: 'List Calls' },
        { value: 'modify_call', label: 'Modify Active Call' },
        { value: 'end_call', label: 'End Call' },
        
        // WhatsApp Operations
        { value: 'send_whatsapp', label: 'Send WhatsApp Message' },
        { value: 'send_whatsapp_media', label: 'Send WhatsApp Media' },
        { value: 'send_whatsapp_template', label: 'Send WhatsApp Template' },
        
        // Phone Number Operations
        { value: 'list_phone_numbers', label: 'List Phone Numbers' },
        { value: 'get_phone_number', label: 'Get Phone Number' },
        { value: 'buy_phone_number', label: 'Buy Phone Number' },
        { value: 'release_phone_number', label: 'Release Phone Number' },
        { value: 'update_phone_number', label: 'Update Phone Number' },
        
        // Verification Operations
        { value: 'create_verification', label: 'Create Verification' },
        { value: 'check_verification', label: 'Check Verification' },
        
        // Conference Operations
        { value: 'create_conference', label: 'Create Conference' },
        { value: 'get_conference', label: 'Get Conference' },
        { value: 'list_conferences', label: 'List Conferences' },
        { value: 'update_conference', label: 'Update Conference' },
        { value: 'list_conference_participants', label: 'List Conference Participants' },
        { value: 'add_conference_participant', label: 'Add Conference Participant' },
        { value: 'remove_conference_participant', label: 'Remove Conference Participant' },
        
        // Recording Operations
        { value: 'get_recording', label: 'Get Recording' },
        { value: 'list_recordings', label: 'List Recordings' },
        { value: 'delete_recording', label: 'Delete Recording' },
        
        // TwiML Operations
        { value: 'create_twiml', label: 'Create TwiML Response' },
        
        // Account Operations
        { value: 'get_account', label: 'Get Account Details' },
        { value: 'list_accounts', label: 'List Sub-Accounts' },
        { value: 'create_account', label: 'Create Sub-Account' },
        
        // Usage Operations
        { value: 'get_usage', label: 'Get Usage Statistics' },
        { value: 'list_usage_records', label: 'List Usage Records' }
      ],
      required: true
    },

    // SMS Configuration
    {
      label: 'From Phone Number',
      field: 'from',
      type: 'text',
      placeholder: '+1234567890',
      required: (config) => {
        const operation = config?.operation as string;
        return ['send_sms', 'make_call', 'send_whatsapp', 'send_whatsapp_media', 'send_whatsapp_template'].includes(operation);
      },
      validation: (value, config) => {
        const operation = config?.operation as string;
        if (['send_sms', 'make_call', 'send_whatsapp', 'send_whatsapp_media', 'send_whatsapp_template'].includes(operation)) {
          if (!value) return 'From phone number is required';
          if (!/^\+[1-9]\d{1,14}$/.test(value as string)) {
            return 'Invalid phone number format (use E.164 format: +1234567890)';
          }
        }
        return null;
      }
    },
    {
      label: 'To Phone Number',
      field: 'to',
      type: 'text',
      placeholder: '+1234567890',
      required: (config) => {
        const operation = config?.operation as string;
        return ['send_sms', 'make_call', 'send_whatsapp', 'send_whatsapp_media', 'send_whatsapp_template', 'create_verification'].includes(operation);
      },
      validation: (value, config) => {
        const operation = config?.operation as string;
        if (['send_sms', 'make_call', 'send_whatsapp', 'send_whatsapp_media', 'send_whatsapp_template', 'create_verification'].includes(operation)) {
          if (!value) return 'To phone number is required';
          if (!/^\+[1-9]\d{1,14}$/.test(value as string)) {
            return 'Invalid phone number format (use E.164 format: +1234567890)';
          }
        }
        return null;
      }
    },
    {
      label: 'Message Body',
      field: 'body',
      type: 'textarea',
      placeholder: 'Your message here...',
      required: (config) => {
        const operation = config?.operation as string;
        return ['send_sms', 'send_whatsapp'].includes(operation);
      },
      validation: (value, config) => {
        const operation = config?.operation as string;
        if (['send_sms', 'send_whatsapp'].includes(operation)) {
          if (!value) return 'Message body is required';
          const strValue = value as string;
          if (strValue.length > 1600) {
            return 'Message body too long (maximum 1600 characters)';
          }
        }
        return null;
      }
    },

    // WhatsApp Configuration
    {
      label: 'WhatsApp Template Name',
      field: 'templateName',
      type: 'text',
      placeholder: 'hello_world',
      required: (config) => {
        const operation = config?.operation as string;
        return operation === 'send_whatsapp_template';
      }
    },
    {
      label: 'Template Language',
      field: 'templateLanguage',
      type: 'select',
      options: [
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Spanish' },
        { value: 'fr', label: 'French' },
        { value: 'de', label: 'German' },
        { value: 'it', label: 'Italian' },
        { value: 'pt', label: 'Portuguese' },
        { value: 'ru', label: 'Russian' },
        { value: 'ar', label: 'Arabic' },
        { value: 'hi', label: 'Hindi' },
        { value: 'zh', label: 'Chinese' }
      ],
      defaultValue: 'en',
      required: (config) => {
        const operation = config?.operation as string;
        return operation === 'send_whatsapp_template';
      }
    },
    {
      label: 'Template Parameters (JSON Array)',
      field: 'templateParameters',
      type: 'textarea',
      placeholder: '["John", "Doe", "2023"]',
      required: false,
      validation: (value) => {
        if (value) {
          try {
            const parsed = JSON.parse(value as string);
            if (!Array.isArray(parsed)) {
              return 'Template parameters must be a JSON array';
            }
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },
    {
      label: 'Media URL',
      field: 'mediaUrl',
      type: 'text',
      placeholder: 'https://example.com/image.jpg',
      required: (config) => {
        const operation = config?.operation as string;
        return operation === 'send_whatsapp_media';
      },
      validation: (value, config) => {
        const operation = config?.operation as string;
        if (operation === 'send_whatsapp_media' && value) {
          try {
            new URL(value as string);
          } catch {
            return 'Invalid media URL format';
          }
        }
        return null;
      }
    },

    // Voice Call Configuration
    {
      label: 'TwiML URL',
      field: 'url',
      type: 'text',
      placeholder: 'https://example.com/twiml.xml',
      required: (config) => {
        const operation = config?.operation as string;
        return operation === 'make_call';
      },
      validation: (value, config) => {
        const operation = config?.operation as string;
        if (operation === 'make_call' && value) {
          try {
            new URL(value as string);
          } catch {
            return 'Invalid TwiML URL format';
          }
        }
        return null;
      }
    },
    {
      label: 'Call Method',
      field: 'method',
      type: 'select',
      options: [
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' }
      ],
      defaultValue: 'POST',
      required: false
    },
    {
      label: 'Status Callback URL',
      field: 'statusCallback',
      type: 'text',
      placeholder: 'https://example.com/status',
      required: false,
      validation: (value) => {
        if (value) {
          try {
            new URL(value as string);
          } catch {
            return 'Invalid status callback URL format';
          }
        }
        return null;
      }
    },
    {
      label: 'Status Callback Method',
      field: 'statusCallbackMethod',
      type: 'select',
      options: [
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' }
      ],
      defaultValue: 'POST',
      required: false
    },
    {
      label: 'Timeout (seconds)',
      field: 'timeout',
      type: 'number',
      placeholder: '60',
      defaultValue: 60,
      required: false,
      validation: (value) => {
        if (value) {
          const numValue = value as number;
          if (numValue < 5 || numValue > 600) {
            return 'Timeout must be between 5 and 600 seconds';
          }
        }
        return null;
      }
    },

    // Conference Configuration
    {
      label: 'Conference Name',
      field: 'conferenceName',
      type: 'text',
      placeholder: 'My Conference Room',
      required: (config) => {
        const operation = config?.operation as string;
        return ['create_conference', 'get_conference', 'update_conference',
                'list_conference_participants', 'add_conference_participant',
                'remove_conference_participant'].includes(operation);
      }
    },
    {
      label: 'Muted',
      field: 'muted',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Start Conference on Enter',
      field: 'startConferenceOnEnter',
      type: 'checkbox',
      defaultValue: true,
      required: false
    },
    {
      label: 'End Conference on Exit',
      field: 'endConferenceOnExit',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },

    // Verification Configuration
    {
      label: 'Verification Channel',
      field: 'channel',
      type: 'select',
      options: [
        { value: 'sms', label: 'SMS' },
        { value: 'call', label: 'Voice Call' },
        { value: 'email', label: 'Email' }
      ],
      defaultValue: 'sms',
      required: (config) => {
        const operation = config?.operation as string;
        return operation === 'create_verification';
      }
    },
    {
      label: 'Verification Code',
      field: 'code',
      type: 'text',
      placeholder: '123456',
      required: (config) => {
        const operation = config?.operation as string;
        return operation === 'check_verification';
      },
      validation: (value, config) => {
        const operation = config?.operation as string;
        if (operation === 'check_verification' && value) {
          if (!/^\d{4,8}$/.test(value as string)) {
            return 'Verification code must be 4-8 digits';
          }
        }
        return null;
      }
    },

    // Resource Identification
    {
      label: 'Message SID',
      field: 'messageSid',
      type: 'text',
      placeholder: 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      required: (config) => {
        const operation = config?.operation as string;
        return ['get_message', 'delete_message'].includes(operation);
      },
      validation: (value, config) => {
        const operation = config?.operation as string;
        const strValue = value as string;
        if (['get_message', 'delete_message'].includes(operation) && value) {
          if (!strValue.startsWith('SM') || strValue.length !== 34) {
            return 'Invalid Message SID format';
          }
        }
        return null;
      }
    },
    {
      label: 'Call SID',
      field: 'callSid',
      type: 'text',
      placeholder: 'CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      required: (config) => {
        const operation = config?.operation as string;
        return ['get_call', 'modify_call', 'end_call'].includes(operation);
      },
      validation: (value, config) => {
        const operation = config?.operation as string;
        const strValue = value as string;
        if (['get_call', 'modify_call', 'end_call'].includes(operation) && value) {
          if (!strValue.startsWith('CA') || strValue.length !== 34) {
            return 'Invalid Call SID format';
          }
        }
        return null;
      }
    },
    {
      label: 'Phone Number SID',
      field: 'phoneNumberSid',
      type: 'text',
      placeholder: 'PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      required: (config) => {
        const operation = config?.operation as string;
        return ['get_phone_number', 'release_phone_number', 'update_phone_number'].includes(operation);
      }
    },
    {
      label: 'Recording SID',
      field: 'recordingSid',
      type: 'text',
      placeholder: 'RExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      required: (config) => {
        const operation = config?.operation as string;
        return ['get_recording', 'delete_recording'].includes(operation);
      }
    },

    // TwiML Configuration
    {
      label: 'TwiML Response',
      field: 'twiml',
      type: 'textarea',
      placeholder: '<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say>Hello World</Say>\n</Response>',
      required: (config) => {
        const operation = config?.operation as string;
        return operation === 'create_twiml';
      },
      validation: (value, config) => {
        const operation = config?.operation as string;
        const strValue = value as string;
        if (operation === 'create_twiml' && value) {
          if (!strValue.includes('<Response>') || !strValue.includes('</Response>')) {
            return 'TwiML must contain <Response> tags';
          }
        }
        return null;
      }
    },

    // Filtering and Pagination
    {
      label: 'Date Sent After',
      field: 'dateSentAfter',
      type: 'datetime-local',
      required: false
    },
    {
      label: 'Date Sent Before',
      field: 'dateSentBefore',
      type: 'datetime-local',
      required: false
    },
    {
      label: 'Status Filter',
      field: 'status',
      type: 'select',
      options: [
        { value: '', label: 'All Statuses' },
        { value: 'queued', label: 'Queued' },
        { value: 'sending', label: 'Sending' },
        { value: 'sent', label: 'Sent' },
        { value: 'failed', label: 'Failed' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'undelivered', label: 'Undelivered' },
        { value: 'receiving', label: 'Receiving' },
        { value: 'received', label: 'Received' }
      ],
      required: false
    },
    {
      label: 'Page Size',
      field: 'pageSize',
      type: 'number',
      placeholder: '50',
      defaultValue: 50,
      required: false,
      validation: (value) => {
        if (value) {
          const numValue = value as number;
          if (numValue < 1 || numValue > 1000) {
            return 'Page size must be between 1 and 1000';
          }
        }
        return null;
      }
    },

    // Advanced Options
    {
      label: 'Record Call',
      field: 'record',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Recording Channels',
      field: 'recordingChannels',
      type: 'select',
      options: [
        { value: 'mono', label: 'Mono' },
        { value: 'dual', label: 'Dual Channel' }
      ],
      defaultValue: 'mono',
      required: false
    },
    {
      label: 'Application SID',
      field: 'applicationSid',
      type: 'text',
      placeholder: 'APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      required: false
    },
    {
      label: 'Send Digits',
      field: 'sendDigits',
      type: 'text',
      placeholder: '1234#',
      required: false,
      validation: (value) => {
        if (value && !/^[0-9*#w]+$/.test(value as string)) {
          return 'Send digits can only contain numbers, *, #, and w (for pause)';
        }
        return null;
      }
    },
    {
      label: 'If Machine',
      field: 'ifMachine',
      type: 'select',
      options: [
        { value: 'continue', label: 'Continue' },
        { value: 'hangup', label: 'Hang Up' }
      ],
      defaultValue: 'continue',
      required: false
    },
    {
      label: 'Machine Detection',
      field: 'machineDetection',
      type: 'select',
      options: [
        { value: 'Enable', label: 'Enable' },
        { value: 'DetectMessageEnd', label: 'Detect Message End' }
      ],
      required: false
    }
  ],
  examples: [
    {
      name: 'Send SMS',
      description: 'Send a simple SMS message',
      config: {
        accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        authToken: 'your-auth-token',
        operation: 'send_sms',
        from: '+1234567890',
        to: '+0987654321',
        body: 'Hello from Twilio!'
      }
    },
    {
      name: 'Make Voice Call',
      description: 'Make a voice call with TwiML',
      config: {
        accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        authToken: 'your-auth-token',
        operation: 'make_call',
        from: '+1234567890',
        to: '+0987654321',
        url: 'https://demo.twilio.com/docs/voice.xml',
        timeout: 30,
        record: true
      }
    },
    {
      name: 'Send WhatsApp Message',
      description: 'Send a WhatsApp message',
      config: {
        accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        authToken: 'your-auth-token',
        operation: 'send_whatsapp',
        from: 'whatsapp:+14155238886',
        to: 'whatsapp:+1234567890',
        body: 'Hello from WhatsApp via Twilio!'
      }
    },
    {
      name: 'Create Phone Verification',
      description: 'Send verification code via SMS',
      config: {
        accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        authToken: 'your-auth-token',
        operation: 'create_verification',
        to: '+1234567890',
        channel: 'sms'
      }
    },
    {
      name: 'List Messages',
      description: 'Get list of messages with filters',
      config: {
        accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        authToken: 'your-auth-token',
        operation: 'list_messages',
        dateSentAfter: '2023-01-01',
        status: 'delivered',
        pageSize: 20
      }
    },
    {
      name: 'Create Conference',
      description: 'Create a conference room',
      config: {
        accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        authToken: 'your-auth-token',
        operation: 'create_conference',
        conferenceName: 'Team Meeting',
        startConferenceOnEnter: true,
        endConferenceOnExit: false,
        record: true
      }
    }
  ]
};