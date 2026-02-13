import { NodeConfigDefinition, validators } from '../../../types/nodeConfig';

export const discordConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'Authentication Method',
      field: 'authMethod',
      type: 'select',
      required: true,
      defaultValue: 'webhook',
      options: [
        { value: 'webhook', label: 'Webhook URL' },
        { value: 'bot', label: 'Bot Token' }
      ]
    },
    {
      label: 'Webhook URL',
      field: 'webhookUrl',
      type: 'text',
      placeholder: 'https://discord.com/api/webhooks/123456789/abcdef...',
      description: 'Discord webhook URL',
      validation: (value, config) => {
        if (config?.authMethod === 'webhook' && !value) {
          return 'Webhook URL is required';
        }
        if (value && typeof value === 'string' && !value.startsWith('https://discord.com/api/webhooks/')) {
          return 'Invalid Discord webhook URL';
        }
        return null;
      }
    },
    {
      label: 'Bot Token',
      field: 'botToken',
      type: 'password',
      placeholder: 'Your bot token',
      description: 'Discord bot token',
      validation: (value, config) => {
        if (config?.authMethod === 'bot' && !value) {
          return 'Bot token is required';
        }
        return null;
      }
    },
    {
      label: 'Channel ID',
      field: 'channelId',
      type: 'text',
      placeholder: '123456789012345678',
      description: 'Discord channel ID (required for bot)',
      validation: (value, config) => {
        if (config?.authMethod === 'bot' && !value) {
          return 'Channel ID is required for bot authentication';
        }
        if (value && typeof value === 'string' && !/^\d{17,19}$/.test(value)) {
          return 'Invalid channel ID format';
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
        { value: 'embed', label: 'Rich Embed' },
        { value: 'file', label: 'File Attachment' }
      ]
    },
    {
      label: 'Content',
      field: 'content',
      type: 'expression',
      placeholder: 'Hello from {{$json.appName}}!',
      required: true,
      description: 'Message content',
      validation: validators.required('Content')
    },
    {
      label: 'Username',
      field: 'username',
      type: 'text',
      placeholder: 'Workflow Bot',
      description: 'Override webhook username'
    },
    {
      label: 'Avatar URL',
      field: 'avatarUrl',
      type: 'text',
      placeholder: 'https://example.com/avatar.png',
      description: 'Override webhook avatar',
      validation: validators.url
    },
    {
      label: 'Text-to-Speech',
      field: 'tts',
      type: 'checkbox',
      defaultValue: false,
      description: 'Enable TTS for message'
    },
    {
      label: 'Embed Title',
      field: 'embedTitle',
      type: 'text',
      placeholder: 'Notification',
      description: 'Title for embed message'
    },
    {
      label: 'Embed Description',
      field: 'embedDescription',
      type: 'expression',
      placeholder: 'Details about {{$json.event}}',
      description: 'Description for embed'
    },
    {
      label: 'Embed Color',
      field: 'embedColor',
      type: 'select',
      defaultValue: '3447003',
      options: [
        { value: '3447003', label: 'Blue (Default)' },
        { value: '3066993', label: 'Green' },
        { value: '15158332', label: 'Red' },
        { value: '16776960', label: 'Yellow' },
        { value: '10181046', label: 'Purple' },
        { value: '16753920', label: 'Orange' },
        { value: '0', label: 'Black' }
      ]
    },
    {
      label: 'Embed Fields',
      field: 'embedFields',
      type: 'json',
      placeholder: '[{"name": "Field", "value": "Value", "inline": true}]',
      description: 'Array of embed fields',
      validation: validators.json
    },
    {
      label: 'Embed Image URL',
      field: 'embedImage',
      type: 'text',
      placeholder: 'https://example.com/image.png',
      description: 'Image for embed',
      validation: validators.url
    },
    {
      label: 'Embed Thumbnail URL',
      field: 'embedThumbnail',
      type: 'text',
      placeholder: 'https://example.com/thumb.png',
      description: 'Thumbnail for embed',
      validation: validators.url
    },
    {
      label: 'File URL',
      field: 'fileUrl',
      type: 'text',
      placeholder: 'https://example.com/file.pdf',
      description: 'File to attach (webhook)',
      validation: validators.url
    },
    {
      label: 'File Content',
      field: 'fileContent',
      type: 'expression',
      placeholder: '{{$binary.data}}',
      description: 'File content for bot upload'
    },
    {
      label: 'File Name',
      field: 'fileName',
      type: 'text',
      placeholder: 'report.pdf',
      description: 'Name for uploaded file'
    },
    {
      label: 'Suppress Embeds',
      field: 'suppressEmbeds',
      type: 'checkbox',
      defaultValue: false,
      description: 'Suppress link embeds'
    },
    {
      label: 'Allowed Mentions',
      field: 'allowedMentions',
      type: 'json',
      placeholder: '{"parse": ["users", "roles", "everyone"]}',
      description: 'Control mention parsing',
      validation: validators.json
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};

    // Auth validation
    if (config.authMethod === 'webhook' && !config.webhookUrl) {
      errors.webhookUrl = 'Webhook URL is required';
    }
    
    if (config.authMethod === 'bot') {
      if (!config.botToken) {
        errors.botToken = 'Bot token is required';
      }
      if (!config.channelId) {
        errors.channelId = 'Channel ID is required for bot';
      }
    }

    // Message type validation
    if (config.messageType === 'embed' && !config.embedDescription && !config.embedTitle) {
      errors.embedDescription = 'Embed requires at least title or description';
    }
    
    if (config.messageType === 'file' && !config.fileUrl && !config.fileContent) {
      errors.fileUrl = 'File URL or content is required';
    }

    return errors;
  },

  transform: (config) => {
    // Parse JSON fields
    if (config.embedFields && typeof config.embedFields === 'string') {
      try {
        config.embedFields = JSON.parse(config.embedFields);
      } catch (e) {
        // Keep as string
      }
    }

    if (config.allowedMentions && typeof config.allowedMentions === 'string') {
      try {
        config.allowedMentions = JSON.parse(config.allowedMentions);
      } catch (e) {
        // Keep as string
      }
    }

    // Convert color to number
    if (config.embedColor && typeof config.embedColor === 'string') {
      config.embedColor = parseInt(config.embedColor, 10);
    }

    return config;
  },

  examples: [
    {
      label: 'Simple Message',
      config: {
        authMethod: 'webhook',
        webhookUrl: 'https://discord.com/api/webhooks/YOUR/WEBHOOK',
        messageType: 'text',
        content: '🚀 Deployment completed successfully!'
      }
    },
    {
      label: 'Rich Embed',
      config: {
        authMethod: 'webhook',
        webhookUrl: 'https://discord.com/api/webhooks/YOUR/WEBHOOK',
        messageType: 'embed',
        content: 'New order notification',
        embedTitle: '🛍️ New Order Received!',
        embedDescription: 'Order #{{$json.orderId}} from {{$json.customerName}}',
        embedColor: '3066993',
        embedFields: JSON.stringify([
          { name: 'Amount', value: '${{$json.amount}}', inline: true },
          { name: 'Items', value: '{{$json.itemCount}}', inline: true },
          { name: 'Status', value: 'Processing', inline: true }
        ], null, 2),
        embedThumbnail: 'https://example.com/logo.png'
      }
    },
    {
      label: 'Error Alert',
      config: {
        authMethod: 'bot',
        botToken: 'YOUR_BOT_TOKEN',
        channelId: '123456789012345678',
        messageType: 'embed',
        content: '@here Error detected!',
        embedTitle: '🚨 Critical Error',
        embedDescription: '{{$json.error.message}}',
        embedColor: '15158332',
        embedFields: JSON.stringify([
          { name: 'Service', value: '{{$json.service}}', inline: true },
          { name: 'Time', value: '{{$now}}', inline: true }
        ], null, 2)
      }
    },
    {
      label: 'File Report',
      config: {
        authMethod: 'webhook',
        webhookUrl: 'https://discord.com/api/webhooks/YOUR/WEBHOOK',
        messageType: 'file',
        content: '📊 Daily report is ready',
        fileUrl: '{{$json.reportUrl}}',
        fileName: 'daily-report-{{$today}}.pdf'
      }
    },
    {
      label: 'Custom Webhook Bot',
      config: {
        authMethod: 'webhook',
        webhookUrl: 'https://discord.com/api/webhooks/YOUR/WEBHOOK',
        messageType: 'text',
        content: '{{$json.message}}',
        username: 'Custom Bot',
        avatarUrl: 'https://example.com/custom-avatar.png',
        tts: false
      }
    }
  ]
};