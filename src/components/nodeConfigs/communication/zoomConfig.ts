import { NodeConfigDefinition } from '../../../types/nodeConfig';

export const zoomConfig: NodeConfigDefinition = {
  fields: [
    // Authentication Configuration
    {
      label: 'Authentication Method',
      field: 'authMethod',
      type: 'select',
      options: [
        { value: 'jwt', label: 'JWT (Legacy)' },
        { value: 'oauth', label: 'OAuth 2.0 (Recommended)' },
        { value: 'server_to_server', label: 'Server-to-Server OAuth' }
      ],
      required: true,
      defaultValue: 'oauth'
    },
    {
      label: 'API Key',
      field: 'apiKey',
      type: 'text',
      placeholder: 'your-api-key',
      required: function() { return this.authMethod === 'jwt'; },
      validation: (value, config) => {
        const authMethod = config?.authMethod;
        if (authMethod === 'jwt' && !value) {
          return 'API Key is required for JWT authentication';
        }
        return null;
      }
    },
    {
      label: 'API Secret',
      field: 'apiSecret',
      type: 'password',
      placeholder: 'your-api-secret',
      required: function() { return this.authMethod === 'jwt'; },
      validation: (value, config) => {
        const authMethod = config?.authMethod;
        if (authMethod === 'jwt' && !value) {
          return 'API Secret is required for JWT authentication';
        }
        return null;
      }
    },
    {
      label: 'Client ID',
      field: 'clientId',
      type: 'text',
      placeholder: 'your-client-id',
      required: function() { return ['oauth', 'server_to_server'].includes(this.authMethod); },
      validation: (value, config) => {
        const authMethod = config?.authMethod;
        if (['oauth', 'server_to_server'].includes(authMethod as string) && !value) {
          return 'Client ID is required for OAuth authentication';
        }
        return null;
      }
    },
    {
      label: 'Client Secret',
      field: 'clientSecret',
      type: 'password',
      placeholder: 'your-client-secret',
      required: function() { return ['oauth', 'server_to_server'].includes(this.authMethod); },
      validation: (value, config) => {
        const authMethod = config?.authMethod;
        if (['oauth', 'server_to_server'].includes(authMethod as string) && !value) {
          return 'Client Secret is required for OAuth authentication';
        }
        return null;
      }
    },
    {
      label: 'Access Token',
      field: 'accessToken',
      type: 'password',
      placeholder: 'your-access-token',
      required: function() { return this.authMethod === 'oauth'; },
      validation: (value, config) => {
        const authMethod = config?.authMethod;
        if (authMethod === 'oauth' && !value) {
          return 'Access Token is required for OAuth authentication';
        }
        return null;
      }
    },
    {
      label: 'Account ID',
      field: 'accountId',
      type: 'text',
      placeholder: 'your-account-id',
      required: function() { return this.authMethod === 'server_to_server'; },
      validation: (value, config) => {
        const authMethod = config?.authMethod;
        if (authMethod === 'server_to_server' && !value) {
          return 'Account ID is required for Server-to-Server OAuth';
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
        // Meeting Operations
        { value: 'create_meeting', label: 'Create Meeting' },
        { value: 'get_meeting', label: 'Get Meeting Details' },
        { value: 'list_meetings', label: 'List Meetings' },
        { value: 'update_meeting', label: 'Update Meeting' },
        { value: 'delete_meeting', label: 'Delete Meeting' },
        { value: 'end_meeting', label: 'End Meeting' },
        
        // Meeting Participant Operations
        { value: 'list_meeting_participants', label: 'List Meeting Participants' },
        { value: 'add_meeting_registrant', label: 'Add Meeting Registrant' },
        { value: 'list_meeting_registrants', label: 'List Meeting Registrants' },
        { value: 'update_meeting_registrant', label: 'Update Meeting Registrant' },
        { value: 'delete_meeting_registrant', label: 'Delete Meeting Registrant' },
        
        // Webinar Operations
        { value: 'create_webinar', label: 'Create Webinar' },
        { value: 'get_webinar', label: 'Get Webinar Details' },
        { value: 'list_webinars', label: 'List Webinars' },
        { value: 'update_webinar', label: 'Update Webinar' },
        { value: 'delete_webinar', label: 'Delete Webinar' },
        { value: 'end_webinar', label: 'End Webinar' },
        
        // Webinar Participant Operations
        { value: 'add_webinar_registrant', label: 'Add Webinar Registrant' },
        { value: 'list_webinar_registrants', label: 'List Webinar Registrants' },
        { value: 'update_webinar_registrant', label: 'Update Webinar Registrant' },
        { value: 'delete_webinar_registrant', label: 'Delete Webinar Registrant' },
        { value: 'list_webinar_participants', label: 'List Webinar Participants' },
        
        // User Operations
        { value: 'create_user', label: 'Create User' },
        { value: 'get_user', label: 'Get User Details' },
        { value: 'list_users', label: 'List Users' },
        { value: 'update_user', label: 'Update User' },
        { value: 'delete_user', label: 'Delete User' },
        { value: 'check_user_email', label: 'Check User Email' },
        { value: 'check_user_zpak', label: 'Check User ZPak' },
        
        // Recording Operations
        { value: 'list_recordings', label: 'List Recordings' },
        { value: 'get_recording', label: 'Get Recording Details' },
        { value: 'delete_recording', label: 'Delete Recording' },
        { value: 'recover_recording', label: 'Recover Recording' },
        
        // Account Operations
        { value: 'get_account', label: 'Get Account Details' },
        { value: 'get_account_settings', label: 'Get Account Settings' },
        { value: 'update_account_settings', label: 'Update Account Settings' },
        
        // Report Operations
        { value: 'get_daily_usage_report', label: 'Get Daily Usage Report' },
        { value: 'get_meeting_participants_report', label: 'Get Meeting Participants Report' },
        { value: 'get_meeting_polls_report', label: 'Get Meeting Polls Report' },
        { value: 'get_webinar_participants_report', label: 'Get Webinar Participants Report' },
        
        // Room Operations
        { value: 'list_rooms', label: 'List Zoom Rooms' },
        { value: 'get_room', label: 'Get Zoom Room Details' },
        { value: 'add_room', label: 'Add Zoom Room' },
        { value: 'update_room', label: 'Update Zoom Room' },
        { value: 'delete_room', label: 'Delete Zoom Room' },
        
        // Phone Operations
        { value: 'list_phone_users', label: 'List Phone Users' },
        { value: 'get_phone_user', label: 'Get Phone User Details' },
        { value: 'make_phone_call', label: 'Make Phone Call' },
        { value: 'get_call_logs', label: 'Get Call Logs' }
      ],
      required: true
    },

    // Meeting Configuration
    {
      label: 'Meeting Topic',
      field: 'topic',
      type: 'text',
      placeholder: 'My Zoom Meeting',
      required: function() { 
        return ['create_meeting', 'update_meeting', 'create_webinar', 'update_webinar'].includes(this.operation);
      },
      validation: (value, config) => {
        const operation = config?.operation;
        if (['create_meeting', 'update_meeting', 'create_webinar', 'update_webinar'].includes(operation as string) && !value) {
          return 'Meeting topic is required';
        }
        return null;
      }
    },
    {
      label: 'Meeting Type',
      field: 'type',
      type: 'select',
      options: [
        { value: '1', label: 'Instant Meeting' },
        { value: '2', label: 'Scheduled Meeting' },
        { value: '3', label: 'Recurring Meeting (No Fixed Time)' },
        { value: '8', label: 'Recurring Meeting (Fixed Time)' }
      ],
      defaultValue: 2,
      required: function() { 
        return ['create_meeting', 'update_meeting'].includes(this.operation);
      }
    },
    {
      label: 'Start Time',
      field: 'startTime',
      type: 'datetime',
      required: function() { 
        return ['create_meeting', 'update_meeting', 'create_webinar', 'update_webinar'].includes(this.operation) && 
               [2, 8].includes(this.type);
      },
      validation: (value, config) => {
        const operation = config?.operation;
        const type = config?.type;
        if (['create_meeting', 'update_meeting', 'create_webinar', 'update_webinar'].includes(operation as string) &&
            [2, 8].includes(type as number) && !value) {
          return 'Start time is required for scheduled meetings';
        }
        return null;
      }
    },
    {
      label: 'Duration (minutes)',
      field: 'duration',
      type: 'number',
      placeholder: '60',
      required: function() { 
        return ['create_meeting', 'update_meeting', 'create_webinar', 'update_webinar'].includes(this.operation);
      },
      validation: (value, config) => {
        const operation = config?.operation;
        if (['create_meeting', 'update_meeting', 'create_webinar', 'update_webinar'].includes(operation as string)) {
          if (!value) return 'Duration is required';
          const numValue = typeof value === 'number' ? value : Number(value);
          if (numValue < 1 || numValue > 1440) {
            return 'Duration must be between 1 and 1440 minutes';
          }
        }
        return null;
      }
    },
    {
      label: 'Timezone',
      field: 'timezone',
      type: 'select',
      options: [
        { value: 'UTC', label: 'UTC' },
        { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
        { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
        { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
        { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
        { value: 'Europe/London', label: 'London' },
        { value: 'Europe/Paris', label: 'Paris' },
        { value: 'Europe/Berlin', label: 'Berlin' },
        { value: 'Asia/Tokyo', label: 'Tokyo' },
        { value: 'Asia/Shanghai', label: 'Shanghai' },
        { value: 'Asia/Kolkata', label: 'Mumbai' },
        { value: 'Australia/Sydney', label: 'Sydney' }
      ],
      defaultValue: 'UTC',
      required: false
    },
    {
      label: 'Password',
      field: 'password',
      type: 'password',
      placeholder: 'meeting-password',
      required: false,
      validation: (value, config) => {
        if (value) {
          const strValue = String(value);
          if (strValue.length < 4 || strValue.length > 10) {
            return 'Password must be between 4 and 10 characters';
          }
        }
        return null;
      }
    },
    {
      label: 'Agenda',
      field: 'agenda',
      type: 'textarea',
      placeholder: 'Meeting agenda...',
      required: false,
      validation: (value, config) => {
        if (value) {
          const strValue = String(value);
          if (strValue.length > 2000) {
            return 'Agenda too long (maximum 2000 characters)';
          }
        }
        return null;
      }
    },

    // Meeting Settings
    {
      label: 'Host Video',
      field: 'hostVideo',
      type: 'checkbox',
      defaultValue: true,
      required: false
    },
    {
      label: 'Participant Video',
      field: 'participantVideo',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Join Before Host',
      field: 'joinBeforeHost',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Mute Participants on Entry',
      field: 'muteUponEntry',
      type: 'checkbox',
      defaultValue: true,
      required: false
    },
    {
      label: 'Enable Waiting Room',
      field: 'waitingRoom',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Auto Recording',
      field: 'autoRecording',
      type: 'select',
      options: [
        { value: 'none', label: 'No Recording' },
        { value: 'local', label: 'Local Recording' },
        { value: 'cloud', label: 'Cloud Recording' }
      ],
      defaultValue: 'none',
      required: false
    },
    {
      label: 'Enable Breakout Rooms',
      field: 'breakoutRoom',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Alternative Hosts',
      field: 'alternativeHosts',
      type: 'text',
      placeholder: 'email1@example.com,email2@example.com',
      required: false,
      validation: (value, config) => {
        if (value) {
          const emails = (value as string).split(',').map(e => e.trim());
          for (const email of emails) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              return `Invalid email format: ${email}`;
            }
          }
        }
        return null;
      }
    },

    // Webinar Specific Settings
    {
      label: 'Webinar Type',
      field: 'webinarType',
      type: 'select',
      options: [
        { value: '5', label: 'Webinar' },
        { value: '6', label: 'Recurring Webinar (No Fixed Time)' },
        { value: '9', label: 'Recurring Webinar (Fixed Time)' }
      ],
      defaultValue: 5,
      required: function() { 
        return ['create_webinar', 'update_webinar'].includes(this.operation);
      }
    },
    {
      label: 'Enable Q&A',
      field: 'enableQA',
      type: 'checkbox',
      defaultValue: true,
      required: false
    },
    {
      label: 'Enable Chat',
      field: 'enableChat',
      type: 'checkbox',
      defaultValue: true,
      required: false
    },
    {
      label: 'Enable Registration',
      field: 'enableRegistration',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Registration Type',
      field: 'registrationType',
      type: 'select',
      options: [
        { value: '1', label: 'Attendees register once and can attend any occurrence' },
        { value: '2', label: 'Attendees need to register for each occurrence' },
        { value: '3', label: 'Attendees register once and can choose one or more occurrences' }
      ],
      defaultValue: 1,
      required: function() { 
        return this.enableRegistration;
      }
    },

    // User Configuration
    {
      label: 'User ID or Email',
      field: 'userId',
      type: 'text',
      placeholder: 'user@example.com or user_id',
      required: function() { 
        return ['get_user', 'update_user', 'delete_user', 'list_meetings', 'list_webinars', 
                'list_recordings', 'check_user_email', 'check_user_zpak'].includes(this.operation);
      },
      validation: (value, config) => {
        const operation = config?.operation;
        if (['get_user', 'update_user', 'delete_user', 'list_meetings', 'list_webinars',
             'list_recordings', 'check_user_email', 'check_user_zpak'].includes(operation as string) && !value) {
          return 'User ID or email is required';
        }
        return null;
      }
    },
    {
      label: 'First Name',
      field: 'firstName',
      type: 'text',
      placeholder: 'John',
      required: function() { 
        return ['create_user', 'update_user'].includes(this.operation);
      },
      validation: (value, config) => {
        const operation = config?.operation;
        if (['create_user', 'update_user'].includes(operation as string) && !value) {
          return 'First name is required';
        }
        return null;
      }
    },
    {
      label: 'Last Name',
      field: 'lastName',
      type: 'text',
      placeholder: 'Doe',
      required: function() { 
        return ['create_user', 'update_user'].includes(this.operation);
      },
      validation: (value, config) => {
        const operation = config?.operation;
        if (['create_user', 'update_user'].includes(operation as string) && !value) {
          return 'Last name is required';
        }
        return null;
      }
    },
    {
      label: 'User Email',
      field: 'email',
      type: 'email',
      placeholder: 'user@example.com',
      required: function() { 
        return ['create_user', 'add_meeting_registrant', 'add_webinar_registrant'].includes(this.operation);
      },
      validation: (value, config) => {
        const operation = config?.operation;
        if (['create_user', 'add_meeting_registrant', 'add_webinar_registrant'].includes(operation as string)) {
          if (!value) return 'Email is required';
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string)) {
            return 'Invalid email format';
          }
        }
        return null;
      }
    },
    {
      label: 'User Type',
      field: 'userType',
      type: 'select',
      options: [
        { value: '1', label: 'Basic' },
        { value: '2', label: 'Licensed' },
        { value: '3', label: 'On-Premise' }
      ],
      defaultValue: 1,
      required: function() { 
        return this.operation === 'create_user';
      }
    },

    // Resource Identification
    {
      label: 'Meeting ID',
      field: 'meetingId',
      type: 'text',
      placeholder: '123456789',
      required: function() { 
        return ['get_meeting', 'update_meeting', 'delete_meeting', 'end_meeting', 
                'list_meeting_participants', 'add_meeting_registrant', 'list_meeting_registrants',
                'update_meeting_registrant', 'delete_meeting_registrant'].includes(this.operation);
      },
      validation: (value, config) => {
        const operation = config?.operation;
        if (['get_meeting', 'update_meeting', 'delete_meeting', 'end_meeting',
             'list_meeting_participants', 'add_meeting_registrant', 'list_meeting_registrants',
             'update_meeting_registrant', 'delete_meeting_registrant'].includes(operation as string) && !value) {
          return 'Meeting ID is required';
        }
        return null;
      }
    },
    {
      label: 'Webinar ID',
      field: 'webinarId',
      type: 'text',
      placeholder: '123456789',
      required: function() { 
        return ['get_webinar', 'update_webinar', 'delete_webinar', 'end_webinar',
                'add_webinar_registrant', 'list_webinar_registrants', 'update_webinar_registrant',
                'delete_webinar_registrant', 'list_webinar_participants'].includes(this.operation);
      },
      validation: (value, config) => {
        const operation = config?.operation;
        if (['get_webinar', 'update_webinar', 'delete_webinar', 'end_webinar',
             'add_webinar_registrant', 'list_webinar_registrants', 'update_webinar_registrant',
             'delete_webinar_registrant', 'list_webinar_participants'].includes(operation as string) && !value) {
          return 'Webinar ID is required';
        }
        return null;
      }
    },
    {
      label: 'Registrant ID',
      field: 'registrantId',
      type: 'text',
      placeholder: 'registrant_id',
      required: function() { 
        return ['update_meeting_registrant', 'delete_meeting_registrant', 
                'update_webinar_registrant', 'delete_webinar_registrant'].includes(this.operation);
      }
    },
    {
      label: 'Recording ID',
      field: 'recordingId',
      type: 'text',
      placeholder: 'recording_id',
      required: function() { 
        return ['get_recording', 'delete_recording', 'recover_recording'].includes(this.operation);
      }
    },

    // Room Configuration
    {
      label: 'Room Name',
      field: 'roomName',
      type: 'text',
      placeholder: 'Conference Room A',
      required: function() { 
        return ['add_room', 'update_room'].includes(this.operation);
      }
    },
    {
      label: 'Room Type',
      field: 'roomType',
      type: 'select',
      options: [
        { value: 'ZoomRoom', label: 'Zoom Room' },
        { value: 'SchedulingDisplayOnly', label: 'Scheduling Display Only' },
        { value: 'DigitalSignageOnly', label: 'Digital Signage Only' }
      ],
      defaultValue: 'ZoomRoom',
      required: function() { 
        return this.operation === 'add_room';
      }
    },

    // Phone Configuration
    {
      label: 'Phone Number',
      field: 'phoneNumber',
      type: 'text',
      placeholder: '+1234567890',
      required: function() { 
        return this.operation === 'make_phone_call';
      },
      validation: (value, config) => {
        const operation = config?.operation;
        if (operation === 'make_phone_call' && value) {
          if (!/^\+[1-9]\d{1,14}$/.test(value as string)) {
            return 'Invalid phone number format (use E.164 format: +1234567890)';
          }
        }
        return null;
      }
    },

    // Date Range for Reports/Lists
    {
      label: 'From Date',
      field: 'from',
      type: 'datetime',
      required: function() { 
        return ['get_daily_usage_report', 'get_meeting_participants_report', 
                'get_meeting_polls_report', 'get_webinar_participants_report', 
                'get_call_logs'].includes(this.operation);
      }
    },
    {
      label: 'To Date',
      field: 'to',
      type: 'datetime',
      required: function() { 
        return ['get_daily_usage_report', 'get_meeting_participants_report', 
                'get_meeting_polls_report', 'get_webinar_participants_report', 
                'get_call_logs'].includes(this.operation);
      }
    },

    // Pagination and Filtering
    {
      label: 'Page Size',
      field: 'pageSize',
      type: 'number',
      placeholder: '30',
      defaultValue: 30,
      required: false,
      validation: (value, config) => {
        if (value) {
          const numValue = typeof value === 'number' ? value : Number(value);
          if (numValue < 1 || numValue > 300) {
            return 'Page size must be between 1 and 300';
          }
        }
        return null;
      }
    },
    {
      label: 'Next Page Token',
      field: 'nextPageToken',
      type: 'text',
      placeholder: 'page_token',
      required: false
    },
    {
      label: 'Meeting Status Filter',
      field: 'meetingStatus',
      type: 'select',
      options: [
        { value: 'all', label: 'All Meetings' },
        { value: 'waiting', label: 'Waiting' },
        { value: 'live', label: 'Live' }
      ],
      defaultValue: 'all',
      required: false
    },

    // Advanced Options
    {
      label: 'Use Personal Meeting ID',
      field: 'usePmi',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Enforce Login',
      field: 'enforceLogin',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Enforce Login Domains',
      field: 'enforceLoginDomains',
      type: 'text',
      placeholder: 'example.com,company.com',
      required: false
    },
    {
      label: 'Meeting Authentication',
      field: 'meetingAuthentication',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Close Registration',
      field: 'closeRegistration',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Occurrence ID',
      field: 'occurrenceId',
      type: 'text',
      placeholder: 'occurrence_id',
      required: false
    }
  ],
  examples: [
    {
      name: 'Create Scheduled Meeting',
      description: 'Create a scheduled Zoom meeting',
      config: {
        authMethod: 'oauth',
        clientId: 'your-client-id',
        clientSecret: 'your-client-secret',
        accessToken: 'your-access-token',
        operation: 'create_meeting',
        topic: 'Weekly Team Meeting',
        type: 2,
        startTime: '2023-12-01T10:00:00',
        duration: 60,
        timezone: 'America/New_York',
        password: 'meeting123',
        hostVideo: true,
        participantVideo: false,
        waitingRoom: true,
        autoRecording: 'cloud'
      }
    },
    {
      name: 'Create Webinar',
      description: 'Create a webinar with registration',
      config: {
        authMethod: 'oauth',
        clientId: 'your-client-id',
        clientSecret: 'your-client-secret',
        accessToken: 'your-access-token',
        operation: 'create_webinar',
        topic: 'Product Launch Webinar',
        webinarType: 5,
        startTime: '2023-12-15T14:00:00',
        duration: 90,
        timezone: 'UTC',
        enableRegistration: true,
        registrationType: 1,
        enableQA: true,
        enableChat: true,
        autoRecording: 'cloud'
      }
    },
    {
      name: 'Add Meeting Registrant',
      description: 'Register someone for a meeting',
      config: {
        authMethod: 'oauth',
        clientId: 'your-client-id',
        clientSecret: 'your-client-secret',
        accessToken: 'your-access-token',
        operation: 'add_meeting_registrant',
        meetingId: '123456789',
        email: 'attendee@example.com',
        firstName: 'John',
        lastName: 'Doe'
      }
    },
    {
      name: 'List User Meetings',
      description: 'Get all meetings for a user',
      config: {
        authMethod: 'oauth',
        clientId: 'your-client-id',
        clientSecret: 'your-client-secret',
        accessToken: 'your-access-token',
        operation: 'list_meetings',
        userId: 'user@example.com',
        meetingStatus: 'live',
        pageSize: 50
      }
    },
    {
      name: 'Get Recording',
      description: 'Get recording details',
      config: {
        authMethod: 'oauth',
        clientId: 'your-client-id',
        clientSecret: 'your-client-secret',
        accessToken: 'your-access-token',
        operation: 'get_recording',
        recordingId: 'recording_id_here'
      }
    },
    {
      name: 'Create User',
      description: 'Create a new Zoom user',
      config: {
        authMethod: 'oauth',
        clientId: 'your-client-id',
        clientSecret: 'your-client-secret',
        accessToken: 'your-access-token',
        operation: 'create_user',
        email: 'newuser@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        userType: 2
      }
    }
  ]
};