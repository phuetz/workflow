import { NodeConfigDefinition } from '../../../types/nodeConfig';

export const grafanaConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'Authentication',
      field: 'auth',
      type: 'text',
      required: true,
      placeholder: 'Select Grafana credentials',
      tooltip: 'Grafana API key or basic authentication'
    },
    {
      label: 'Grafana URL',
      field: 'baseUrl',
      type: 'text',
      required: true,
      placeholder: 'https://your-grafana-instance.com',
      tooltip: 'Base URL of your Grafana instance'
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      options: [
        // Dashboard Management
        { value: 'dashboard_create', label: 'Create Dashboard' },
        { value: 'dashboard_update', label: 'Update Dashboard' },
        { value: 'dashboard_get', label: 'Get Dashboard' },
        { value: 'dashboard_list', label: 'List Dashboards' },
        { value: 'dashboard_delete', label: 'Delete Dashboard' },
        { value: 'dashboard_import', label: 'Import Dashboard' },
        { value: 'dashboard_export', label: 'Export Dashboard' },
        { value: 'dashboard_share', label: 'Share Dashboard' },
        { value: 'dashboard_search', label: 'Search Dashboards' },
        { value: 'dashboard_permissions_get', label: 'Get Dashboard Permissions' },
        { value: 'dashboard_permissions_set', label: 'Set Dashboard Permissions' },
        { value: 'dashboard_clone', label: 'Clone Dashboard' },
        
        // Data Source Management
        { value: 'datasource_add', label: 'Add Data Source' },
        { value: 'datasource_update', label: 'Update Data Source' },
        { value: 'datasource_test', label: 'Test Data Source' },
        { value: 'datasource_list', label: 'List Data Sources' },
        { value: 'datasource_delete', label: 'Delete Data Source' },
        { value: 'datasource_health', label: 'Get Data Source Health' },
        { value: 'datasource_proxy_config', label: 'Configure Data Source Proxy' },
        
        // Panel Operations
        { value: 'panel_create', label: 'Create Panel' },
        { value: 'panel_update', label: 'Update Panel' },
        { value: 'panel_get_data', label: 'Get Panel Data' },
        { value: 'panel_delete', label: 'Delete Panel' },
        { value: 'panel_configure_queries', label: 'Configure Panel Queries' },
        { value: 'panel_set_alerts', label: 'Set Panel Alerts' },
        { value: 'panel_export', label: 'Export Panel' },
        
        // Alerting & Notifications
        { value: 'alert_rule_create', label: 'Create Alert Rule' },
        { value: 'alert_rule_update', label: 'Update Alert Rule' },
        { value: 'alert_rule_list', label: 'List Alert Rules' },
        { value: 'alert_rule_delete', label: 'Delete Alert Rule' },
        { value: 'alert_rule_test', label: 'Test Alert Rule' },
        { value: 'alert_history', label: 'Get Alert History' },
        { value: 'notification_channel_config', label: 'Configure Notification Channel' },
        { value: 'notification_test', label: 'Send Test Notification' },
        { value: 'alert_silence', label: 'Silence Alerts' },
        { value: 'alert_status', label: 'Get Alert Status' },
        
        // User & Organization Management
        { value: 'user_create', label: 'Create User' },
        { value: 'user_update', label: 'Update User' },
        { value: 'user_get', label: 'Get User Info' },
        { value: 'user_list', label: 'List Users' },
        { value: 'user_delete', label: 'Delete User' },
        { value: 'user_password_reset', label: 'Reset User Password' },
        { value: 'org_create', label: 'Create Organization' },
        { value: 'org_switch', label: 'Switch Organization' },
        
        // Annotation Management
        { value: 'annotation_create', label: 'Create Annotation' },
        { value: 'annotation_update', label: 'Update Annotation' },
        { value: 'annotation_get', label: 'Get Annotations' },
        { value: 'annotation_delete', label: 'Delete Annotation' },
        { value: 'annotation_search', label: 'Search Annotations' },
        
        // Advanced Features
        { value: 'playlist_create', label: 'Create Playlist' },
        { value: 'system_health', label: 'Get System Health' },
        { value: 'ldap_config', label: 'Configure LDAP' },
        { value: 'plugin_manage', label: 'Manage Plugins' },
        { value: 'global_settings', label: 'Set Global Settings' },
        { value: 'report_generate', label: 'Generate Reports' },
        { value: 'variables_config', label: 'Configure Variables' }
      ],
      defaultValue: 'dashboard_list',
      tooltip: 'The operation to perform in Grafana'
    },
    {
      label: 'Dashboard UID',
      field: 'dashboardUid',
      type: 'text',
      placeholder: 'dashboard-uid',
      required: function() {
        const dashOps = [
          'dashboard_update', 'dashboard_get', 'dashboard_delete',
          'dashboard_export', 'dashboard_share', 'dashboard_permissions_get',
          'dashboard_permissions_set', 'dashboard_clone', 'panel_create',
          'panel_update', 'panel_get_data', 'panel_delete'
        ];
        return dashOps.includes(this.operation);
      },
      tooltip: 'Unique identifier of the dashboard'
    },
    {
      label: 'Dashboard Title',
      field: 'title',
      type: 'text',
      placeholder: 'My Monitoring Dashboard',
      required: function() {
        return ['dashboard_create', 'dashboard_update'].includes(this.operation);
      },
      tooltip: 'Title of the dashboard'
    },
    {
      label: 'Dashboard JSON',
      field: 'dashboardJson',
      type: 'json',
      placeholder: '{"panels": [], "title": "My Dashboard"}',
      required: function() {
        return ['dashboard_create', 'dashboard_update', 'dashboard_import'].includes(this.operation);
      },
      showWhen: function() {
        return ['dashboard_create', 'dashboard_update', 'dashboard_import'].includes(this.operation);
      },
      tooltip: 'Complete dashboard configuration in JSON format'
    },
    {
      label: 'Folder ID',
      field: 'folderId',
      type: 'number',
      placeholder: '0',
      defaultValue: 0,
      required: false,
      showWhen: function() {
        return ['dashboard_create', 'dashboard_update', 'dashboard_import'].includes(this.operation);
      },
      tooltip: 'Folder to save the dashboard in (0 for General)'
    },
    {
      label: 'Overwrite',
      field: 'overwrite',
      type: 'boolean',
      defaultValue: false,
      showWhen: function() {
        return ['dashboard_create', 'dashboard_update', 'dashboard_import'].includes(this.operation);
      },
      tooltip: 'Overwrite existing dashboard with same UID'
    },
    {
      label: 'Data Source Name',
      field: 'name',
      type: 'text',
      placeholder: 'Prometheus',
      required: function() {
        return ['datasource_add', 'datasource_update'].includes(this.operation);
      },
      showWhen: function() {
        const dsOps = [
          'datasource_add', 'datasource_update', 'datasource_test',
          'datasource_delete', 'datasource_health'
        ];
        return dsOps.includes(this.operation);
      }
    },
    {
      label: 'Data Source Type',
      field: 'type',
      type: 'select',
      options: [
        { value: 'prometheus', label: 'Prometheus' },
        { value: 'graphite', label: 'Graphite' },
        { value: 'influxdb', label: 'InfluxDB' },
        { value: 'elasticsearch', label: 'Elasticsearch' },
        { value: 'mysql', label: 'MySQL' },
        { value: 'postgres', label: 'PostgreSQL' },
        { value: 'cloudwatch', label: 'AWS CloudWatch' },
        { value: 'azuremonitor', label: 'Azure Monitor' },
        { value: 'stackdriver', label: 'Google Cloud Monitoring' },
        { value: 'loki', label: 'Loki (Logs)' },
        { value: 'jaeger', label: 'Jaeger (Traces)' },
        { value: 'tempo', label: 'Tempo (Traces)' }
      ],
      defaultValue: 'prometheus',
      required: function() {
        return this.operation === 'datasource_add';
      },
      showWhen: function() {
        return ['datasource_add', 'datasource_update'].includes(this.operation);
      }
    },
    {
      label: 'Data Source URL',
      field: 'url',
      type: 'text',
      placeholder: 'http://localhost:9090',
      required: function() {
        return this.operation === 'datasource_add';
      },
      showWhen: function() {
        return ['datasource_add', 'datasource_update'].includes(this.operation);
      },
      tooltip: 'URL of the data source'
    },
    {
      label: 'Data Source ID',
      field: 'datasourceId',
      type: 'number',
      placeholder: '1',
      required: function() {
        const dsIdOps = [
          'datasource_update', 'datasource_test', 'datasource_delete',
          'datasource_health', 'datasource_proxy_config'
        ];
        return dsIdOps.includes(this.operation);
      }
    },
    {
      label: 'Panel ID',
      field: 'panelId',
      type: 'number',
      placeholder: '1',
      required: function() {
        const panelOps = [
          'panel_update', 'panel_get_data', 'panel_delete',
          'panel_configure_queries', 'panel_set_alerts', 'panel_export'
        ];
        return panelOps.includes(this.operation);
      }
    },
    {
      label: 'Panel Configuration',
      field: 'panelConfig',
      type: 'json',
      placeholder: '{"type": "graph", "title": "CPU Usage"}',
      required: function() {
        return ['panel_create', 'panel_update'].includes(this.operation);
      },
      showWhen: function() {
        return ['panel_create', 'panel_update', 'panel_configure_queries'].includes(this.operation);
      }
    },
    {
      label: 'Alert Rule Name',
      field: 'alertName',
      type: 'text',
      placeholder: 'High CPU Alert',
      required: function() {
        return ['alert_rule_create', 'alert_rule_update'].includes(this.operation);
      },
      showWhen: function() {
        const alertOps = [
          'alert_rule_create', 'alert_rule_update', 'alert_rule_delete',
          'alert_rule_test'
        ];
        return alertOps.includes(this.operation);
      }
    },
    {
      label: 'Alert Condition',
      field: 'condition',
      type: 'json',
      placeholder: '{"evaluator": {"type": "gt", "params": [80]}}',
      required: function() {
        return ['alert_rule_create', 'alert_rule_update'].includes(this.operation);
      },
      showWhen: function() {
        return ['alert_rule_create', 'alert_rule_update', 'panel_set_alerts'].includes(this.operation);
      },
      tooltip: 'Alert condition configuration'
    },
    {
      label: 'Alert Frequency',
      field: 'frequency',
      type: 'text',
      placeholder: '5m',
      defaultValue: '5m',
      showWhen: function() {
        return ['alert_rule_create', 'alert_rule_update'].includes(this.operation);
      },
      tooltip: 'How often to evaluate the alert (e.g., 5m, 1h)'
    },
    {
      label: 'Notification Channel',
      field: 'notificationChannel',
      type: 'text',
      placeholder: 'slack-alerts',
      required: function() {
        return this.operation === 'notification_channel_config';
      },
      showWhen: function() {
        return ['notification_channel_config', 'notification_test'].includes(this.operation);
      }
    },
    {
      label: 'Channel Type',
      field: 'channelType',
      type: 'select',
      options: [
        { value: 'email', label: 'Email' },
        { value: 'slack', label: 'Slack' },
        { value: 'pagerduty', label: 'PagerDuty' },
        { value: 'webhook', label: 'Webhook' },
        { value: 'teams', label: 'Microsoft Teams' },
        { value: 'discord', label: 'Discord' },
        { value: 'telegram', label: 'Telegram' },
        { value: 'opsgenie', label: 'OpsGenie' }
      ],
      defaultValue: 'email',
      required: function() {
        return this.operation === 'notification_channel_config';
      },
      showWhen: function() {
        return this.operation === 'notification_channel_config';
      }
    },
    {
      label: 'Channel Settings',
      field: 'channelSettings',
      type: 'json',
      placeholder: '{"url": "https://hooks.slack.com/..."}',
      required: function() {
        return this.operation === 'notification_channel_config';
      },
      showWhen: function() {
        return this.operation === 'notification_channel_config';
      }
    },
    {
      label: 'Username',
      field: 'username',
      type: 'text',
      placeholder: 'john.doe',
      required: function() {
        return ['user_create', 'user_update'].includes(this.operation);
      },
      showWhen: function() {
        const userOps = [
          'user_create', 'user_update', 'user_get', 'user_delete',
          'user_password_reset'
        ];
        return userOps.includes(this.operation);
      }
    },
    {
      label: 'Email',
      field: 'email',
      type: 'email',
      placeholder: 'john.doe@example.com',
      required: function() {
        return this.operation === 'user_create';
      },
      showWhen: function() {
        return ['user_create', 'user_update'].includes(this.operation);
      }
    },
    {
      label: 'Password',
      field: 'password',
      type: 'password',
      placeholder: 'Strong password',
      required: function() {
        return ['user_create', 'user_password_reset'].includes(this.operation);
      },
      showWhen: function() {
        return ['user_create', 'user_password_reset'].includes(this.operation);
      }
    },
    {
      label: 'User Role',
      field: 'role',
      type: 'select',
      options: [
        { value: 'Admin', label: 'Admin' },
        { value: 'Editor', label: 'Editor' },
        { value: 'Viewer', label: 'Viewer' }
      ],
      defaultValue: 'Viewer',
      showWhen: function() {
        return ['user_create', 'user_update'].includes(this.operation);
      }
    },
    {
      label: 'Organization Name',
      field: 'orgName',
      type: 'text',
      placeholder: 'My Organization',
      required: function() {
        return this.operation === 'org_create';
      },
      showWhen: function() {
        return ['org_create', 'org_switch'].includes(this.operation);
      }
    },
    {
      label: 'Organization ID',
      field: 'orgId',
      type: 'number',
      placeholder: '1',
      required: function() {
        return this.operation === 'org_switch';
      },
      showWhen: function() {
        return this.operation === 'org_switch';
      }
    },
    {
      label: 'Annotation Text',
      field: 'text',
      type: 'textarea',
      placeholder: 'Deployment completed',
      required: function() {
        return ['annotation_create', 'annotation_update'].includes(this.operation);
      },
      showWhen: function() {
        const annotOps = [
          'annotation_create', 'annotation_update', 'annotation_search'
        ];
        return annotOps.includes(this.operation);
      }
    },
    {
      label: 'Annotation Tags',
      field: 'tags',
      type: 'text',
      placeholder: 'deployment, production',
      required: false,
      showWhen: function() {
        return ['annotation_create', 'annotation_update', 'annotation_search'].includes(this.operation);
      },
      tooltip: 'Comma-separated list of tags'
    },
    {
      label: 'Time Range',
      field: 'timeRange',
      type: 'json',
      placeholder: '{"from": "now-6h", "to": "now"}',
      required: false,
      showWhen: function() {
        const timeOps = [
          'annotation_get', 'annotation_search', 'alert_history',
          'panel_get_data', 'dashboard_export'
        ];
        return timeOps.includes(this.operation);
      },
      tooltip: 'Time range for queries'
    },
    {
      label: 'Query',
      field: 'query',
      type: 'text',
      placeholder: 'type:dashboard tag:production',
      required: false,
      showWhen: function() {
        return ['dashboard_search', 'annotation_search'].includes(this.operation);
      },
      tooltip: 'Search query string'
    },
    {
      label: 'Permissions',
      field: 'permissions',
      type: 'json',
      placeholder: '[{"role": "Viewer", "permission": 1}]',
      required: function() {
        return this.operation === 'dashboard_permissions_set';
      },
      showWhen: function() {
        return this.operation === 'dashboard_permissions_set';
      },
      tooltip: 'Array of permission objects'
    },
    {
      label: 'Playlist Name',
      field: 'playlistName',
      type: 'text',
      placeholder: 'Operations Dashboards',
      required: function() {
        return this.operation === 'playlist_create';
      },
      showWhen: function() {
        return this.operation === 'playlist_create';
      }
    },
    {
      label: 'Playlist Items',
      field: 'items',
      type: 'json',
      placeholder: '[{"type": "dashboard", "value": "uid1", "order": 1}]',
      required: function() {
        return this.operation === 'playlist_create';
      },
      showWhen: function() {
        return this.operation === 'playlist_create';
      },
      tooltip: 'Array of playlist items'
    },
    {
      label: 'Plugin ID',
      field: 'pluginId',
      type: 'text',
      placeholder: 'grafana-piechart-panel',
      required: function() {
        return this.operation === 'plugin_manage';
      },
      showWhen: function() {
        return this.operation === 'plugin_manage';
      }
    },
    {
      label: 'Plugin Action',
      field: 'action',
      type: 'select',
      options: [
        { value: 'install', label: 'Install' },
        { value: 'update', label: 'Update' },
        { value: 'uninstall', label: 'Uninstall' },
        { value: 'enable', label: 'Enable' },
        { value: 'disable', label: 'Disable' }
      ],
      defaultValue: 'install',
      required: function() {
        return this.operation === 'plugin_manage';
      },
      showWhen: function() {
        return this.operation === 'plugin_manage';
      }
    },
    {
      label: 'Report Format',
      field: 'format',
      type: 'select',
      options: [
        { value: 'pdf', label: 'PDF' },
        { value: 'png', label: 'PNG' },
        { value: 'csv', label: 'CSV' }
      ],
      defaultValue: 'pdf',
      showWhen: function() {
        return this.operation === 'report_generate';
      }
    },
    {
      label: 'Variables',
      field: 'variables',
      type: 'json',
      placeholder: '[{"name": "server", "type": "query", "query": "label_values(node)"}]',
      required: function() {
        return this.operation === 'variables_config';
      },
      showWhen: function() {
        return this.operation === 'variables_config';
      },
      tooltip: 'Dashboard template variables configuration'
    },
    {
      label: 'Limit',
      field: 'limit',
      type: 'number',
      placeholder: '100',
      defaultValue: 100,
      showWhen: function() {
        const limitOps = [
          'dashboard_list', 'dashboard_search', 'user_list',
          'alert_rule_list', 'annotation_get', 'annotation_search'
        ];
        return limitOps.includes(this.operation);
      }
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};

    // Dashboard UID validation
    if (config.dashboardUid && !/^[a-zA-Z0-9_\-]+$/.test(String(config.dashboardUid))) {
      errors.dashboardUid = 'Dashboard UID can only contain letters, numbers, underscores, and hyphens';
    }

    // Frequency validation
    if (config.frequency && !/^\d+[smhd]$/.test(String(config.frequency))) {
      errors.frequency = 'Invalid frequency format (e.g., 5m, 1h, 1d)';
    }

    // Email validation
    if (config.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(config.email))) {
      errors.email = 'Invalid email format';
    }

    // Tags validation
    if (config.tags && String(config.tags).length > 255) {
      errors.tags = 'Tags cannot exceed 255 characters';
    }

    // Base URL validation
    if (config.baseUrl) {
      try {
        new URL(String(config.baseUrl));
      } catch {
        errors.baseUrl = 'Please enter a valid URL';
      }
    }

    // Data source URL validation
    if (config.url) {
      try {
        new URL(String(config.url));
      } catch {
        errors.url = 'Please enter a valid URL';
      }
    }

    // Limit validation
    if (config.limit !== undefined && config.limit !== null) {
      const num = typeof config.limit === 'string' ? parseInt(config.limit, 10) : Number(config.limit);
      if (isNaN(num) || num < 1 || num > 5000) {
        errors.limit = 'Limit must be between 1 and 5000';
      }
    }

    return errors;
  },

  examples: [
    {
      name: 'Create Infrastructure Dashboard',
      description: 'Create a new dashboard for infrastructure monitoring',
      config: {
        operation: 'dashboard_create',
        title: 'Infrastructure Overview',
        dashboardJson: {
          panels: [
            {
              title: 'CPU Usage',
              type: 'graph',
              targets: [{ expr: 'rate(cpu_usage[5m])' }]
            },
            {
              title: 'Memory Usage',
              type: 'graph',
              targets: [{ expr: 'memory_usage_bytes' }]
            }
          ],
          time: { from: 'now-6h', to: 'now' },
          refresh: '5s'
        },
        folderId: 0,
        overwrite: false
      }
    },
    {
      name: 'Configure Prometheus Data Source',
      description: 'Add Prometheus as a data source',
      config: {
        operation: 'datasource_add',
        name: 'Prometheus Production',
        type: 'prometheus',
        url: 'http://prometheus:9090',
        access: 'proxy',
        isDefault: true
      }
    },
    {
      name: 'Create CPU Alert',
      description: 'Alert when CPU usage exceeds 80%',
      config: {
        operation: 'alert_rule_create',
        alertName: 'High CPU Usage',
        condition: {
          query: {
            model: { expr: 'avg(cpu_usage)' },
            reducer: 'avg',
            evaluator: { type: 'gt', params: [80] }
          }
        },
        frequency: '5m',
        handler: 1,
        noDataState: 'alerting',
        executionErrorState: 'alerting'
      }
    },
    {
      name: 'Create Deployment Annotation',
      description: 'Mark deployment events on dashboards',
      config: {
        operation: 'annotation_create',
        text: 'Version 2.0.0 deployed to production',
        tags: 'deployment, production, v2.0.0',
        dashboardId: 0,
        time: Date.now()
      }
    }
  ]
};