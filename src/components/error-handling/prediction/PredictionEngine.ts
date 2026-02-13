/**
 * Core prediction logic for error detection and node health analysis
 */

import { logger } from '../../../services/SimpleLogger';
import type { PredictedError, NodeHealth, REQUIRED_CONFIG_FIELDS } from './types';

type WorkflowNode = {
  id: string;
  data: {
    type: string;
    label?: string;
    config?: Record<string, unknown>;
    description?: string;
  };
};

type WorkflowEdge = {
  source: string;
  target: string;
  sourceHandle?: string;
};

type ExecutionHistoryEntry = {
  status: string;
  errors?: Array<{ nodeId?: string }>;
};

/**
 * Detect circular references in workflow edges using DFS
 */
export function detectCircularReferences(edgeList: WorkflowEdge[]): string[][] {
  const adjacencyList: { [key: string]: string[] } = {};

  // Build adjacency list from edges
  edgeList.forEach(edge => {
    if (!adjacencyList[edge.source]) {
      adjacencyList[edge.source] = [];
    }
    adjacencyList[edge.source].push(edge.target);
  });

  const circularPaths: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  // DFS to find cycles with memory-safe implementation
  const dfs = (nodeId: string, path: string[] = []): boolean => {
    const neighbors = adjacencyList[nodeId] || [];

    // Prevent excessive recursion (DoS protection)
    if (path.length > 100) {
      logger.warn('Maximum path depth reached, stopping cycle detection');
      return false;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, path)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Cycle detected
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          circularPaths.push([...path.slice(cycleStart)]);
        }
        return true;
      }
    }

    // Clean up path on backtrack to prevent memory leak
    path.pop();
    recursionStack.delete(nodeId);
    return false;
  };

  // Check each node
  Object.keys(adjacencyList).forEach(nodeId => {
    if (!visited.has(nodeId)) {
      dfs(nodeId);
    }
  });

  return circularPaths;
}

/**
 * Predict potential errors in the workflow
 */
export function predictPotentialErrors(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  executionHistory: ExecutionHistoryEntry[],
  ignoredErrors: string[]
): PredictedError[] {
  const predictions: PredictedError[] = [];

  // Analyze each node for potential errors
  nodes.forEach(node => {
    const nodeType = node.data.type;
    const nodeConfig = (node.data.config || {}) as Record<string, unknown>;

    // HTTP Request nodes
    if (nodeType === 'httpRequest' || nodeType === 'webhook' || nodeType.includes('api')) {
      analyzeHttpNode(node, nodeConfig, predictions);
    }

    // Database nodes
    if (nodeType === 'mysql' || nodeType === 'postgres' || nodeType === 'mongodb') {
      analyzeDatabaseNode(node, nodeConfig, predictions);
    }

    // AI Services
    if (nodeType === 'openai' || nodeType === 'anthropic') {
      analyzeAINode(node, nodeConfig, predictions);
    }

    // Email nodes
    if (nodeType === 'email' || nodeType === 'gmail') {
      analyzeEmailNode(node, nodeConfig, predictions);
    }

    // Code nodes
    if (nodeType === 'code' || nodeType === 'python') {
      analyzeCodeNode(node, nodeConfig, predictions);
    }

    // Condition nodes
    if (nodeType === 'condition') {
      analyzeConditionNode(node, nodeConfig, predictions);
    }

    // Generic checks for all nodes
    analyzeGenericNode(node, edges, predictions);
  });

  // Check workflow-level issues
  const circularPaths = detectCircularReferences(edges);
  if (circularPaths.length > 0) {
    predictions.push({
      id: `err_${Date.now()}_workflow_1`,
      nodeId: 'workflow',
      nodeName: 'Workflow Structure',
      errorType: 'logic',
      description: 'References circulaires detectees dans le workflow',
      probability: 95,
      severity: 'critical',
      suggestedFix: 'Eliminer les boucles infinies en ajoutant une condition de sortie ou en brisant le cycle',
      detectionConfidence: 95
    });
  }

  // Check execution history for patterns
  analyzeExecutionHistory(nodes, executionHistory, predictions);

  // Remove ignored errors
  return predictions.filter(err => !ignoredErrors.includes(err.id));
}

function analyzeHttpNode(
  node: WorkflowNode,
  nodeConfig: Record<string, unknown>,
  predictions: PredictedError[]
): void {
  const nodeType = node.data.type;

  // Check for URL validity
  if (!nodeConfig.url || !(nodeConfig.url as string).startsWith('http')) {
    predictions.push({
      id: `err_${Date.now()}_${node.id}_1`,
      nodeId: node.id,
      nodeName: node.data.label || nodeType,
      errorType: 'connectivity',
      description: 'URL invalide ou manquante',
      probability: 95,
      severity: 'high',
      suggestedFix: 'Ajouter une URL valide commencant par http:// ou https://',
      detectionConfidence: 98
    });
  }

  // Check for rate limiting issues
  const url = nodeConfig.url as string;
  if (url?.includes('api.github.com') ||
      url?.includes('api.twitter.com') ||
      url?.includes('api.openai.com')) {
    predictions.push({
      id: `err_${Date.now()}_${node.id}_2`,
      nodeId: node.id,
      nodeName: node.data.label || nodeType,
      errorType: 'rate_limit',
      description: 'API susceptible aux limites de taux (rate limits)',
      probability: 65,
      severity: 'medium',
      suggestedFix: 'Implementer un backoff exponentiel et la gestion des erreurs 429',
      detectionConfidence: 85
    });
  }

  // Check for timeout possibilities
  if (!nodeConfig.timeout) {
    predictions.push({
      id: `err_${Date.now()}_${node.id}_3`,
      nodeId: node.id,
      nodeName: node.data.label || nodeType,
      errorType: 'timeout',
      description: 'Aucun timeout configure',
      probability: 40,
      severity: 'medium',
      suggestedFix: 'Definir un timeout approprie (ex: 10000ms)',
      detectionConfidence: 75
    });
  }
}

function analyzeDatabaseNode(
  node: WorkflowNode,
  nodeConfig: Record<string, unknown>,
  predictions: PredictedError[]
): void {
  const nodeType = node.data.type;

  // Check for connection issues
  if (!nodeConfig.host || !nodeConfig.database) {
    predictions.push({
      id: `err_${Date.now()}_${node.id}_4`,
      nodeId: node.id,
      nodeName: node.data.label || nodeType,
      errorType: 'connectivity',
      description: 'Parametres de connexion incomplets',
      probability: 90,
      severity: 'critical',
      suggestedFix: 'Configurer tous les parametres de connexion (host, database, user, password)',
      detectionConfidence: 95
    });
  }

  // Check for query issues
  const query = nodeConfig.query as string;
  if (query &&
      (query.includes('DELETE') || query.includes('DROP')) &&
      !query.includes('WHERE')) {
    predictions.push({
      id: `err_${Date.now()}_${node.id}_5`,
      nodeId: node.id,
      nodeName: node.data.label || nodeType,
      errorType: 'data',
      description: 'Requete destructive sans clause WHERE',
      probability: 85,
      severity: 'critical',
      suggestedFix: 'Ajouter une clause WHERE specifique pour eviter la perte de donnees',
      detectionConfidence: 92
    });
  }
}

function analyzeAINode(
  node: WorkflowNode,
  nodeConfig: Record<string, unknown>,
  predictions: PredictedError[]
): void {
  const nodeType = node.data.type;

  if (!nodeConfig.model) {
    predictions.push({
      id: `err_${Date.now()}_${node.id}_6`,
      nodeId: node.id,
      nodeName: node.data.label || nodeType,
      errorType: 'validation',
      description: 'Modele d\'IA non specifie',
      probability: 95,
      severity: 'high',
      suggestedFix: 'Specifier un modele d\'IA valide',
      detectionConfidence: 98
    });
  }

  if (!nodeConfig.maxTokens && nodeType === 'openai') {
    predictions.push({
      id: `err_${Date.now()}_${node.id}_7`,
      nodeId: node.id,
      nodeName: node.data.label || nodeType,
      errorType: 'resource',
      description: 'Limite de tokens non definie',
      probability: 60,
      severity: 'medium',
      suggestedFix: 'Definir maxTokens pour controler les couts et la taille des reponses',
      detectionConfidence: 85
    });
  }
}

function analyzeEmailNode(
  node: WorkflowNode,
  nodeConfig: Record<string, unknown>,
  predictions: PredictedError[]
): void {
  const nodeType = node.data.type;

  if (!nodeConfig.to) {
    predictions.push({
      id: `err_${Date.now()}_${node.id}_8`,
      nodeId: node.id,
      nodeName: node.data.label || nodeType,
      errorType: 'validation',
      description: 'Destinataire non specifie',
      probability: 98,
      severity: 'high',
      suggestedFix: 'Ajouter un ou plusieurs destinataires valides',
      detectionConfidence: 98
    });
  } else if (nodeConfig.to && !(nodeConfig.to as string).includes('@')) {
    predictions.push({
      id: `err_${Date.now()}_${node.id}_9`,
      nodeId: node.id,
      nodeName: node.data.label || nodeType,
      errorType: 'validation',
      description: 'Format d\'email incorrect',
      probability: 90,
      severity: 'high',
      suggestedFix: 'Corriger le format de l\'adresse email',
      detectionConfidence: 95
    });
  }
}

function analyzeCodeNode(
  node: WorkflowNode,
  nodeConfig: Record<string, unknown>,
  predictions: PredictedError[]
): void {
  const nodeType = node.data.type;

  if (!nodeConfig.code) {
    predictions.push({
      id: `err_${Date.now()}_${node.id}_10`,
      nodeId: node.id,
      nodeName: node.data.label || nodeType,
      errorType: 'logic',
      description: 'Code non specifie',
      probability: 100,
      severity: 'critical',
      suggestedFix: 'Ajouter du code a executer',
      detectionConfidence: 100
    });
  } else {
    const code = nodeConfig.code as string;
    if (!code.includes('try') && !code.includes('catch')) {
      predictions.push({
        id: `err_${Date.now()}_${node.id}_11`,
        nodeId: node.id,
        nodeName: node.data.label || nodeType,
        errorType: 'logic',
        description: 'Gestion d\'erreurs manquante',
        probability: 75,
        severity: 'medium',
        suggestedFix: 'Ajouter un bloc try/catch pour gerer les exceptions',
        detectionConfidence: 85
      });
    }
  }
}

function analyzeConditionNode(
  node: WorkflowNode,
  nodeConfig: Record<string, unknown>,
  predictions: PredictedError[]
): void {
  const nodeType = node.data.type;

  if (!nodeConfig.condition) {
    predictions.push({
      id: `err_${Date.now()}_${node.id}_12`,
      nodeId: node.id,
      nodeName: node.data.label || nodeType,
      errorType: 'logic',
      description: 'Condition non specifiee',
      probability: 100,
      severity: 'high',
      suggestedFix: 'Definir une condition d\'evaluation valide',
      detectionConfidence: 98
    });
  }
}

function analyzeGenericNode(
  node: WorkflowNode,
  edges: WorkflowEdge[],
  predictions: PredictedError[]
): void {
  const nodeType = node.data.type;
  const outgoingEdges = edges.filter(e => e.source === node.id);

  // Check for outgoing connections
  if (outgoingEdges.length === 0 &&
      nodeType !== 'email' &&
      nodeType !== 'slack' &&
      nodeType !== 'webhook' &&
      !node.data.type.includes('notification')) {
    predictions.push({
      id: `err_${Date.now()}_${node.id}_13`,
      nodeId: node.id,
      nodeName: node.data.label || nodeType,
      errorType: 'logic',
      description: 'Noeud terminal sans action de sortie',
      probability: 50,
      severity: 'low',
      suggestedFix: 'Connecter ce noeud a un autre noeud ou a un noeud de notification',
      detectionConfidence: 70
    });
  }
}

function analyzeExecutionHistory(
  nodes: WorkflowNode[],
  executionHistory: ExecutionHistoryEntry[],
  predictions: PredictedError[]
): void {
  if (executionHistory.length === 0) return;

  const failedExecutions = executionHistory.filter(exec => exec.status === 'error');
  if (failedExecutions.length === 0) return;

  // Find common error patterns
  const errorNodes = new Map<string, number>();
  failedExecutions.forEach(exec => {
    if (exec.errors) {
      exec.errors.forEach((err) => {
        const nodeId = err.nodeId || 'unknown';
        errorNodes.set(nodeId, (errorNodes.get(nodeId) || 0) + 1);
      });
    }
  });

  // Add predictions for frequent error nodes
  errorNodes.forEach((count, nodeId) => {
    if (count >= 2) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        predictions.push({
          id: `err_${Date.now()}_${nodeId}_history`,
          nodeId: nodeId,
          nodeName: node.data.label || node.data.type,
          errorType: 'data',
          description: `Noeud avec echecs frequents (${count} fois)`,
          probability: Math.min(95, count * 20),
          severity: count > 3 ? 'critical' : 'high',
          suggestedFix: 'Analyser les logs d\'erreur et ajouter une gestion d\'erreurs robuste',
          detectionConfidence: 90
        });
      }
    }
  });
}

/**
 * Analyze node health based on configuration and history
 */
export function analyzeNodeHealth(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  executionHistory: ExecutionHistoryEntry[],
  requiredConfigFields: typeof REQUIRED_CONFIG_FIELDS
): NodeHealth[] {
  return nodes.map(node => {
    let healthScore = 100;
    const factors: NodeHealth['factors'] = [];
    const nodeType = node.data.type;
    const config = node.data.config || {};

    // Factor: Configuration completeness
    if (requiredConfigFields[nodeType]) {
      const missingFields = requiredConfigFields[nodeType].filter(
        field => !config[field]
      );

      if (missingFields.length > 0) {
        const impact = -20 * missingFields.length;
        healthScore += impact;
        factors.push({
          factor: 'Configuration incomplete',
          impact,
          description: `${missingFields.join(', ')} manquant(s)`
        });
      } else {
        factors.push({
          factor: 'Configuration complete',
          impact: 10,
          description: 'Tous les champs requis sont remplis'
        });
      }
    }

    // Factor: Error handling
    const hasErrorHandling = edges.some(edge =>
      edge.source === node.id &&
      (edge.sourceHandle === 'error' || edge.sourceHandle?.includes('false'))
    );

    if (['code', 'httpRequest', 'mysql', 'postgres', 'openai', 'email'].includes(nodeType)) {
      if (hasErrorHandling) {
        factors.push({
          factor: 'Gestion d\'erreurs',
          impact: 15,
          description: 'Gestion d\'erreurs configuree'
        });
      } else {
        healthScore -= 15;
        factors.push({
          factor: 'Absence de gestion d\'erreurs',
          impact: -15,
          description: 'Ajouter une branche pour gerer les erreurs'
        });
      }
    }

    // Factor: Execution history
    const nodeResults = Object.entries(executionHistory).filter(
      ([, exec]) => exec.errors?.some((err) => err.nodeId === node.id)
    );

    if (nodeResults.length > 0) {
      const impact = -10 * Math.min(nodeResults.length, 5);
      healthScore += impact;
      factors.push({
        factor: 'Historique d\'echecs',
        impact,
        description: `${nodeResults.length} echec(s) precedent(s)`
      });
    }

    // Factor: Connection integrity
    const incomingEdges = edges.filter(e => e.target === node.id);
    if (incomingEdges.length === 0 &&
        !['trigger', 'webhook', 'schedule', 'manualTrigger'].includes(nodeType)) {
      healthScore -= 25;
      factors.push({
        factor: 'Noeud orphelin',
        impact: -25,
        description: 'Ce noeud n\'est connecte a aucun autre noeud en amont'
      });
    }

    // Factor: Heavy operations check
    if (['openai', 'anthropic', 'code', 'python', 'mysql', 'postgres', 'mongodb'].includes(nodeType)) {
      if (!config.rateLimit && !config.throttling) {
        healthScore -= 10;
        factors.push({
          factor: 'Absence de rate limiting',
          impact: -10,
          description: 'Implementer des mecanismes de throttling pour les operations lourdes'
        });
      }

      if (!config.timeout) {
        healthScore -= 5;
        factors.push({
          factor: 'Timeout non configure',
          impact: -5,
          description: 'Definir un timeout pour eviter les blocages'
        });
      }
    }

    // Factor: Node description
    if ((node.data as { description?: string }).description) {
      factors.push({
        factor: 'Documentation',
        impact: 5,
        description: 'Noeud documente'
      });
    }

    // Ensure health score is between 0-100
    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      nodeId: node.id,
      healthScore,
      factors
    };
  });
}
