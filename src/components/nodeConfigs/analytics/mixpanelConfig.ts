import { NodeConfigDefinition, FieldConfig } from '../../../types/nodeConfig';

// Extended field config to support additional properties
interface ExtendedFieldConfig extends Omit<FieldConfig, 'type'> {
  type: FieldConfig['type'] | 'credentials' | 'date';
  credentialTypes?: string[];
  visible?: boolean | ((this: any) => boolean);
  min?: number;
  max?: number;
}

// Extended node config definition to support extended field configs
interface ExtendedNodeConfigDefinition extends Omit<NodeConfigDefinition, 'fields'> {
  fields: ExtendedFieldConfig[];
  validation?: Record<string, (value: unknown) => string | null>;
}

export const mixpanelConfig: ExtendedNodeConfigDefinition = {
  fields: [
    {
      label: 'Authentication',
      field: 'auth',
      type: 'credentials',
      required: true,
      credentialTypes: ['mixpanel-api'],
      placeholder: 'Select Mixpanel credentials',
      tooltip: 'Mixpanel project token and API secret'
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      options: [
        // Event Tracking & Management
        { value: 'track_event', label: 'Track Event' },
        { value: 'track_user_profile', label: 'Track User Profile' },
        { value: 'batch_track_events', label: 'Batch Track Events' },
        { value: 'import_historical_data', label: 'Import Historical Data' },
        { value: 'delete_events', label: 'Delete Events' },
        { value: 'track_revenue', label: 'Track Revenue' },
        { value: 'set_user_properties', label: 'Set User Properties' },
        { value: 'increment_user_properties', label: 'Increment User Properties' },
        
        // Analytics & Insights
        { value: 'query_events', label: 'Query Events' },
        { value: 'get_funnel_analysis', label: 'Get Funnel Analysis' },
        { value: 'generate_cohort_report', label: 'Generate Cohort Report' },
        { value: 'get_segmentation_data', label: 'Get Segmentation Data' },
        { value: 'retrieve_retention_data', label: 'Retrieve Retention Data' },
        { value: 'get_revenue_analytics', label: 'Get Revenue Analytics' },
        { value: 'export_raw_data', label: 'Export Raw Data' },
        { value: 'get_realtime_analytics', label: 'Get Real-time Analytics' },
        
        // A/B Testing & Experiments
        { value: 'create_experiment', label: 'Create Experiment' },
        { value: 'get_experiment_results', label: 'Get Experiment Results' },
        { value: 'update_experiment', label: 'Update Experiment' },
        { value: 'list_active_experiments', label: 'List Active Experiments' },
        { value: 'end_experiment', label: 'End Experiment' },
        { value: 'get_experiment_participants', label: 'Get Experiment Participants' },
        
        // User Management
        { value: 'get_user_profile', label: 'Get User Profile' },
        { value: 'search_users', label: 'Search Users' },
        { value: 'merge_user_profiles', label: 'Merge User Profiles' },
        { value: 'delete_user_profile', label: 'Delete User Profile' },
        { value: 'get_user_activity', label: 'Get User Activity' },
        { value: 'update_user_alias', label: 'Update User Alias' },
        
        // Dashboard & Reporting
        { value: 'create_dashboard', label: 'Create Dashboard' },
        { value: 'get_dashboard_data', label: 'Get Dashboard Data' },
        { value: 'share_dashboard', label: 'Share Dashboard' },
        { value: 'schedule_reports', label: 'Schedule Reports' },
        { value: 'create_custom_report', label: 'Create Custom Report' },
        { value: 'export_dashboard', label: 'Export Dashboard' },
        
        // Advanced Analytics
        { value: 'create_custom_metric', label: 'Create Custom Metric' },
        { value: 'get_predictive_analytics', label: 'Get Predictive Analytics' },
        { value: 'analyze_user_paths', label: 'Analyze User Paths' },
        { value: 'get_anomaly_detection', label: 'Get Anomaly Detection' },
        { value: 'create_alert_rules', label: 'Create Alert Rules' },
        { value: 'get_impact_analysis', label: 'Get Impact Analysis' },
        
        // Data Management
        { value: 'validate_data_schema', label: 'Validate Data Schema' },
        { value: 'get_data_dictionary', label: 'Get Data Dictionary' },
        { value: 'clean_duplicate_data', label: 'Clean Duplicate Data' },
        { value: 'archive_old_data', label: 'Archive Old Data' },
        { value: 'get_data_quality_metrics', label: 'Get Data Quality Metrics' }
      ],
      defaultValue: 'track_event',
      tooltip: 'The operation to perform in Mixpanel'
    },
    {
      label: 'Event Name',
      field: 'eventName',
      type: 'text',
      placeholder: 'button_clicked',
      required: function() {
        const eventOps = [
          'track_event', 'track_revenue', 'query_events', 'delete_events'
        ];
        return eventOps.includes(this.operation);
      },
      tooltip: 'Name of the event to track or query'
    },
    {
      label: 'Event Properties',
      field: 'properties',
      type: 'json',
      placeholder: '{"button_id": "submit", "page": "checkout"}',
      required: false,
      visible: function() {
        const propOps = [
          'track_event', 'track_revenue', 'batch_track_events',
          'import_historical_data'
        ];
        return propOps.includes(this.operation);
      },
      tooltip: 'JSON object with event properties'
    },
    {
      label: 'User ID',
      field: 'userId',
      type: 'text',
      placeholder: 'user_123',
      required: function() {
        const userOps = [
          'track_user_profile', 'get_user_profile', 'delete_user_profile',
          'get_user_activity', 'set_user_properties', 'increment_user_properties',
          'update_user_alias'
        ];
        return userOps.includes(this.operation);
      },
      tooltip: 'Unique identifier for the user'
    },
    {
      label: 'User Properties',
      field: 'userProperties',
      type: 'json',
      placeholder: '{"name": "John Doe", "plan": "premium"}',
      required: function() {
        return ['track_user_profile', 'set_user_properties'].includes(this.operation);
      },
      visible: function() {
        const userPropOps = [
          'track_user_profile', 'set_user_properties', 'search_users'
        ];
        return userPropOps.includes(this.operation);
      }
    },
    {
      label: 'Increment Properties',
      field: 'incrementProperties',
      type: 'json',
      placeholder: '{"login_count": 1, "total_spent": 99.99}',
      required: function() {
        return this.operation === 'increment_user_properties';
      },
      visible: function() {
        return this.operation === 'increment_user_properties';
      },
      tooltip: 'Numeric properties to increment'
    },
    {
      label: 'Revenue Amount',
      field: 'amount',
      type: 'number',
      placeholder: '99.99',
      min: 0,
      required: function() {
        return this.operation === 'track_revenue';
      },
      visible: function() {
        return this.operation === 'track_revenue';
      },
      tooltip: 'Revenue amount in your currency'
    },
    {
      label: 'Events Batch',
      field: 'events',
      type: 'json',
      placeholder: '[{"event": "login", "properties": {}}, {"event": "purchase", "properties": {}}]',
      required: function() {
        return ['batch_track_events', 'import_historical_data'].includes(this.operation);
      },
      visible: function() {
        return ['batch_track_events', 'import_historical_data'].includes(this.operation);
      },
      tooltip: 'Array of events to track in batch'
    },
    {
      label: 'Date Range Start',
      field: 'fromDate',
      type: 'date',
      required: false,
      visible: function() {
        const dateOps = [
          'query_events', 'get_funnel_analysis', 'generate_cohort_report',
          'get_segmentation_data', 'retrieve_retention_data', 'get_revenue_analytics',
          'export_raw_data', 'get_user_activity', 'get_data_quality_metrics'
        ];
        return dateOps.includes(this.operation);
      },
      tooltip: 'Start date for analytics queries'
    },
    {
      label: 'Date Range End',
      field: 'toDate',
      type: 'date',
      required: false,
      visible: function() {
        const dateOps = [
          'query_events', 'get_funnel_analysis', 'generate_cohort_report',
          'get_segmentation_data', 'retrieve_retention_data', 'get_revenue_analytics',
          'export_raw_data', 'get_user_activity', 'get_data_quality_metrics'
        ];
        return dateOps.includes(this.operation);
      },
      tooltip: 'End date for analytics queries'
    },
    {
      label: 'Funnel Steps',
      field: 'funnelSteps',
      type: 'json',
      placeholder: '["signup", "onboarding", "first_purchase"]',
      required: function() {
        return this.operation === 'get_funnel_analysis';
      },
      visible: function() {
        return this.operation === 'get_funnel_analysis';
      },
      tooltip: 'Array of event names defining the funnel'
    },
    {
      label: 'Cohort Definition',
      field: 'cohortDefinition',
      type: 'json',
      placeholder: '{"event": "signup", "properties": {"source": "organic"}}',
      required: function() {
        return this.operation === 'generate_cohort_report';
      },
      visible: function() {
        return this.operation === 'generate_cohort_report';
      }
    },
    {
      label: 'Segmentation Event',
      field: 'segmentEvent',
      type: 'text',
      placeholder: 'page_viewed',
      required: function() {
        return this.operation === 'get_segmentation_data';
      },
      visible: function() {
        return this.operation === 'get_segmentation_data';
      }
    },
    {
      label: 'Segment By',
      field: 'segmentBy',
      type: 'text',
      placeholder: 'browser',
      required: false,
      visible: function() {
        return this.operation === 'get_segmentation_data';
      },
      tooltip: 'Property to segment the data by'
    },
    {
      label: 'Experiment Name',
      field: 'experimentName',
      type: 'text',
      placeholder: 'New Checkout Flow A/B Test',
      required: function() {
        const expOps = [
          'create_experiment', 'get_experiment_results', 'update_experiment',
          'end_experiment', 'get_experiment_participants'
        ];
        return expOps.includes(this.operation);
      },
      visible: function() {
        const expOps = [
          'create_experiment', 'get_experiment_results', 'update_experiment',
          'end_experiment', 'get_experiment_participants'
        ];
        return expOps.includes(this.operation);
      }
    },
    {
      label: 'Experiment Variants',
      field: 'variants',
      type: 'json',
      placeholder: '["control", "variant_a", "variant_b"]',
      required: function() {
        return this.operation === 'create_experiment';
      },
      visible: function() {
        return ['create_experiment', 'update_experiment'].includes(this.operation);
      },
      tooltip: 'Array of experiment variant names'
    },
    {
      label: 'Dashboard Name',
      field: 'dashboardName',
      type: 'text',
      placeholder: 'Product KPIs Dashboard',
      required: function() {
        const dashOps = [
          'create_dashboard', 'get_dashboard_data', 'share_dashboard',
          'export_dashboard'
        ];
        return dashOps.includes(this.operation);
      },
      visible: function() {
        const dashOps = [
          'create_dashboard', 'get_dashboard_data', 'share_dashboard',
          'export_dashboard'
        ];
        return dashOps.includes(this.operation);
      }
    },
    {
      label: 'Dashboard Configuration',
      field: 'dashboardConfig',
      type: 'json',
      placeholder: '{"charts": ["revenue_trend", "user_growth"], "layout": "grid"}',
      required: function() {
        return this.operation === 'create_dashboard';
      },
      visible: function() {
        return ['create_dashboard', 'create_custom_report'].includes(this.operation);
      }
    },
    {
      label: 'Report Schedule',
      field: 'schedule',
      type: 'select',
      options: [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'custom', label: 'Custom Schedule' }
      ],
      defaultValue: 'weekly',
      required: function() {
        return this.operation === 'schedule_reports';
      },
      visible: function() {
        return this.operation === 'schedule_reports';
      }
    },
    {
      label: 'Recipients',
      field: 'recipients',
      type: 'text',
      placeholder: 'team@company.com, manager@company.com',
      required: false,
      visible: function() {
        return ['share_dashboard', 'schedule_reports'].includes(this.operation);
      },
      tooltip: 'Comma-separated email addresses'
    },
    {
      label: 'Metric Name',
      field: 'metricName',
      type: 'text',
      placeholder: 'Average Order Value',
      required: function() {
        return this.operation === 'create_custom_metric';
      },
      visible: function() {
        return this.operation === 'create_custom_metric';
      }
    },
    {
      label: 'Metric Formula',
      field: 'formula',
      type: 'text',
      placeholder: 'sum(revenue) / count(distinct user_id)',
      required: function() {
        return this.operation === 'create_custom_metric';
      },
      visible: function() {
        return this.operation === 'create_custom_metric';
      },
      tooltip: 'SQL-like formula for the custom metric'
    },
    {
      label: 'User Path Analysis',
      field: 'pathConfig',
      type: 'json',
      placeholder: '{"startEvent": "signup", "endEvent": "purchase", "maxSteps": 10}',
      required: function() {
        return this.operation === 'analyze_user_paths';
      },
      visible: function() {
        return this.operation === 'analyze_user_paths';
      }
    },
    {
      label: 'Alert Rule',
      field: 'alertRule',
      type: 'json',
      placeholder: '{"metric": "conversion_rate", "condition": "<", "threshold": 0.05}',
      required: function() {
        return this.operation === 'create_alert_rules';
      },
      visible: function() {
        return this.operation === 'create_alert_rules';
      },
      tooltip: 'Alert condition configuration'
    },
    {
      label: 'Impact Feature',
      field: 'feature',
      type: 'text',
      placeholder: 'new_checkout_flow',
      required: function() {
        return this.operation === 'get_impact_analysis';
      },
      visible: function() {
        return this.operation === 'get_impact_analysis';
      },
      tooltip: 'Feature name to analyze impact'
    },
    {
      label: 'Merge User IDs',
      field: 'mergeUserIds',
      type: 'json',
      placeholder: '["old_user_123", "new_user_456"]',
      required: function() {
        return this.operation === 'merge_user_profiles';
      },
      visible: function() {
        return this.operation === 'merge_user_profiles';
      },
      tooltip: 'Array of user IDs to merge'
    },
    {
      label: 'User Alias',
      field: 'alias',
      type: 'text',
      placeholder: 'john.doe@example.com',
      required: function() {
        return this.operation === 'update_user_alias';
      },
      visible: function() {
        return this.operation === 'update_user_alias';
      }
    },
    {
      label: 'Export Format',
      field: 'format',
      type: 'select',
      options: [
        { value: 'json', label: 'JSON' },
        { value: 'csv', label: 'CSV' },
        { value: 'parquet', label: 'Parquet' }
      ],
      defaultValue: 'json',
      visible: function() {
        return ['export_raw_data', 'export_dashboard'].includes(this.operation);
      }
    },
    {
      label: 'Data Retention Days',
      field: 'retentionDays',
      type: 'number',
      placeholder: '365',
      min: 30,
      max: 1825,
      required: function() {
        return this.operation === 'archive_old_data';
      },
      visible: function() {
        return this.operation === 'archive_old_data';
      },
      tooltip: 'Number of days to retain data'
    },
    {
      label: 'Schema Validation',
      field: 'schema',
      type: 'json',
      placeholder: '{"event": {"type": "string", "required": true}}',
      required: function() {
        return this.operation === 'validate_data_schema';
      },
      visible: function() {
        return this.operation === 'validate_data_schema';
      }
    },
    {
      label: 'Include System Properties',
      field: 'includeSystemProps',
      type: 'boolean',
      defaultValue: false,
      visible: function() {
        const queryOps = [
          'query_events', 'export_raw_data', 'get_data_dictionary'
        ];
        return queryOps.includes(this.operation);
      },
      tooltip: 'Include Mixpanel system properties in results'
    },
    {
      label: 'Limit',
      field: 'limit',
      type: 'number',
      placeholder: '1000',
      defaultValue: 1000,
      min: 1,
      max: 10000,
      visible: function() {
        const limitOps = [
          'query_events', 'search_users', 'export_raw_data',
          'list_active_experiments', 'get_experiment_participants'
        ];
        return limitOps.includes(this.operation);
      }
    }
  ],

  validation: {
    eventName: (value) => {
      const str = value as string;
      if (str && str.length > 255) {
        return 'Event name cannot exceed 255 characters';
      }
      if (str && !/^[a-zA-Z0-9_\-\s]+$/.test(str)) {
        return 'Event name can only contain letters, numbers, underscores, hyphens, and spaces';
      }
      return null;
    },
    userId: (value) => {
      const str = value as string;
      if (str && str.length > 255) {
        return 'User ID cannot exceed 255 characters';
      }
      return null;
    },
    amount: (value) => {
      const num = value as number;
      if (num !== undefined && num !== null && num < 0) {
        return 'Revenue amount must be positive';
      }
      return null;
    },
    recipients: (value) => {
      if (value) {
        const emails = typeof value === 'string' ? value.split(',').map(e => e.trim()) : [];
        for (const email of emails) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return `Invalid email format: ${email}`;
          }
        }
      }
      return null;
    }
  },

  examples: [
    {
      name: 'Track User Signup',
      description: 'Track when a user completes signup with source information',
      config: {
        operation: 'track_event',
        eventName: 'user_signup',
        properties: {
          source: 'organic',
          signup_method: 'email',
          referrer: 'blog_post'
        }
      }
    },
    {
      name: 'Analyze Conversion Funnel',
      description: 'Analyze the signup to purchase conversion funnel',
      config: {
        operation: 'get_funnel_analysis',
        funnelSteps: ['signup', 'onboarding_complete', 'trial_started', 'first_purchase'],
        fromDate: '2024-01-01',
        toDate: '2024-01-31'
      }
    },
    {
      name: 'Create Revenue Dashboard',
      description: 'Create a dashboard tracking key revenue metrics',
      config: {
        operation: 'create_dashboard',
        dashboardName: 'Revenue Analytics',
        dashboardConfig: {
          charts: ['daily_revenue', 'revenue_by_plan', 'mrr_growth', 'churn_rate'],
          layout: 'grid',
          refresh_interval: 3600
        }
      }
    },
    {
      name: 'Setup Conversion Alert',
      description: 'Alert when conversion rate drops below threshold',
      config: {
        operation: 'create_alert_rules',
        alertRule: {
          name: 'Low Conversion Alert',
          metric: 'signup_to_trial_conversion',
          condition: 'less_than',
          threshold: 0.15,
          window: '24h',
          notification_channels: ['email', 'slack']
        }
      }
    }
  ]
};