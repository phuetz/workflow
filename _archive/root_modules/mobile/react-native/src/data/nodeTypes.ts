/**
 * Mobile-optimized node types and categories
 */

export interface NodeType {
  type: string;
  label: string;
  description?: string;
  icon?: string;
  color: string;
  category: string;
}

export interface NodeCategory {
  id: string;
  name: string;
  icon: string;
  nodes: NodeType[];
}

export const nodeCategories: NodeCategory[] = [
  {
    id: 'triggers',
    name: 'Triggers',
    icon: 'play-arrow',
    nodes: [
      {
        type: 'webhook',
        label: 'Webhook',
        description: 'Trigger on HTTP request',
        icon: 'webhook',
        color: '#3B82F6',
        category: 'triggers'
      },
      {
        type: 'schedule',
        label: 'Schedule',
        description: 'Run at specific times',
        icon: 'schedule',
        color: '#10B981',
        category: 'triggers'
      },
      {
        type: 'email',
        label: 'Email Trigger',
        description: 'Trigger on new email',
        icon: 'email',
        color: '#F59E0B',
        category: 'triggers'
      },
      {
        type: 'form',
        label: 'Form Submit',
        description: 'Trigger on form submission',
        icon: 'dynamic-form',
        color: '#EF4444',
        category: 'triggers'
      }
    ]
  },
  {
    id: 'actions',
    name: 'Actions',
    icon: 'flash-on',
    nodes: [
      {
        type: 'http',
        label: 'HTTP Request',
        description: 'Make API calls',
        icon: 'http',
        color: '#6366F1',
        category: 'actions'
      },
      {
        type: 'database',
        label: 'Database',
        description: 'Query or update database',
        icon: 'storage',
        color: '#84CC16',
        category: 'actions'
      },
      {
        type: 'email-send',
        label: 'Send Email',
        description: 'Send email messages',
        icon: 'send',
        color: '#06B6D4',
        category: 'actions'
      },
      {
        type: 'slack',
        label: 'Slack',
        description: 'Send Slack messages',
        icon: 'chat',
        color: '#7C3AED',
        category: 'actions'
      }
    ]
  },
  {
    id: 'data',
    name: 'Data',
    icon: 'transform',
    nodes: [
      {
        type: 'transform',
        label: 'Transform',
        description: 'Transform data structure',
        icon: 'transform',
        color: '#EC4899',
        category: 'data'
      },
      {
        type: 'filter',
        label: 'Filter',
        description: 'Filter data items',
        icon: 'filter-list',
        color: '#F97316',
        category: 'data'
      },
      {
        type: 'merge',
        label: 'Merge',
        description: 'Merge multiple inputs',
        icon: 'merge-type',
        color: '#0EA5E9',
        category: 'data'
      },
      {
        type: 'split',
        label: 'Split',
        description: 'Split data into batches',
        icon: 'call-split',
        color: '#8B5CF6',
        category: 'data'
      }
    ]
  },
  {
    id: 'logic',
    name: 'Logic',
    icon: 'device-hub',
    nodes: [
      {
        type: 'if',
        label: 'If',
        description: 'Conditional branching',
        icon: 'alt-route',
        color: '#10B981',
        category: 'logic'
      },
      {
        type: 'switch',
        label: 'Switch',
        description: 'Multiple conditions',
        icon: 'shuffle',
        color: '#F59E0B',
        category: 'logic'
      },
      {
        type: 'loop',
        label: 'Loop',
        description: 'Iterate over items',
        icon: 'loop',
        color: '#3B82F6',
        category: 'logic'
      },
      {
        type: 'wait',
        label: 'Wait',
        description: 'Delay execution',
        icon: 'timer',
        color: '#EF4444',
        category: 'logic'
      }
    ]
  },
  {
    id: 'ai',
    name: 'AI & ML',
    icon: 'psychology',
    nodes: [
      {
        type: 'openai',
        label: 'OpenAI',
        description: 'GPT models',
        icon: 'smart-toy',
        color: '#10B981',
        category: 'ai'
      },
      {
        type: 'sentiment',
        label: 'Sentiment',
        description: 'Analyze sentiment',
        icon: 'sentiment-satisfied',
        color: '#F59E0B',
        category: 'ai'
      },
      {
        type: 'translate',
        label: 'Translate',
        description: 'Translate text',
        icon: 'translate',
        color: '#3B82F6',
        category: 'ai'
      },
      {
        type: 'vision',
        label: 'Vision',
        description: 'Image analysis',
        icon: 'visibility',
        color: '#EF4444',
        category: 'ai'
      }
    ]
  }
];