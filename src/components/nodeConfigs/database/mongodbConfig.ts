import { NodeConfigDefinition, validators } from '../../../types/nodeConfig';

export const mongodbConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'Connection String',
      field: 'connectionString',
      type: 'text',
      placeholder: 'mongodb://localhost:27017',
      required: true,
      description: 'MongoDB connection URI',
      validation: (value) => {
        if (!value) return 'Connection string is required';
        const strValue = String(value);
        if (!strValue.startsWith('mongodb://') && !strValue.startsWith('mongodb+srv://')) {
          return 'Connection string must start with mongodb:// or mongodb+srv://';
        }
        return null;
      }
    },
    {
      label: 'Database',
      field: 'database',
      type: 'text',
      placeholder: 'myDatabase',
      required: true,
      validation: validators.required('Database')
    },
    {
      label: 'Collection',
      field: 'collection',
      type: 'text',
      placeholder: 'users',
      required: true,
      validation: validators.required('Collection')
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      defaultValue: 'find',
      options: [
        { value: 'find', label: 'Find Documents' },
        { value: 'findOne', label: 'Find One Document' },
        { value: 'insert', label: 'Insert Document(s)' },
        { value: 'update', label: 'Update Document(s)' },
        { value: 'replace', label: 'Replace Document' },
        { value: 'delete', label: 'Delete Document(s)' },
        { value: 'aggregate', label: 'Aggregate Pipeline' },
        { value: 'count', label: 'Count Documents' },
        { value: 'distinct', label: 'Distinct Values' },
        { value: 'createIndex', label: 'Create Index' }
      ]
    },
    {
      label: 'Query / Filter',
      field: 'query',
      type: 'json',
      placeholder: '{"status": "active", "age": {"$gte": 18}}',
      defaultValue: '{}',
      description: 'MongoDB query filter',
      validation: (value) => {
        if (!value) return null;
        return validators.json(String(value));
      }
    },
    {
      label: 'Document(s) (for Insert)',
      field: 'document',
      type: 'json',
      placeholder: '{"name": "{{$json.name}}", "email": "{{$json.email}}"}',
      description: 'Document or array of documents to insert',
      validation: (value) => {
        if (!value) return null;
        return validators.json(String(value));
      }
    },
    {
      label: 'Update',
      field: 'update',
      type: 'json',
      placeholder: '{"$set": {"lastLogin": "{{$now}}"}, "$inc": {"loginCount": 1}}',
      description: 'Update operations',
      validation: (value) => {
        if (!value) return null;
        return validators.json(String(value));
      }
    },
    {
      label: 'Options',
      field: 'options',
      type: 'json',
      placeholder: '{"upsert": true, "multi": true}',
      defaultValue: '{}',
      description: 'Operation options',
      validation: (value) => {
        if (!value) return null;
        return validators.json(String(value));
      }
    },
    {
      label: 'Projection',
      field: 'projection',
      type: 'json',
      placeholder: '{"name": 1, "email": 1, "_id": 0}',
      description: 'Fields to include/exclude',
      validation: (value) => {
        if (!value) return null;
        return validators.json(String(value));
      }
    },
    {
      label: 'Sort',
      field: 'sort',
      type: 'json',
      placeholder: '{"createdAt": -1}',
      description: 'Sort order (1: ascending, -1: descending)',
      validation: (value) => {
        if (!value) return null;
        return validators.json(String(value));
      }
    },
    {
      label: 'Limit',
      field: 'limit',
      type: 'number',
      placeholder: '100',
      description: 'Maximum documents to return',
      validation: validators.positiveNumber
    },
    {
      label: 'Skip',
      field: 'skip',
      type: 'number',
      placeholder: '0',
      description: 'Number of documents to skip',
      validation: (value) => {
        if (!value) return null;
        const num = Number(value);
        if (isNaN(num) || num < 0) {
          return 'Skip must be 0 or positive';
        }
        return null;
      }
    },
    {
      label: 'Aggregation Pipeline',
      field: 'pipeline',
      type: 'json',
      placeholder: '[{"$match": {"status": "active"}}, {"$group": {"_id": "$category", "count": {"$sum": 1}}}]',
      description: 'Aggregation pipeline stages',
      validation: (value) => {
        if (!value) return null;
        const strValue = String(value);
        const error = validators.json(strValue);
        if (error) return error;
        try {
          const pipeline = JSON.parse(strValue);
          if (!Array.isArray(pipeline)) {
            return 'Pipeline must be an array';
          }
        } catch (e) {
          // Already validated as JSON
        }
        return null;
      }
    },
    {
      label: 'Distinct Field',
      field: 'distinctField',
      type: 'text',
      placeholder: 'category',
      description: 'Field to get distinct values for'
    },
    {
      label: 'Index Specification',
      field: 'indexSpec',
      type: 'json',
      placeholder: '{"email": 1}',
      description: 'Index keys and direction',
      validation: (value) => {
        if (!value) return null;
        return validators.json(String(value));
      }
    },
    {
      label: 'Connection Timeout (ms)',
      field: 'connectTimeoutMS',
      type: 'number',
      placeholder: '10000',
      defaultValue: 10000,
      validation: validators.positiveNumber
    },
    {
      label: 'Use Transactions',
      field: 'useTransaction',
      type: 'checkbox',
      defaultValue: false,
      description: 'Execute within a transaction'
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};

    // Operation-specific validations
    const operation = String(config.operation || '');
    if (['find', 'findOne', 'count', 'delete'].includes(operation) && !config.query) {
      config.query = '{}'; // Default empty query
    }

    if (operation === 'insert' && !config.document) {
      errors.document = 'Document is required for insert operation';
    }

    if (['update', 'replace'].includes(operation)) {
      if (!config.query) {
        errors.query = 'Query filter is required for update/replace';
      }
      if (!config.update && !config.document) {
        errors.update = operation === 'update' ? 'Update operations required' : 'Replacement document required';
      }
    }

    if (operation === 'aggregate' && !config.pipeline) {
      errors.pipeline = 'Aggregation pipeline is required';
    }

    if (operation === 'distinct' && !config.distinctField) {
      errors.distinctField = 'Field name is required for distinct operation';
    }

    if (operation === 'createIndex' && !config.indexSpec) {
      errors.indexSpec = 'Index specification is required';
    }

    return errors;
  },

  transform: (config) => {
    // Parse all JSON fields
    const jsonFields = ['query', 'document', 'update', 'options', 'projection', 'sort', 'pipeline', 'indexSpec'];

    jsonFields.forEach(field => {
      if (config[field] && typeof config[field] === 'string') {
        try {
          config[field] = JSON.parse(config[field]);
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }
    });

    return config;
  },

  examples: [
    {
      label: 'Find Documents',
      config: {
        connectionString: 'mongodb://localhost:27017',
        database: 'myapp',
        collection: 'users',
        operation: 'find',
        query: '{"active": true}',
        projection: '{"name": 1, "email": 1}',
        sort: '{"createdAt": -1}',
        limit: 10
      }
    },
    {
      label: 'Insert Document',
      config: {
        connectionString: 'mongodb://localhost:27017',
        database: 'myapp',
        collection: 'users',
        operation: 'insert',
        document: '{"name": "{{$json.name}}", "email": "{{$json.email}}", "createdAt": "{{$now}}"}'
      }
    },
    {
      label: 'Update with Operators',
      config: {
        connectionString: 'mongodb://localhost:27017',
        database: 'myapp',
        collection: 'users',
        operation: 'update',
        query: '{"_id": "{{$json.userId}}"}',
        update: '{"$set": {"lastLogin": "{{$now}}"}, "$inc": {"loginCount": 1}}',
        options: '{"upsert": false}'
      }
    },
    {
      label: 'Aggregation Pipeline',
      config: {
        connectionString: 'mongodb://localhost:27017',
        database: 'myapp',
        collection: 'orders',
        operation: 'aggregate',
        pipeline: '[{"$match": {"status": "completed"}}, {"$group": {"_id": "$customerId", "totalSpent": {"$sum": "$amount"}}}, {"$sort": {"totalSpent": -1}}, {"$limit": 10}]'
      }
    },
    {
      label: 'Bulk Insert',
      config: {
        connectionString: 'mongodb://localhost:27017',
        database: 'myapp',
        collection: 'events',
        operation: 'insert',
        document: '{{$json.events}}',
        options: '{"ordered": false}'
      }
    },
    {
      label: 'Delete Documents',
      config: {
        connectionString: 'mongodb://localhost:27017',
        database: 'myapp',
        collection: 'logs',
        operation: 'delete',
        query: '{"createdAt": {"$lt": "{{$json.cutoffDate}}"}}',
        options: '{"multi": true}'
      }
    }
  ]
};