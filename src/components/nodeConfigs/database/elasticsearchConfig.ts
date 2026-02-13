import { NodeConfigDefinition } from '../types';

export const elasticsearchConfig: NodeConfigDefinition = {
  fields: [
    // Connection Configuration
    {
      label: 'Connection Method',
      field: 'connectionMethod',
      type: 'select',
      options: [
        { value: 'cloud', label: 'Elastic Cloud' },
        { value: 'self_hosted', label: 'Self-Hosted' },
        { value: 'url', label: 'Connection URL' }
      ],
      required: true,
      defaultValue: 'self_hosted'
    },
    {
      label: 'Cloud ID',
      field: 'cloudId',
      type: 'text',
      placeholder: 'my-deployment:dXMtZWFzdC0xLmF3cy5mb3VuZC5pbyQ...',
      required: function() { return this.connectionMethod === 'cloud'; },
      validation: (value, config) => {
        const connectionMethod = config?.connectionMethod;
        if (connectionMethod === 'cloud' && !value) {
          return 'Cloud ID is required for Elastic Cloud';
        }
        return null;
      }
    },
    {
      label: 'Node URL(s)',
      field: 'nodes',
      type: 'textarea',
      placeholder: 'http://localhost:9200\nhttp://localhost:9201',
      required: function() { return this.connectionMethod === 'self_hosted'; },
      validation: (value, config) => {
        const connectionMethod = config?.connectionMethod;
        if (connectionMethod === 'self_hosted' && !value) {
          return 'At least one node URL is required';
        }
        if (value && typeof value === 'string') {
          const urls = value.split('\n');
          for (const url of urls) {
            try {
              new URL(url.trim());
            } catch {
              return `Invalid URL format: ${url}`;
            }
          }
        }
        return null;
      }
    },
    {
      label: 'Connection URL',
      field: 'url',
      type: 'text',
      placeholder: 'https://elastic.example.com:9200',
      required: function() { return this.connectionMethod === 'url'; },
      validation: (value, config) => {
        const connectionMethod = config?.connectionMethod;
        if (connectionMethod === 'url' && !value) {
          return 'Connection URL is required';
        }
        if (value && typeof value === 'string') {
          try {
            new URL(value);
          } catch {
            return 'Invalid URL format';
          }
        }
        return null;
      }
    },
    {
      label: 'Username',
      field: 'username',
      type: 'text',
      placeholder: 'elastic',
      required: false
    },
    {
      label: 'Password',
      field: 'password',
      type: 'password',
      placeholder: 'password',
      required: false
    },
    {
      label: 'API Key ID',
      field: 'apiKeyId',
      type: 'text',
      placeholder: 'api-key-id',
      required: false
    },
    {
      label: 'API Key',
      field: 'apiKey',
      type: 'password',
      placeholder: 'api-key-secret',
      required: false
    },
    {
      label: 'Certificate Fingerprint',
      field: 'caFingerprint',
      type: 'text',
      placeholder: 'SHA256 fingerprint',
      required: false
    },

    // Operation Configuration
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      options: [
        // Document Operations
        { value: 'index', label: 'Index Document' },
        { value: 'get', label: 'Get Document' },
        { value: 'update', label: 'Update Document' },
        { value: 'delete', label: 'Delete Document' },
        { value: 'bulk', label: 'Bulk Operations' },
        { value: 'mget', label: 'Multi Get' },
        { value: 'exists', label: 'Document Exists' },
        { value: 'count', label: 'Count Documents' },
        { value: 'update_by_query', label: 'Update By Query' },
        { value: 'delete_by_query', label: 'Delete By Query' },
        { value: 'reindex', label: 'Reindex' },
        
        // Search Operations
        { value: 'search', label: 'Search' },
        { value: 'msearch', label: 'Multi Search' },
        { value: 'scroll', label: 'Scroll Search' },
        { value: 'clear_scroll', label: 'Clear Scroll' },
        { value: 'sql_query', label: 'SQL Query' },
        { value: 'eql_search', label: 'EQL Search' },
        
        // Aggregation Operations
        { value: 'aggregate', label: 'Aggregations' },
        { value: 'terms_enum', label: 'Terms Enum' },
        
        // Index Management
        { value: 'create_index', label: 'Create Index' },
        { value: 'delete_index', label: 'Delete Index' },
        { value: 'get_index', label: 'Get Index Info' },
        { value: 'exists_index', label: 'Index Exists' },
        { value: 'open_index', label: 'Open Index' },
        { value: 'close_index', label: 'Close Index' },
        { value: 'refresh_index', label: 'Refresh Index' },
        { value: 'flush_index', label: 'Flush Index' },
        { value: 'forcemerge_index', label: 'Force Merge' },
        { value: 'get_mapping', label: 'Get Mapping' },
        { value: 'put_mapping', label: 'Put Mapping' },
        { value: 'get_settings', label: 'Get Settings' },
        { value: 'put_settings', label: 'Put Settings' },
        { value: 'analyze', label: 'Analyze Text' },
        
        // Alias Operations
        { value: 'create_alias', label: 'Create Alias' },
        { value: 'delete_alias', label: 'Delete Alias' },
        { value: 'get_alias', label: 'Get Alias' },
        { value: 'exists_alias', label: 'Alias Exists' },
        { value: 'update_aliases', label: 'Update Aliases' },
        
        // Template Operations
        { value: 'put_template', label: 'Put Index Template' },
        { value: 'get_template', label: 'Get Index Template' },
        { value: 'delete_template', label: 'Delete Index Template' },
        { value: 'exists_template', label: 'Template Exists' },
        
        // Snapshot Operations
        { value: 'create_snapshot', label: 'Create Snapshot' },
        { value: 'get_snapshot', label: 'Get Snapshot' },
        { value: 'delete_snapshot', label: 'Delete Snapshot' },
        { value: 'restore_snapshot', label: 'Restore Snapshot' },
        
        // Cluster Operations
        { value: 'cluster_health', label: 'Cluster Health' },
        { value: 'cluster_stats', label: 'Cluster Stats' },
        { value: 'node_info', label: 'Node Info' },
        { value: 'node_stats', label: 'Node Stats' },
        
        // Pipeline Operations
        { value: 'put_pipeline', label: 'Put Ingest Pipeline' },
        { value: 'get_pipeline', label: 'Get Ingest Pipeline' },
        { value: 'delete_pipeline', label: 'Delete Ingest Pipeline' },
        { value: 'simulate_pipeline', label: 'Simulate Pipeline' }
      ],
      required: true
    },

    // Index Configuration
    {
      label: 'Index Name',
      field: 'index',
      type: 'text',
      placeholder: 'my-index',
      required: function() { 
        return !['cluster_health', 'cluster_stats', 'node_info', 'node_stats', 
                'msearch', 'create_snapshot', 'get_snapshot', 'delete_snapshot', 
                'restore_snapshot'].includes(this.operation);
      },
      validation: (value) => {
        if (value && typeof value === 'string' && !/^[a-z0-9._-]+$/.test(value)) {
          return 'Index name can only contain lowercase letters, numbers, dots, underscores, and hyphens';
        }
        return null;
      }
    },
    {
      label: 'Document ID',
      field: 'id',
      type: 'text',
      placeholder: 'document-id',
      required: function() { 
        return ['get', 'update', 'delete', 'exists'].includes(this.operation);
      }
    },

    // Document Content
    {
      label: 'Document (JSON)',
      field: 'document',
      type: 'textarea',
      placeholder: '{"title": "Example", "content": "This is a sample document"}',
      required: function() { 
        return ['index', 'update'].includes(this.operation);
      },
      validation: (value, formData) => {
        const operation = formData?.operation;
        if (typeof operation === 'string' && ['index', 'update'].includes(operation) && value && typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch {
            return 'Document must be valid JSON';
          }
        }
        return null;
      }
    },

    // Search Configuration
    {
      label: 'Query (JSON)',
      field: 'query',
      type: 'textarea',
      placeholder: '{"match": {"title": "example"}}',
      required: function() { 
        return ['search', 'count', 'update_by_query', 'delete_by_query', 'aggregate'].includes(this.operation);
      },
      validation: (value, formData) => {
        const operation = formData?.operation;
        if (typeof operation === 'string' && ['search', 'count', 'update_by_query', 'delete_by_query', 'aggregate'].includes(operation) && value && typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch {
            return 'Query must be valid JSON';
          }
        }
        return null;
      }
    },
    {
      label: 'Query String',
      field: 'q',
      type: 'text',
      placeholder: 'title:example AND status:active',
      required: false
    },
    {
      label: 'Size (Results per page)',
      field: 'size',
      type: 'number',
      placeholder: '10',
      defaultValue: 10,
      required: false,
      validation: (value) => {
        if (typeof value === 'number' && (value < 0 || value > 10000)) {
          return 'Size must be between 0 and 10000';
        }
        return null;
      }
    },
    {
      label: 'From (Offset)',
      field: 'from',
      type: 'number',
      placeholder: '0',
      defaultValue: 0,
      required: false,
      validation: (value) => {
        if (typeof value === 'number' && value < 0) {
          return 'From must be non-negative';
        }
        return null;
      }
    },
    {
      label: 'Sort',
      field: 'sort',
      type: 'text',
      placeholder: 'created_at:desc,_score',
      required: false
    },
    {
      label: 'Source Fields',
      field: '_source',
      type: 'text',
      placeholder: 'title,content,author',
      required: false
    },
    {
      label: 'Highlight Fields',
      field: 'highlight',
      type: 'textarea',
      placeholder: '{"fields": {"content": {}}}',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch {
            return 'Highlight configuration must be valid JSON';
          }
        }
        return null;
      }
    },

    // Aggregation Configuration
    {
      label: 'Aggregations (JSON)',
      field: 'aggs',
      type: 'textarea',
      placeholder: '{"categories": {"terms": {"field": "category.keyword"}}}',
      required: function() { 
        return this.operation === 'aggregate';
      },
      validation: (value, formData) => {
        const operation = formData?.operation;
        if (operation === 'aggregate' && value && typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch {
            return 'Aggregations must be valid JSON';
          }
        }
        return null;
      }
    },

    // Bulk Operations
    {
      label: 'Bulk Operations (NDJSON)',
      field: 'bulkOperations',
      type: 'textarea',
      placeholder: '{"index": {"_index": "test", "_id": "1"}}\n{"field": "value"}\n{"delete": {"_index": "test", "_id": "2"}}',
      required: function() { 
        return this.operation === 'bulk';
      },
      validation: (value, formData) => {
        const operation = formData?.operation;
        if (operation === 'bulk' && value && typeof value === 'string') {
          const lines = value.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              try {
                JSON.parse(line);
              } catch {
                return 'Each line must be valid JSON (NDJSON format)';
              }
            }
          }
        }
        return null;
      }
    },

    // Multiple IDs
    {
      label: 'Document IDs (comma-separated)',
      field: 'ids',
      type: 'text',
      placeholder: 'id1,id2,id3',
      required: function() { 
        return this.operation === 'mget';
      }
    },

    // Update Script
    {
      label: 'Update Script',
      field: 'script',
      type: 'textarea',
      placeholder: '{"source": "ctx._source.views += params.increment", "params": {"increment": 1}}',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch {
            return 'Script must be valid JSON';
          }
        }
        return null;
      }
    },
    {
      label: 'Upsert Document',
      field: 'upsert',
      type: 'textarea',
      placeholder: '{"views": 0, "created_at": "2023-01-01"}',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch {
            return 'Upsert document must be valid JSON';
          }
        }
        return null;
      }
    },

    // Index Settings
    {
      label: 'Index Settings (JSON)',
      field: 'settings',
      type: 'textarea',
      placeholder: '{"number_of_shards": 3, "number_of_replicas": 1}',
      required: function() { 
        return ['create_index', 'put_settings'].includes(this.operation);
      },
      validation: (value, formData) => {
        const operation = formData?.operation;
        if (typeof operation === 'string' && ['create_index', 'put_settings'].includes(operation) && value && typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch {
            return 'Settings must be valid JSON';
          }
        }
        return null;
      }
    },
    {
      label: 'Index Mappings (JSON)',
      field: 'mappings',
      type: 'textarea',
      placeholder: '{"properties": {"title": {"type": "text"}, "created_at": {"type": "date"}}}',
      required: function() { 
        return ['create_index', 'put_mapping'].includes(this.operation);
      },
      validation: (value, formData) => {
        const operation = formData?.operation;
        if (typeof operation === 'string' && ['create_index', 'put_mapping'].includes(operation) && value && typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch {
            return 'Mappings must be valid JSON';
          }
        }
        return null;
      }
    },

    // SQL Query
    {
      label: 'SQL Query',
      field: 'sqlQuery',
      type: 'textarea',
      placeholder: 'SELECT * FROM "my-index" WHERE status = "active" LIMIT 10',
      required: function() { 
        return this.operation === 'sql_query';
      }
    },

    // EQL Query
    {
      label: 'EQL Query',
      field: 'eqlQuery',
      type: 'textarea',
      placeholder: 'process where process.name == "cmd.exe"',
      required: function() { 
        return this.operation === 'eql_search';
      }
    },

    // Scroll Configuration
    {
      label: 'Scroll ID',
      field: 'scrollId',
      type: 'text',
      placeholder: 'DXF1ZXJ5QW5kRmV0Y2gBAAAAAAAAAD4...',
      required: function() { 
        return ['scroll', 'clear_scroll'].includes(this.operation);
      }
    },
    {
      label: 'Scroll Timeout',
      field: 'scroll',
      type: 'text',
      placeholder: '1m',
      defaultValue: '1m',
      required: function() { 
        return this.operation === 'search' && this.useScroll;
      }
    },
    {
      label: 'Use Scroll',
      field: 'useScroll',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },

    // Alias Configuration
    {
      label: 'Alias Name',
      field: 'alias',
      type: 'text',
      placeholder: 'my-alias',
      required: function() { 
        return ['create_alias', 'delete_alias', 'get_alias', 'exists_alias'].includes(this.operation);
      }
    },

    // Template Configuration
    {
      label: 'Template Name',
      field: 'templateName',
      type: 'text',
      placeholder: 'my-template',
      required: function() { 
        return ['put_template', 'get_template', 'delete_template', 'exists_template'].includes(this.operation);
      }
    },
    {
      label: 'Index Patterns',
      field: 'indexPatterns',
      type: 'text',
      placeholder: 'logs-*,metrics-*',
      required: function() { 
        return this.operation === 'put_template';
      }
    },

    // Pipeline Configuration
    {
      label: 'Pipeline ID',
      field: 'pipelineId',
      type: 'text',
      placeholder: 'my-pipeline',
      required: function() { 
        return ['put_pipeline', 'get_pipeline', 'delete_pipeline', 'simulate_pipeline'].includes(this.operation);
      }
    },
    {
      label: 'Pipeline Definition (JSON)',
      field: 'pipelineDefinition',
      type: 'textarea',
      placeholder: '{"processors": [{"set": {"field": "timestamp", "value": "{{_ingest.timestamp}}"}}]}',
      required: function() { 
        return this.operation === 'put_pipeline';
      },
      validation: (value, formData) => {
        const operation = formData?.operation;
        if (operation === 'put_pipeline' && value && typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch {
            return 'Pipeline definition must be valid JSON';
          }
        }
        return null;
      }
    },

    // Snapshot Configuration
    {
      label: 'Repository Name',
      field: 'repository',
      type: 'text',
      placeholder: 'my-backup-repo',
      required: function() { 
        return ['create_snapshot', 'get_snapshot', 'delete_snapshot', 'restore_snapshot'].includes(this.operation);
      }
    },
    {
      label: 'Snapshot Name',
      field: 'snapshot',
      type: 'text',
      placeholder: 'snapshot-2023-11-30',
      required: function() { 
        return ['create_snapshot', 'get_snapshot', 'delete_snapshot', 'restore_snapshot'].includes(this.operation);
      }
    },

    // Reindex Configuration
    {
      label: 'Source Index',
      field: 'sourceIndex',
      type: 'text',
      placeholder: 'old-index',
      required: function() { 
        return this.operation === 'reindex';
      }
    },
    {
      label: 'Destination Index',
      field: 'destIndex',
      type: 'text',
      placeholder: 'new-index',
      required: function() { 
        return this.operation === 'reindex';
      }
    },

    // Text Analysis
    {
      label: 'Text to Analyze',
      field: 'text',
      type: 'textarea',
      placeholder: 'The quick brown fox jumps over the lazy dog',
      required: function() { 
        return this.operation === 'analyze';
      }
    },
    {
      label: 'Analyzer',
      field: 'analyzer',
      type: 'text',
      placeholder: 'standard',
      defaultValue: 'standard',
      required: false
    },

    // Advanced Options
    {
      label: 'Refresh',
      field: 'refresh',
      type: 'select',
      options: [
        { value: '', label: 'Default' },
        { value: 'true', label: 'True (immediate)' },
        { value: 'false', label: 'False' },
        { value: 'wait_for', label: 'Wait For' }
      ],
      required: false
    },
    {
      label: 'Wait for Active Shards',
      field: 'waitForActiveShards',
      type: 'text',
      placeholder: '1',
      required: false
    },
    {
      label: 'Timeout',
      field: 'timeout',
      type: 'text',
      placeholder: '30s',
      defaultValue: '30s',
      required: false
    },
    {
      label: 'Request Cache',
      field: 'requestCache',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Track Total Hits',
      field: 'trackTotalHits',
      type: 'checkbox',
      defaultValue: true,
      required: false
    },
    {
      label: 'Track Scores',
      field: 'trackScores',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Explain',
      field: 'explain',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Version',
      field: 'version',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Routing',
      field: 'routing',
      type: 'text',
      placeholder: 'routing-value',
      required: false
    },
    {
      label: 'Pipeline',
      field: 'pipeline',
      type: 'text',
      placeholder: 'ingest-pipeline-name',
      required: false
    },
    {
      label: 'Preference',
      field: 'preference',
      type: 'text',
      placeholder: '_local',
      required: false
    }
  ],
  examples: [
    {
      name: 'Index Document',
      description: 'Index a new document',
      config: {
        connectionMethod: 'self_hosted',
        nodes: 'http://localhost:9200',
        operation: 'index',
        index: 'products',
        document: '{"name": "Laptop", "price": 999.99, "category": "Electronics", "in_stock": true}',
        refresh: 'true'
      }
    },
    {
      name: 'Search Documents',
      description: 'Search with query and aggregations',
      config: {
        connectionMethod: 'self_hosted',
        nodes: 'http://localhost:9200',
        operation: 'search',
        index: 'products',
        query: '{"match": {"category": "Electronics"}}',
        size: 20,
        sort: 'price:desc',
        aggs: '{"price_ranges": {"range": {"field": "price", "ranges": [{"to": 100}, {"from": 100, "to": 500}, {"from": 500}]}}}'
      }
    },
    {
      name: 'Bulk Operations',
      description: 'Perform multiple operations',
      config: {
        connectionMethod: 'cloud',
        cloudId: 'my-deployment:dXMtZWFzdC0xLmF3cy...',
        username: 'elastic',
        password: 'password',
        operation: 'bulk',
        bulkOperations: '{"index": {"_index": "products", "_id": "1"}}\n{"name": "Phone", "price": 699}\n{"update": {"_index": "products", "_id": "2"}}\n{"doc": {"price": 549}}'
      }
    },
    {
      name: 'SQL Query',
      description: 'Query using SQL syntax',
      config: {
        connectionMethod: 'self_hosted',
        nodes: 'http://localhost:9200',
        operation: 'sql_query',
        sqlQuery: 'SELECT name, price FROM "products" WHERE category = \'Electronics\' AND price > 500 ORDER BY price DESC LIMIT 10'
      }
    },
    {
      name: 'Update By Query',
      description: 'Update multiple documents',
      config: {
        connectionMethod: 'self_hosted',
        nodes: 'http://localhost:9200',
        operation: 'update_by_query',
        index: 'products',
        query: '{"term": {"category": "Electronics"}}',
        script: '{"source": "ctx._source.price = ctx._source.price * params.discount", "params": {"discount": 0.9}}'
      }
    },
    {
      name: 'Create Index with Mapping',
      description: 'Create index with custom mapping',
      config: {
        connectionMethod: 'self_hosted',
        nodes: 'http://localhost:9200',
        operation: 'create_index',
        index: 'customers',
        settings: '{"number_of_shards": 3, "number_of_replicas": 1}',
        mappings: '{"properties": {"name": {"type": "text", "fields": {"keyword": {"type": "keyword"}}}, "email": {"type": "keyword"}, "created_at": {"type": "date"}, "age": {"type": "integer"}}}'
      }
    }
  ]
};