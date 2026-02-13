import { NodeConfigDefinition } from '../../../types/nodeConfig';

export const calendlyConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'Authentication',
      field: 'auth',
      type: 'credentials',
      required: true,
      credentialTypes: ['calendly-oauth2'],
      placeholder: 'Select Calendly OAuth2 credentials',
      tooltip: 'Calendly OAuth 2.0 authentication credentials'
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      options: [
        // User Operations
        { value: 'user_get', label: 'Get Current User' },
        { value: 'user_get_by_uuid', label: 'Get User by UUID' },
        
        // Event Type Operations
        { value: 'event_type_list', label: 'List Event Types' },
        { value: 'event_type_get', label: 'Get Event Type' },
        { value: 'event_type_create', label: 'Create Event Type' },
        { value: 'event_type_update', label: 'Update Event Type' },
        { value: 'event_type_delete', label: 'Delete Event Type' },
        { value: 'event_type_availability', label: 'Get Event Type Availability' },
        
        // Scheduled Event Operations
        { value: 'event_list', label: 'List Scheduled Events' },
        { value: 'event_get', label: 'Get Scheduled Event' },
        { value: 'event_cancel', label: 'Cancel Scheduled Event' },
        { value: 'event_reschedule', label: 'Reschedule Event' },
        { value: 'event_invitees', label: 'List Event Invitees' },
        
        // Invitee Operations
        { value: 'invitee_get', label: 'Get Invitee' },
        { value: 'invitee_no_show', label: 'Mark Invitee as No-Show' },
        
        // Availability Operations
        { value: 'availability_schedule_list', label: 'List Availability Schedules' },
        { value: 'availability_schedule_get', label: 'Get Availability Schedule' },
        { value: 'availability_schedule_create', label: 'Create Availability Schedule' },
        { value: 'availability_schedule_update', label: 'Update Availability Schedule' },
        { value: 'availability_schedule_delete', label: 'Delete Availability Schedule' },
        { value: 'availability_busy_times', label: 'Get Busy Times' },
        
        // Routing Form Operations
        { value: 'routing_form_list', label: 'List Routing Forms' },
        { value: 'routing_form_get', label: 'Get Routing Form' },
        { value: 'routing_form_submissions', label: 'List Form Submissions' },
        { value: 'routing_form_submission_get', label: 'Get Form Submission' },
        
        // Webhook Operations
        { value: 'webhook_list', label: 'List Webhooks' },
        { value: 'webhook_create', label: 'Create Webhook' },
        { value: 'webhook_get', label: 'Get Webhook' },
        { value: 'webhook_update', label: 'Update Webhook' },
        { value: 'webhook_delete', label: 'Delete Webhook' },
        
        // Organization Operations
        { value: 'org_invitations_list', label: 'List Organization Invitations' },
        { value: 'org_invitations_create', label: 'Create Organization Invitation' },
        { value: 'org_invitations_revoke', label: 'Revoke Organization Invitation' },
        { value: 'org_memberships_list', label: 'List Organization Memberships' },
        { value: 'org_memberships_remove', label: 'Remove Organization Member' }
      ],
      defaultValue: 'event_list',
      tooltip: 'The operation to perform in Calendly'
    },
    {
      label: 'Event Type UUID',
      field: 'eventTypeUuid',
      type: 'text',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      required: function() {
        const eventTypeOps = [
          'event_type_get', 'event_type_update', 'event_type_delete',
          'event_type_availability'
        ];
        return eventTypeOps.includes(this.operation);
      },
      tooltip: 'UUID of the event type'
    },
    {
      label: 'Event UUID',
      field: 'eventUuid',
      type: 'text',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      required: function() {
        const eventOps = [
          'event_get', 'event_cancel', 'event_reschedule', 'event_invitees'
        ];
        return eventOps.includes(this.operation);
      },
      tooltip: 'UUID of the scheduled event'
    },
    {
      label: 'User UUID',
      field: 'userUuid',
      type: 'text',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      required: function() {
        return this.operation === 'user_get_by_uuid';
      },
      tooltip: 'UUID of the user'
    },
    {
      label: 'Invitee UUID',
      field: 'inviteeUuid',
      type: 'text',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      required: function() {
        return ['invitee_get', 'invitee_no_show'].includes(this.operation);
      },
      tooltip: 'UUID of the invitee'
    },
    {
      label: 'Event Type Name',
      field: 'name',
      type: 'text',
      placeholder: '30-Minute Meeting',
      required: function() {
        return this.operation === 'event_type_create';
      },
      tooltip: 'Name of the event type'
    },
    {
      label: 'Duration (minutes)',
      field: 'duration',
      type: 'number',
      placeholder: '30',
      min: 15,
      max: 480,
      required: function() {
        return this.operation === 'event_type_create';
      },
      tooltip: 'Duration of the event in minutes'
    },
    {
      label: 'Event Type Color',
      field: 'color',
      type: 'select',
      options: [
        { value: '#0088cc', label: 'Blue' },
        { value: '#00a86b', label: 'Green' },
        { value: '#ff6900', label: 'Orange' },
        { value: '#e55100', label: 'Red' },
        { value: '#7b68ee', label: 'Purple' },
        { value: '#20b2aa', label: 'Teal' },
        { value: '#ff1493', label: 'Pink' }
      ],
      defaultValue: '#0088cc',
      visible: function() {
        return ['event_type_create', 'event_type_update'].includes(this.operation);
      }
    },
    {
      label: 'Event Type Description',
      field: 'description',
      type: 'textarea',
      placeholder: 'A brief meeting to discuss...',
      required: false,
      visible: function() {
        return ['event_type_create', 'event_type_update'].includes(this.operation);
      }
    },
    {
      label: 'Location Type',
      field: 'locationType',
      type: 'select',
      options: [
        { value: 'zoom', label: 'Zoom' },
        { value: 'google_meet', label: 'Google Meet' },
        { value: 'teams', label: 'Microsoft Teams' },
        { value: 'gotomeeting', label: 'GoToMeeting' },
        { value: 'webex', label: 'Webex' },
        { value: 'phone_call', label: 'Phone Call' },
        { value: 'in_person', label: 'In-Person Meeting' },
        { value: 'custom', label: 'Custom Location' },
        { value: 'ask_invitee', label: 'Ask Invitee' }
      ],
      defaultValue: 'zoom',
      visible: function() {
        return ['event_type_create', 'event_type_update'].includes(this.operation);
      }
    },
    {
      label: 'Custom Location',
      field: 'customLocation',
      type: 'text',
      placeholder: 'Conference Room A',
      required: function() {
        return this.locationType === 'custom' && ['event_type_create', 'event_type_update'].includes(this.operation);
      },
      visible: function() {
        return this.locationType === 'custom' && ['event_type_create', 'event_type_update'].includes(this.operation);
      }
    },
    {
      label: 'Start Date',
      field: 'startTime',
      type: 'datetime',
      required: false,
      visible: function() {
        const dateOps = [
          'event_list', 'availability_busy_times'
        ];
        return dateOps.includes(this.operation);
      },
      tooltip: 'Filter events starting from this date'
    },
    {
      label: 'End Date',
      field: 'endTime',
      type: 'datetime',
      required: false,
      visible: function() {
        const dateOps = [
          'event_list', 'availability_busy_times'
        ];
        return dateOps.includes(this.operation);
      },
      tooltip: 'Filter events ending before this date'
    },
    {
      label: 'Event Status',
      field: 'status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'canceled', label: 'Canceled' }
      ],
      defaultValue: 'active',
      visible: function() {
        return this.operation === 'event_list';
      }
    },
    {
      label: 'Sort Order',
      field: 'sort',
      type: 'select',
      options: [
        { value: 'start_time:asc', label: 'Start Time (Ascending)' },
        { value: 'start_time:desc', label: 'Start Time (Descending)' },
        { value: 'created_at:asc', label: 'Created Date (Ascending)' },
        { value: 'created_at:desc', label: 'Created Date (Descending)' }
      ],
      defaultValue: 'start_time:asc',
      visible: function() {
        const sortOps = [
          'event_list', 'event_type_list', 'routing_form_list',
          'webhook_list', 'org_invitations_list'
        ];
        return sortOps.includes(this.operation);
      }
    },
    {
      label: 'Cancellation Reason',
      field: 'cancelReason',
      type: 'textarea',
      placeholder: 'Meeting rescheduled to next week',
      required: false,
      visible: function() {
        return this.operation === 'event_cancel';
      }
    },
    {
      label: 'Reschedule Reason',
      field: 'rescheduleReason',
      type: 'textarea',
      placeholder: 'Conflict with another meeting',
      required: false,
      visible: function() {
        return this.operation === 'event_reschedule';
      }
    },
    {
      label: 'New Start Time',
      field: 'newStartTime',
      type: 'datetime',
      required: function() {
        return this.operation === 'event_reschedule';
      },
      visible: function() {
        return this.operation === 'event_reschedule';
      },
      tooltip: 'New start time for the rescheduled event'
    },
    {
      label: 'Schedule Name',
      field: 'scheduleName',
      type: 'text',
      placeholder: 'Working Hours',
      required: function() {
        return this.operation === 'availability_schedule_create';
      },
      visible: function() {
        const scheduleOps = [
          'availability_schedule_create', 'availability_schedule_update'
        ];
        return scheduleOps.includes(this.operation);
      }
    },
    {
      label: 'Schedule UUID',
      field: 'scheduleUuid',
      type: 'text',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      required: function() {
        const scheduleOps = [
          'availability_schedule_get', 'availability_schedule_update',
          'availability_schedule_delete'
        ];
        return scheduleOps.includes(this.operation);
      }
    },
    {
      label: 'Timezone',
      field: 'timezone',
      type: 'text',
      placeholder: 'America/New_York',
      defaultValue: 'America/New_York',
      required: false,
      visible: function() {
        const tzOps = [
          'availability_schedule_create', 'availability_schedule_update',
          'event_type_create', 'event_type_update'
        ];
        return tzOps.includes(this.operation);
      }
    },
    {
      label: 'Webhook URL',
      field: 'url',
      type: 'url',
      placeholder: 'https://your-app.com/webhooks/calendly',
      required: function() {
        return this.operation === 'webhook_create';
      },
      visible: function() {
        return ['webhook_create', 'webhook_update'].includes(this.operation);
      }
    },
    {
      label: 'Webhook Events',
      field: 'events',
      type: 'multiselect',
      options: [
        { value: 'invitee.created', label: 'Invitee Created' },
        { value: 'invitee.canceled', label: 'Invitee Canceled' },
        { value: 'routing_form_submission.created', label: 'Form Submission Created' }
      ],
      defaultValue: ['invitee.created'],
      required: function() {
        return this.operation === 'webhook_create';
      },
      visible: function() {
        return ['webhook_create', 'webhook_update'].includes(this.operation);
      }
    },
    {
      label: 'Webhook UUID',
      field: 'webhookUuid',
      type: 'text',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      required: function() {
        const webhookOps = [
          'webhook_get', 'webhook_update', 'webhook_delete'
        ];
        return webhookOps.includes(this.operation);
      }
    },
    {
      label: 'Webhook Scope',
      field: 'scope',
      type: 'select',
      options: [
        { value: 'user', label: 'User' },
        { value: 'organization', label: 'Organization' }
      ],
      defaultValue: 'user',
      visible: function() {
        return this.operation === 'webhook_create';
      }
    },
    {
      label: 'Invitation Email',
      field: 'email',
      type: 'email',
      placeholder: 'user@example.com',
      required: function() {
        return this.operation === 'org_invitations_create';
      }
    },
    {
      label: 'Invitation UUID',
      field: 'invitationUuid',
      type: 'text',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      required: function() {
        return this.operation === 'org_invitations_revoke';
      }
    },
    {
      label: 'Membership UUID',
      field: 'membershipUuid',
      type: 'text',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      required: function() {
        return this.operation === 'org_memberships_remove';
      }
    },
    {
      label: 'Routing Form UUID',
      field: 'formUuid',
      type: 'text',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      required: function() {
        const formOps = [
          'routing_form_get', 'routing_form_submissions'
        ];
        return formOps.includes(this.operation);
      }
    },
    {
      label: 'Submission UUID',
      field: 'submissionUuid',
      type: 'text',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      required: function() {
        return this.operation === 'routing_form_submission_get';
      }
    },
    {
      label: 'Page Size',
      field: 'count',
      type: 'number',
      placeholder: '20',
      defaultValue: 20,
      min: 1,
      max: 100,
      visible: function() {
        const pageOps = [
          'event_list', 'event_type_list', 'routing_form_list',
          'webhook_list', 'org_invitations_list', 'org_memberships_list',
          'availability_schedule_list', 'routing_form_submissions'
        ];
        return pageOps.includes(this.operation);
      }
    },
    {
      label: 'Page Token',
      field: 'pageToken',
      type: 'text',
      placeholder: 'Next page token',
      required: false,
      visible: function() {
        const pageOps = [
          'event_list', 'event_type_list', 'routing_form_list',
          'webhook_list', 'org_invitations_list', 'org_memberships_list',
          'availability_schedule_list', 'routing_form_submissions'
        ];
        return pageOps.includes(this.operation);
      },
      tooltip: 'Token for pagination'
    }
  ],

  validation: {
    eventTypeUuid: (value) => {
      if (value && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value as string)) {
        return 'Invalid UUID format';
      }
      return null;
    },
    duration: (value) => {
      const numValue = value as number;
      if (numValue && (numValue < 15 || numValue > 480)) {
        return 'Duration must be between 15 and 480 minutes';
      }
      return null;
    },
    timezone: (value) => {
      if (value && !/^[A-Za-z_]+\/[A-Za-z_]+$/.test(value as string)) {
        return 'Invalid timezone format (e.g., America/New_York)';
      }
      return null;
    },
    email: (value) => {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string)) {
        return 'Invalid email format';
      }
      return null;
    }
  },

  examples: [
    {
      name: 'List Upcoming Events',
      description: 'Get all scheduled events for the next 7 days',
      config: {
        operation: 'event_list',
        status: 'active',
        sort: 'start_time:asc',
        count: 50
      }
    },
    {
      name: 'Create 30-Min Meeting Type',
      description: 'Create a new 30-minute meeting event type',
      config: {
        operation: 'event_type_create',
        name: '30-Minute Strategy Call',
        duration: 30,
        color: '#0088cc',
        description: 'Quick strategy discussion call',
        locationType: 'zoom',
        timezone: 'America/New_York'
      }
    },
    {
      name: 'Setup Event Webhook',
      description: 'Create webhook for new event notifications',
      config: {
        operation: 'webhook_create',
        url: 'https://api.myapp.com/webhooks/calendly',
        events: ['invitee.created', 'invitee.canceled'],
        scope: 'user'
      }
    },
    {
      name: 'Cancel Event with Reason',
      description: 'Cancel a scheduled event and notify invitee',
      config: {
        operation: 'event_cancel',
        eventUuid: '12345678-1234-1234-1234-123456789012',
        cancelReason: 'Due to an urgent conflict, we need to reschedule this meeting.'
      }
    }
  ]
};