/**
 * Enhanced Node Types - Additional 30+ nodes
 * Microsoft, Firebase, Supabase, and more
 */

import { NodeConfig } from './nodeTypes';

export const enhancedNodeTypes: Record<string, NodeConfig> = {
  // ============ Microsoft Nodes ============
  microsoftOneDrive: {
    type: 'microsoftOneDrive',
    label: 'OneDrive',
    description: 'Access and manage files in Microsoft OneDrive',
    category: 'microsoft',
    icon: 'Cloud',
    inputs: [{ name: 'operation', type: 'string' }],
    outputs: [{ name: 'result', type: 'any' }],
    config: {
      operation: {
        type: 'select',
        options: ['upload', 'download', 'list', 'delete', 'create_folder']
      },
      path: { type: 'string', required: true }
    }
  },

  microsoftSharePoint: {
    type: 'microsoftSharePoint',
    label: 'SharePoint',
    description: 'Integrate with Microsoft SharePoint',
    category: 'microsoft',
    icon: 'Database',
    inputs: [{ name: 'action', type: 'string' }],
    outputs: [{ name: 'data', type: 'any' }],
    config: {
      siteUrl: { type: 'string', required: true },
      listName: { type: 'string' },
      operation: {
        type: 'select',
        options: ['get_items', 'create_item', 'update_item', 'delete_item']
      }
    }
  },

  microsoftTeams: {
    type: 'microsoftTeams',
    label: 'Microsoft Teams',
    description: 'Send messages to Microsoft Teams',
    category: 'microsoft',
    icon: 'MessageSquare',
    inputs: [{ name: 'message', type: 'string' }],
    outputs: [{ name: 'status', type: 'string' }],
    config: {
      webhookUrl: { type: 'string', required: true },
      message: { type: 'text', required: true },
      title: { type: 'string' }
    }
  },

  microsoftPowerBI: {
    type: 'microsoftPowerBI',
    label: 'Power BI',
    description: 'Push data to Power BI datasets',
    category: 'microsoft',
    icon: 'BarChart',
    inputs: [{ name: 'data', type: 'array' }],
    outputs: [{ name: 'result', type: 'any' }],
    config: {
      datasetId: { type: 'string', required: true },
      tableName: { type: 'string', required: true }
    }
  },

  microsoftOutlook: {
    type: 'microsoftOutlook',
    label: 'Outlook',
    description: 'Send emails via Microsoft Outlook',
    category: 'microsoft',
    icon: 'Mail',
    inputs: [{ name: 'email', type: 'object' }],
    outputs: [{ name: 'sent', type: 'boolean' }],
    config: {
      to: { type: 'string', required: true },
      subject: { type: 'string', required: true },
      body: { type: 'text', required: true },
      attachments: { type: 'array' }
    }
  },

  // ============ Firebase Nodes ============
  firebaseAuth: {
    type: 'firebaseAuth',
    label: 'Firebase Auth',
    description: 'Authenticate users with Firebase',
    category: 'firebase',
    icon: 'Lock',
    inputs: [{ name: 'credentials', type: 'object' }],
    outputs: [{ name: 'user', type: 'object' }],
    config: {
      operation: {
        type: 'select',
        options: ['sign_in', 'sign_up', 'sign_out', 'verify_email', 'reset_password']
      }
    }
  },

  firebaseFirestore: {
    type: 'firebaseFirestore',
    label: 'Firestore',
    description: 'Interact with Firebase Firestore database',
    category: 'firebase',
    icon: 'Database',
    inputs: [{ name: 'data', type: 'any' }],
    outputs: [{ name: 'result', type: 'any' }],
    config: {
      collection: { type: 'string', required: true },
      operation: {
        type: 'select',
        options: ['get', 'add', 'update', 'delete', 'query']
      },
      documentId: { type: 'string' }
    }
  },

  firebaseStorage: {
    type: 'firebaseStorage',
    label: 'Firebase Storage',
    description: 'Upload and manage files in Firebase Storage',
    category: 'firebase',
    icon: 'HardDrive',
    inputs: [{ name: 'file', type: 'any' }],
    outputs: [{ name: 'url', type: 'string' }],
    config: {
      operation: {
        type: 'select',
        options: ['upload', 'download', 'delete', 'get_url']
      },
      path: { type: 'string', required: true }
    }
  },

  firebaseRealtimeDB: {
    type: 'firebaseRealtimeDB',
    label: 'Realtime Database',
    description: 'Interact with Firebase Realtime Database',
    category: 'firebase',
    icon: 'Zap',
    inputs: [{ name: 'data', type: 'any' }],
    outputs: [{ name: 'result', type: 'any' }],
    config: {
      path: { type: 'string', required: true },
      operation: {
        type: 'select',
        options: ['get', 'set', 'update', 'remove', 'push']
      }
    }
  },

  firebaseFunctions: {
    type: 'firebaseFunctions',
    label: 'Cloud Functions',
    description: 'Call Firebase Cloud Functions',
    category: 'firebase',
    icon: 'Code',
    inputs: [{ name: 'params', type: 'object' }],
    outputs: [{ name: 'response', type: 'any' }],
    config: {
      functionName: { type: 'string', required: true },
      region: { type: 'string', default: 'us-central1' }
    }
  },

  // ============ Supabase Nodes ============
  supabaseAuth: {
    type: 'supabaseAuth',
    label: 'Supabase Auth',
    description: 'Authenticate users with Supabase',
    category: 'supabase',
    icon: 'Shield',
    inputs: [{ name: 'credentials', type: 'object' }],
    outputs: [{ name: 'session', type: 'object' }],
    config: {
      operation: {
        type: 'select',
        options: ['sign_in', 'sign_up', 'sign_out', 'reset_password', 'update_user']
      }
    }
  },

  supabaseDatabase: {
    type: 'supabaseDatabase',
    label: 'Supabase DB',
    description: 'Query Supabase PostgreSQL database',
    category: 'supabase',
    icon: 'Database',
    inputs: [{ name: 'data', type: 'any' }],
    outputs: [{ name: 'rows', type: 'array' }],
    config: {
      table: { type: 'string', required: true },
      operation: {
        type: 'select',
        options: ['select', 'insert', 'update', 'delete', 'upsert']
      },
      filters: { type: 'object' }
    }
  },

  supabaseStorage: {
    type: 'supabaseStorage',
    label: 'Supabase Storage',
    description: 'Manage files in Supabase Storage',
    category: 'supabase',
    icon: 'Folder',
    inputs: [{ name: 'file', type: 'any' }],
    outputs: [{ name: 'url', type: 'string' }],
    config: {
      bucket: { type: 'string', required: true },
      operation: {
        type: 'select',
        options: ['upload', 'download', 'delete', 'list', 'get_public_url']
      },
      path: { type: 'string', required: true }
    }
  },

  supabaseRealtime: {
    type: 'supabaseRealtime',
    label: 'Realtime',
    description: 'Subscribe to Supabase realtime changes',
    category: 'supabase',
    icon: 'Radio',
    inputs: [],
    outputs: [{ name: 'changes', type: 'any' }],
    config: {
      table: { type: 'string', required: true },
      event: {
        type: 'select',
        options: ['INSERT', 'UPDATE', 'DELETE', '*']
      }
    }
  },

  // ============ Message Queue Nodes ============
  rabbitMQ: {
    type: 'rabbitMQ',
    label: 'RabbitMQ',
    description: 'Publish/Subscribe messages with RabbitMQ',
    category: 'messaging',
    icon: 'MessageCircle',
    inputs: [{ name: 'message', type: 'any' }],
    outputs: [{ name: 'result', type: 'any' }],
    config: {
      operation: { type: 'select', options: ['publish', 'consume'] },
      queue: { type: 'string', required: true },
      exchange: { type: 'string' },
      routingKey: { type: 'string' }
    }
  },

  kafka: {
    type: 'kafka',
    label: 'Apache Kafka',
    description: 'Produce/Consume Kafka messages',
    category: 'messaging',
    icon: 'Zap',
    inputs: [{ name: 'message', type: 'any' }],
    outputs: [{ name: 'result', type: 'any' }],
    config: {
      operation: { type: 'select', options: ['produce', 'consume'] },
      topic: { type: 'string', required: true },
      partition: { type: 'number' },
      key: { type: 'string' }
    }
  },

  redis: {
    type: 'redis',
    label: 'Redis',
    description: 'Cache and retrieve data with Redis',
    category: 'messaging',
    icon: 'Layers',
    inputs: [{ name: 'data', type: 'any' }],
    outputs: [{ name: 'result', type: 'any' }],
    config: {
      operation: {
        type: 'select',
        options: ['get', 'set', 'del', 'incr', 'lpush', 'rpush', 'expire']
      },
      key: { type: 'string', required: true },
      ttl: { type: 'number' }
    }
  },

  // ============ Data Processing Nodes ============
  jsonTransform: {
    type: 'jsonTransform',
    label: 'JSON Transform',
    description: 'Transform JSON using JSONPath and templates',
    category: 'data',
    icon: 'Code',
    inputs: [{ name: 'data', type: 'object' }],
    outputs: [{ name: 'transformed', type: 'object' }],
    config: {
      template: { type: 'json', required: true },
      mode: { type: 'select', options: ['jmespath', 'jsonpath', 'template'] }
    }
  },

  csvParser: {
    type: 'csvParser',
    label: 'CSV Parser',
    description: 'Parse CSV files into JSON',
    category: 'data',
    icon: 'FileText',
    inputs: [{ name: 'csv', type: 'string' }],
    outputs: [{ name: 'json', type: 'array' }],
    config: {
      delimiter: { type: 'string', default: ',' },
      hasHeader: { type: 'boolean', default: true },
      encoding: { type: 'string', default: 'utf-8' }
    }
  },

  xmlParser: {
    type: 'xmlParser',
    label: 'XML Parser',
    description: 'Parse XML into JSON',
    category: 'data',
    icon: 'Code',
    inputs: [{ name: 'xml', type: 'string' }],
    outputs: [{ name: 'json', type: 'object' }],
    config: {
      ignoreAttributes: { type: 'boolean', default: false },
      arrayMode: { type: 'boolean', default: false }
    }
  },

  dataAggregator: {
    type: 'dataAggregator',
    label: 'Aggregator',
    description: 'Aggregate data with sum, avg, min, max',
    category: 'data',
    icon: 'BarChart2',
    inputs: [{ name: 'data', type: 'array' }],
    outputs: [{ name: 'result', type: 'object' }],
    config: {
      operation: {
        type: 'select',
        options: ['sum', 'avg', 'min', 'max', 'count', 'group_by']
      },
      field: { type: 'string', required: true },
      groupBy: { type: 'string' }
    }
  },

  dataSplitter: {
    type: 'dataSplitter',
    label: 'Data Splitter',
    description: 'Split arrays into batches',
    category: 'data',
    icon: 'Split',
    inputs: [{ name: 'data', type: 'array' }],
    outputs: [{ name: 'batches', type: 'array' }],
    config: {
      batchSize: { type: 'number', required: true, default: 10 },
      mode: { type: 'select', options: ['size', 'count'] }
    }
  },

  // ============ ML/AI Nodes ============
  tensorflowPredict: {
    type: 'tensorflowPredict',
    label: 'TensorFlow',
    description: 'Run TensorFlow.js predictions',
    category: 'ai',
    icon: 'Brain',
    inputs: [{ name: 'input', type: 'any' }],
    outputs: [{ name: 'prediction', type: 'any' }],
    config: {
      modelUrl: { type: 'string', required: true },
      inputShape: { type: 'array' }
    }
  },

  sentimentAnalysis: {
    type: 'sentimentAnalysis',
    label: 'Sentiment Analysis',
    description: 'Analyze text sentiment',
    category: 'ai',
    icon: 'Smile',
    inputs: [{ name: 'text', type: 'string' }],
    outputs: [{ name: 'sentiment', type: 'object' }],
    config: {
      language: { type: 'string', default: 'en' }
    }
  },

  imageRecognition: {
    type: 'imageRecognition',
    label: 'Image Recognition',
    description: 'Recognize objects in images',
    category: 'ai',
    icon: 'Image',
    inputs: [{ name: 'image', type: 'any' }],
    outputs: [{ name: 'objects', type: 'array' }],
    config: {
      model: { type: 'select', options: ['mobilenet', 'coco-ssd', 'yolo'] },
      threshold: { type: 'number', default: 0.5 }
    }
  },

  // ============ Monitoring Nodes ============
  prometheus: {
    type: 'prometheus',
    label: 'Prometheus',
    description: 'Query Prometheus metrics',
    category: 'monitoring',
    icon: 'Activity',
    inputs: [{ name: 'query', type: 'string' }],
    outputs: [{ name: 'metrics', type: 'array' }],
    config: {
      url: { type: 'string', required: true },
      query: { type: 'text', required: true },
      step: { type: 'string' }
    }
  },

  grafana: {
    type: 'grafana',
    label: 'Grafana',
    description: 'Create Grafana annotations',
    category: 'monitoring',
    icon: 'TrendingUp',
    inputs: [{ name: 'annotation', type: 'object' }],
    outputs: [{ name: 'result', type: 'any' }],
    config: {
      url: { type: 'string', required: true },
      apiKey: { type: 'string', required: true },
      dashboardId: { type: 'string' }
    }
  },

  sentry: {
    type: 'sentry',
    label: 'Sentry',
    description: 'Report errors to Sentry',
    category: 'monitoring',
    icon: 'AlertCircle',
    inputs: [{ name: 'error', type: 'object' }],
    outputs: [{ name: 'eventId', type: 'string' }],
    config: {
      dsn: { type: 'string', required: true },
      environment: { type: 'string', default: 'production' },
      level: {
        type: 'select',
        options: ['debug', 'info', 'warning', 'error', 'fatal']
      }
    }
  }
};

// New categories
export const enhancedCategories = {
  microsoft: {
    name: 'Microsoft',
    color: '#0078D4',
    icon: 'Cloud'
  },
  firebase: {
    name: 'Firebase',
    color: '#FFCA28',
    icon: 'Zap'
  },
  supabase: {
    name: 'Supabase',
    color: '#3ECF8E',
    icon: 'Database'
  },
  messaging: {
    name: 'Messaging',
    color: '#FF6B6B',
    icon: 'MessageSquare'
  },
  monitoring: {
    name: 'Monitoring',
    color: '#4ECDC4',
    icon: 'Activity'
  }
};

export default enhancedNodeTypes;
