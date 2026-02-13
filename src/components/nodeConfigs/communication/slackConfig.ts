import { NodeConfigDefinition, validators } from '../../../types/nodeConfig';

export const slackConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'Authentication Method',
      field: 'authMethod',
      type: 'select',
      required: true,
      defaultValue: 'webhook',
      options: [
        { value: 'webhook', label: 'Webhook URL' },
        { value: 'oauth', label: 'OAuth Token' },
        { value: 'bot', label: 'Bot Token' }
      ]
    },
    {
      label: 'Webhook URL',
      field: 'webhookUrl',
      type: 'text',
      placeholder: 'https://hooks.slack.example.com/services/T000/B000/PLACEHOLDER',
      description: 'Incoming webhook URL from Slack',
      validation: (value, config) => {
        const authMethod = config?.authMethod as string | undefined;
        const strValue = value as string | undefined;
        if (authMethod === 'webhook' && !strValue) {
          return 'Webhook URL is required';
        }
        if (strValue && !strValue.includes('hooks.slack.com/')) {
          return 'Invalid Slack webhook URL';
        }
        return null;
      }
    },
    {
      label: 'OAuth Token',
      field: 'oauthToken',
      type: 'password',
      placeholder: 'xoxb-...',
      description: 'Slack OAuth access token',
      validation: (value, config) => {
        const authMethod = config?.authMethod as string | undefined;
        if (authMethod === 'oauth' && !value) {
          return 'OAuth token is required';
        }
        return null;
      }
    },
    {
      label: 'Bot Token',
      field: 'botToken',
      type: 'password',
      placeholder: 'xoxb-...',
      description: 'Slack bot user token',
      validation: (value, config) => {
        const authMethod = config?.authMethod as string | undefined;
        if (authMethod === 'bot' && !value) {
          return 'Bot token is required';
        }
        return null;
      }
    },
    {
      label: 'Channel',
      field: 'channel',
      type: 'text',
      placeholder: '#general or @username',
      required: true,
      description: 'Channel, private group, or IM channel',
      validation: (value) => {
        const strValue = value as string | undefined;
        if (!strValue) return 'Channel is required';
        if (!strValue.startsWith('#') && !strValue.startsWith('@') && !strValue.match(/^[CG][A-Z0-9]{8,}$/)) {
          return 'Channel must start with # or @ or be a channel ID';
        }
        return null;
      }
    },
    {
      label: 'Message Type',
      field: 'messageType',
      type: 'select',
      defaultValue: 'text',
      options: [
        { value: 'text', label: 'Simple Text' },
        { value: 'blocks', label: 'Block Kit (Rich formatting)' },
        { value: 'attachments', label: 'Attachments (Legacy)' }
      ]
    },
    {
      label: 'Message',
      field: 'message',
      type: 'expression',
      placeholder: 'Hello from {{$json.appName}}!',
      required: true,
      description: 'Message text or blocks JSON',
      validation: validators.required('Message')
    },
    {
      label: 'Username',
      field: 'username',
      type: 'text',
      placeholder: 'Workflow Bot',
      description: 'Override bot username (webhook only)'
    },
    {
      label: 'Icon',
      field: 'iconType',
      type: 'select',
      defaultValue: 'emoji',
      options: [
        { value: 'emoji', label: 'Emoji' },
        { value: 'url', label: 'Icon URL' }
      ]
    },
    {
      label: 'Icon Emoji',
      field: 'iconEmoji',
      type: 'text',
      placeholder: ':robot_face:',
      defaultValue: ':robot_face:',
      description: 'Emoji for bot avatar'
    },
    {
      label: 'Icon URL',
      field: 'iconUrl',
      type: 'text',
      placeholder: 'https://example.com/icon.png',
      description: 'URL for bot avatar image',
      validation: validators.url
    },
    {
      label: 'Thread Timestamp',
      field: 'threadTs',
      type: 'text',
      placeholder: '1234567890.123456',
      description: 'Reply in thread (message timestamp)'
    },
    {
      label: 'Link Names',
      field: 'linkNames',
      type: 'checkbox',
      defaultValue: true,
      description: 'Find and link channel names and usernames'
    },
    {
      label: 'Unfurl Links',
      field: 'unfurlLinks',
      type: 'checkbox',
      defaultValue: true,
      description: 'Enable unfurling of primarily text-based content'
    },
    {
      label: 'Unfurl Media',
      field: 'unfurlMedia',
      type: 'checkbox',
      defaultValue: true,
      description: 'Enable unfurling of media content'
    },
    {
      label: 'Blocks',
      field: 'blocks',
      type: 'json',
      placeholder: '[{"type": "section", "text": {"type": "mrkdwn", "text": "Hello!"}}]',
      description: 'Block Kit blocks for rich messages',
      validation: (value, config) => {
        const messageType = config?.messageType as string | undefined;
        if (messageType === 'blocks' && !value) {
          return 'Blocks are required when using Block Kit';
        }
        if (value) {
          return validators.json(value as string);
        }
        return null;
      }
    },
    {
      label: 'Attachments',
      field: 'attachments',
      type: 'json',
      placeholder: '[{"color": "good", "text": "Success!"}]',
      description: 'Legacy attachments format',
      validation: (value, config) => {
        const messageType = config?.messageType as string | undefined;
        if (messageType === 'attachments' && !value) {
          return 'Attachments are required';
        }
        if (value) {
          return validators.json(value as string);
        }
        return null;
      }
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};

    // Auth validation
    if (config.authMethod === 'webhook' && !config.webhookUrl) {
      errors.webhookUrl = 'Webhook URL is required';
    }
    
    if (config.authMethod === 'oauth' && !config.oauthToken) {
      errors.oauthToken = 'OAuth token is required';
    }
    
    if (config.authMethod === 'bot' && !config.botToken) {
      errors.botToken = 'Bot token is required';
    }

    // Message type validation
    if (config.messageType === 'blocks' && !config.blocks) {
      errors.blocks = 'Blocks are required for Block Kit messages';
    }
    
    if (config.messageType === 'attachments' && !config.attachments) {
      errors.attachments = 'Attachments are required';
    }

    // Icon validation
    const iconUrl = config.iconUrl as string | undefined;
    if (config.iconType === 'url' && iconUrl && !iconUrl.match(/^https?:\/\/.+/)) {
      errors.iconUrl = 'Icon URL must be a valid URL';
    }

    return errors;
  },

  transform: (config) => {
    // Parse JSON fields
    if (config.blocks && typeof config.blocks === 'string') {
      try {
        config.blocks = JSON.parse(config.blocks);
      } catch (e) {
        // Keep as string
      }
    }

    if (config.attachments && typeof config.attachments === 'string') {
      try {
        config.attachments = JSON.parse(config.attachments);
      } catch (e) {
        // Keep as string
      }
    }

    // Set icon based on type
    if (config.iconType === 'emoji') {
      delete config.iconUrl;
    } else {
      delete config.iconEmoji;
    }

    return config;
  },

  examples: [
    {
      label: 'Simple Message',
      config: {
        authMethod: 'webhook',
        webhookUrl: 'https://hooks.slack.example.com/services/T000/B000/PLACEHOLDER',
        channel: '#general',
        messageType: 'text',
        message: '🚀 Workflow completed successfully!'
      }
    },
    {
      label: 'Rich Block Message',
      config: {
        authMethod: 'bot',
        botToken: 'xoxb-your-token',
        channel: '#notifications',
        messageType: 'blocks',
        blocks: JSON.stringify([
          {
            "type": "header",
            "text": {
              "type": "plain_text",
              "text": "🎉 New Order Received"
            }
          },
          {
            "type": "section",
            "fields": [
              {
                "type": "mrkdwn",
                "text": "*Customer:* {{$json.customerName}}"
              },
              {
                "type": "mrkdwn",
                "text": "*Amount:* ${{$json.amount}}"
              }
            ]
          }
        ], null, 2)
      }
    },
    {
      label: 'Thread Reply',
      config: {
        authMethod: 'oauth',
        oauthToken: 'xoxb-your-token',
        channel: '#support',
        messageType: 'text',
        message: 'Update: {{$json.status}}',
        threadTs: '{{$json.parentMessageTs}}'
      }
    },
    {
      label: 'Custom Bot Avatar',
      config: {
        authMethod: 'webhook',
        webhookUrl: 'https://hooks.slack.example.com/services/T000/B000/PLACEHOLDER',
        channel: '#alerts',
        messageType: 'text',
        message: '⚠️ Alert: {{$json.alertMessage}}',
        username: 'Alert Bot',
        iconType: 'emoji',
        iconEmoji: ':warning:'
      }
    },
    {
      label: 'Error Notification',
      config: {
        authMethod: 'webhook',
        webhookUrl: 'https://hooks.slack.example.com/services/T000/B000/PLACEHOLDER',
        channel: '#errors',
        messageType: 'attachments',
        message: 'Error in workflow',
        attachments: JSON.stringify([
          {
            "color": "danger",
            "title": "Workflow Error",
            "text": "{{$json.error.message}}",
            "fields": [
              {
                "title": "Node",
                "value": "{{$json.error.node}}",
                "short": true
              },
              {
                "title": "Time",
                "value": "{{$now}}",
                "short": true
              }
            ]
          }
        ], null, 2)
      }
    }
  ]
};