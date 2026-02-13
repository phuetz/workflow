import { NodeConfigDefinition } from '../../../types/nodeConfig';

export const datadogConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'API Key',
      field: 'apiKey',
      type: 'password',
      required: true,
      placeholder: 'Enter your Datadog API key',
      tooltip: 'Datadog API key for authentication'
    },
    {
      label: 'Application Key',
      field: 'appKey',
      type: 'password',
      required: true,
      placeholder: 'Enter your Datadog Application key',
      tooltip: 'Datadog Application key for authentication'
    },
    {
      label: 'Datadog Site',
      field: 'site',
      type: 'select',
      options: [
        { value: 'datadoghq.com', label: 'US1 (datadoghq.com)' },
        { value: 'us3.datadoghq.com', label: 'US3 (us3.datadoghq.com)' },
        { value: 'us5.datadoghq.com', label: 'US5 (us5.datadoghq.com)' },
        { value: 'datadoghq.eu', label: 'EU (datadoghq.eu)' },
        { value: 'ap1.datadoghq.com', label: 'AP1 (ap1.datadoghq.com)' },
        { value: 'ddog-gov.com', label: 'US1-FED (ddog-gov.com)' }
      ],
      defaultValue: 'datadoghq.com',
      required: true,
      tooltip: 'Your Datadog site/region'
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      options: [
        // Metrics & Monitoring
        { value: 'send_custom_metrics', label: 'Send Custom Metrics' },
        { value: 'query_metrics', label: 'Query Metrics' },
        { value: 'get_metric_metadata', label: 'Get Metric Metadata' },
        { value: 'list_active_metrics', label: 'List Active Metrics' },
        { value: 'submit_distribution_metrics', label: 'Submit Distribution Metrics' },
        { value: 'create_custom_check', label: 'Create Custom Check' },
        { value: 'update_metric_tags', label: 'Update Metric Tags' },
        { value: 'get_metric_timeseries', label: 'Get Metric Timeseries' },
        
        // Infrastructure Monitoring
        { value: 'get_host_info', label: 'Get Host Info' },
        { value: 'list_hosts', label: 'List Hosts' },
        { value: 'mute_host', label: 'Mute Host' },
        { value: 'add_host_tags', label: 'Add Host Tags' },
        { value: 'get_infrastructure_map', label: 'Get Infrastructure Map' },
        { value: 'monitor_process', label: 'Monitor Process' },
        { value: 'container_monitoring', label: 'Container Monitoring' },
        { value: 'network_performance', label: 'Network Performance' },
        
        // Dashboard Management
        { value: 'create_dashboard', label: 'Create Dashboard' },
        { value: 'update_dashboard', label: 'Update Dashboard' },
        { value: 'get_dashboard', label: 'Get Dashboard' },
        { value: 'list_dashboards', label: 'List Dashboards' },
        { value: 'delete_dashboard', label: 'Delete Dashboard' },
        { value: 'share_dashboard', label: 'Share Dashboard' },
        { value: 'create_screenboard', label: 'Create Screenboard' },
        { value: 'create_timeboard', label: 'Create Timeboard' },
        
        // Alerting & Notifications
        { value: 'create_monitor', label: 'Create Monitor' },
        { value: 'update_monitor', label: 'Update Monitor' },
        { value: 'get_monitor', label: 'Get Monitor' },
        { value: 'list_monitors', label: 'List Monitors' },
        { value: 'delete_monitor', label: 'Delete Monitor' },
        { value: 'mute_monitor', label: 'Mute Monitor' },
        { value: 'resolve_monitor', label: 'Resolve Monitor' },
        { value: 'get_monitor_status', label: 'Get Monitor Status' },
        { value: 'create_downtime', label: 'Create Downtime' },
        { value: 'cancel_downtime', label: 'Cancel Downtime' },
        
        // Log Management
        { value: 'send_logs', label: 'Send Logs' },
        { value: 'search_logs', label: 'Search Logs' },
        { value: 'get_log_archives', label: 'Get Log Archives' },
        { value: 'create_log_pipeline', label: 'Create Log Pipeline' },
        { value: 'set_log_retention', label: 'Set Log Retention' },
        { value: 'create_log_metric', label: 'Create Log Metric' },
        { value: 'get_log_indexes', label: 'Get Log Indexes' },
        
        // APM & Traces
        { value: 'send_traces', label: 'Send Traces' },
        { value: 'query_traces', label: 'Query Traces' },
        { value: 'get_service_map', label: 'Get Service Map' },
        { value: 'get_service_performance', label: 'Get Service Performance' },
        { value: 'create_service_check', label: 'Create Service Check' },
        { value: 'get_error_tracking', label: 'Get Error Tracking' },
        
        // Synthetic Monitoring
        { value: 'create_synthetic_test', label: 'Create Synthetic Test' },
        { value: 'update_synthetic_test', label: 'Update Synthetic Test' },
        { value: 'get_test_results', label: 'Get Test Results' },
        { value: 'list_synthetic_tests', label: 'List Synthetic Tests' },
        { value: 'pause_synthetic_test', label: 'Pause Synthetic Test' },
        { value: 'get_global_variables', label: 'Get Global Variables' },
        
        // Security Monitoring
        { value: 'create_security_rule', label: 'Create Security Rule' },
        { value: 'get_security_signals', label: 'Get Security Signals' },
        { value: 'list_security_rules', label: 'List Security Rules' },
        { value: 'update_security_rule', label: 'Update Security Rule' }
      ],
      defaultValue: 'send_custom_metrics',
      tooltip: 'The operation to perform in Datadog'
    },
    {
      label: 'Metric Name',
      field: 'metricName',
      type: 'text',
      placeholder: 'custom.metric.cpu_usage',
      required: function(config) {
        const metricOps = [
          'send_custom_metrics', 'query_metrics', 'get_metric_metadata',
          'update_metric_tags', 'get_metric_timeseries', 'submit_distribution_metrics'
        ];
        return metricOps.includes(config?.operation as string);
      },
      tooltip: 'Name of the metric (dots for namespacing)'
    },
    {
      label: 'Metric Value',
      field: 'value',
      type: 'number',
      placeholder: '85.5',
      required: function(config) {
        return ['send_custom_metrics', 'submit_distribution_metrics'].includes(config?.operation as string);
      },
      showWhen: function(config) {
        return ['send_custom_metrics', 'submit_distribution_metrics'].includes(config?.operation as string);
      }
    },
    {
      label: 'Metric Type',
      field: 'metricType',
      type: 'select',
      options: [
        { value: 'gauge', label: 'Gauge' },
        { value: 'count', label: 'Count' },
        { value: 'rate', label: 'Rate' },
        { value: 'histogram', label: 'Histogram' },
        { value: 'distribution', label: 'Distribution' }
      ],
      defaultValue: 'gauge',
      required: function(config) {
        return config?.operation === 'send_custom_metrics';
      },
      showWhen: function(config) {
        return config?.operation === 'send_custom_metrics';
      }
    },
    {
      label: 'Tags',
      field: 'tags',
      type: 'text',
      placeholder: 'env:production,app:web,version:2.0',
      required: false,
      showWhen: function(config) {
        const tagOps = [
          'send_custom_metrics', 'query_metrics', 'add_host_tags',
          'update_metric_tags', 'send_logs', 'send_traces',
          'create_monitor', 'search_logs'
        ];
        return tagOps.includes(config?.operation as string);
      },
      tooltip: 'Comma-separated list of tags (key:value pairs)'
    },
    {
      label: 'Query',
      field: 'query',
      type: 'text',
      placeholder: 'avg:system.cpu.user{*} by {host}',
      required: function(config) {
        const queryOps = [
          'query_metrics', 'create_monitor', 'update_monitor',
          'search_logs', 'query_traces'
        ];
        return queryOps.includes(config?.operation as string);
      },
      showWhen: function(config) {
        const queryOps = [
          'query_metrics', 'create_monitor', 'update_monitor',
          'search_logs', 'query_traces', 'get_metric_timeseries'
        ];
        return queryOps.includes(config?.operation as string);
      },
      tooltip: 'Datadog query language syntax'
    },
    {
      label: 'Time Range',
      field: 'timeRange',
      type: 'select',
      options: [
        { value: 'past_5_minutes', label: 'Past 5 Minutes' },
        { value: 'past_15_minutes', label: 'Past 15 Minutes' },
        { value: 'past_1_hour', label: 'Past 1 Hour' },
        { value: 'past_4_hours', label: 'Past 4 Hours' },
        { value: 'past_1_day', label: 'Past 1 Day' },
        { value: 'past_2_days', label: 'Past 2 Days' },
        { value: 'past_1_week', label: 'Past 1 Week' },
        { value: 'past_1_month', label: 'Past 1 Month' }
      ],
      defaultValue: 'past_1_hour',
      showWhen: function(config) {
        const timeOps = [
          'query_metrics', 'get_metric_timeseries', 'search_logs',
          'query_traces', 'get_service_performance'
        ];
        return timeOps.includes(config?.operation as string);
      }
    },
    {
      label: 'Custom Time Range',
      field: 'customTimeRange',
      type: 'json',
      placeholder: '{"from": 1609459200, "to": 1609545600}',
      required: false,
      showWhen: function(config) {
        const timeOps = [
          'query_metrics', 'get_metric_timeseries', 'search_logs',
          'query_traces'
        ];
        return timeOps.includes(config?.operation as string);
      },
      tooltip: 'Unix timestamps for custom time range'
    },
    {
      label: 'Host Name',
      field: 'hostname',
      type: 'text',
      placeholder: 'web-server-01',
      required: function(config) {
        const hostOps = [
          'get_host_info', 'mute_host', 'add_host_tags',
          'monitor_process'
        ];
        return hostOps.includes(config?.operation as string);
      },
      showWhen: function(config) {
        const hostOps = [
          'get_host_info', 'list_hosts', 'mute_host', 'add_host_tags',
          'monitor_process'
        ];
        return hostOps.includes(config?.operation as string);
      }
    },
    {
      label: 'Dashboard ID',
      field: 'dashboardId',
      type: 'text',
      placeholder: 'abc-123-def',
      required: function(config) {
        const dashOps = [
          'update_dashboard', 'get_dashboard', 'delete_dashboard',
          'share_dashboard'
        ];
        return dashOps.includes(config?.operation as string);
      },
      showWhen: function(config) {
        const dashOps = [
          'update_dashboard', 'get_dashboard', 'delete_dashboard',
          'share_dashboard'
        ];
        return dashOps.includes(config?.operation as string);
      }
    },
    {
      label: 'Dashboard Title',
      field: 'title',
      type: 'text',
      placeholder: 'Application Performance Dashboard',
      required: function(config) {
        return ['create_dashboard', 'create_screenboard', 'create_timeboard'].includes(config?.operation as string);
      },
      showWhen: function(config) {
        const dashOps = [
          'create_dashboard', 'update_dashboard', 'create_screenboard',
          'create_timeboard'
        ];
        return dashOps.includes(config?.operation as string);
      }
    },
    {
      label: 'Dashboard Definition',
      field: 'dashboardDefinition',
      type: 'json',
      placeholder: '{"widgets": [], "layout_type": "ordered"}',
      required: function(config) {
        return ['create_dashboard', 'update_dashboard'].includes(config?.operation as string);
      },
      showWhen: function(config) {
        return ['create_dashboard', 'update_dashboard', 'create_screenboard', 'create_timeboard'].includes(config?.operation as string);
      },
      tooltip: 'Complete dashboard JSON definition'
    },
    {
      label: 'Monitor Name',
      field: 'monitorName',
      type: 'text',
      placeholder: 'High CPU Usage Alert',
      required: function(config) {
        return ['create_monitor', 'update_monitor'].includes(config?.operation as string);
      },
      showWhen: function(config) {
        const monitorOps = [
          'create_monitor', 'update_monitor', 'get_monitor',
          'delete_monitor', 'mute_monitor', 'resolve_monitor'
        ];
        return monitorOps.includes(config?.operation as string);
      }
    },
    {
      label: 'Monitor ID',
      field: 'monitorId',
      type: 'number',
      placeholder: '12345',
      required: function(config) {
        const monitorIdOps = [
          'update_monitor', 'get_monitor', 'delete_monitor',
          'mute_monitor', 'resolve_monitor', 'get_monitor_status'
        ];
        return monitorIdOps.includes(config?.operation as string);
      },
      showWhen: function(config) {
        const monitorIdOps = [
          'update_monitor', 'get_monitor', 'delete_monitor',
          'mute_monitor', 'resolve_monitor', 'get_monitor_status'
        ];
        return monitorIdOps.includes(config?.operation as string);
      }
    },
    {
      label: 'Monitor Type',
      field: 'monitorType',
      type: 'select',
      options: [
        { value: 'metric', label: 'Metric' },
        { value: 'log', label: 'Log' },
        { value: 'apm', label: 'APM' },
        { value: 'synthetic', label: 'Synthetic' },
        { value: 'process', label: 'Process' },
        { value: 'network', label: 'Network' },
        { value: 'rum', label: 'Real User Monitoring' },
        { value: 'event', label: 'Event' },
        { value: 'composite', label: 'Composite' }
      ],
      defaultValue: 'metric',
      required: function(config) {
        return config?.operation === 'create_monitor';
      },
      showWhen: function(config) {
        return ['create_monitor', 'list_monitors'].includes(config?.operation as string);
      }
    },
    {
      label: 'Alert Message',
      field: 'message',
      type: 'textarea',
      placeholder: 'CPU usage is above {{threshold}} on {{host.name}}',
      required: function(config) {
        return ['create_monitor', 'update_monitor'].includes(config?.operation as string);
      },
      showWhen: function(config) {
        return ['create_monitor', 'update_monitor'].includes(config?.operation as string);
      },
      tooltip: 'Message template with variables'
    },
    {
      label: 'Thresholds',
      field: 'thresholds',
      type: 'json',
      placeholder: '{"critical": 90, "warning": 80}',
      required: function(config) {
        return config?.operation === 'create_monitor';
      },
      showWhen: function(config) {
        return ['create_monitor', 'update_monitor'].includes(config?.operation as string);
      }
    },
    {
      label: 'Log Content',
      field: 'logs',
      type: 'json',
      placeholder: '[{"message": "Error occurred", "level": "error", "service": "api"}]',
      required: function(config) {
        return config?.operation === 'send_logs';
      },
      showWhen: function(config) {
        return config?.operation === 'send_logs';
      },
      tooltip: 'Array of log entries to send'
    },
    {
      label: 'Log Index',
      field: 'index',
      type: 'text',
      placeholder: 'main',
      defaultValue: 'main',
      showWhen: function(config) {
        const logOps = [
          'search_logs', 'get_log_archives', 'set_log_retention',
          'get_log_indexes'
        ];
        return logOps.includes(config?.operation as string);
      }
    },
    {
      label: 'Pipeline Name',
      field: 'pipelineName',
      type: 'text',
      placeholder: 'Apache Access Logs',
      required: function(config) {
        return config?.operation === 'create_log_pipeline';
      },
      showWhen: function(config) {
        return config?.operation === 'create_log_pipeline';
      }
    },
    {
      label: 'Pipeline Processors',
      field: 'processors',
      type: 'json',
      placeholder: '[{"type": "grok-parser", "source": "message"}]',
      required: function(config) {
        return config?.operation === 'create_log_pipeline';
      },
      showWhen: function(config) {
        return config?.operation === 'create_log_pipeline';
      }
    },
    {
      label: 'Retention Days',
      field: 'retentionDays',
      type: 'number',
      placeholder: '30',
      required: function(config) {
        return config?.operation === 'set_log_retention';
      },
      showWhen: function(config) {
        return config?.operation === 'set_log_retention';
      },
      tooltip: 'Number of days to retain logs (1-1825)',
      validation: (value) => {
        const num = typeof value === 'string' ? parseInt(value, 10) : (value as number);
        if (num < 1 || num > 1825) {
          return 'Retention days must be between 1 and 1825';
        }
        return null;
      }
    },
    {
      label: 'Traces',
      field: 'traces',
      type: 'json',
      placeholder: '[{"trace_id": "123", "spans": [...]}]',
      required: function(config) {
        return config?.operation === 'send_traces';
      },
      showWhen: function(config) {
        return config?.operation === 'send_traces';
      },
      tooltip: 'Array of trace data to send'
    },
    {
      label: 'Service Name',
      field: 'service',
      type: 'text',
      placeholder: 'web-api',
      required: function(config) {
        const serviceOps = [
          'get_service_map', 'get_service_performance', 'create_service_check',
          'send_traces', 'query_traces'
        ];
        return serviceOps.includes(config?.operation as string);
      },
      showWhen: function(config) {
        const serviceOps = [
          'get_service_map', 'get_service_performance', 'create_service_check',
          'send_traces', 'query_traces', 'get_error_tracking'
        ];
        return serviceOps.includes(config?.operation as string);
      }
    },
    {
      label: 'Check Status',
      field: 'status',
      type: 'select',
      options: [
        { value: '0', label: 'OK' },
        { value: '1', label: 'Warning' },
        { value: '2', label: 'Critical' },
        { value: '3', label: 'Unknown' }
      ],
      defaultValue: '0',
      required: function(config) {
        return ['create_service_check', 'create_custom_check'].includes(config?.operation as string);
      },
      showWhen: function(config) {
        return ['create_service_check', 'create_custom_check'].includes(config?.operation as string);
      }
    },
    {
      label: 'Synthetic Test Type',
      field: 'testType',
      type: 'select',
      options: [
        { value: 'api', label: 'API Test' },
        { value: 'browser', label: 'Browser Test' },
        { value: 'tcp', label: 'TCP Test' },
        { value: 'dns', label: 'DNS Test' },
        { value: 'ssl', label: 'SSL Test' },
        { value: 'icmp', label: 'ICMP Test' },
        { value: 'udp', label: 'UDP Test' },
        { value: 'websocket', label: 'WebSocket Test' },
        { value: 'grpc', label: 'gRPC Test' }
      ],
      defaultValue: 'api',
      required: function(config) {
        return config?.operation === 'create_synthetic_test';
      },
      showWhen: function(config) {
        return ['create_synthetic_test', 'update_synthetic_test'].includes(config?.operation as string);
      }
    },
    {
      label: 'Test Configuration',
      field: 'testConfig',
      type: 'json',
      placeholder: '{"request": {"url": "https://api.example.com", "method": "GET"}}',
      required: function(config) {
        return ['create_synthetic_test', 'update_synthetic_test'].includes(config?.operation as string);
      },
      showWhen: function(config) {
        return ['create_synthetic_test', 'update_synthetic_test'].includes(config?.operation as string);
      }
    },
    {
      label: 'Test ID',
      field: 'testId',
      type: 'text',
      placeholder: 'abc-123-def',
      required: function(config) {
        const testIdOps = [
          'update_synthetic_test', 'get_test_results', 'pause_synthetic_test'
        ];
        return testIdOps.includes(config?.operation as string);
      },
      showWhen: function(config) {
        const testIdOps = [
          'update_synthetic_test', 'get_test_results', 'pause_synthetic_test',
          'list_synthetic_tests'
        ];
        return testIdOps.includes(config?.operation as string);
      }
    },
    {
      label: 'Security Rule Name',
      field: 'ruleName',
      type: 'text',
      placeholder: 'Suspicious Login Attempts',
      required: function(config) {
        return ['create_security_rule', 'update_security_rule'].includes(config?.operation as string);
      },
      showWhen: function(config) {
        const secOps = [
          'create_security_rule', 'update_security_rule', 'list_security_rules'
        ];
        return secOps.includes(config?.operation as string);
      }
    },
    {
      label: 'Security Rule Query',
      field: 'securityQuery',
      type: 'text',
      placeholder: '@evt.name:authentication @evt.outcome:failure',
      required: function(config) {
        return ['create_security_rule', 'update_security_rule'].includes(config?.operation as string);
      },
      showWhen: function(config) {
        return ['create_security_rule', 'update_security_rule', 'get_security_signals'].includes(config?.operation as string);
      }
    },
    {
      label: 'Downtime Message',
      field: 'downtimeMessage',
      type: 'text',
      placeholder: 'Scheduled maintenance window',
      required: false,
      showWhen: function(config) {
        return config?.operation === 'create_downtime';
      }
    },
    {
      label: 'Downtime Scope',
      field: 'scope',
      type: 'text',
      placeholder: 'env:production AND host:web-*',
      required: function(config) {
        return config?.operation === 'create_downtime';
      },
      showWhen: function(config) {
        return config?.operation === 'create_downtime';
      },
      tooltip: 'Scope of hosts/services to mute'
    },
    {
      label: 'Start Time',
      field: 'startTime',
      type: 'text',
      placeholder: '2024-01-01T00:00:00Z',
      required: function(config) {
        return config?.operation === 'create_downtime';
      },
      showWhen: function(config) {
        return config?.operation === 'create_downtime';
      },
      tooltip: 'ISO 8601 format (e.g., 2024-01-01T00:00:00Z)'
    },
    {
      label: 'End Time',
      field: 'endTime',
      type: 'text',
      placeholder: '2024-01-02T00:00:00Z',
      required: false,
      showWhen: function(config) {
        return config?.operation === 'create_downtime';
      },
      tooltip: 'ISO 8601 format. Leave empty for indefinite downtime'
    },
    {
      label: 'Downtime ID',
      field: 'downtimeId',
      type: 'number',
      placeholder: '12345',
      required: function(config) {
        return config?.operation === 'cancel_downtime';
      },
      showWhen: function(config) {
        return config?.operation === 'cancel_downtime';
      }
    },
    {
      label: 'Include Inactive',
      field: 'includeInactive',
      type: 'boolean',
      defaultValue: false,
      showWhen: function(config) {
        return ['list_hosts', 'list_monitors', 'list_dashboards'].includes(config?.operation as string);
      }
    },
    {
      label: 'Limit',
      field: 'limit',
      type: 'number',
      placeholder: '100',
      defaultValue: 100,
      showWhen: function(config) {
        const limitOps = [
          'list_hosts', 'list_monitors', 'list_dashboards',
          'search_logs', 'query_traces', 'list_synthetic_tests',
          'list_security_rules', 'get_security_signals'
        ];
        return limitOps.includes(config?.operation as string);
      },
      tooltip: 'Maximum number of results to return (1-1000)',
      validation: (value) => {
        const num = typeof value === 'string' ? parseInt(value, 10) : (value as number);
        if (num < 1 || num > 1000) {
          return 'Limit must be between 1 and 1000';
        }
        return null;
      }
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};

    // Validate metric name
    if (config.metricName) {
      const metricName = config.metricName as string;
      if (!/^[a-zA-Z][a-zA-Z0-9_\.]*$/.test(metricName)) {
        errors.metricName = 'Metric name must start with a letter and contain only letters, numbers, underscores, and dots';
      } else if (metricName.length > 200) {
        errors.metricName = 'Metric name cannot exceed 200 characters';
      }
    }

    // Validate tags
    if (config.tags) {
      const tagsStr = config.tags as string;
      const tags = tagsStr.split(',').map(t => t.trim());
      for (const tag of tags) {
        if (!tag.includes(':')) {
          errors.tags = `Invalid tag format: ${tag}. Tags must be key:value pairs`;
          break;
        }
        if (tag.length > 200) {
          errors.tags = 'Individual tags cannot exceed 200 characters';
          break;
        }
      }
    }

    // Validate query
    if (config.query) {
      const query = config.query as string;
      if (query.length > 1024) {
        errors.query = 'Query cannot exceed 1024 characters';
      }
    }

    // Validate hostname
    if (config.hostname) {
      const hostname = config.hostname as string;
      if (!/^[a-zA-Z0-9\-\.]+$/.test(hostname)) {
        errors.hostname = 'Hostname can only contain letters, numbers, hyphens, and dots';
      }
    }

    return errors;
  },

  examples: [
    {
      name: 'Send Custom Metric',
      description: 'Send application performance metric',
      config: {
        operation: 'send_custom_metrics',
        metricName: 'app.api.response_time',
        value: 125.5,
        metricType: 'gauge',
        tags: 'env:production,endpoint:users,method:GET'
      }
    },
    {
      name: 'Create CPU Monitor',
      description: 'Alert when CPU usage is high',
      config: {
        operation: 'create_monitor',
        monitorName: 'High CPU Usage on Web Servers',
        monitorType: 'metric',
        query: 'avg(last_5m):avg:system.cpu.user{role:web} by {host} > 0.8',
        message: 'CPU usage is {{value}} on {{host.name}} @slack-ops-alerts',
        thresholds: { critical: 0.8, warning: 0.7 },
        tags: 'team:backend,severity:high'
      }
    },
    {
      name: 'Search Application Logs',
      description: 'Find error logs in the last hour',
      config: {
        operation: 'search_logs',
        query: 'status:error service:api @http.status_code:>=500',
        timeRange: 'past_1_hour',
        index: 'main',
        limit: 100
      }
    },
    {
      name: 'Create API Synthetic Test',
      description: 'Monitor API endpoint availability',
      config: {
        operation: 'create_synthetic_test',
        testType: 'api',
        testConfig: {
          name: 'API Health Check',
          request: {
            url: 'https://api.example.com/health',
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          },
          assertions: [
            { type: 'statusCode', operator: 'is', target: 200 },
            { type: 'responseTime', operator: 'lessThan', target: 1000 }
          ],
          locations: ['aws:us-east-1', 'aws:eu-west-1'],
          frequency: 300
        },
        tags: 'env:production,critical:true'
      }
    }
  ]
};