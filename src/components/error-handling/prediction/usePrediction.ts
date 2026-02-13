/**
 * Main hook for error prediction functionality
 */

import { useState, useCallback } from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';
import { logger } from '../../../services/SimpleLogger';
import { predictPotentialErrors, analyzeNodeHealth } from './PredictionEngine';
import { REQUIRED_CONFIG_FIELDS } from './types';
import type { PredictedError, NodeHealth, PredictionState } from './types';

export interface UsePredictionReturn {
  // State
  isOpen: boolean;
  isScanning: boolean;
  predictedErrors: PredictedError[];
  nodeHealth: NodeHealth[];
  activeTab: 'errors' | 'health';
  showIgnoredErrors: boolean;
  ignoredErrors: string[];
  darkMode: boolean;
  nodes: ReturnType<typeof useWorkflowStore>['nodes'];

  // Actions
  setIsOpen: (open: boolean) => void;
  setActiveTab: (tab: 'errors' | 'health') => void;
  setShowIgnoredErrors: (show: boolean) => void;
  runErrorPrediction: () => Promise<void>;
  ignoreError: (errorId: string) => void;
  getFilteredPredictions: () => PredictedError[];
}

export function usePrediction(): UsePredictionReturn {
  const { nodes, edges, executionHistory, darkMode, addLog } = useWorkflowStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [predictedErrors, setPredictedErrors] = useState<PredictedError[]>([]);
  const [nodeHealth, setNodeHealth] = useState<NodeHealth[]>([]);
  const [activeTab, setActiveTab] = useState<'errors' | 'health'>('errors');
  const [showIgnoredErrors, setShowIgnoredErrors] = useState(false);
  const [ignoredErrors, setIgnoredErrors] = useState<string[]>([]);

  const runErrorPrediction = useCallback(async () => {
    if (nodes.length === 0) return;

    setIsScanning(true);

    try {
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate AI error predictions
      const predictions = predictPotentialErrors(
        nodes,
        edges,
        executionHistory,
        ignoredErrors
      );
      setPredictedErrors(predictions);

      // Generate node health assessments
      const health = analyzeNodeHealth(
        nodes,
        edges,
        executionHistory,
        REQUIRED_CONFIG_FIELDS
      );
      setNodeHealth(health);

      addLog({
        level: 'info',
        message: 'Prediction d\'erreurs terminee',
        data: {
          predictedErrors: predictions.length,
          healthAssessments: health.length
        }
      });
    } catch (error: unknown) {
      logger.error('Error in prediction engine:', error);
      addLog({
        level: 'error',
        message: 'Erreur lors de la prediction',
        data: { error: (error as Error).message }
      });
    } finally {
      setIsScanning(false);
    }
  }, [nodes, edges, executionHistory, ignoredErrors, addLog]);

  const ignoreError = useCallback((errorId: string) => {
    setIgnoredErrors(prev => [...prev, errorId]);
    setPredictedErrors(prev => prev.filter(err => err.id !== errorId));
  }, []);

  const getFilteredPredictions = useCallback((): PredictedError[] => {
    if (showIgnoredErrors) {
      // Show all predictions, including ignored ones
      return predictPotentialErrors(nodes, edges, executionHistory, []);
    }
    // Show only non-ignored predictions
    return predictedErrors.filter(err => !ignoredErrors.includes(err.id));
  }, [showIgnoredErrors, nodes, edges, executionHistory, predictedErrors, ignoredErrors]);

  return {
    // State
    isOpen,
    isScanning,
    predictedErrors,
    nodeHealth,
    activeTab,
    showIgnoredErrors,
    ignoredErrors,
    darkMode,
    nodes,

    // Actions
    setIsOpen,
    setActiveTab,
    setShowIgnoredErrors,
    runErrorPrediction,
    ignoreError,
    getFilteredPredictions
  };
}
