import { NodeConfigDefinition } from '../types';

export const outlookConfig: NodeConfigDefinition = {
  fields: [
    // Authentication Configuration
    {
      label: 'Authentication Method',
      field: 'authMethod',
      type: 'select',
      options: [
        { value: 'oauth', label: 'OAuth 2.0 (Microsoft Graph)' },
        { value: 'client_credentials', label: 'Client Credentials (App-only)' },
        { value: 'delegated', label: 'Delegated Permissions' }
      ],
      required: true,
      defaultValue: 'oauth'
    },
    {
      label: 'Tenant ID',
      field: 'tenantId',
      type: 'text',
      placeholder: 'your-tenant-id',
      required: true,
      validation: (value) => {
        if (!value) return 'Tenant ID is required';
        if (typeof value === 'string' && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)) {
          return 'Invalid tenant ID format (must be a valid GUID)';
        }
        return null;
      }
    },
    {
      label: 'Client ID',
      field: 'clientId',
      type: 'text',
      placeholder: 'your-client-id',
      required: true,
      validation: (value) => {
        if (!value) return 'Client ID is required';
        if (typeof value === 'string' && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)) {
          return 'Invalid client ID format (must be a valid GUID)';
        }
        return null;
      }
    },
    {
      label: 'Client Secret',
      field: 'clientSecret',
      type: 'password',
      placeholder: 'your-client-secret',
      required: function(config) { return config?.authMethod === 'client_credentials'; },
      validation: (value, config) => {
        if (config?.authMethod === 'client_credentials' && !value) {
          return 'Client secret is required for app-only authentication';
        }
        return null;
      }
    },
    {
      label: 'Access Token',
      field: 'accessToken',
      type: 'password',
      placeholder: 'your-access-token',
      required: function(config) { return config?.authMethod === 'oauth' || config?.authMethod === 'delegated'; },
      validation: (value, config) => {
        if ((config?.authMethod === 'oauth' || config?.authMethod === 'delegated') && !value) {
          return 'Access token is required';
        }
        return null;
      }
    },
    {
      label: 'API Version',
      field: 'apiVersion',
      type: 'select',
      options: [
        { value: 'v1.0', label: 'v1.0 (Stable)' },
        { value: 'beta', label: 'Beta (Preview features)' }
      ],
      defaultValue: 'v1.0',
      required: false
    },

    // Operation Configuration
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      options: [
        // Email Operations
        { value: 'send_email', label: 'Send Email' },
        { value: 'send_email_with_attachments', label: 'Send Email with Attachments' },
        { value: 'reply_to_email', label: 'Reply to Email' },
        { value: 'forward_email', label: 'Forward Email' },
        { value: 'get_emails', label: 'Get Emails' },
        { value: 'get_email', label: 'Get Single Email' },
        { value: 'search_emails', label: 'Search Emails' },
        { value: 'move_email', label: 'Move Email to Folder' },
        { value: 'delete_email', label: 'Delete Email' },
        { value: 'mark_as_read', label: 'Mark Email as Read/Unread' },
        { value: 'flag_email', label: 'Flag/Unflag Email' },
        { value: 'create_draft', label: 'Create Draft' },
        { value: 'update_draft', label: 'Update Draft' },
        { value: 'send_draft', label: 'Send Draft' },
        
        // Folder Operations
        { value: 'list_folders', label: 'List Mail Folders' },
        { value: 'create_folder', label: 'Create Mail Folder' },
        { value: 'rename_folder', label: 'Rename Mail Folder' },
        { value: 'delete_folder', label: 'Delete Mail Folder' },
        { value: 'get_folder_info', label: 'Get Folder Info' },
        
        // Calendar Operations
        { value: 'create_event', label: 'Create Calendar Event' },
        { value: 'update_event', label: 'Update Calendar Event' },
        { value: 'delete_event', label: 'Delete Calendar Event' },
        { value: 'get_events', label: 'Get Calendar Events' },
        { value: 'search_events', label: 'Search Calendar Events' },
        { value: 'accept_event', label: 'Accept Event Invitation' },
        { value: 'decline_event', label: 'Decline Event Invitation' },
        { value: 'tentative_event', label: 'Tentatively Accept Event' },
        { value: 'get_calendars', label: 'List Calendars' },
        { value: 'create_calendar', label: 'Create Calendar' },
        { value: 'get_free_busy', label: 'Get Free/Busy Schedule' },
        
        // Contact Operations
        { value: 'get_contacts', label: 'Get Contacts' },
        { value: 'create_contact', label: 'Create Contact' },
        { value: 'update_contact', label: 'Update Contact' },
        { value: 'delete_contact', label: 'Delete Contact' },
        { value: 'search_contacts', label: 'Search Contacts' },
        { value: 'get_contact_folders', label: 'Get Contact Folders' },
        
        // Task Operations
        { value: 'get_tasks', label: 'Get Tasks' },
        { value: 'create_task', label: 'Create Task' },
        { value: 'update_task', label: 'Update Task' },
        { value: 'complete_task', label: 'Complete Task' },
        { value: 'delete_task', label: 'Delete Task' },
        
        // User Operations
        { value: 'get_user_profile', label: 'Get User Profile' },
        { value: 'get_user_photo', label: 'Get User Photo' },
        { value: 'update_user_photo', label: 'Update User Photo' },
        { value: 'get_mailbox_settings', label: 'Get Mailbox Settings' },
        { value: 'update_mailbox_settings', label: 'Update Mailbox Settings' },
        { value: 'get_out_of_office', label: 'Get Out of Office Settings' },
        { value: 'set_out_of_office', label: 'Set Out of Office' }
      ],
      required: true
    },

    // Email Configuration
    {
      label: 'To Recipients',
      field: 'to',
      type: 'text',
      placeholder: 'email@example.com, another@example.com',
      required: function(config) {
        return ['send_email', 'send_email_with_attachments', 'create_draft'].includes(config?.operation as string);
      },
      validation: (value, config) => {
        if (['send_email', 'send_email_with_attachments', 'create_draft'].includes(config?.operation as string) && value && typeof value === 'string') {
          const emails = value.split(',').map((e: string) => e.trim());
          for (const email of emails) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              return `Invalid email format: ${email}`;
            }
          }
        }
        return null;
      }
    },
    {
      label: 'CC Recipients',
      field: 'cc',
      type: 'text',
      placeholder: 'cc@example.com',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string') {
          const emails = value.split(',').map((e: string) => e.trim());
          for (const email of emails) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              return `Invalid email format: ${email}`;
            }
          }
        }
        return null;
      }
    },
    {
      label: 'BCC Recipients',
      field: 'bcc',
      type: 'text',
      placeholder: 'bcc@example.com',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string') {
          const emails = value.split(',').map((e: string) => e.trim());
          for (const email of emails) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              return `Invalid email format: ${email}`;
            }
          }
        }
        return null;
      }
    },
    {
      label: 'Subject',
      field: 'subject',
      type: 'text',
      placeholder: 'Email subject',
      required: function(config) {
        return ['send_email', 'send_email_with_attachments', 'create_draft', 'update_draft'].includes(config?.operation as string);
      }
    },
    {
      label: 'Email Body',
      field: 'body',
      type: 'textarea',
      placeholder: 'Email content...',
      required: function(config) {
        return ['send_email', 'send_email_with_attachments', 'create_draft', 'update_draft'].includes(config?.operation as string);
      }
    },
    {
      label: 'Body Type',
      field: 'bodyType',
      type: 'select',
      options: [
        { value: 'text', label: 'Plain Text' },
        { value: 'html', label: 'HTML' }
      ],
      defaultValue: 'html',
      required: false
    },
    {
      label: 'Importance',
      field: 'importance',
      type: 'select',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'normal', label: 'Normal' },
        { value: 'high', label: 'High' }
      ],
      defaultValue: 'normal',
      required: false
    },
    {
      label: 'Request Read Receipt',
      field: 'requestReadReceipt',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Request Delivery Receipt',
      field: 'requestDeliveryReceipt',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },

    // Email Search/Filter Configuration
    {
      label: 'Search Query',
      field: 'searchQuery',
      type: 'text',
      placeholder: 'subject:invoice AND from:accounting',
      required: function(config) {
        return config?.operation === 'search_emails';
      }
    },
    {
      label: 'Filter',
      field: 'filter',
      type: 'text',
      placeholder: "receivedDateTime ge 2023-01-01",
      required: false
    },
    {
      label: 'Order By',
      field: 'orderBy',
      type: 'select',
      options: [
        { value: 'receivedDateTime desc', label: 'Newest First' },
        { value: 'receivedDateTime asc', label: 'Oldest First' },
        { value: 'subject asc', label: 'Subject A-Z' },
        { value: 'subject desc', label: 'Subject Z-A' },
        { value: 'from/emailAddress/address asc', label: 'Sender A-Z' }
      ],
      defaultValue: 'receivedDateTime desc',
      required: false
    },
    {
      label: 'Folder Name/ID',
      field: 'folderId',
      type: 'text',
      placeholder: 'Inbox, Sent Items, or folder ID',
      defaultValue: 'Inbox',
      required: function(config) {
        return ['get_emails', 'move_email'].includes(config?.operation as string);
      }
    },
    {
      label: 'Include Attachments',
      field: 'includeAttachments',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },

    // Calendar Event Configuration
    {
      label: 'Event Subject',
      field: 'eventSubject',
      type: 'text',
      placeholder: 'Meeting subject',
      required: function(config) {
        return ['create_event', 'update_event'].includes(config?.operation as string);
      }
    },
    {
      label: 'Event Body',
      field: 'eventBody',
      type: 'textarea',
      placeholder: 'Meeting description...',
      required: false
    },
    {
      label: 'Start Date/Time',
      field: 'startDateTime',
      type: 'datetime-local',
      required: function(config) {
        return ['create_event', 'update_event', 'get_events', 'search_events'].includes(config?.operation as string);
      }
    },
    {
      label: 'End Date/Time',
      field: 'endDateTime',
      type: 'datetime-local',
      required: function(config) {
        return ['create_event', 'update_event', 'get_events', 'search_events'].includes(config?.operation as string);
      }
    },
    {
      label: 'Time Zone',
      field: 'timeZone',
      type: 'select',
      options: [
        { value: 'UTC', label: 'UTC' },
        { value: 'Eastern Standard Time', label: 'Eastern Time (US & Canada)' },
        { value: 'Central Standard Time', label: 'Central Time (US & Canada)' },
        { value: 'Mountain Standard Time', label: 'Mountain Time (US & Canada)' },
        { value: 'Pacific Standard Time', label: 'Pacific Time (US & Canada)' },
        { value: 'GMT Standard Time', label: 'London' },
        { value: 'W. Europe Standard Time', label: 'Amsterdam, Berlin, Rome' },
        { value: 'E. Europe Standard Time', label: 'Bucharest' },
        { value: 'FLE Standard Time', label: 'Helsinki, Kyiv, Sofia' },
        { value: 'Tokyo Standard Time', label: 'Tokyo' },
        { value: 'China Standard Time', label: 'Beijing' },
        { value: 'India Standard Time', label: 'Mumbai, Kolkata' },
        { value: 'AUS Eastern Standard Time', label: 'Sydney' }
      ],
      defaultValue: 'UTC',
      required: false
    },
    {
      label: 'Location',
      field: 'location',
      type: 'text',
      placeholder: 'Conference Room A',
      required: false
    },
    {
      label: 'Attendees',
      field: 'attendees',
      type: 'text',
      placeholder: 'attendee1@example.com, attendee2@example.com',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string') {
          const emails = value.split(',').map((e: string) => e.trim());
          for (const email of emails) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              return `Invalid email format: ${email}`;
            }
          }
        }
        return null;
      }
    },
    {
      label: 'Is All Day Event',
      field: 'isAllDay',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Reminder Minutes Before',
      field: 'reminderMinutes',
      type: 'number',
      placeholder: '15',
      defaultValue: 15,
      required: false,
      validation: (value) => {
        if (value && typeof value === 'number' && value < 0) {
          return 'Reminder minutes must be positive';
        }
        return null;
      }
    },
    {
      label: 'Recurrence Pattern',
      field: 'recurrencePattern',
      type: 'select',
      options: [
        { value: '', label: 'No Recurrence' },
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'absoluteMonthly', label: 'Monthly (same date)' },
        { value: 'relativeMonthly', label: 'Monthly (same weekday)' },
        { value: 'absoluteYearly', label: 'Yearly' }
      ],
      required: false
    },
    {
      label: 'Show As',
      field: 'showAs',
      type: 'select',
      options: [
        { value: 'free', label: 'Free' },
        { value: 'tentative', label: 'Tentative' },
        { value: 'busy', label: 'Busy' },
        { value: 'oof', label: 'Out of Office' },
        { value: 'workingElsewhere', label: 'Working Elsewhere' }
      ],
      defaultValue: 'busy',
      required: false
    },
    {
      label: 'Is Online Meeting',
      field: 'isOnlineMeeting',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },

    // Contact Configuration
    {
      label: 'First Name',
      field: 'firstName',
      type: 'text',
      placeholder: 'John',
      required: function(config) {
        return ['create_contact', 'update_contact'].includes(config?.operation as string);
      }
    },
    {
      label: 'Last Name',
      field: 'lastName',
      type: 'text',
      placeholder: 'Doe',
      required: function(config) {
        return ['create_contact', 'update_contact'].includes(config?.operation as string);
      }
    },
    {
      label: 'Email Address',
      field: 'emailAddress',
      type: 'email',
      placeholder: 'john.doe@example.com',
      required: function(config) {
        return ['create_contact', 'update_contact'].includes(config?.operation as string);
      },
      validation: (value, config) => {
        if (['create_contact', 'update_contact'].includes(config?.operation as string) && value && typeof value === 'string') {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return 'Invalid email format';
          }
        }
        return null;
      }
    },
    {
      label: 'Business Phone',
      field: 'businessPhone',
      type: 'text',
      placeholder: '+1 (555) 123-4567',
      required: false
    },
    {
      label: 'Mobile Phone',
      field: 'mobilePhone',
      type: 'text',
      placeholder: '+1 (555) 987-6543',
      required: false
    },
    {
      label: 'Company Name',
      field: 'companyName',
      type: 'text',
      placeholder: 'Acme Corporation',
      required: false
    },
    {
      label: 'Job Title',
      field: 'jobTitle',
      type: 'text',
      placeholder: 'Software Engineer',
      required: false
    },

    // Task Configuration
    {
      label: 'Task Subject',
      field: 'taskSubject',
      type: 'text',
      placeholder: 'Task subject',
      required: function(config) {
        return ['create_task', 'update_task'].includes(config?.operation as string);
      }
    },
    {
      label: 'Task Body',
      field: 'taskBody',
      type: 'textarea',
      placeholder: 'Task description...',
      required: false
    },
    {
      label: 'Due Date',
      field: 'dueDate',
      type: 'datetime-local',
      required: false
    },
    {
      label: 'Task Status',
      field: 'taskStatus',
      type: 'select',
      options: [
        { value: 'notStarted', label: 'Not Started' },
        { value: 'inProgress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'waitingOnOthers', label: 'Waiting on Others' },
        { value: 'deferred', label: 'Deferred' }
      ],
      defaultValue: 'notStarted',
      required: false
    },
    {
      label: 'Task Priority',
      field: 'taskPriority',
      type: 'select',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'normal', label: 'Normal' },
        { value: 'high', label: 'High' }
      ],
      defaultValue: 'normal',
      required: false
    },

    // ID Fields
    {
      label: 'Message ID',
      field: 'messageId',
      type: 'text',
      placeholder: 'AAMkAGI2...',
      required: function(config) {
        return ['get_email', 'reply_to_email', 'forward_email', 'move_email',
                'delete_email', 'mark_as_read', 'flag_email'].includes(config?.operation as string);
      }
    },
    {
      label: 'Event ID',
      field: 'eventId',
      type: 'text',
      placeholder: 'AAMkAGI2...',
      required: function(config) {
        return ['update_event', 'delete_event', 'accept_event', 'decline_event', 'tentative_event'].includes(config?.operation as string);
      }
    },
    {
      label: 'Contact ID',
      field: 'contactId',
      type: 'text',
      placeholder: 'AAMkAGI2...',
      required: function(config) {
        return ['update_contact', 'delete_contact'].includes(config?.operation as string);
      }
    },
    {
      label: 'Task ID',
      field: 'taskId',
      type: 'text',
      placeholder: 'AAMkAGI2...',
      required: function(config) {
        return ['update_task', 'complete_task', 'delete_task'].includes(config?.operation as string);
      }
    },
    {
      label: 'Draft ID',
      field: 'draftId',
      type: 'text',
      placeholder: 'AAMkAGI2...',
      required: function(config) {
        return ['update_draft', 'send_draft'].includes(config?.operation as string);
      }
    },

    // Attachment Configuration
    {
      label: 'Attachments (JSON)',
      field: 'attachments',
      type: 'textarea',
      placeholder: '[{"name": "document.pdf", "content": "base64_encoded_content", "type": "application/pdf"}]',
      required: function(config) {
        return config?.operation === 'send_email_with_attachments';
      },
      validation: (value, config) => {
        if (config?.operation === 'send_email_with_attachments' && value && typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) {
              return 'Attachments must be a JSON array';
            }
            for (const attachment of parsed) {
              if (!attachment.name || !attachment.content) {
                return 'Each attachment must have name and content properties';
              }
            }
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },

    // Advanced Options
    {
      label: 'Page Size',
      field: 'pageSize',
      type: 'number',
      placeholder: '10',
      defaultValue: 10,
      required: false,
      validation: (value) => {
        if (value && typeof value === 'number' && (value < 1 || value > 999)) {
          return 'Page size must be between 1 and 999';
        }
        return null;
      }
    },
    {
      label: 'Skip Token',
      field: 'skipToken',
      type: 'text',
      placeholder: 'Pagination token',
      required: false
    },
    {
      label: 'Select Fields',
      field: 'selectFields',
      type: 'text',
      placeholder: 'subject,from,receivedDateTime',
      required: false
    },
    {
      label: 'Expand Properties',
      field: 'expandProperties',
      type: 'text',
      placeholder: 'attachments',
      required: false
    },
    {
      label: 'Save to Sent Items',
      field: 'saveToSentItems',
      type: 'checkbox',
      defaultValue: true,
      required: false
    },
    {
      label: 'Is Read',
      field: 'isRead',
      type: 'checkbox',
      required: function(config) {
        return config?.operation === 'mark_as_read';
      }
    },
    {
      label: 'Flag Status',
      field: 'flagStatus',
      type: 'select',
      options: [
        { value: 'notFlagged', label: 'Not Flagged' },
        { value: 'complete', label: 'Complete' },
        { value: 'flagged', label: 'Flagged' }
      ],
      required: function(config) {
        return config?.operation === 'flag_email';
      }
    },
    {
      label: 'Categories',
      field: 'categories',
      type: 'text',
      placeholder: 'Red category, Important',
      required: false
    }
  ],
  examples: [
    {
      name: 'Send Email',
      description: 'Send a simple email',
      config: {
        authMethod: 'oauth',
        tenantId: 'your-tenant-id',
        clientId: 'your-client-id',
        accessToken: 'your-access-token',
        operation: 'send_email',
        to: 'recipient@example.com',
        subject: 'Important Update',
        body: '<h1>Hello</h1><p>This is an important update.</p>',
        bodyType: 'html',
        importance: 'high',
        saveToSentItems: true
      }
    },
    {
      name: 'Search Emails',
      description: 'Search for specific emails',
      config: {
        authMethod: 'oauth',
        tenantId: 'your-tenant-id',
        clientId: 'your-client-id',
        accessToken: 'your-access-token',
        operation: 'search_emails',
        searchQuery: 'subject:invoice AND from:accounting',
        folderId: 'Inbox',
        orderBy: 'receivedDateTime desc',
        pageSize: 20,
        includeAttachments: true
      }
    },
    {
      name: 'Create Calendar Event',
      description: 'Schedule a meeting',
      config: {
        authMethod: 'oauth',
        tenantId: 'your-tenant-id',
        clientId: 'your-client-id',
        accessToken: 'your-access-token',
        operation: 'create_event',
        eventSubject: 'Weekly Team Meeting',
        eventBody: 'Discuss project updates and blockers',
        startDateTime: '2023-12-01T10:00:00',
        endDateTime: '2023-12-01T11:00:00',
        timeZone: 'Eastern Standard Time',
        location: 'Conference Room A',
        attendees: 'team@example.com',
        reminderMinutes: 15,
        isOnlineMeeting: true,
        showAs: 'busy'
      }
    },
    {
      name: 'Get Emails with Filter',
      description: 'Get recent unread emails',
      config: {
        authMethod: 'oauth',
        tenantId: 'your-tenant-id',
        clientId: 'your-client-id',
        accessToken: 'your-access-token',
        operation: 'get_emails',
        folderId: 'Inbox',
        filter: "isRead eq false and receivedDateTime ge 2023-11-01",
        orderBy: 'receivedDateTime desc',
        pageSize: 50,
        selectFields: 'subject,from,receivedDateTime,hasAttachments'
      }
    },
    {
      name: 'Create Contact',
      description: 'Add a new contact',
      config: {
        authMethod: 'oauth',
        tenantId: 'your-tenant-id',
        clientId: 'your-client-id',
        accessToken: 'your-access-token',
        operation: 'create_contact',
        firstName: 'John',
        lastName: 'Doe',
        emailAddress: 'john.doe@example.com',
        businessPhone: '+1 (555) 123-4567',
        mobilePhone: '+1 (555) 987-6543',
        companyName: 'Acme Corporation',
        jobTitle: 'Senior Developer'
      }
    },
    {
      name: 'Send Email with Attachments',
      description: 'Send email with PDF attachment',
      config: {
        authMethod: 'oauth',
        tenantId: 'your-tenant-id',
        clientId: 'your-client-id',
        accessToken: 'your-access-token',
        operation: 'send_email_with_attachments',
        to: 'client@example.com',
        cc: 'manager@example.com',
        subject: 'Monthly Report - November 2023',
        body: 'Please find attached the monthly report for November 2023.',
        bodyType: 'text',
        attachments: '[{"name": "november_report.pdf", "content": "base64_encoded_pdf_content", "type": "application/pdf"}]',
        importance: 'normal',
        requestReadReceipt: true
      }
    }
  ]
};