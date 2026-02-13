import { NodeConfigDefinition } from '../../../types/nodeConfig';

export const intercomConfig: NodeConfigDefinition = {
  fields: [
    // Authentication
    {
      label: 'Access Token',
      field: 'accessToken',
      type: 'password',
      required: true,
      description: 'Your Intercom Access Token'
    },

    // Operation
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      options: [
        // Conversation Operations
        { value: 'conversation_get', label: 'Get Conversation' },
        { value: 'conversation_list', label: 'List Conversations' },
        { value: 'conversation_create', label: 'Create Conversation' },
        { value: 'conversation_reply', label: 'Reply to Conversation' },
        { value: 'conversation_assign', label: 'Assign Conversation' },
        { value: 'conversation_close', label: 'Close Conversation' },
        { value: 'conversation_snooze', label: 'Snooze Conversation' },
        { value: 'conversation_tag', label: 'Tag Conversation' },
        { value: 'conversation_search', label: 'Search Conversations' },
        { value: 'conversation_stats', label: 'Get Conversation Stats' },
        { value: 'conversation_export', label: 'Export Conversations' },
        { value: 'conversation_archive', label: 'Archive Conversation' },

        // Contact Operations
        { value: 'contact_get', label: 'Get Contact' },
        { value: 'contact_list', label: 'List Contacts' },
        { value: 'contact_create', label: 'Create Contact' },
        { value: 'contact_update', label: 'Update Contact' },
        { value: 'contact_delete', label: 'Delete Contact' },
        { value: 'contact_search', label: 'Search Contacts' },
        { value: 'contact_merge', label: 'Merge Contacts' },
        { value: 'contact_tag', label: 'Tag Contact' },
        { value: 'contact_conversations', label: 'Get Contact Conversations' },
        { value: 'contact_subscribe', label: 'Subscribe Contact' },

        // Message Operations
        { value: 'message_send', label: 'Send Message' },
        { value: 'message_send_email', label: 'Send Email' },
        { value: 'message_send_push', label: 'Send Push Notification' },
        { value: 'message_send_inapp', label: 'Send In-App Message' },
        { value: 'message_schedule', label: 'Schedule Message' },
        { value: 'message_get', label: 'Get Message' },
        { value: 'message_update', label: 'Update Message' },
        { value: 'message_delete', label: 'Delete Message' },

        // Teams & Admins
        { value: 'team_list', label: 'List Teams' },
        { value: 'team_get', label: 'Get Team' },
        { value: 'admin_list', label: 'List Admins' },
        { value: 'admin_get', label: 'Get Admin' },
        { value: 'admin_update', label: 'Update Admin' },
        { value: 'admin_activity', label: 'Get Admin Activity' },

        // Data & Events
        { value: 'event_track', label: 'Track Event' },
        { value: 'event_list', label: 'List Events' },
        { value: 'data_attribute_create', label: 'Create Data Attribute' },
        { value: 'data_attribute_update', label: 'Update Data Attribute' },
        { value: 'data_attribute_list', label: 'List Data Attributes' },
        { value: 'data_event_submit', label: 'Submit Data Event' },
        { value: 'data_export', label: 'Export Data' },
        { value: 'data_delete', label: 'Delete Data' }
      ],
      required: true,
      description: 'Intercom operation to perform'
    },

    // Common Parameters
    {
      label: 'Per Page',
      field: 'perPage',
      type: 'number',
      placeholder: '50',
      defaultValue: 50,
      validation: (value) => {
        if (value && ((value as number) < 1 || (value as number) > 150)) {
          return 'Must be between 1 and 150';
        }
        return null;
      },
      description: 'Number of results per page (for list operations)'
    },
    {
      label: 'Page',
      field: 'page',
      type: 'number',
      placeholder: '1',
      defaultValue: 1,
      description: 'Page number (for list operations)'
    },
    {
      label: 'Sort Order',
      field: 'order',
      type: 'select',
      options: [
        { value: 'asc', label: 'Ascending' },
        { value: 'desc', label: 'Descending' }
      ],
      defaultValue: 'desc',
      description: 'Sort order (for list operations)'
    },

    // Conversation Operations Fields
    {
      label: 'Conversation ID',
      field: 'conversationId',
      type: 'text',
      placeholder: '12345',
      description: 'Required for conversation get/reply/assign/close/snooze/tag/archive operations'
    },
    {
      label: 'Subject',
      field: 'subject',
      type: 'text',
      placeholder: 'Conversation subject',
      required: false,
      description: 'For conversation create operation'
    },
    {
      label: 'Body',
      field: 'body',
      type: 'text',
      placeholder: 'Message content...',
      description: 'Message body (for conversation create/reply)'
    },
    {
      label: 'Message Type',
      field: 'messageType',
      type: 'select',
      options: [
        { value: 'comment', label: 'Comment' },
        { value: 'note', label: 'Note' },
        { value: 'assignment', label: 'Assignment' }
      ],
      defaultValue: 'comment',
      description: 'For conversation reply operation'
    },
    {
      label: 'Assignee ID',
      field: 'assigneeId',
      type: 'number',
      placeholder: '12345',
      description: 'Required for conversation assign operation'
    },
    {
      label: 'Team ID',
      field: 'teamId',
      type: 'number',
      placeholder: '67890',
      required: false,
      description: 'For conversation assign/create operations'
    },
    {
      label: 'Conversation State',
      field: 'state',
      type: 'select',
      options: [
        { value: 'open', label: 'Open' },
        { value: 'closed', label: 'Closed' },
        { value: 'snoozed', label: 'Snoozed' }
      ],
      description: 'For conversation close/list operations'
    },
    {
      label: 'Priority',
      field: 'priority',
      type: 'select',
      options: [
        { value: 'not_priority', label: 'Not Priority' },
        { value: 'priority', label: 'Priority' }
      ],
      defaultValue: 'not_priority',
      description: 'For conversation create/reply operations'
    },
    {
      label: 'Snoozed Until',
      field: 'snoozedUntil',
      type: 'number',
      placeholder: '1640995200',
      description: 'Unix timestamp (required for conversation snooze)'
    },
    {
      label: 'Contact ID',
      field: 'contactId',
      type: 'text',
      placeholder: '5f7d8a9b2c3d4e5f6a7b8c9d',
      description: 'Required for conversation create operation'
    },
    {
      label: 'Email',
      field: 'email',
      type: 'email',
      placeholder: 'user@example.com',
      required: false,
      description: 'For conversation create, contact create/update operations'
    },
    {
      label: 'User ID',
      field: 'userId',
      type: 'text',
      placeholder: 'user_123',
      required: false,
      description: 'For conversation create, contact create/update, event track operations'
    },
    {
      label: 'Tags',
      field: 'tags',
      type: 'json',
      placeholder: '["tag1", "tag2"]',
      required: false,
      description: 'For conversation tag, contact tag/create/update operations'
    },
    {
      label: 'Tag Action',
      field: 'tagAction',
      type: 'select',
      options: [
        { value: 'add', label: 'Add Tags' },
        { value: 'remove', label: 'Remove Tags' }
      ],
      defaultValue: 'add',
      description: 'For conversation tag, contact tag operations'
    },

    // Conversation Filtering
    {
      label: 'State Filter',
      field: 'stateFilter',
      type: 'select',
      options: [
        { value: 'open', label: 'Open' },
        { value: 'closed', label: 'Closed' },
        { value: 'all', label: 'All' }
      ],
      defaultValue: 'open',
      description: 'For conversation list operation'
    },
    {
      label: 'Unassigned Only',
      field: 'unassigned',
      type: 'checkbox',
      defaultValue: false,
      description: 'For conversation list operation'
    },
    {
      label: 'Assigned to Team',
      field: 'assignedToTeam',
      type: 'number',
      placeholder: '12345',
      required: false,
      description: 'For conversation list operation'
    },
    {
      label: 'Display As',
      field: 'displayAs',
      type: 'select',
      options: [
        { value: 'plaintext', label: 'Plain Text' },
        { value: 'html', label: 'HTML' }
      ],
      defaultValue: 'plaintext',
      description: 'For conversation list/get operations'
    },

    // Contact Operations Fields
    {
      label: 'Contact ID',
      field: 'contactIdValue',
      type: 'text',
      placeholder: '5f7d8a9b2c3d4e5f6a7b8c9d',
      description: 'Required for contact get/update/delete/tag/conversations/subscribe operations'
    },
    {
      label: 'Name',
      field: 'name',
      type: 'text',
      placeholder: 'John Doe',
      required: false,
      description: 'For contact create/update operations'
    },
    {
      label: 'Phone',
      field: 'phone',
      type: 'text',
      placeholder: '+1234567890',
      required: false,
      description: 'For contact create/update operations'
    },
    {
      label: 'Avatar URL',
      field: 'avatar',
      type: 'text',
      placeholder: 'https://example.com/avatar.jpg',
      required: false,
      description: 'For contact create/update operations'
    },
    {
      label: 'Signed Up At',
      field: 'signedUpAt',
      type: 'number',
      placeholder: '1640995200',
      required: false,
      description: 'Unix timestamp (for contact create/update)'
    },
    {
      label: 'Last Seen At',
      field: 'lastSeenAt',
      type: 'number',
      placeholder: '1640995200',
      required: false,
      description: 'Unix timestamp (for contact create/update)'
    },
    {
      label: 'Unsubscribed from Emails',
      field: 'unsubscribedFromEmails',
      type: 'checkbox',
      defaultValue: false,
      description: 'For contact create/update operations'
    },
    {
      label: 'Custom Attributes',
      field: 'customAttributes',
      type: 'json',
      placeholder: '{"plan": "pro", "monthly_spend": 100}',
      required: false,
      description: 'For contact create/update operations'
    },
    {
      label: 'Companies',
      field: 'companies',
      type: 'json',
      placeholder: '[{"companyId": "123", "name": "Acme Corp"}]',
      required: false,
      description: 'For contact create/update operations'
    },

    // Contact Merge Fields
    {
      label: 'Primary Contact ID',
      field: 'primaryContactId',
      type: 'text',
      placeholder: '5f7d8a9b2c3d4e5f6a7b8c9d',
      description: 'Required for contact merge operation'
    },
    {
      label: 'Secondary Contact ID',
      field: 'secondaryContactId',
      type: 'text',
      placeholder: '6a8b9c0d1e2f3a4b5c6d7e8f',
      description: 'Required for contact merge operation'
    },

    // Message Operations Fields
    {
      label: 'Message Type',
      field: 'messageTypeValue',
      type: 'select',
      options: [
        { value: 'inapp', label: 'In-App' },
        { value: 'email', label: 'Email' },
        { value: 'push', label: 'Push' },
        { value: 'facebook', label: 'Facebook' },
        { value: 'twitter', label: 'Twitter' }
      ],
      description: 'Required for message send operations'
    },
    {
      label: 'To',
      field: 'to',
      type: 'json',
      placeholder: '{"type": "user", "id": "123"}',
      description: 'Required for message send operations'
    },
    {
      label: 'Template',
      field: 'template',
      type: 'text',
      placeholder: 'welcome_message',
      required: false,
      description: 'For message send/email/inapp operations'
    },
    {
      label: 'From',
      field: 'from',
      type: 'json',
      placeholder: '{"type": "admin", "id": "456"}',
      required: false,
      description: 'For message send operations'
    },
    {
      label: 'Create At',
      field: 'createAt',
      type: 'number',
      placeholder: '1640995200',
      required: false,
      description: 'Unix timestamp for scheduling (message schedule operation)'
    },
    {
      label: 'Attachments',
      field: 'attachments',
      type: 'json',
      placeholder: '[{"type": "image", "url": "https://example.com/image.jpg"}]',
      required: false,
      description: 'For message send/email/inapp operations'
    },

    // Email Specific
    {
      label: 'Email Subject',
      field: 'emailSubject',
      type: 'text',
      placeholder: 'Welcome to our platform!',
      description: 'Required for message send email operation'
    },
    {
      label: 'Email Template',
      field: 'emailTemplate',
      type: 'text',
      placeholder: 'welcome_email',
      required: false,
      description: 'For message send email operation'
    },

    // Push Notification Specific
    {
      label: 'Push Data',
      field: 'pushData',
      type: 'json',
      placeholder: '{"action": "open_app", "screen": "home"}',
      required: false,
      description: 'For message send push operation'
    },
    {
      label: 'APNS Topic',
      field: 'apnsTopic',
      type: 'text',
      placeholder: 'com.company.app',
      required: false,
      description: 'For message send push operation'
    },

    // Event Tracking Fields
    {
      label: 'Event Name',
      field: 'eventName',
      type: 'text',
      placeholder: 'purchased',
      description: 'Required for event track, data event submit operations'
    },
    {
      label: 'Metadata',
      field: 'metadata',
      type: 'json',
      placeholder: '{"price": 99.99, "product": "Pro Plan"}',
      required: false,
      description: 'For event track, data event submit operations'
    },
    {
      label: 'Created At',
      field: 'createdAt',
      type: 'number',
      placeholder: '1640995200',
      required: false,
      description: 'Unix timestamp (for event track, data event submit)'
    },

    // Bulk Events
    {
      label: 'Events',
      field: 'events',
      type: 'json',
      placeholder: '[{"eventName": "login", "userId": "123", "metadata": {}}]',
      description: 'Required for data event submit operation'
    },

    // Data Attribute Fields
    {
      label: 'Data Attribute ID',
      field: 'dataAttributeId',
      type: 'number',
      placeholder: '12345',
      description: 'Required for data attribute update operation'
    },
    {
      label: 'Attribute Name',
      field: 'attributeName',
      type: 'text',
      placeholder: 'subscription_tier',
      description: 'Required for data attribute create operation'
    },
    {
      label: 'Label',
      field: 'label',
      type: 'text',
      placeholder: 'Subscription Tier',
      required: false,
      description: 'For data attribute create/update operations'
    },
    {
      label: 'Description',
      field: 'description',
      type: 'text',
      placeholder: 'Customer subscription level',
      required: false,
      description: 'For data attribute create/update operations'
    },
    {
      label: 'Data Type',
      field: 'dataType',
      type: 'select',
      options: [
        { value: 'string', label: 'String' },
        { value: 'integer', label: 'Integer' },
        { value: 'float', label: 'Float' },
        { value: 'boolean', label: 'Boolean' },
        { value: 'date', label: 'Date' }
      ],
      description: 'Required for data attribute create operation'
    },
    {
      label: 'Options',
      field: 'options',
      type: 'json',
      placeholder: '[{"value": "free", "label": "Free"}, {"value": "pro", "label": "Pro"}]',
      required: false,
      description: 'For data attribute create/update operations'
    },

    // Search Fields
    {
      label: 'Search Query',
      field: 'query',
      type: 'text',
      placeholder: 'tag:important',
      description: 'Required for conversation search, contact search operations'
    },

    // Admin/Team Fields
    {
      label: 'Team ID',
      field: 'teamIdValue',
      type: 'number',
      placeholder: '12345',
      description: 'Required for team get operation'
    },
    {
      label: 'Admin ID',
      field: 'adminId',
      type: 'number',
      placeholder: '67890',
      description: 'Required for admin get/update/activity operations'
    },

    // Advanced Options
    {
      label: 'Include Deleted',
      field: 'includeDeleted',
      type: 'checkbox',
      defaultValue: false,
      description: 'For contact list, conversation list operations'
    },
    {
      label: 'Expand Fields',
      field: 'expandFields',
      type: 'json',
      placeholder: '["author", "assignee", "team"]',
      required: false,
      description: 'For conversation get/list, contact get/list operations'
    }
  ],

  examples: [
    {
      name: 'Automated Welcome Message',
      description: 'Send in-app message to new users',
      config: {
        accessToken: '${INTERCOM_ACCESS_TOKEN}',
        operation: 'message_send_inapp',
        body: 'Welcome to our platform! Let us know if you need any help getting started.',
        messageTypeValue: 'inapp',
        to: {
          type: 'contact',
          email: '{{newUser.email}}'
        },
        from: {
          type: 'bot',
          id: '{{bot.welcomeBot}}'
        }
      }
    },
    {
      name: 'Smart Conversation Assignment',
      description: 'Assign conversation based on tags and priority',
      config: {
        accessToken: '${INTERCOM_ACCESS_TOKEN}',
        operation: 'conversation_assign',
        conversationId: '{{trigger.conversationId}}',
        assigneeId: '{{ai.findBestAgent(conversation.tags, conversation.priority)}}',
        teamId: '{{teams.support}}'
      }
    },
    {
      name: 'Lead Enrichment',
      description: 'Update contact with company information',
      config: {
        accessToken: '${INTERCOM_ACCESS_TOKEN}',
        operation: 'contact_update',
        contactIdValue: '{{contact.id}}',
        customAttributes: {
          company_size: '{{enrichment.companySize}}',
          industry: '{{enrichment.industry}}',
          annual_revenue: '{{enrichment.annualRevenue}}',
          lead_score: '{{calculate.leadScore(enrichment)}}'
        },
        companies: [
          {
            name: '{{enrichment.companyName}}',
            companyId: '{{enrichment.companyId}}'
          }
        ]
      }
    },
    {
      name: 'Track Feature Usage',
      description: 'Record user interaction with key features',
      config: {
        accessToken: '${INTERCOM_ACCESS_TOKEN}',
        operation: 'event_track',
        eventName: 'feature_used',
        userId: '{{user.id}}',
        metadata: {
          feature_name: '{{event.featureName}}',
          duration_seconds: '{{event.duration}}',
          success: '{{event.success}}',
          error_message: '{{event.error || null}}'
        },
        createdAt: Math.floor(Date.now() / 1000)
      }
    },
    {
      name: 'Escalation Flow',
      description: 'Escalate high-priority unresolved conversations',
      config: {
        accessToken: '${INTERCOM_ACCESS_TOKEN}',
        operation: 'conversation_list',
        stateFilter: 'open',
        unassigned: false,
        order: 'asc',
        perPage: 50
      }
    },
    {
      name: 'Customer Health Check',
      description: 'Schedule proactive outreach based on activity',
      config: {
        accessToken: '${INTERCOM_ACCESS_TOKEN}',
        operation: 'message_send_email',
        emailSubject: 'How are things going with {{product.name}}?',
        body: 'Hi {{contact.name}}, We noticed you haven\'t used {{feature.name}} in a while. Would you like a quick refresher on how to get the most out of it?',
        to: {
          type: 'contact',
          id: '{{contact.id}}'
        },
        from: {
          type: 'admin',
          id: '{{admin.customerSuccess}}'
        }
      }
    }
  ]
};