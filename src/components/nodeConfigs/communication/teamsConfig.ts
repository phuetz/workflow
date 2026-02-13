import { NodeConfigDefinition, validators } from '../../../types/nodeConfig';

export const teamsConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'Webhook URL',
      field: 'webhookUrl',
      type: 'text',
      placeholder: 'https://outlook.office.com/webhook/...',
      required: true,
      description: 'Microsoft Teams incoming webhook URL',
      validation: (value) => {
        if (!value) return 'Webhook URL is required';
        const strValue = String(value);
        if (!strValue.includes('outlook.office.com/webhook/') && !strValue.includes('outlook.office365.com/webhook/')) {
          return 'Invalid Teams webhook URL';
        }
        return null;
      }
    },
    {
      label: 'Message Type',
      field: 'messageType',
      type: 'select',
      defaultValue: 'simple',
      options: [
        { value: 'simple', label: 'Simple Text' },
        { value: 'card', label: 'Message Card' },
        { value: 'adaptive', label: 'Adaptive Card' }
      ]
    },
    {
      label: 'Text',
      field: 'text',
      type: 'expression',
      placeholder: 'Hello from {{$json.appName}}!',
      required: true,
      description: 'Message text',
      validation: validators.required('Text')
    },
    {
      label: 'Title',
      field: 'title',
      type: 'text',
      placeholder: 'Notification Title',
      description: 'Card title'
    },
    {
      label: 'Summary',
      field: 'summary',
      type: 'text',
      placeholder: 'Brief summary',
      description: 'Card summary (required for cards)'
    },
    {
      label: 'Theme Color',
      field: 'themeColor',
      type: 'select',
      defaultValue: '0078D4',
      options: [
        { value: '0078D4', label: 'Blue (Default)' },
        { value: '107C10', label: 'Green (Success)' },
        { value: 'FF8C00', label: 'Orange (Warning)' },
        { value: 'C50E1F', label: 'Red (Error)' },
        { value: '5B2D90', label: 'Purple' },
        { value: '004B50', label: 'Teal' },
        { value: 'FFB900', label: 'Yellow' }
      ]
    },
    {
      label: 'Sections',
      field: 'sections',
      type: 'json',
      placeholder: '[{"activityTitle": "Title", "activitySubtitle": "Subtitle", "facts": [{"name": "Key", "value": "Value"}]}]',
      description: 'Card sections with facts',
      validation: validators.json
    },
    {
      label: 'Activity Title',
      field: 'activityTitle',
      type: 'text',
      placeholder: '{{$json.user.name}}',
      description: 'Activity title for simple cards'
    },
    {
      label: 'Activity Subtitle',
      field: 'activitySubtitle',
      type: 'text',
      placeholder: '{{$now}}',
      description: 'Activity subtitle'
    },
    {
      label: 'Activity Image',
      field: 'activityImage',
      type: 'text',
      placeholder: 'https://example.com/avatar.png',
      description: 'Activity avatar URL',
      validation: validators.url
    },
    {
      label: 'Hero Image',
      field: 'heroImage',
      type: 'text',
      placeholder: 'https://example.com/hero.jpg',
      description: 'Large hero image URL',
      validation: validators.url
    },
    {
      label: 'Facts',
      field: 'facts',
      type: 'json',
      placeholder: '[{"name": "Status", "value": "Active"}, {"name": "Count", "value": "42"}]',
      description: 'Key-value facts to display',
      validation: validators.json
    },
    {
      label: 'Markdown',
      field: 'markdown',
      type: 'checkbox',
      defaultValue: true,
      description: 'Enable markdown formatting'
    },
    {
      label: 'Actions',
      field: 'potentialAction',
      type: 'json',
      placeholder: '[{"@type": "OpenUri", "name": "View Details", "targets": [{"os": "default", "uri": "https://example.com"}]}]',
      description: 'Card actions',
      validation: validators.json
    },
    {
      label: 'Adaptive Card Body',
      field: 'adaptiveBody',
      type: 'json',
      placeholder: '[{"type": "TextBlock", "text": "Hello World", "size": "large"}]',
      description: 'Adaptive card body elements',
      validation: validators.json
    },
    {
      label: 'Adaptive Actions',
      field: 'adaptiveActions',
      type: 'json',
      placeholder: '[{"type": "Action.OpenUrl", "title": "Learn More", "url": "https://example.com"}]',
      description: 'Adaptive card actions',
      validation: validators.json
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};

    // Webhook URL is always required
    if (!config.webhookUrl) {
      errors.webhookUrl = 'Webhook URL is required';
    }

    // Message type specific validation
    if (config.messageType === 'card') {
      if (!config.summary) {
        errors.summary = 'Summary is required for message cards';
      }
    }

    if (config.messageType === 'adaptive') {
      if (!config.adaptiveBody) {
        errors.adaptiveBody = 'Adaptive card body is required';
      }
    }

    return errors;
  },

  transform: (config) => {
    // Parse JSON fields
    const jsonFields = ['sections', 'facts', 'potentialAction', 'adaptiveBody', 'adaptiveActions'];

    jsonFields.forEach(field => {
      if (config[field] && typeof config[field] === 'string') {
        try {
          config[field] = JSON.parse(config[field]);
        } catch (e) {
          // Keep as string
        }
      }
    });

    // Build the message payload based on type
    if (config.messageType === 'card') {
      const card: any = {
        '@type': 'MessageCard',
        '@context': 'https://schema.org/extensions',
        summary: config.summary,
        themeColor: config.themeColor,
        title: config.title,
        text: config.text
      };

      if (config.sections) {
        card.sections = config.sections;
      } else if (config.activityTitle || config.facts) {
        // Build a simple section
        const section: any = {};

        if (config.activityTitle) {
          section.activityTitle = config.activityTitle;
          section.activitySubtitle = config.activitySubtitle;
          section.activityImage = config.activityImage;
        }

        if (config.facts) {
          section.facts = config.facts;
        }

        card.sections = [section];
      }

      if (config.heroImage) {
        card.sections = card.sections || [];
        card.sections.unshift({
          images: [{ image: config.heroImage }]
        });
      }

      if (config.potentialAction) {
        card.potentialAction = config.potentialAction;
      }

      config.payload = card;
    } else if (config.messageType === 'adaptive') {
      config.payload = {
        type: 'message',
        attachments: [{
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            version: '1.4',
            body: config.adaptiveBody,
            actions: config.adaptiveActions
          }
        }]
      };
    }

    return config;
  },

  examples: [
    {
      label: 'Simple Text Message',
      config: {
        webhookUrl: 'https://outlook.office.com/webhook/YOUR/WEBHOOK/URL',
        messageType: 'simple',
        text: '🚀 Deployment completed successfully!'
      }
    },
    {
      label: 'Status Update Card',
      config: {
        webhookUrl: 'https://outlook.office.com/webhook/YOUR/WEBHOOK/URL',
        messageType: 'card',
        title: '📊 Daily Status Report',
        text: 'Here is the summary for {{$json.date}}',
        summary: 'Daily Report',
        themeColor: '0078D4',
        facts: JSON.stringify([
          { name: 'Total Orders', value: '{{$json.orderCount}}' },
          { name: 'Revenue', value: '${{$json.revenue}}' },
          { name: 'Active Users', value: '{{$json.activeUsers}}' },
          { name: 'Performance', value: '{{$json.performance}}%' }
        ], null, 2),
        potentialAction: JSON.stringify([
          {
            '@type': 'OpenUri',
            name: 'View Dashboard',
            targets: [{ os: 'default', uri: '{{$json.dashboardUrl}}' }]
          }
        ], null, 2)
      }
    },
    {
      label: 'Error Alert Card',
      config: {
        webhookUrl: 'https://outlook.office.com/webhook/YOUR/WEBHOOK/URL',
        messageType: 'card',
        title: '🚨 Error Alert',
        text: '{{$json.error.message}}',
        summary: 'Error in {{$json.service}}',
        themeColor: 'C50E1F',
        activityTitle: 'Error Details',
        activitySubtitle: '{{$now}}',
        sections: JSON.stringify([
          {
            facts: [
              { name: 'Service', value: '{{$json.service}}' },
              { name: 'Error Code', value: '{{$json.error.code}}' },
              { name: 'Severity', value: '{{$json.severity}}' }
            ]
          }
        ], null, 2)
      }
    },
    {
      label: 'Approval Request',
      config: {
        webhookUrl: 'https://outlook.office.com/webhook/YOUR/WEBHOOK/URL',
        messageType: 'card',
        title: '✅ Approval Required',
        text: '{{$json.requester}} has submitted a request for approval',
        summary: 'Approval Request from {{$json.requester}}',
        themeColor: 'FFB900',
        facts: JSON.stringify([
          { name: 'Request Type', value: '{{$json.type}}' },
          { name: 'Amount', value: '${{$json.amount}}' },
          { name: 'Department', value: '{{$json.department}}' }
        ], null, 2),
        potentialAction: JSON.stringify([
          {
            '@type': 'OpenUri',
            name: 'Approve',
            targets: [{ os: 'default', uri: '{{$json.approveUrl}}' }]
          },
          {
            '@type': 'OpenUri',
            name: 'Reject',
            targets: [{ os: 'default', uri: '{{$json.rejectUrl}}' }]
          }
        ], null, 2)
      }
    },
    {
      label: 'Adaptive Card Example',
      config: {
        webhookUrl: 'https://outlook.office.com/webhook/YOUR/WEBHOOK/URL',
        messageType: 'adaptive',
        text: 'Adaptive card notification',
        adaptiveBody: JSON.stringify([
          {
            type: 'TextBlock',
            text: '🎉 New Feature Released!',
            weight: 'bolder',
            size: 'large'
          },
          {
            type: 'TextBlock',
            text: '{{$json.featureName}} is now available',
            wrap: true
          },
          {
            type: 'FactSet',
            facts: [
              { title: 'Version', value: '{{$json.version}}' },
              { title: 'Release Date', value: '{{$json.releaseDate}}' }
            ]
          }
        ], null, 2),
        adaptiveActions: JSON.stringify([
          {
            type: 'Action.OpenUrl',
            title: 'View Release Notes',
            url: '{{$json.releaseNotesUrl}}'
          }
        ], null, 2)
      }
    }
  ]
};