import { NodeConfigDefinition, validators } from '../../../types/nodeConfig';

export const telegramConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'Bot Token',
      field: 'botToken',
      type: 'password',
      placeholder: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
      required: true,
      description: 'Telegram bot token from @BotFather',
      validation: (value) => {
        if (!value) return 'Bot token is required';
        const tokenStr = String(value);
        if (!tokenStr.match(/^\d+:[A-Za-z0-9_-]+$/)) {
          return 'Invalid bot token format';
        }
        return null;
      }
    },
    {
      label: 'Chat ID',
      field: 'chatId',
      type: 'text',
      placeholder: '-1001234567890 or @username',
      required: true,
      description: 'Chat ID, user ID, or @username',
      validation: validators.required('Chat ID')
    },
    {
      label: 'Message Type',
      field: 'messageType',
      type: 'select',
      defaultValue: 'text',
      options: [
        { value: 'text', label: 'Text Message' },
        { value: 'photo', label: 'Photo' },
        { value: 'document', label: 'Document' },
        { value: 'video', label: 'Video' },
        { value: 'audio', label: 'Audio' },
        { value: 'voice', label: 'Voice' },
        { value: 'location', label: 'Location' },
        { value: 'contact', label: 'Contact' },
        { value: 'poll', label: 'Poll' }
      ]
    },
    {
      label: 'Text',
      field: 'text',
      type: 'expression',
      placeholder: 'Hello from {{$json.appName}}!',
      required: true,
      description: 'Message text (Markdown or HTML supported)',
      validation: (value, config) => {
        if (config && config.messageType === 'text' && !value) {
          return 'Text is required for text messages';
        }
        return null;
      }
    },
    {
      label: 'Parse Mode',
      field: 'parseMode',
      type: 'select',
      defaultValue: 'Markdown',
      options: [
        { value: 'Markdown', label: 'Markdown' },
        { value: 'MarkdownV2', label: 'Markdown V2' },
        { value: 'HTML', label: 'HTML' },
        { value: '', label: 'None' }
      ]
    },
    {
      label: 'Caption',
      field: 'caption',
      type: 'expression',
      placeholder: 'Photo caption',
      description: 'Caption for media messages'
    },
    {
      label: 'Media URL',
      field: 'mediaUrl',
      type: 'text',
      placeholder: 'https://example.com/image.jpg',
      description: 'URL for photo, video, audio, or document',
      validation: validators.url
    },
    {
      label: 'File Content',
      field: 'fileContent',
      type: 'expression',
      placeholder: '{{$binary.data}}',
      description: 'Binary content for file upload'
    },
    {
      label: 'File Name',
      field: 'fileName',
      type: 'text',
      placeholder: 'document.pdf',
      description: 'File name for documents'
    },
    {
      label: 'Disable Notification',
      field: 'disableNotification',
      type: 'checkbox',
      defaultValue: false,
      description: 'Send silently'
    },
    {
      label: 'Protect Content',
      field: 'protectContent',
      type: 'checkbox',
      defaultValue: false,
      description: 'Protect from forwarding/saving'
    },
    {
      label: 'Reply To Message ID',
      field: 'replyToMessageId',
      type: 'text',
      placeholder: '{{$json.messageId}}',
      description: 'ID of message to reply to'
    },
    {
      label: 'Inline Keyboard',
      field: 'inlineKeyboard',
      type: 'json',
      placeholder: '[[{"text": "Button", "callback_data": "action"}]]',
      description: 'Inline keyboard buttons',
      validation: validators.json
    },
    {
      label: 'Reply Keyboard',
      field: 'replyKeyboard',
      type: 'json',
      placeholder: '[["Button 1", "Button 2"], ["Button 3"]]',
      description: 'Custom keyboard',
      validation: validators.json
    },
    {
      label: 'Remove Keyboard',
      field: 'removeKeyboard',
      type: 'checkbox',
      defaultValue: false,
      description: 'Remove custom keyboard'
    },
    {
      label: 'Location Latitude',
      field: 'latitude',
      type: 'number',
      placeholder: '48.8566',
      description: 'Latitude for location messages'
    },
    {
      label: 'Location Longitude',
      field: 'longitude',
      type: 'number',
      placeholder: '2.3522',
      description: 'Longitude for location messages'
    },
    {
      label: 'Poll Question',
      field: 'pollQuestion',
      type: 'text',
      placeholder: 'What is your favorite color?',
      description: 'Question for poll'
    },
    {
      label: 'Poll Options',
      field: 'pollOptions',
      type: 'json',
      placeholder: '["Red", "Blue", "Green"]',
      description: 'Array of poll options',
      validation: validators.json
    },
    {
      label: 'Poll Type',
      field: 'pollType',
      type: 'select',
      defaultValue: 'regular',
      options: [
        { value: 'regular', label: 'Regular' },
        { value: 'quiz', label: 'Quiz' }
      ]
    },
    {
      label: 'Correct Option ID',
      field: 'correctOptionId',
      type: 'number',
      placeholder: '0',
      description: 'Correct answer index for quiz (0-based)'
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};

    // Bot token is always required
    if (!config.botToken) {
      errors.botToken = 'Bot token is required';
    }

    // Chat ID is always required
    if (!config.chatId) {
      errors.chatId = 'Chat ID is required';
    }

    // Message type specific validation
    switch (config.messageType) {
      case 'text':
        if (!config.text) {
          errors.text = 'Text is required for text messages';
        }
        break;
      
      case 'photo':
      case 'video':
      case 'audio':
      case 'voice':
      case 'document':
        if (!config.mediaUrl && !config.fileContent) {
          errors.mediaUrl = 'Media URL or file content is required';
        }
        break;
      
      case 'location':
        if (!config.latitude) {
          errors.latitude = 'Latitude is required for location';
        }
        if (!config.longitude) {
          errors.longitude = 'Longitude is required for location';
        }
        break;
      
      case 'poll':
        if (!config.pollQuestion) {
          errors.pollQuestion = 'Question is required for poll';
        }
        if (!config.pollOptions) {
          errors.pollOptions = 'Options are required for poll';
        }
        break;
    }

    // Quiz validation
    if (config.pollType === 'quiz' && config.correctOptionId === undefined) {
      errors.correctOptionId = 'Correct option is required for quiz';
    }

    return errors;
  },

  transform: (config) => {
    // Parse JSON fields
    if (config.inlineKeyboard && typeof config.inlineKeyboard === 'string') {
      try {
        config.inlineKeyboard = JSON.parse(config.inlineKeyboard);
      } catch (e) {
        // Keep as string
      }
    }

    if (config.replyKeyboard && typeof config.replyKeyboard === 'string') {
      try {
        config.replyKeyboard = JSON.parse(config.replyKeyboard);
      } catch (e) {
        // Keep as string
      }
    }

    if (config.pollOptions && typeof config.pollOptions === 'string') {
      try {
        config.pollOptions = JSON.parse(config.pollOptions);
      } catch (e) {
        // Keep as string
      }
    }

    // Build reply markup
    if (config.inlineKeyboard || config.replyKeyboard || config.removeKeyboard) {
      const replyMarkup: Record<string, unknown> = {};

      if (config.inlineKeyboard) {
        replyMarkup.inline_keyboard = config.inlineKeyboard;
      } else if (config.replyKeyboard) {
        replyMarkup.keyboard = config.replyKeyboard;
        replyMarkup.resize_keyboard = true;
      } else if (config.removeKeyboard) {
        replyMarkup.remove_keyboard = true;
      }

      config.replyMarkup = replyMarkup;
    }

    return config;
  },

  examples: [
    {
      label: 'Simple Text Message',
      config: {
        botToken: 'YOUR_BOT_TOKEN',
        chatId: '@yourchannel',
        messageType: 'text',
        text: '🚀 Hello from {{$json.appName}}!',
        parseMode: 'Markdown'
      }
    },
    {
      label: 'Rich Formatted Message',
      config: {
        botToken: 'YOUR_BOT_TOKEN',
        chatId: '-1001234567890',
        messageType: 'text',
        text: '*New Order Received!*\n\nCustomer: {{$json.customerName}}\nAmount: ${{$json.amount}}\nItems: {{$json.itemCount}}\n\n[View Order]({{$json.orderUrl}})',
        parseMode: 'Markdown',
        disableNotification: false
      }
    },
    {
      label: 'Photo with Caption',
      config: {
        botToken: 'YOUR_BOT_TOKEN',
        chatId: '@yourchannel',
        messageType: 'photo',
        mediaUrl: '{{$json.imageUrl}}',
        caption: '📸 {{$json.title}}\n\n{{$json.description}}',
        parseMode: 'Markdown'
      }
    },
    {
      label: 'Interactive Poll',
      config: {
        botToken: 'YOUR_BOT_TOKEN',
        chatId: '-1001234567890',
        messageType: 'poll',
        pollQuestion: '{{$json.question}}',
        pollOptions: JSON.stringify(['Option A', 'Option B', 'Option C', 'Option D'], null, 2),
        pollType: 'regular'
      }
    },
    {
      label: 'Message with Inline Buttons',
      config: {
        botToken: 'YOUR_BOT_TOKEN',
        chatId: '@yourchannel',
        messageType: 'text',
        text: '🔔 *Alert:* {{$json.alertMessage}}',
        parseMode: 'Markdown',
        inlineKeyboard: JSON.stringify([
          [
            { text: '✅ Acknowledge', callback_data: 'ack_{{$json.alertId}}' },
            { text: '🔍 View Details', url: '{{$json.detailsUrl}}' }
          ],
          [
            { text: '📞 Contact Support', url: 'https://t.me/support' }
          ]
        ], null, 2)
      }
    },
    {
      label: 'Document Upload',
      config: {
        botToken: 'YOUR_BOT_TOKEN',
        chatId: '-1001234567890',
        messageType: 'document',
        mediaUrl: '{{$json.documentUrl}}',
        fileName: 'report-{{$today}}.pdf',
        caption: '📄 Daily Report\nGenerated at: {{$now}}'
      }
    }
  ]
};