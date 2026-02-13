import { NodeConfigDefinition } from '../types';

export const pineconeConfig: NodeConfigDefinition = {
  fields: [
    // Authentication Configuration
    {
      label: 'API Key',
      field: 'apiKey',
      type: 'password',
      placeholder: 'your-pinecone-api-key',
      required: true,
      validation: (value) => {
        if (!value) return 'API Key is required';
        if (typeof value === 'string' && value.length < 32) return 'Invalid API key format';
        return null;
      }
    },
    {
      label: 'Environment',
      field: 'environment',
      type: 'text',
      placeholder: 'us-west1-gcp',
      required: true,
      validation: (value) => {
        if (!value) return 'Environment is required';
        if (typeof value === 'string' && !value.match(/^[a-z0-9-]+-[a-z0-9-]+$/)) {
          return 'Invalid environment format (e.g., us-west1-gcp)';
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
        // Vector Operations
        { value: 'upsert', label: 'Upsert Vectors' },
        { value: 'query', label: 'Query Vectors' },
        { value: 'fetch', label: 'Fetch Vectors' },
        { value: 'update', label: 'Update Vector' },
        { value: 'delete', label: 'Delete Vectors' },
        { value: 'delete_all', label: 'Delete All Vectors' },
        
        // Index Operations
        { value: 'describe_index_stats', label: 'Describe Index Stats' },
        { value: 'list_indexes', label: 'List Indexes' },
        { value: 'create_index', label: 'Create Index' },
        { value: 'describe_index', label: 'Describe Index' },
        { value: 'delete_index', label: 'Delete Index' },
        { value: 'configure_index', label: 'Configure Index' },
        
        // Collection Operations
        { value: 'create_collection', label: 'Create Collection' },
        { value: 'list_collections', label: 'List Collections' },
        { value: 'describe_collection', label: 'Describe Collection' },
        { value: 'delete_collection', label: 'Delete Collection' },
        
        // Namespace Operations
        { value: 'list_namespaces', label: 'List Namespaces' },
        { value: 'delete_namespace', label: 'Delete Namespace' }
      ],
      required: true
    },

    // Index Configuration
    {
      label: 'Index Name',
      field: 'indexName',
      type: 'text',
      placeholder: 'my-index',
      required: function(config) {
        return !['list_indexes', 'list_collections'].includes(config?.operation as string);
      },
      validation: (value, config) => {
        const operation = config?.operation as string;
        if (!['list_indexes', 'list_collections'].includes(operation) && !value) {
          return 'Index name is required';
        }
        if (value && typeof value === 'string' && !value.match(/^[a-z0-9-]+$/)) {
          return 'Index name can only contain lowercase letters, numbers, and hyphens';
        }
        return null;
      }
    },
    {
      label: 'Namespace',
      field: 'namespace',
      type: 'text',
      placeholder: 'default',
      required: false,
      description: 'Namespace for vector operations (optional)'
    },

    // Vector Data
    {
      label: 'Vectors',
      field: 'vectors',
      type: 'textarea',
      placeholder: '[{"id": "vec1", "values": [0.1, 0.2, 0.3], "metadata": {"genre": "comedy"}}]',
      required: function(config) {
        return config?.operation === 'upsert';
      },
      validation: (value, config) => {
        const operation = config?.operation as string;
        if (operation === 'upsert' && value) {
          try {
            const vectors = typeof value === 'string' ? JSON.parse(value) : value;
            if (!Array.isArray(vectors)) {
              return 'Vectors must be a JSON array';
            }
            for (const vec of vectors) {
              if (!vec.id || !vec.values) {
                return 'Each vector must have id and values';
              }
              if (!Array.isArray(vec.values)) {
                return 'Vector values must be an array of numbers';
              }
            }
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },
    {
      label: 'Vector ID',
      field: 'vectorId',
      type: 'text',
      placeholder: 'vec-123',
      required: function(config) {
        return ['fetch', 'update'].includes(config?.operation as string);
      }
    },
    {
      label: 'Vector IDs',
      field: 'vectorIds',
      type: 'text',
      placeholder: 'vec1,vec2,vec3',
      required: function(config) {
        return config?.operation === 'delete' && !config?.deleteAll;
      },
      description: 'Comma-separated vector IDs'
    },

    // Query Configuration
    {
      label: 'Query Vector',
      field: 'queryVector',
      type: 'textarea',
      placeholder: '[0.1, 0.2, 0.3, ...]',
      required: function(config) {
        return config?.operation === 'query' && !config?.queryId;
      },
      validation: (value, config) => {
        const operation = config?.operation as string;
        const queryId = config?.queryId;
        if (operation === 'query' && !queryId && value) {
          try {
            const vector = typeof value === 'string' ? JSON.parse(value) : value;
            if (!Array.isArray(vector)) {
              return 'Query vector must be a JSON array of numbers';
            }
            if (vector.some(v => typeof v !== 'number')) {
              return 'All vector values must be numbers';
            }
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },
    {
      label: 'Query by ID',
      field: 'queryId',
      type: 'text',
      placeholder: 'vec-123',
      required: false,
      description: 'Query using an existing vector ID instead of values'
    },
    {
      label: 'Top K',
      field: 'topK',
      type: 'number',
      placeholder: '10',
      defaultValue: 10,
      required: function(config) {
        return config?.operation === 'query';
      },
      validation: (value, config) => {
        const operation = config?.operation as string;
        if (operation === 'query') {
          const numValue = typeof value === 'string' ? parseInt(value, 10) : (value as number);
          if (!value) return 'Top K is required';
          if (numValue < 1 || numValue > 10000) {
            return 'Top K must be between 1 and 10000';
          }
        }
        return null;
      }
    },
    {
      label: 'Include Values',
      field: 'includeValues',
      type: 'checkbox',
      defaultValue: false,
      required: false,
      description: 'Include vector values in query results'
    },
    {
      label: 'Include Metadata',
      field: 'includeMetadata',
      type: 'checkbox',
      defaultValue: true,
      required: false,
      description: 'Include metadata in query results'
    },

    // Metadata Filter
    {
      label: 'Metadata Filter',
      field: 'metadataFilter',
      type: 'textarea',
      placeholder: '{"genre": {"$in": ["comedy", "drama"]}, "year": {"$gte": 2020}}',
      required: false,
      description: 'MongoDB-style metadata filter',
      validation: (value) => {
        if (value) {
          try {
            JSON.parse(value as string);
          } catch {
            return 'Metadata filter must be valid JSON';
          }
        }
        return null;
      }
    },

    // Update Configuration
    {
      label: 'Update Values',
      field: 'updateValues',
      type: 'textarea',
      placeholder: '[0.1, 0.2, 0.3, ...]',
      required: false,
      description: 'New vector values for update',
      validation: (value) => {
        if (value) {
          try {
            const vector = typeof value === 'string' ? JSON.parse(value) : value;
            if (!Array.isArray(vector)) {
              return 'Update values must be a JSON array of numbers';
            }
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },
    {
      label: 'Set Metadata',
      field: 'setMetadata',
      type: 'textarea',
      placeholder: '{"genre": "action", "year": 2023}',
      required: false,
      description: 'Metadata to set/update',
      validation: (value) => {
        if (value) {
          try {
            JSON.parse(value as string);
          } catch {
            return 'Set metadata must be valid JSON';
          }
        }
        return null;
      }
    },

    // Delete Configuration
    {
      label: 'Delete All',
      field: 'deleteAll',
      type: 'checkbox',
      defaultValue: false,
      required: false,
      description: 'Delete all vectors in the namespace'
    },
    {
      label: 'Delete Filter',
      field: 'deleteFilter',
      type: 'textarea',
      placeholder: '{"genre": "comedy"}',
      required: false,
      description: 'Delete vectors matching this metadata filter',
      validation: (value) => {
        if (value) {
          try {
            JSON.parse(value as string);
          } catch {
            return 'Delete filter must be valid JSON';
          }
        }
        return null;
      }
    },

    // Index Creation Configuration
    {
      label: 'Dimension',
      field: 'dimension',
      type: 'number',
      placeholder: '384',
      required: function(config) {
        return config?.operation === 'create_index';
      },
      validation: (value, config) => {
        const operation = config?.operation as string;
        if (operation === 'create_index') {
          const numValue = typeof value === 'string' ? parseInt(value, 10) : (value as number);
          if (!value) return 'Dimension is required';
          if (numValue < 1 || numValue > 20000) {
            return 'Dimension must be between 1 and 20000';
          }
        }
        return null;
      }
    },
    {
      label: 'Metric',
      field: 'metric',
      type: 'select',
      options: [
        { value: 'cosine', label: 'Cosine' },
        { value: 'euclidean', label: 'Euclidean' },
        { value: 'dotproduct', label: 'Dot Product' }
      ],
      defaultValue: 'cosine',
      required: function(config) {
        return config?.operation === 'create_index';
      }
    },
    {
      label: 'Index Type',
      field: 'indexType',
      type: 'select',
      options: [
        { value: 's1', label: 'S1 - Starter' },
        { value: 'p1', label: 'P1 - Performance' },
        { value: 'p2', label: 'P2 - Performance' }
      ],
      defaultValue: 's1',
      required: false
    },
    {
      label: 'Replicas',
      field: 'replicas',
      type: 'number',
      placeholder: '1',
      defaultValue: 1,
      required: false,
      validation: (value) => {
        const numValue = typeof value === 'string' ? parseInt(value, 10) : (value as number);
        if (value && (numValue < 1 || numValue > 20)) {
          return 'Replicas must be between 1 and 20';
        }
        return null;
      }
    },
    {
      label: 'Pods',
      field: 'pods',
      type: 'number',
      placeholder: '1',
      defaultValue: 1,
      required: false,
      validation: (value) => {
        const numValue = typeof value === 'string' ? parseInt(value, 10) : (value as number);
        if (value && (numValue < 1 || numValue > 20)) {
          return 'Pods must be between 1 and 20';
        }
        return null;
      }
    },
    {
      label: 'Pod Type',
      field: 'podType',
      type: 'select',
      options: [
        { value: 's1.x1', label: 'S1.x1 - Starter' },
        { value: 's1.x2', label: 'S1.x2 - Starter' },
        { value: 's1.x4', label: 'S1.x4 - Starter' },
        { value: 's1.x8', label: 'S1.x8 - Starter' },
        { value: 'p1.x1', label: 'P1.x1 - Performance' },
        { value: 'p1.x2', label: 'P1.x2 - Performance' },
        { value: 'p1.x4', label: 'P1.x4 - Performance' },
        { value: 'p1.x8', label: 'P1.x8 - Performance' },
        { value: 'p2.x1', label: 'P2.x1 - Performance' },
        { value: 'p2.x2', label: 'P2.x2 - Performance' },
        { value: 'p2.x4', label: 'P2.x4 - Performance' },
        { value: 'p2.x8', label: 'P2.x8 - Performance' }
      ],
      defaultValue: 's1.x1',
      required: false
    },

    // Collection Configuration
    {
      label: 'Collection Name',
      field: 'collectionName',
      type: 'text',
      placeholder: 'my-collection',
      required: function(config) {
        return ['create_collection', 'describe_collection', 'delete_collection'].includes(config?.operation as string);
      },
      validation: (value, config) => {
        const operation = config?.operation as string;
        if (['create_collection', 'describe_collection', 'delete_collection'].includes(operation) && !value) {
          return 'Collection name is required';
        }
        if (value && typeof value === 'string' && !value.match(/^[a-z0-9-]+$/)) {
          return 'Collection name can only contain lowercase letters, numbers, and hyphens';
        }
        return null;
      }
    },
    {
      label: 'Source Index',
      field: 'sourceIndex',
      type: 'text',
      placeholder: 'source-index',
      required: function(config) {
        return config?.operation === 'create_collection';
      },
      description: 'Index to create collection from'
    },

    // Batch Options
    {
      label: 'Batch Size',
      field: 'batchSize',
      type: 'number',
      placeholder: '100',
      defaultValue: 100,
      required: false,
      validation: (value) => {
        const numValue = typeof value === 'string' ? parseInt(value, 10) : (value as number);
        if (value && (numValue < 1 || numValue > 100)) {
          return 'Batch size must be between 1 and 100';
        }
        return null;
      }
    },

    // Advanced Options
    {
      label: 'Sparse Values',
      field: 'sparseValues',
      type: 'textarea',
      placeholder: '{"indices": [1, 3, 5], "values": [0.1, 0.3, 0.5]}',
      required: false,
      description: 'Sparse vector representation',
      validation: (value) => {
        if (value) {
          try {
            const sparse = typeof value === 'string' ? JSON.parse(value) : value;
            if (!sparse.indices || !sparse.values) {
              return 'Sparse values must have indices and values arrays';
            }
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },
    {
      label: 'Timeout (seconds)',
      field: 'timeout',
      type: 'number',
      placeholder: '30',
      defaultValue: 30,
      required: false,
      validation: (value) => {
        const numValue = typeof value === 'string' ? parseInt(value, 10) : (value as number);
        if (value && numValue < 1) {
          return 'Timeout must be positive';
        }
        return null;
      }
    }
  ],
  examples: [
    {
      name: 'Upsert Vectors',
      description: 'Insert or update vectors with metadata',
      config: {
        apiKey: 'your-api-key',
        environment: 'us-west1-gcp',
        operation: 'upsert',
        indexName: 'product-embeddings',
        namespace: 'electronics',
        vectors: JSON.stringify([
          {
            id: 'product-1',
            values: [0.1, 0.2, 0.3, 0.4, 0.5],
            metadata: {
              category: 'laptop',
              brand: 'Apple',
              price: 1299,
              name: 'MacBook Air'
            }
          },
          {
            id: 'product-2',
            values: [0.2, 0.3, 0.4, 0.5, 0.6],
            metadata: {
              category: 'phone',
              brand: 'Samsung',
              price: 999,
              name: 'Galaxy S23'
            }
          }
        ], null, 2)
      }
    },
    {
      name: 'Semantic Search',
      description: 'Find similar vectors using semantic search',
      config: {
        apiKey: 'your-api-key',
        environment: 'us-west1-gcp',
        operation: 'query',
        indexName: 'product-embeddings',
        namespace: 'electronics',
        queryVector: '[0.15, 0.25, 0.35, 0.45, 0.55]',
        topK: 5,
        includeMetadata: true,
        includeValues: false,
        metadataFilter: JSON.stringify({
          category: 'laptop',
          price: { $lte: 1500 }
        }, null, 2)
      }
    },
    {
      name: 'Create Serverless Index',
      description: 'Create a new serverless Pinecone index',
      config: {
        apiKey: 'your-api-key',
        environment: 'us-west1-gcp',
        operation: 'create_index',
        indexName: 'semantic-search',
        dimension: 384,
        metric: 'cosine',
        indexType: 's1'
      }
    },
    {
      name: 'Query by ID',
      description: 'Find similar items using an existing vector',
      config: {
        apiKey: 'your-api-key',
        environment: 'us-west1-gcp',
        operation: 'query',
        indexName: 'product-embeddings',
        queryId: 'product-123',
        topK: 10,
        includeMetadata: true,
        metadataFilter: JSON.stringify({
          category: { $in: ['laptop', 'tablet'] }
        }, null, 2)
      }
    },
    {
      name: 'Update Vector Metadata',
      description: 'Update metadata for existing vector',
      config: {
        apiKey: 'your-api-key',
        environment: 'us-west1-gcp',
        operation: 'update',
        indexName: 'product-embeddings',
        vectorId: 'product-1',
        setMetadata: JSON.stringify({
          price: 1199,
          on_sale: true,
          discount: 0.1
        }, null, 2)
      }
    },
    {
      name: 'Delete by Metadata',
      description: 'Delete vectors matching metadata criteria',
      config: {
        apiKey: 'your-api-key',
        environment: 'us-west1-gcp',
        operation: 'delete',
        indexName: 'product-embeddings',
        namespace: 'discontinued',
        deleteFilter: JSON.stringify({
          status: 'discontinued',
          last_updated: { $lt: '2023-01-01' }
        }, null, 2)
      }
    }
  ]
};