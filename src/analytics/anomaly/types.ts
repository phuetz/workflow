/**
 * Types and Interfaces for Anomaly Detection System
 *
 * @module anomaly/types
 */

export interface Anomaly {
  id: string;
  executionId: string;
  workflowId: string;
  timestamp: number;
  type: 'performance' | 'error' | 'resource' | 'cost' | 'pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number; // Anomaly score (higher = more anomalous)
  metric: string;
  actualValue: number;
  expectedValue: number;
  deviation: number; // Standard deviations from normal
  description: string;
  rootCauses: RootCause[];
  recommendations: string[];
  autoRemediation?: AutoRemediation;
}

export interface RootCause {
  factor: string;
  likelihood: number; // 0-1
  description: string;
  evidence: string[];
}

export interface AutoRemediation {
  action: string;
  confidence: number;
  description: string;
  script?: string;
  requiresApproval: boolean;
}

export interface AnomalyDetectionConfig {
  methods: Array<'zscore' | 'iqr' | 'modified_zscore' | 'isolation_forest'>;
  sensitivity: 'low' | 'medium' | 'high';
  minSamples: number;
  alertThreshold: number; // Minimum anomaly score to alert
  autoRemediate: boolean;
}

export interface AnomalyPattern {
  pattern: string;
  frequency: number;
  lastOccurrence: number;
  affectedWorkflows: string[];
  commonFactors: string[];
}

export interface AnomalyReport {
  totalAnomalies: number;
  anomaliesByType: Record<string, number>;
  anomaliesBySeverity: Record<string, number>;
  topAnomalies: Anomaly[];
  patterns: AnomalyPattern[];
  trends: {
    increasing: boolean;
    rate: number; // Anomalies per day
  };
  recommendations: string[];
}

export type AnomalyType = 'performance' | 'error' | 'resource' | 'cost' | 'pattern';
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';
export type DetectionMethod = 'zscore' | 'iqr' | 'modified_zscore' | 'isolation_forest';
export type SensitivityLevel = 'low' | 'medium' | 'high';
