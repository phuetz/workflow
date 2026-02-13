import { NodeConfigDefinition, validators } from '../../../types/nodeConfig';

export const googleAnalyticsConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'Analytics Version',
      field: 'analyticsVersion',
      type: 'select',
      required: true,
      defaultValue: 'ga4',
      options: [
        { value: 'ga4', label: 'Google Analytics 4 (GA4) - Recommended' },
        { value: 'universal', label: 'Universal Analytics (Legacy)' }
      ]
    },
    {
      label: 'Authentication Method',
      field: 'authMethod',
      type: 'select',
      required: true,
      defaultValue: 'service_account',
      options: [
        { value: 'service_account', label: 'Service Account (Recommended)' },
        { value: 'oauth', label: 'OAuth 2.0' },
        { value: 'api_key', label: 'API Key (Limited)' }
      ]
    },
    {
      label: 'Service Account Key',
      field: 'serviceAccountKey',
      type: 'password',
      placeholder: 'JSON service account key',
      description: 'Google Cloud service account JSON key',
      validation: (value) => {
        if (value) {
          try {
            JSON.parse(value as string);
            return null;
          } catch (e) {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },
    {
      label: 'OAuth Access Token',
      field: 'accessToken',
      type: 'password',
      placeholder: 'ya29.a0...',
      description: 'OAuth 2.0 access token',
      validation: null
    },
    {
      label: 'Refresh Token',
      field: 'refreshToken',
      type: 'password',
      placeholder: '1//0G...',
      description: 'OAuth refresh token for token renewal'
    },
    {
      label: 'API Key',
      field: 'apiKey',
      type: 'password',
      placeholder: 'AIza...',
      description: 'Google API key (limited functionality)',
      validation: null
    },
    {
      label: 'Property ID (GA4)',
      field: 'propertyId',
      type: 'text',
      placeholder: '123456789',
      description: 'GA4 Property ID (found in Admin > Property Settings)',
      validation: (value) => {
        if (value && !/^\d+$/.test(value as string)) {
          return 'Property ID should be numeric';
        }
        return null;
      }
    },
    {
      label: 'View ID (Universal Analytics)',
      field: 'viewId',
      type: 'text',
      placeholder: '123456789',
      description: 'Universal Analytics View ID',
      validation: (value) => {
        if (value && !/^\d+$/.test(value as string)) {
          return 'View ID should be numeric';
        }
        return null;
      }
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      defaultValue: 'getRealtimeReport',
      options: [
        { value: 'getRealtimeReport', label: 'Get Realtime Report (GA4)' },
        { value: 'getAnalyticsReport', label: 'Get Analytics Report (GA4)' },
        { value: 'getUniversalReport', label: 'Get Universal Analytics Report' },
        { value: 'getAudienceReport', label: 'Get Audience Report' },
        { value: 'getAcquisitionReport', label: 'Get Acquisition Report' },
        { value: 'getBehaviorReport', label: 'Get Behavior Report' },
        { value: 'getConversionsReport', label: 'Get Conversions Report' },
        { value: 'getEcommerceReport', label: 'Get E-commerce Report' },
        { value: 'getCustomReport', label: 'Get Custom Report' },
        { value: 'listProperties', label: 'List GA4 Properties' },
        { value: 'listAccounts', label: 'List Analytics Accounts' },
        { value: 'getMetadata', label: 'Get Dimensions & Metrics Metadata' },
        { value: 'createCustomDimension', label: 'Create Custom Dimension' },
        { value: 'createCustomMetric', label: 'Create Custom Metric' },
        { value: 'createAudience', label: 'Create Audience' },
        { value: 'createConversionEvent', label: 'Create Conversion Event' },
        { value: 'getGoals', label: 'Get Goals (Universal Analytics)' },
        { value: 'createGoal', label: 'Create Goal (Universal Analytics)' },
        { value: 'sendEvent', label: 'Send Custom Event (Measurement Protocol)' },
        { value: 'sendPageview', label: 'Send Pageview (Measurement Protocol)' },
        { value: 'sendEcommerce', label: 'Send E-commerce Data' }
      ]
    },
    {
      label: 'Date Range',
      field: 'dateRange',
      type: 'select',
      defaultValue: 'last_7_days',
      options: [
        { value: 'today', label: 'Today' },
        { value: 'yesterday', label: 'Yesterday' },
        { value: 'last_7_days', label: 'Last 7 days' },
        { value: 'last_30_days', label: 'Last 30 days' },
        { value: 'last_90_days', label: 'Last 90 days' },
        { value: 'this_month', label: 'This month' },
        { value: 'last_month', label: 'Last month' },
        { value: 'this_year', label: 'This year' },
        { value: 'custom', label: 'Custom Range' }
      ]
    },
    {
      label: 'Start Date',
      field: 'startDate',
      type: 'text',
      placeholder: '2024-01-01',
      description: 'Start date (YYYY-MM-DD format)',
      validation: (value) => {
        if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value as string)) {
          return 'Date must be in YYYY-MM-DD format';
        }
        return null;
      }
    },
    {
      label: 'End Date',
      field: 'endDate',
      type: 'text',
      placeholder: '2024-01-31',
      description: 'End date (YYYY-MM-DD format)',
      validation: (value) => {
        if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value as string)) {
          return 'Date must be in YYYY-MM-DD format';
        }
        return null;
      }
    },
    {
      label: 'Metrics',
      field: 'metrics',
      type: 'json',
      placeholder: '["activeUsers", "sessions", "pageviews", "bounceRate"]',
      description: 'Array of metric names to retrieve',
      validation: validators.json
    },
    {
      label: 'Dimensions',
      field: 'dimensions',
      type: 'json',
      placeholder: '["country", "deviceCategory", "channelGrouping"]',
      description: 'Array of dimension names for grouping',
      validation: validators.json
    },
    {
      label: 'Filters',
      field: 'filters',
      type: 'json',
      placeholder: '{"dimensionFilter": {"filter": {"fieldName": "country", "stringFilter": {"value": "United States", "matchType": "EXACT"}}}}',
      description: 'Filter conditions for the report',
      validation: validators.json
    },
    {
      label: 'Order By',
      field: 'orderBy',
      type: 'json',
      placeholder: '[{"metric": {"metricName": "activeUsers"}, "desc": true}]',
      description: 'Sort order for results',
      validation: validators.json
    },
    {
      label: 'Limit',
      field: 'limit',
      type: 'number',
      placeholder: '1000',
      defaultValue: 1000,
      description: 'Maximum number of rows to return'
    },
    {
      label: 'Offset',
      field: 'offset',
      type: 'number',
      placeholder: '0',
      defaultValue: 0,
      description: 'Number of rows to skip (pagination)'
    },
    {
      label: 'Cohort Date Range',
      field: 'cohortDateRange',
      type: 'select',
      defaultValue: 'WEEKLY',
      options: [
        { value: 'DAILY', label: 'Daily' },
        { value: 'WEEKLY', label: 'Weekly' },
        { value: 'MONTHLY', label: 'Monthly' }
      ]
    },
    {
      label: 'Segment ID',
      field: 'segmentId',
      type: 'text',
      placeholder: 'gaid::-1',
      description: 'Analytics segment ID (e.g., gaid::-1 for all users)'
    },
    {
      label: 'Sampling Level',
      field: 'samplingLevel',
      type: 'select',
      defaultValue: 'DEFAULT',
      options: [
        { value: 'DEFAULT', label: 'Default' },
        { value: 'SMALL', label: 'Small (faster, less accurate)' },
        { value: 'LARGE', label: 'Large (slower, more accurate)' }
      ]
    },
    {
      label: 'Include Empty Rows',
      field: 'includeEmptyRows',
      type: 'checkbox',
      defaultValue: false,
      description: 'Include rows with zero values'
    },
    {
      label: 'Hide Totals',
      field: 'hideTotals',
      type: 'checkbox',
      defaultValue: false,
      description: 'Hide totals row from response'
    },
    {
      label: 'Hide Value Ranges',
      field: 'hideValueRanges',
      type: 'checkbox',
      defaultValue: false,
      description: 'Hide value ranges from response'
    },
    {
      label: 'Custom Dimension Name',
      field: 'customDimensionName',
      type: 'text',
      placeholder: 'User Type',
      description: 'Name for new custom dimension'
    },
    {
      label: 'Custom Dimension Scope',
      field: 'customDimensionScope',
      type: 'select',
      defaultValue: 'EVENT',
      options: [
        { value: 'EVENT', label: 'Event' },
        { value: 'USER', label: 'User' }
      ]
    },
    {
      label: 'Custom Metric Name',
      field: 'customMetricName',
      type: 'text',
      placeholder: 'Custom Conversion Rate',
      description: 'Name for new custom metric'
    },
    {
      label: 'Custom Metric Type',
      field: 'customMetricType',
      type: 'select',
      defaultValue: 'STANDARD',
      options: [
        { value: 'STANDARD', label: 'Standard' },
        { value: 'CURRENCY', label: 'Currency' },
        { value: 'TIME', label: 'Time' }
      ]
    },
    {
      label: 'Audience Name',
      field: 'audienceName',
      type: 'text',
      placeholder: 'High Value Customers',
      description: 'Name for new audience'
    },
    {
      label: 'Audience Description',
      field: 'audienceDescription',
      type: 'text',
      placeholder: 'Customers with high lifetime value',
      description: 'Description for new audience'
    },
    {
      label: 'Event Name',
      field: 'eventName',
      type: 'text',
      placeholder: 'custom_conversion',
      description: 'Event name for Measurement Protocol'
    },
    {
      label: 'Client ID',
      field: 'clientId',
      type: 'text',
      placeholder: '555.123456789.1234567890',
      description: 'Client ID for Measurement Protocol'
    },
    {
      label: 'Event Parameters',
      field: 'eventParameters',
      type: 'json',
      placeholder: '{"currency": "USD", "value": 99.99, "custom_parameter": "{{$json.value}}"}',
      description: 'Custom event parameters',
      validation: validators.json
    },
    {
      label: 'Page URL',
      field: 'pageUrl',
      type: 'text',
      placeholder: 'https://example.com/page',
      description: 'Page URL for pageview events',
      validation: validators.url
    },
    {
      label: 'Page Title',
      field: 'pageTitle',
      type: 'text',
      placeholder: 'Page Title',
      description: 'Page title for pageview events'
    },
    {
      label: 'Transaction ID',
      field: 'transactionId',
      type: 'text',
      placeholder: 'T123456',
      description: 'Unique transaction ID for e-commerce'
    },
    {
      label: 'Items',
      field: 'items',
      type: 'json',
      placeholder: '[{"item_id": "SKU123", "item_name": "Product", "category": "Electronics", "price": 99.99, "quantity": 1}]',
      description: 'Array of items for e-commerce events',
      validation: validators.json
    },
    {
      label: 'Currency',
      field: 'currency',
      type: 'select',
      defaultValue: 'USD',
      options: [
        { value: 'USD', label: 'US Dollar' },
        { value: 'EUR', label: 'Euro' },
        { value: 'GBP', label: 'British Pound' },
        { value: 'JPY', label: 'Japanese Yen' },
        { value: 'CAD', label: 'Canadian Dollar' },
        { value: 'AUD', label: 'Australian Dollar' },
        { value: 'CHF', label: 'Swiss Franc' },
        { value: 'CNY', label: 'Chinese Yuan' }
      ]
    },
    {
      label: 'Revenue',
      field: 'revenue',
      type: 'number',
      placeholder: '99.99',
      description: 'Total revenue for transaction'
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};

    // Auth validation
    switch (config.authMethod) {
      case 'service_account':
        if (!config.serviceAccountKey) {
          errors.serviceAccountKey = 'Service account key is required';
        }
        break;
      case 'oauth':
        if (!config.accessToken) {
          errors.accessToken = 'Access token is required';
        }
        break;
      case 'api_key':
        if (!config.apiKey) {
          errors.apiKey = 'API key is required';
        }
        break;
    }

    // Analytics version validation
    if (config.analyticsVersion === 'ga4' && !config.propertyId) {
      errors.propertyId = 'Property ID is required for GA4';
    } else if (config.analyticsVersion === 'universal' && !config.viewId) {
      errors.viewId = 'View ID is required for Universal Analytics';
    }

    // Date range validation
    if (config.dateRange === 'custom') {
      if (!config.startDate) errors.startDate = 'Start date is required for custom range';
      if (!config.endDate) errors.endDate = 'End date is required for custom range';
    }

    // Operation-specific validation
    switch (config.operation) {
      case 'createCustomDimension':
        if (!config.customDimensionName) {
          errors.customDimensionName = 'Custom dimension name is required';
        }
        break;
      
      case 'createCustomMetric':
        if (!config.customMetricName) {
          errors.customMetricName = 'Custom metric name is required';
        }
        break;
      
      case 'createAudience':
        if (!config.audienceName) {
          errors.audienceName = 'Audience name is required';
        }
        break;
      
      case 'sendEvent':
        if (!config.eventName) errors.eventName = 'Event name is required';
        if (!config.clientId) errors.clientId = 'Client ID is required';
        break;
      
      case 'sendPageview':
        if (!config.clientId) errors.clientId = 'Client ID is required';
        if (!config.pageUrl) errors.pageUrl = 'Page URL is required';
        break;
      
      case 'sendEcommerce':
        if (!config.clientId) errors.clientId = 'Client ID is required';
        if (!config.transactionId) errors.transactionId = 'Transaction ID is required';
        if (!config.items) errors.items = 'Items are required';
        break;
    }

    return errors;
  },

  transform: (config) => {
    // Parse JSON fields
    const jsonFields = ['metrics', 'dimensions', 'filters', 'orderBy', 'eventParameters', 'items'];
    jsonFields.forEach(field => {
      if (config[field] && typeof config[field] === 'string') {
        try {
          config[field] = JSON.parse(config[field] as string);
        } catch (e) {
          // Keep as string
        }
      }
    });

    // Parse service account key
    if (config.serviceAccountKey && typeof config.serviceAccountKey === 'string') {
      try {
        config.serviceAccountCredentials = JSON.parse(config.serviceAccountKey);
      } catch (e) {
        // Keep as string
      }
    }

    // Set API URLs based on version
    if (config.analyticsVersion === 'ga4') {
      config.apiUrl = 'https://analyticsdata.googleapis.com/v1beta';
      config.adminApiUrl = 'https://analyticsadmin.googleapis.com/v1beta';
    } else {
      config.apiUrl = 'https://analyticsreporting.googleapis.com/v4';
      config.managementApiUrl = 'https://analytics.googleapis.com/v3/management';
    }

    // Set measurement protocol URL
    if (['sendEvent', 'sendPageview', 'sendEcommerce'].includes(config.operation as string)) {
      if (config.analyticsVersion === 'ga4') {
        config.measurementUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${config.measurementId as string}&api_secret=${config.apiSecret as string}`;
      } else {
        config.measurementUrl = 'https://www.google-analytics.com/collect';
      }
    }

    // Build date ranges
    const today = new Date();
    const yesterday = new Date();
    const sevenDaysAgo = new Date();
    const thirtyDaysAgo = new Date();
    const ninetyDaysAgo = new Date();

    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0];
    };

    switch (config.dateRange) {
      case 'today':
        config.startDate = formatDate(today);
        config.endDate = formatDate(today);
        break;
      case 'yesterday':
        yesterday.setDate(yesterday.getDate() - 1);
        config.startDate = formatDate(yesterday);
        config.endDate = formatDate(yesterday);
        break;
      case 'last_7_days':
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        config.startDate = formatDate(sevenDaysAgo);
        config.endDate = formatDate(today);
        break;
      case 'last_30_days':
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        config.startDate = formatDate(thirtyDaysAgo);
        config.endDate = formatDate(today);
        break;
      case 'last_90_days':
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        config.startDate = formatDate(ninetyDaysAgo);
        config.endDate = formatDate(today);
        break;
    }

    return config;
  },

  examples: [
    {
      label: 'Get Website Traffic Report (GA4)',
      config: {
        analyticsVersion: 'ga4',
        authMethod: 'service_account',
        serviceAccountKey: 'YOUR_SERVICE_ACCOUNT_JSON',
        propertyId: '123456789',
        operation: 'getAnalyticsReport',
        dateRange: 'last_30_days',
        metrics: JSON.stringify(['activeUsers', 'sessions', 'pageviews', 'bounceRate'], null, 2),
        dimensions: JSON.stringify(['date', 'country', 'deviceCategory'], null, 2),
        orderBy: JSON.stringify([{ metric: { metricName: 'activeUsers' }, desc: true }], null, 2),
        limit: 1000
      }
    },
    {
      label: 'Get Acquisition Report',
      config: {
        analyticsVersion: 'ga4',
        authMethod: 'service_account',
        serviceAccountKey: 'YOUR_SERVICE_ACCOUNT_JSON',
        propertyId: '123456789',
        operation: 'getAcquisitionReport',
        dateRange: 'last_7_days',
        metrics: JSON.stringify(['newUsers', 'sessions', 'conversions'], null, 2),
        dimensions: JSON.stringify(['sessionDefaultChannelGrouping', 'sessionSource', 'sessionMedium'], null, 2),
        filters: JSON.stringify({
          dimensionFilter: {
            filter: {
              fieldName: 'sessionDefaultChannelGrouping',
              stringFilter: { value: 'Organic Search', matchType: 'EXACT' }
            }
          }
        }, null, 2)
      }
    },
    {
      label: 'Get E-commerce Performance',
      config: {
        analyticsVersion: 'ga4',
        authMethod: 'service_account',
        serviceAccountKey: 'YOUR_SERVICE_ACCOUNT_JSON',
        propertyId: '123456789',
        operation: 'getEcommerceReport',
        dateRange: 'last_30_days',
        metrics: JSON.stringify(['purchaseRevenue', 'totalPurchasers', 'purchasesTotalQuantity'], null, 2),
        dimensions: JSON.stringify(['itemName', 'itemCategory'], null, 2),
        orderBy: JSON.stringify([{ metric: { metricName: 'purchaseRevenue' }, desc: true }], null, 2),
        limit: 50
      }
    },
    {
      label: 'Send Custom Conversion Event',
      config: {
        analyticsVersion: 'ga4',
        authMethod: 'service_account',
        serviceAccountKey: 'YOUR_SERVICE_ACCOUNT_JSON',
        propertyId: '123456789',
        operation: 'sendEvent',
        eventName: 'workflow_conversion',
        clientId: '{{$json.gaClientId}}',
        eventParameters: JSON.stringify({
          currency: 'USD',
          value: '{{$json.conversionValue}}',
          workflow_name: '{{$json.workflowName}}',
          user_type: '{{$json.userSegment}}'
        }, null, 2)
      }
    },
    {
      label: 'Track E-commerce Purchase',
      config: {
        analyticsVersion: 'ga4',
        authMethod: 'service_account',
        serviceAccountKey: 'YOUR_SERVICE_ACCOUNT_JSON',
        propertyId: '123456789',
        operation: 'sendEcommerce',
        clientId: '{{$json.gaClientId}}',
        transactionId: '{{$json.orderId}}',
        currency: 'USD',
        revenue: '{{$json.totalAmount}}',
        items: JSON.stringify([
          {
            item_id: '{{$json.productSku}}',
            item_name: '{{$json.productName}}',
            category: '{{$json.category}}',
            price: '{{$json.price}}',
            quantity: '{{$json.quantity}}'
          }
        ], null, 2)
      }
    },
    {
      label: 'Get Realtime Users',
      config: {
        analyticsVersion: 'ga4',
        authMethod: 'service_account',
        serviceAccountKey: 'YOUR_SERVICE_ACCOUNT_JSON',
        propertyId: '123456789',
        operation: 'getRealtimeReport',
        metrics: JSON.stringify(['activeUsers'], null, 2),
        dimensions: JSON.stringify(['country', 'city', 'deviceCategory'], null, 2),
        orderBy: JSON.stringify([{ metric: { metricName: 'activeUsers' }, desc: true }], null, 2),
        limit: 100
      }
    }
  ]
};