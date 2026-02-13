/**
 * Helper functions for CustomNode
 * Extracted to improve maintainability and testability
 */

/**
 * Get border color based on node execution state
 */
export const getBorderColor = (
  isExecuting: boolean,
  hasError: boolean,
  hasResult: boolean,
  isConfigured: boolean
): string => {
  if (isExecuting) return 'border-blue-500';
  if (hasError) return 'border-red-500';
  if (hasResult) return 'border-green-500';
  if (isConfigured) return 'border-blue-300';
  return 'border-gray-300';
};

/**
 * Get configuration summary for node
 */
export const getConfigInfo = (config: Record<string, unknown> | undefined, nodeType: string): string => {
  if (!config || Object.keys(config).length === 0) {
    return 'Non configuré - cliquez pour configurer';
  }

  // Node-specific config summaries
  switch (nodeType) {
    case 'httpRequest':
      return `${config.method || 'GET'} ${config.url || ''}`.slice(0, 30);

    case 'email':
    case 'gmail':
      return `À: ${config.to || 'Non défini'}`.slice(0, 30);

    case 'slack':
      return `Canal: ${config.channel || 'Non défini'}`.slice(0, 30);

    case 'schedule':
      return `Cron: ${config.cron || 'Non défini'}`.slice(0, 30);

    case 'condition':
      return `Si: ${config.expression || 'Non défini'}`.slice(0, 30);

    case 'delay':
      return `Délai: ${config.delay || '0'}ms`;

    case 'mysql':
    case 'postgres':
    case 'mongodb':
      return `DB: ${config.database || 'Non défini'}`.slice(0, 30);

    case 'code':
    case 'python':
      return config.code ? 'Code personnalisé' : 'Non configuré';

    case 'openai':
    case 'anthropic':
      return `Modèle: ${config.model || 'défaut'}`.slice(0, 30);

    default:
      // Generic config summary - show first configured field
      const firstKey = Object.keys(config)[0];
      if (firstKey && config[firstKey]) {
        return `${firstKey}: ${String(config[firstKey])}`.slice(0, 30);
      }
      return 'Configuré';
  }
};

/**
 * Get number of input/output ports for a node type
 */
export const getPortCounts = (
  nodeType: string,
  nodeTypeConfig: { inputs?: number; outputs?: number } | undefined
): { inputCount: number; outputCount: number } => {
  // Default values
  let inputCount = 1;
  let outputCount = 1;

  // Override based on node type configuration
  if (nodeTypeConfig) {
    if (typeof nodeTypeConfig.inputs === 'number') {
      inputCount = nodeTypeConfig.inputs;
    }
    if (typeof nodeTypeConfig.outputs === 'number') {
      outputCount = nodeTypeConfig.outputs;
    }
  }

  // Special cases
  switch (nodeType) {
    case 'trigger':
    case 'manualTrigger':
    case 'schedule':
    case 'webhook':
    case 'rssFeed':
      inputCount = 0; // Triggers have no inputs
      outputCount = 1;
      break;

    case 'condition':
      inputCount = 1;
      outputCount = 2; // true/false branches
      break;

    case 'merge':
      inputCount = 2; // Can merge multiple inputs
      outputCount = 1;
      break;

    case 'split':
      inputCount = 1;
      outputCount = 2; // Split into multiple outputs
      break;
  }

  return { inputCount, outputCount };
};
