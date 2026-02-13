/**
 * Types and interfaces for Error Prediction Engine
 */

export type ErrorType =
  | 'connectivity'
  | 'data'
  | 'rate_limit'
  | 'timeout'
  | 'auth'
  | 'validation'
  | 'resource'
  | 'logic';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface PredictedError {
  id: string;
  nodeId: string;
  nodeName: string;
  errorType: ErrorType;
  description: string;
  probability: number; // 0-100
  severity: Severity;
  suggestedFix: string;
  detectionConfidence: number; // 0-100
}

export interface HealthFactor {
  factor: string;
  impact: number; // -100 to 100
  description: string;
}

export interface NodeHealth {
  nodeId: string;
  healthScore: number; // 0-100
  factors: HealthFactor[];
}

export interface PredictionState {
  isOpen: boolean;
  isScanning: boolean;
  predictedErrors: PredictedError[];
  nodeHealth: NodeHealth[];
  activeTab: 'errors' | 'health';
  showIgnoredErrors: boolean;
  ignoredErrors: string[];
}

export interface RequiredConfigFields {
  [key: string]: string[];
}

export const REQUIRED_CONFIG_FIELDS: RequiredConfigFields = {
  'httpRequest': ['url', 'method'],
  'email': ['to', 'subject', 'body'],
  'mysql': ['host', 'database', 'user'],
  'postgres': ['host', 'database', 'user'],
  'condition': ['condition'],
  'code': ['code'],
  'openai': ['model', 'prompt'],
  'webhook': ['method', 'path']
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  'critical': 0,
  'high': 1,
  'medium': 2,
  'low': 3
};
