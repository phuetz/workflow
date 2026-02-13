import { NodeType } from '../../types/workflow';

export const FLOW_NODES: Record<string, NodeType> = {
  formPage: {
      type: 'formPage',
      label: 'Form Page',
      icon: 'Layers',
      color: 'bg-teal-400',
      category: 'flow',
      inputs: 1,
      outputs: 1,
      description: 'Add additional form pages'
    },
  wait: {
      type: 'wait',
      label: 'Wait',
      icon: 'Clock',
      color: 'bg-gray-500',
      category: 'flow',
      inputs: 1,
      outputs: 1,
      description: 'Wait for specified time or event'
    },
  httpRequest: {
      type: 'httpRequest',
      label: 'Requête HTTP',
      icon: 'Globe',
      color: 'bg-purple-500',
      category: 'core',
      inputs: 1,
      outputs: 1,
      description: 'Make HTTP requests'
    },
  transform: {
      type: 'transform',
      label: 'Transformer',
      icon: 'Shuffle',
      color: 'bg-yellow-500',
      category: 'core',
      inputs: 1,
      outputs: 1,
      description: 'Transform data'
    },
  condition: {
      type: 'condition',
      label: 'Condition',
      icon: 'GitBranch',
      color: 'bg-red-500',
      category: 'core',
      inputs: 1,
      outputs: 2,
      description: 'Conditional branching'
    },
  code: {
      type: 'code',
      label: 'Code JavaScript',
      icon: 'Code',
      color: 'bg-pink-500',
      category: 'core',
      inputs: 1,
      outputs: 1,
      description: 'Execute JavaScript code'
    },
  python: {
      type: 'python',
      label: 'Code Python',
      icon: 'FileText',
      color: 'bg-green-700',
      category: 'core',
      inputs: 1,
      outputs: 1,
      description: 'Execute Python code'
    },
  function: {
      type: 'function',
      label: 'Function',
      icon: 'Zap',
      color: 'bg-yellow-500',
      category: 'core',
      inputs: 1,
      outputs: 1,
      description: 'Execute simple JavaScript expressions with $json, $items access'
    },
  functionItem: {
      type: 'functionItem',
      label: 'Function Item',
      icon: 'Zap',
      color: 'bg-yellow-600',
      category: 'core',
      inputs: 1,
      outputs: 1,
      description: 'Execute JavaScript for each item individually'
    },
  merge: {
      type: 'merge',
      label: 'Fusion',
      icon: 'Merge',
      color: 'bg-teal-500',
      category: 'flow',
      inputs: 2,
      outputs: 1,
      description: 'Merge multiple inputs'
    },
  split: {
      type: 'split',
      label: 'Diviser',
      icon: 'Split',
      color: 'bg-teal-600',
      category: 'flow',
      inputs: 1,
      outputs: 2,
      description: 'Split data flow'
    },
  loop: {
      type: 'loop',
      label: 'Boucle',
      icon: 'RotateCcw',
      color: 'bg-orange-600',
      category: 'flow',
      inputs: 1,
      outputs: 2,
      description: 'Loop through items'
    },
  forEach: {
      type: 'forEach',
      label: 'For Each',
      icon: 'List',
      color: 'bg-orange-500',
      category: 'flow',
      inputs: 1,
      outputs: 1,
      description: 'Iterate over a list of items'
    },
  whileLoop: {
      type: 'whileLoop',
      label: 'While Loop',
      icon: 'RepeatIcon',
      color: 'bg-orange-400',
      category: 'flow',
      inputs: 1,
      outputs: 2,
      description: 'Loop while condition is true'
    },
  switchCase: {
      type: 'switchCase',
      label: 'Switch/Case',
      icon: 'GitBranch',
      color: 'bg-purple-600',
      category: 'flow',
      inputs: 1,
      outputs: 5,
      description: 'Multi-branch conditional routing'
    },
  tryCatch: {
      type: 'tryCatch',
      label: 'Try/Catch',
      icon: 'Shield',
      color: 'bg-red-500',
      category: 'flow',
      inputs: 1,
      outputs: 2,
      description: 'Error handling with retry logic',
      errorHandle: true
    },
  delay: {
      type: 'delay',
      label: 'Délai',
      icon: 'Timer',
      color: 'bg-gray-500',
      category: 'flow',
      inputs: 1,
      outputs: 1,
      description: 'Add delay'
    },
  approval: {
      type: 'approval',
      label: 'Wait for Approval',
      icon: 'CheckCircle',
      color: 'bg-yellow-600',
      category: 'flow',
      inputs: 1,
      outputs: 2,
      description: 'Pause workflow for human approval',
      errorHandle: false
    },
  subWorkflow: {
      type: 'subWorkflow',
      label: 'Sub-workflow',
      icon: 'Workflow',
      color: 'bg-purple-600',
      category: 'flow',
      inputs: 1,
      outputs: 1,
      description: 'Execute sub-workflow'
    },
  errorWorkflow: {
      type: 'errorWorkflow',
      label: 'Error Workflow',
      icon: 'AlertTriangle',
      color: 'bg-red-600',
      category: 'flow',
      inputs: 1,
      outputs: 1,
      description: 'Error handling workflow'
    },
  retry: {
      type: 'retry',
      label: 'Retry',
      icon: 'RotateCcw',
      color: 'bg-orange-500',
      category: 'flow',
      inputs: 1,
      outputs: 2,
      description: 'Retry failed operations'
    },
  // n8n Core Nodes
  respondToWebhook: {
      type: 'respondToWebhook',
      label: 'Respond to Webhook',
      icon: 'Reply',
      color: 'bg-green-600',
      category: 'flow',
      inputs: 1,
      outputs: 1,
      description: 'Send response back to webhook caller'
    },
  stopAndError: {
      type: 'stopAndError',
      label: 'Stop and Error',
      icon: 'XCircle',
      color: 'bg-red-700',
      category: 'flow',
      inputs: 1,
      outputs: 0,
      description: 'Stop workflow and throw an error',
      errorHandle: true
    },
  noOperation: {
      type: 'noOperation',
      label: 'No Operation',
      icon: 'MinusCircle',
      color: 'bg-gray-400',
      category: 'flow',
      inputs: 1,
      outputs: 1,
      description: 'Pass through data without changes (no-op)'
    },
  splitInBatches: {
      type: 'splitInBatches',
      label: 'Split In Batches',
      icon: 'Layers',
      color: 'bg-purple-500',
      category: 'flow',
      inputs: 1,
      outputs: 2,
      description: 'Process items in batches of specified size'
    },
  executeWorkflowTrigger: {
      type: 'executeWorkflowTrigger',
      label: 'Execute Workflow Trigger',
      icon: 'Play',
      color: 'bg-blue-600',
      category: 'trigger',
      inputs: 0,
      outputs: 1,
      description: 'Triggered when workflow is called by another workflow'
    }
};
