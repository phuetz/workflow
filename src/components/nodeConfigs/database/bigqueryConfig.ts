import { NodeConfigDefinition } from '../../../types/nodeConfig';

export const bigqueryConfig: NodeConfigDefinition = {
  fields: [
    // Authentication Configuration
    {
      label: 'Authentication Method',
      field: 'authMethod',
      type: 'select',
      options: [
        { value: 'service_account', label: 'Service Account Key' },
        { value: 'oauth', label: 'OAuth 2.0' },
        { value: 'adc', label: 'Application Default Credentials' }
      ],
      required: true,
      defaultValue: 'service_account'
    },
    {
      label: 'Service Account Key (JSON)',
      field: 'serviceAccountKey',
      type: 'textarea',
      placeholder: '{\n  "type": "service_account",\n  "project_id": "your-project",\n  "private_key_id": "...",\n  "private_key": "...",\n  "client_email": "...",\n  "client_id": "..."\n}',
      required: function() { return this.authMethod === 'service_account'; },
      validation: (value) => {
        if (!value) return null;
        try {
          const key = JSON.parse(value as string);
          if (!key.type || !key.project_id || !key.private_key || !key.client_email) {
            return 'Invalid service account key format';
          }
        } catch {
          return 'Service account key must be valid JSON';
        }
        return null;
      }
    },
    {
      label: 'OAuth Access Token',
      field: 'accessToken',
      type: 'password',
      placeholder: 'ya29.a0AfH6SM...',
      required: function() { return this.authMethod === 'oauth'; }
    },
    {
      label: 'Project ID',
      field: 'projectId',
      type: 'text',
      placeholder: 'my-project-id',
      required: true,
      validation: (value) => {
        if (!value) return 'Project ID is required';
        if (!(value as string).match(/^[a-z][a-z0-9-]*[a-z0-9]$/)) {
          return 'Invalid project ID format';
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
        // Query Operations
        { value: 'query', label: 'Run Query' },
        { value: 'query_dry_run', label: 'Query Dry Run' },
        { value: 'query_legacy', label: 'Run Legacy SQL Query' },
        { value: 'parameterized_query', label: 'Run Parameterized Query' },
        
        // Table Operations
        { value: 'get_table', label: 'Get Table' },
        { value: 'list_tables', label: 'List Tables' },
        { value: 'create_table', label: 'Create Table' },
        { value: 'update_table', label: 'Update Table' },
        { value: 'delete_table', label: 'Delete Table' },
        { value: 'copy_table', label: 'Copy Table' },
        { value: 'export_table', label: 'Export Table' },
        
        // Data Operations
        { value: 'insert_rows', label: 'Insert Rows' },
        { value: 'stream_rows', label: 'Stream Rows' },
        { value: 'get_rows', label: 'Get Table Rows' },
        { value: 'update_rows', label: 'Update Rows' },
        { value: 'delete_rows', label: 'Delete Rows' },
        
        // Dataset Operations
        { value: 'create_dataset', label: 'Create Dataset' },
        { value: 'get_dataset', label: 'Get Dataset' },
        { value: 'list_datasets', label: 'List Datasets' },
        { value: 'update_dataset', label: 'Update Dataset' },
        { value: 'delete_dataset', label: 'Delete Dataset' },
        
        // Job Operations
        { value: 'get_job', label: 'Get Job' },
        { value: 'list_jobs', label: 'List Jobs' },
        { value: 'cancel_job', label: 'Cancel Job' },
        
        // Load Operations
        { value: 'load_csv', label: 'Load CSV File' },
        { value: 'load_json', label: 'Load JSON File' },
        { value: 'load_avro', label: 'Load Avro File' },
        { value: 'load_parquet', label: 'Load Parquet File' },
        
        // View Operations
        { value: 'create_view', label: 'Create View' },
        { value: 'update_view', label: 'Update View' },
        
        // Routine Operations
        { value: 'create_routine', label: 'Create Routine (Function/Procedure)' },
        { value: 'get_routine', label: 'Get Routine' },
        { value: 'list_routines', label: 'List Routines' },
        { value: 'delete_routine', label: 'Delete Routine' }
      ],
      required: true
    },

    // Query Configuration
    {
      label: 'SQL Query',
      field: 'query',
      type: 'textarea',
      placeholder: 'SELECT * FROM `project.dataset.table` WHERE date >= @start_date LIMIT 1000',
      required: function() {
        return ['query', 'query_dry_run', 'query_legacy', 'parameterized_query'].includes(this.operation);
      }
    },
    {
      label: 'Query Parameters (JSON)',
      field: 'queryParameters',
      type: 'textarea',
      placeholder: '[{"name": "start_date", "parameterType": {"type": "DATE"}, "parameterValue": {"value": "2023-01-01"}}]',
      required: function() {
        return this.operation === 'parameterized_query';
      },
      validation: (value) => {
        if (!value) return null;
        try {
          const params = JSON.parse(value as string);
          if (!Array.isArray(params)) {
            return 'Query parameters must be a JSON array';
          }
        } catch {
          return 'Invalid JSON format';
        }
        return null;
      }
    },
    {
      label: 'Use Legacy SQL',
      field: 'useLegacySql',
      type: 'checkbox',
      defaultValue: false,
      required: false,
      description: 'Use legacy SQL syntax instead of standard SQL'
    },
    {
      label: 'Maximum Results',
      field: 'maxResults',
      type: 'number',
      placeholder: '1000',
      defaultValue: 1000,
      required: false,
      validation: (value) => {
        if (value && (value as number) < 1) {
          return 'Maximum results must be positive';
        }
        return null;
      }
    },
    {
      label: 'Timeout (ms)',
      field: 'timeoutMs',
      type: 'number',
      placeholder: '10000',
      defaultValue: 10000,
      required: false,
      validation: (value) => {
        if (value && (value as number) < 0) {
          return 'Timeout must be non-negative';
        }
        return null;
      }
    },
    {
      label: 'Use Query Cache',
      field: 'useQueryCache',
      type: 'checkbox',
      defaultValue: true,
      required: false
    },

    // Dataset/Table Configuration
    {
      label: 'Dataset ID',
      field: 'datasetId',
      type: 'text',
      placeholder: 'my_dataset',
      required: function() {
        return !['list_datasets', 'create_dataset', 'list_jobs', 'query', 'query_dry_run', 'query_legacy', 'parameterized_query'].includes(this.operation);
      },
      validation: (value) => {
        if (!value) return null;
        if (!(value as string).match(/^[a-zA-Z0-9_]+$/)) {
          return 'Dataset ID can only contain letters, numbers, and underscores';
        }
        return null;
      }
    },
    {
      label: 'Table ID',
      field: 'tableId',
      type: 'text',
      placeholder: 'my_table',
      required: function() {
        const tableOps = ['export_table', 'insert_rows', 'stream_rows', 'get_rows', 'update_rows',
                         'delete_rows', 'create_view', 'update_view'];
        return tableOps.includes(this.operation);
      },
      validation: (value) => {
        if (!value) return null;
        if (!(value as string).match(/^[a-zA-Z0-9_]+$/)) {
          return 'Table ID can only contain letters, numbers, and underscores';
        }
        return null;
      }
    },

    // Table Schema
    {
      label: 'Table Schema (JSON)',
      field: 'schema',
      type: 'textarea',
      placeholder: '[\n  {"name": "id", "type": "INTEGER", "mode": "REQUIRED"},\n  {"name": "name", "type": "STRING", "mode": "NULLABLE"},\n  {"name": "created", "type": "TIMESTAMP", "mode": "NULLABLE"}\n]',
      required: function() {
        return this.operation === 'create_table';
      },
      validation: (value) => {
        if (!value) return null;
        try {
          const schema = JSON.parse(value as string);
          if (!Array.isArray(schema)) {
            return 'Schema must be a JSON array';
          }
          for (const field of schema) {
            if (!field.name || !field.type) {
              return 'Each field must have name and type';
            }
          }
        } catch {
          return 'Invalid JSON format';
        }
        return null;
      }
    },
    {
      label: 'Table Description',
      field: 'description',
      type: 'text',
      placeholder: 'Table for storing user data',
      required: false
    },

    // Data Operations
    {
      label: 'Rows Data (JSON)',
      field: 'rows',
      type: 'textarea',
      placeholder: '[\n  {"id": 1, "name": "John", "created": "2023-01-01T00:00:00Z"},\n  {"id": 2, "name": "Jane", "created": "2023-01-02T00:00:00Z"}\n]',
      required: function() {
        return ['insert_rows', 'stream_rows'].includes(this.operation);
      },
      validation: (value) => {
        if (!value) return null;
        try {
          const rows = JSON.parse(value as string);
          if (!Array.isArray(rows)) {
            return 'Rows must be a JSON array';
          }
        } catch {
          return 'Invalid JSON format';
        }
        return null;
      }
    },
    {
      label: 'Insert ID Suffix',
      field: 'insertIdSuffix',
      type: 'text',
      placeholder: 'optional-suffix',
      required: false,
      description: 'Suffix for deduplication'
    },
    {
      label: 'Skip Invalid Rows',
      field: 'skipInvalidRows',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Ignore Unknown Values',
      field: 'ignoreUnknownValues',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Create If Needed',
      field: 'createIfNeeded',
      type: 'checkbox',
      defaultValue: false,
      required: false,
      description: 'Create table if it doesn\'t exist'
    },

    // Load Configuration
    {
      label: 'Source URI',
      field: 'sourceUri',
      type: 'text',
      placeholder: 'gs://my-bucket/data.csv',
      required: function() {
        return ['load_csv', 'load_json', 'load_avro', 'load_parquet'].includes(this.operation);
      },
      validation: (value) => {
        if (!value) return null;
        if (!(value as string).startsWith('gs://')) {
          return 'Source URI must be a Google Cloud Storage path (gs://)';
        }
        return null;
      }
    },
    {
      label: 'Write Disposition',
      field: 'writeDisposition',
      type: 'select',
      options: [
        { value: 'WRITE_EMPTY', label: 'Write if Empty' },
        { value: 'WRITE_TRUNCATE', label: 'Overwrite Table' },
        { value: 'WRITE_APPEND', label: 'Append to Table' }
      ],
      defaultValue: 'WRITE_APPEND',
      required: false
    },
    {
      label: 'Source Format',
      field: 'sourceFormat',
      type: 'select',
      options: [
        { value: 'CSV', label: 'CSV' },
        { value: 'NEWLINE_DELIMITED_JSON', label: 'JSON (Newline Delimited)' },
        { value: 'AVRO', label: 'Avro' },
        { value: 'PARQUET', label: 'Parquet' },
        { value: 'ORC', label: 'ORC' }
      ],
      required: function() { 
        return ['load_csv', 'load_json', 'load_avro', 'load_parquet'].includes(this.operation);
      }
    },

    // CSV Options
    {
      label: 'Field Delimiter',
      field: 'fieldDelimiter',
      type: 'text',
      placeholder: ',',
      defaultValue: ',',
      required: false
    },
    {
      label: 'Skip Leading Rows',
      field: 'skipLeadingRows',
      type: 'number',
      placeholder: '1',
      defaultValue: 0,
      required: false
    },
    {
      label: 'Allow Quoted Newlines',
      field: 'allowQuotedNewlines',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Allow Jagged Rows',
      field: 'allowJaggedRows',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },

    // Export Configuration
    {
      label: 'Destination URI',
      field: 'destinationUri',
      type: 'text',
      placeholder: 'gs://my-bucket/export/*.csv',
      required: function() {
        return this.operation === 'export_table';
      },
      validation: (value) => {
        if (!value) return null;
        if (!(value as string).startsWith('gs://')) {
          return 'Destination URI must be a Google Cloud Storage path (gs://)';
        }
        return null;
      }
    },
    {
      label: 'Export Format',
      field: 'exportFormat',
      type: 'select',
      options: [
        { value: 'CSV', label: 'CSV' },
        { value: 'NEWLINE_DELIMITED_JSON', label: 'JSON (Newline Delimited)' },
        { value: 'AVRO', label: 'Avro' }
      ],
      defaultValue: 'CSV',
      required: false
    },
    {
      label: 'Compression',
      field: 'compression',
      type: 'select',
      options: [
        { value: 'NONE', label: 'None' },
        { value: 'GZIP', label: 'GZIP' },
        { value: 'SNAPPY', label: 'Snappy' }
      ],
      defaultValue: 'NONE',
      required: false
    },

    // View/Routine Configuration
    {
      label: 'View Query',
      field: 'viewQuery',
      type: 'textarea',
      placeholder: 'SELECT id, name, created FROM `project.dataset.table` WHERE active = true',
      required: function() {
        return ['create_view', 'update_view'].includes(this.operation);
      }
    },
    {
      label: 'Use Legacy SQL for View',
      field: 'viewUseLegacySql',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Routine Name',
      field: 'routineName',
      type: 'text',
      placeholder: 'my_function',
      required: function() { 
        return ['create_routine', 'get_routine', 'delete_routine'].includes(this.operation);
      }
    },
    {
      label: 'Routine Type',
      field: 'routineType',
      type: 'select',
      options: [
        { value: 'SCALAR_FUNCTION', label: 'Scalar Function' },
        { value: 'TABLE_VALUED_FUNCTION', label: 'Table Function' },
        { value: 'PROCEDURE', label: 'Stored Procedure' }
      ],
      required: function() { 
        return this.operation === 'create_routine';
      }
    },
    {
      label: 'Routine Definition',
      field: 'routineDefinition',
      type: 'textarea',
      placeholder: 'CREATE FUNCTION my_function(x INT64) AS (x * 2)',
      required: function() { 
        return this.operation === 'create_routine';
      }
    },

    // Copy Table Configuration
    {
      label: 'Destination Dataset',
      field: 'destinationDataset',
      type: 'text',
      placeholder: 'target_dataset',
      required: function() { 
        return this.operation === 'copy_table';
      }
    },
    {
      label: 'Destination Table',
      field: 'destinationTable',
      type: 'text',
      placeholder: 'target_table',
      required: function() { 
        return this.operation === 'copy_table';
      }
    },

    // Job Configuration
    {
      label: 'Job ID',
      field: 'jobId',
      type: 'text',
      placeholder: 'job-123456',
      required: function() { 
        return ['get_job', 'cancel_job'].includes(this.operation);
      }
    },
    {
      label: 'Location',
      field: 'location',
      type: 'text',
      placeholder: 'US',
      defaultValue: 'US',
      required: false,
      description: 'Geographic location for the job'
    },

    // Filter Configuration
    {
      label: 'Filter Expression',
      field: 'filter',
      type: 'text',
      placeholder: 'state = "DONE"',
      required: false,
      description: 'Filter for list operations'
    },
    {
      label: 'Page Size',
      field: 'pageSize',
      type: 'number',
      placeholder: '100',
      defaultValue: 100,
      required: false,
      validation: (value) => {
        if (value && ((value as number) < 1 || (value as number) > 1000)) {
          return 'Page size must be between 1 and 1000';
        }
        return null;
      }
    },
    {
      label: 'Page Token',
      field: 'pageToken',
      type: 'text',
      placeholder: 'next-page-token',
      required: false
    },

    // Advanced Options
    {
      label: 'Priority',
      field: 'priority',
      type: 'select',
      options: [
        { value: 'INTERACTIVE', label: 'Interactive' },
        { value: 'BATCH', label: 'Batch' }
      ],
      defaultValue: 'INTERACTIVE',
      required: false
    },
    {
      label: 'Maximum Bytes Billed',
      field: 'maximumBytesBilled',
      type: 'text',
      placeholder: '1000000000',
      required: false,
      description: 'Limit query cost (in bytes)'
    },
    {
      label: 'Dry Run',
      field: 'dryRun',
      type: 'checkbox',
      defaultValue: false,
      required: false,
      description: 'Validate query without running it'
    },
    {
      label: 'Use Cache',
      field: 'useCache',
      type: 'checkbox',
      defaultValue: true,
      required: false
    },
    {
      label: 'Labels (JSON)',
      field: 'labels',
      type: 'textarea',
      placeholder: '{"environment": "production", "team": "analytics"}',
      required: false,
      validation: (value) => {
        if (value) {
          try {
            JSON.parse(value as string);
          } catch {
            return 'Labels must be valid JSON';
          }
        }
        return null;
      }
    }
  ],
  examples: [
    {
      name: 'Run Query',
      description: 'Execute a standard SQL query',
      config: {
        authMethod: 'service_account',
        serviceAccountKey: '{"type": "service_account", "project_id": "my-project", ...}',
        projectId: 'my-project',
        operation: 'query',
        query: 'SELECT name, COUNT(*) as count FROM `my-project.analytics.events` WHERE date >= CURRENT_DATE() GROUP BY name ORDER BY count DESC LIMIT 10',
        useLegacySql: false,
        maxResults: 1000,
        useQueryCache: true
      }
    },
    {
      name: 'Insert Streaming Data',
      description: 'Stream rows into a table',
      config: {
        authMethod: 'adc',
        projectId: 'my-project',
        operation: 'stream_rows',
        datasetId: 'analytics',
        tableId: 'events',
        rows: JSON.stringify([
          {
            event_id: 'evt_123',
            user_id: 'usr_456',
            event_type: 'page_view',
            timestamp: new Date().toISOString(),
            properties: {
              page: '/home',
              referrer: 'google.com'
            }
          }
        ], null, 2),
        skipInvalidRows: false,
        ignoreUnknownValues: true
      }
    },
    {
      name: 'Create Table with Schema',
      description: 'Create a new table with defined schema',
      config: {
        authMethod: 'service_account',
        serviceAccountKey: '{"type": "service_account", ...}',
        projectId: 'my-project',
        operation: 'create_table',
        datasetId: 'analytics',
        tableId: 'user_events',
        schema: JSON.stringify([
          { name: 'user_id', type: 'STRING', mode: 'REQUIRED' },
          { name: 'event_type', type: 'STRING', mode: 'REQUIRED' },
          { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
          { name: 'properties', type: 'JSON', mode: 'NULLABLE' },
          { name: 'session_id', type: 'STRING', mode: 'NULLABLE' }
        ], null, 2),
        description: 'Table for storing user interaction events'
      }
    },
    {
      name: 'Load CSV from GCS',
      description: 'Load CSV file from Cloud Storage',
      config: {
        authMethod: 'adc',
        projectId: 'my-project',
        operation: 'load_csv',
        datasetId: 'sales',
        tableId: 'transactions',
        sourceUri: 'gs://my-bucket/sales/2023/*.csv',
        sourceFormat: 'CSV',
        writeDisposition: 'WRITE_APPEND',
        skipLeadingRows: 1,
        fieldDelimiter: ',',
        allowQuotedNewlines: true,
        createIfNeeded: true
      }
    },
    {
      name: 'Export Query Results',
      description: 'Export table to Cloud Storage',
      config: {
        authMethod: 'service_account',
        serviceAccountKey: '{"type": "service_account", ...}',
        projectId: 'my-project',
        operation: 'export_table',
        datasetId: 'analytics',
        tableId: 'monthly_summary',
        destinationUri: 'gs://my-bucket/exports/monthly_summary_*.csv',
        exportFormat: 'CSV',
        compression: 'GZIP',
        fieldDelimiter: ','
      }
    },
    {
      name: 'Parameterized Query',
      description: 'Run query with parameters',
      config: {
        authMethod: 'adc',
        projectId: 'my-project',
        operation: 'parameterized_query',
        query: 'SELECT * FROM `my-project.sales.orders` WHERE order_date >= @start_date AND order_date <= @end_date AND status = @status',
        queryParameters: JSON.stringify([
          {
            name: 'start_date',
            parameterType: { type: 'DATE' },
            parameterValue: { value: '2023-01-01' }
          },
          {
            name: 'end_date',
            parameterType: { type: 'DATE' },
            parameterValue: { value: '2023-12-31' }
          },
          {
            name: 'status',
            parameterType: { type: 'STRING' },
            parameterValue: { value: 'completed' }
          }
        ], null, 2),
        maxResults: 10000
      }
    }
  ]
};