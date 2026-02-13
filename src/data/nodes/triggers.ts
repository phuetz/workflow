import { NodeType } from '../../types/workflow';

export const TRIGGERS_NODES: Record<string, NodeType> = {
  trigger: {
      type: 'trigger',
      label: 'Déclencheur HTTP',
      icon: 'Webhook',
      color: 'bg-blue-500',
      category: 'trigger',
      inputs: 0,
      outputs: 1,
      description: 'Receive HTTP requests',
      errorHandle: false
    },
  webhook: {
      type: 'webhook',
      label: 'Webhook',
      icon: 'Link',
      color: 'bg-green-500',
      category: 'trigger',
      inputs: 0,
      outputs: 1,
      description: 'Webhook endpoint',
      errorHandle: false
    },
  schedule: {
      type: 'schedule',
      label: 'Schedule / Cron',
      icon: 'Clock',
      color: 'bg-indigo-500',
      category: 'trigger',
      inputs: 0,
      outputs: 1,
      description: 'Schedule execution',
      errorHandle: false
    },
  rssFeed: {
      type: 'rssFeed',
      label: 'RSS Feed',
      icon: 'Rss',
      color: 'bg-orange-500',
      category: 'trigger',
      inputs: 0,
      outputs: 1,
      description: 'Monitor RSS feeds',
      errorHandle: false
    },
  manualTrigger: {
      type: 'manualTrigger',
      label: 'Manual Trigger',
      icon: 'Play',
      color: 'bg-orange-600',
      category: 'trigger',
      inputs: 0,
      outputs: 1,
      description: 'Manual execution start'
    },
  formTrigger: {
      type: 'formTrigger',
      label: 'Form Trigger',
      icon: 'FileText',
      color: 'bg-teal-500',
      category: 'trigger',
      inputs: 0,
      outputs: 1,
      description: 'Start workflow when form is submitted',
      errorHandle: false
    },
  chatTrigger: {
      type: 'chatTrigger',
      label: 'Chat Trigger',
      icon: 'MessageCircle',
      color: 'bg-violet-500',
      category: 'trigger',
      inputs: 0,
      outputs: 1,
      description: 'Start workflow from chat interaction',
      errorHandle: false
    },
  fileWatcher: {
      type: 'fileWatcher',
      label: 'File Watcher',
      icon: 'Eye',
      color: 'bg-purple-500',
      category: 'trigger',
      inputs: 0,
      outputs: 1,
      description: 'Watch file system changes'
    },
  databaseTrigger: {
      type: 'databaseTrigger',
      label: 'Database Trigger',
      icon: 'Database',
      color: 'bg-green-500',
      category: 'trigger',
      inputs: 0,
      outputs: 1,
      description: 'Database change trigger'
    },
  emailTrigger: {
      type: 'emailTrigger',
      label: 'Email Trigger',
      icon: 'MailOpen',
      color: 'bg-red-500',
      category: 'trigger',
      inputs: 0,
      outputs: 1,
      description: 'Monitor email inbox'
    },

  // n8n Core Triggers (2024-2025)
  sseTrigger: {
    type: 'sseTrigger',
    label: 'SSE Trigger',
    icon: 'Radio',
    color: 'bg-cyan-600',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Listen to Server-Sent Events stream'
  },
  activationTrigger: {
    type: 'activationTrigger',
    label: 'Activation Trigger',
    icon: 'Power',
    color: 'bg-green-600',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Triggered when workflow is activated'
  },
  evaluationTrigger: {
    type: 'evaluationTrigger',
    label: 'Evaluation Trigger',
    icon: 'CheckCircle2',
    color: 'bg-amber-600',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Triggered when condition evaluates to true'
  },
  workflowTrigger: {
    type: 'workflowTrigger',
    label: 'Workflow Trigger',
    icon: 'Workflow',
    color: 'bg-purple-600',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Triggered from another workflow'
  },
  n8nTrigger: {
    type: 'n8nTrigger',
    label: 'Internal Trigger',
    icon: 'Zap',
    color: 'bg-indigo-600',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Internal platform event listener'
  },
  localFileTrigger: {
    type: 'localFileTrigger',
    label: 'Local File Trigger',
    icon: 'FolderOpen',
    color: 'bg-teal-600',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Watch local file system for changes'
  },
  errorTrigger: {
    type: 'errorTrigger',
    label: 'Error Trigger',
    icon: 'AlertCircle',
    color: 'bg-red-600',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Triggered when another workflow errors'
  },
  pollingTrigger: {
    type: 'pollingTrigger',
    label: 'Polling Trigger',
    icon: 'RefreshCw',
    color: 'bg-blue-600',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Periodically poll an API or resource for changes'
  },
  mqttTrigger: {
    type: 'mqttTrigger',
    label: 'MQTT Trigger',
    icon: 'Radio',
    color: 'bg-purple-700',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Listen to MQTT messages'
  },
  amqpTrigger: {
    type: 'amqpTrigger',
    label: 'AMQP Trigger',
    icon: 'MessageSquare',
    color: 'bg-orange-600',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Listen to RabbitMQ/AMQP messages'
  },
  kafkaTrigger: {
    type: 'kafkaTrigger',
    label: 'Kafka Trigger',
    icon: 'Activity',
    color: 'bg-gray-700',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Consume messages from Kafka topics'
  },
  redisTrigger: {
    type: 'redisTrigger',
    label: 'Redis Trigger',
    icon: 'Database',
    color: 'bg-red-700',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Listen to Redis pub/sub channels'
  },
  graphqlTrigger: {
    type: 'graphqlTrigger',
    label: 'GraphQL Subscription',
    icon: 'Share2',
    color: 'bg-pink-600',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Listen to GraphQL subscriptions'
  },
  websocketTrigger: {
    type: 'websocketTrigger',
    label: 'WebSocket Trigger',
    icon: 'Link2',
    color: 'bg-violet-600',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Listen to WebSocket messages'
  }
};
