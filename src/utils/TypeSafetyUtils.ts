/**
 * Type Safety Utilities
 * PROJET SAUVÉ - Remplacement des types any critiques
 */

// Types sécurisés pour remplacer any
export type SafeObject = Record<string, unknown>;
export type SafeFunction = (...args: unknown[]) => unknown;
export type SafeEventHandler = (event: Event) => void;
export type SafeApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// Validation de type sécurisée
export const isObject = (value: unknown): value is SafeObject => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

export const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};

export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' && !isNaN(value);
};

export const isArray = (value: unknown): value is unknown[] => {
  return Array.isArray(value);
};

export const isFunction = (value: unknown): value is SafeFunction => {
  return typeof value === 'function';
};

// Validation de propriétés d'objet
export const hasProperty = <K extends string>(
  obj: unknown,
  prop: K
): obj is SafeObject & Record<K, unknown> => {
  return isObject(obj) && prop in obj;
};

// Sanitisation sécurisée
export const sanitizeInput = (input: unknown): string => {
  if (isString(input)) {
    return input
      .replace(/[<>&"']/g, (match) => {
        const escapeMap: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          '"': '&quot;',
          "'": '&#x27;'
        };
        return escapeMap[match] || match;
      })
      .trim();
  }
  return String(input).replace(/[<>&"']/g, '');
};

// Type guards pour données API
export const validateApiResponse = <T>(
  response: unknown,
  validator?: (data: unknown) => data is T
): response is SafeApiResponse<T> => {
  if (!isObject(response)) return false;
  if (!hasProperty(response, 'success') || typeof response.success !== 'boolean') {
    return false;
  }
  if (validator && hasProperty(response, 'data')) {
    return validator(response.data);
  }
  return true;
};

// Configuration de nœud sécurisée
export interface SafeNodeConfig {
  id: string;
  type: string;
  label: string;
  config: SafeObject;
  position?: { x: number; y: number };
  data?: SafeObject;
}

export const validateNodeConfig = (config: unknown): config is SafeNodeConfig => {
  if (!isObject(config)) return false;
  
  return (
    hasProperty(config, 'id') && isString(config.id) &&
    hasProperty(config, 'type') && isString(config.type) &&
    hasProperty(config, 'label') && isString(config.label) &&
    hasProperty(config, 'config') && isObject(config.config)
  );
};

// Données d'exécution sécurisées
export interface SafeExecutionResult {
  success: boolean;
  status: 'success' | 'error' | 'pending';
  data?: SafeObject;
  error?: string;
  nodeId: string;
  timestamp: number;
  duration?: number;
}

export const validateExecutionResult = (result: unknown): result is SafeExecutionResult => {
  if (!isObject(result)) return false;
  
  return (
    hasProperty(result, 'success') && typeof result.success === 'boolean' &&
    hasProperty(result, 'status') && isString(result.status) &&
    hasProperty(result, 'nodeId') && isString(result.nodeId) &&
    hasProperty(result, 'timestamp') && isNumber(result.timestamp)
  );
};

// Conversion sécurisée any vers types typés
export const convertAnyToSafe = {
  toObject: (value: unknown): SafeObject => {
    if (isObject(value)) return value;
    return {};
  },
  
  toString: (value: unknown): string => {
    if (isString(value)) return sanitizeInput(value);
    return '';
  },
  
  toNumber: (value: unknown): number => {
    if (isNumber(value)) return value;
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? 0 : parsed;
  },
  
  toArray: (value: unknown): unknown[] => {
    if (isArray(value)) return value;
    return [];
  }
};