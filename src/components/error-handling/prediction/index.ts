/**
 * Barrel export for Error Prediction Engine modules
 */

// Types
export type {
  ErrorType,
  Severity,
  PredictedError,
  HealthFactor,
  NodeHealth,
  PredictionState,
  RequiredConfigFields
} from './types';

export { REQUIRED_CONFIG_FIELDS, SEVERITY_ORDER } from './types';

// Core prediction logic
export {
  detectCircularReferences,
  predictPotentialErrors,
  analyzeNodeHealth
} from './PredictionEngine';

// Hook
export { usePrediction } from './usePrediction';
export type { UsePredictionReturn } from './usePrediction';

// Components
export { default as ErrorPredictionList } from './ErrorPredictionList';
export { default as NodeHealthList } from './NodeHealthList';
