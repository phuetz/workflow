// Utilitaires pour les tests unitaires
import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { logger } from '../services/SimpleLogger';

export const createMockNode = (id: string, type: string = 'httpRequest'): WorkflowNode => ({
  id,
  type: 'custom',
  position: { x: 0, y: 0 },
  data: {
    id,
    type,
    label: `Test Node ${id}`,
    position: { x: 0, y: 0 },
    icon: '⚡',
    color: '#3b82f6',
    inputs: 1,
    outputs: 1,
    config: {}
  }
});

export const createMockEdge = (source: string, target: string): WorkflowEdge => ({
  id: `edge-${source}-${target}`,
  source,
  target,
  animated: false,
  style: { stroke: '#94a3b8', strokeWidth: 2 }
});

export const createMockWorkflow = (nodeCount: number = 3) => {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  // Créer les nœuds
  for (let i = 0; i < nodeCount; i++) {
    nodes.push(createMockNode(`node-${i}`, 'httpRequest'));
  }

  // Créer les connexions
  for (let i = 0; i < nodeCount - 1; i++) {
    edges.push(createMockEdge(`node-${i}`, `node-${i + 1}`));
  }

  return { nodes, edges };
};

// Fonction pour tester la sécurité des expressions
export const testExpressionSecurity = (expression: string): boolean => {
  // Patterns dangereux
  const forbiddenPatterns = [
    /eval\(/,
    /Function\(/,
    /constructor/,
    /prototype/,
    /__proto__/,
    /window\./,
    /document\./,
    /global\./,
    /process\./,
    /require\(/,
    /import\(/,
    /export\s/,
    /this\./,
    /setTimeout/,
    /setInterval/,
    /fetch\(/,
    /XMLHttpRequest/,
    /localStorage/,
    /sessionStorage/,
    /location\./,
    /history\./,
    /navigator\./
  ];

  return !forbiddenPatterns.some(pattern => pattern.test(expression));
};

// Fonction pour valider les configurations de nœuds
export const validateNodeConfig = (config: unknown): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config) {
    errors.push('Configuration manquante');
    return { isValid: false, errors };
  }

  // Type guard pour vérifier que config est un objet
  if (typeof config !== 'object' || config === null) {
    errors.push('Configuration doit être un objet');
    return { isValid: false, errors };
  }

  const configObj = config as Record<string, unknown>;

  // Validation des URLs
  if (configObj.url && typeof configObj.url === 'string') {
    try {
      new URL(configObj.url);
    } catch {
      errors.push('URL invalide');
    }
  }

  // Validation des méthodes HTTP
  if (configObj.method && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(configObj.method as string)) {
    errors.push('Méthode HTTP invalide');
  }

  // Validation des timeouts
  if (configObj.timeout && (typeof configObj.timeout !== 'number' || configObj.timeout < 0 || configObj.timeout > 300000)) {
    errors.push('Timeout invalide (doit être entre 0 et 300000ms)');
  }

  // Validation des headers
  if (configObj.headers && typeof configObj.headers !== 'object') {
    errors.push('Headers doivent être un objet');
  }

  return { isValid: errors.length === 0, errors };
};

// Fonction pour détecter les memory leaks potentiels
export const detectMemoryLeaks = (component: unknown): string[] => {
  const warnings: string[] = [];

  // Vérifier les timeouts non nettoyés
  const componentString = typeof component === 'function' ? component.toString() : JSON.stringify(component);

  if (componentString.includes('setTimeout') && !componentString.includes('clearTimeout')) {
    warnings.push('Timeout potentiellement non nettoyé');
  }

  if (componentString.includes('setInterval') && !componentString.includes('clearInterval')) {
    warnings.push('Interval potentiellement non nettoyé');
  }

  if (componentString.includes('addEventListener') && !componentString.includes('removeEventListener')) {
    warnings.push('Event listener potentiellement non nettoyé');
  }

  return warnings;
};

// Fonction pour tester la performance d'une fonction
export const measurePerformance = async (fn: () => Promise<unknown> | unknown, name: string = 'function'): Promise<{
  result: unknown;
  executionTime: number;
  memoryUsage?: NodeJS.MemoryUsage;
}> => {
  const startMemory = process?.memoryUsage?.();
  const startTime = performance.now();

  try {
    const result = await fn();
    const endTime = performance.now();
    const endMemory = process?.memoryUsage?.();

    return {
      result,
      executionTime: Math.max(1, endTime - startTime), // Assurer au moins 1ms
      memoryUsage: endMemory
    };
  } catch (error) {
    const endTime = performance.now();
    logger.error(`Erreur lors de l'exécution de ${name}:`, error instanceof Error ? error : new Error(String(error)));

    return {
      result: null,
      executionTime: Math.max(1, endTime - startTime),
      memoryUsage: process?.memoryUsage?.()
    };
  }
};

// Fonction pour valider les types TypeScript à l'exécution
export const validateTypes = (value: unknown, expectedType: string): boolean => {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return typeof value === 'object' && value !== null;
    case 'array':
      return Array.isArray(value);
    case 'function':
      return typeof value === 'function';
    case 'undefined':
      return value === undefined;
    case 'null':
      return value === null;
    default:
      return false;
  }
};

// Fonction pour tester l'accessibilité
export const testAccessibility = (element: HTMLElement): { score: number; issues: string[] } => {
  const issues: string[] = [];
  let score = 100;

  // Vérifier les attributs ARIA
  if (!element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
    issues.push('Élément sans label ARIA');
    score -= 10;
  }

  // Vérifier le contraste (simulation basique)
  const computedStyle = window.getComputedStyle(element);
  const backgroundColor = computedStyle.backgroundColor;
  const color = computedStyle.color;

  if (backgroundColor === color) {
    issues.push('Contraste insuffisant');
    score -= 20;
  }

  // Vérifier la taille des éléments cliquables
  if (element.tagName === 'BUTTON' || element.onclick) {
    const rect = element.getBoundingClientRect();
    if (rect.width < 44 || rect.height < 44) {
      issues.push('Élément cliquable trop petit (< 44px)');
      score -= 15;
    }
  }

  // Vérifier le focus
  if (element.tabIndex < 0 && element.tagName !== 'DIV') {
    issues.push('Élément non focusable');
    score -= 10;
  }

  return { score: Math.max(0, score), issues };
};

// Fonction pour simuler des erreurs réseau
export const simulateNetworkError = (errorType: 'timeout' | 'error' | 'abort' = 'error'): Promise<never> => {
  return new Promise((_, reject) => {
    const error = new Error();

    switch (errorType) {
      case 'timeout':
        error.name = 'TimeoutError';
        error.message = 'Request timeout';
        break;
      case 'abort':
        error.name = 'AbortError';
        error.message = 'Request aborted';
        break;
      default:
        error.name = 'NetworkError';
        error.message = 'Network error';
    }

    setTimeout(() => reject(error), 100);
  });
};

export default {
  createMockNode,
  createMockEdge,
  createMockWorkflow,
  testExpressionSecurity,
  validateNodeConfig,
  detectMemoryLeaks,
  measurePerformance,
  validateTypes,
  testAccessibility,
  simulateNetworkError
};