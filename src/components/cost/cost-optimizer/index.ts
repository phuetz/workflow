/**
 * Cost Optimizer Module
 * Barrel export for all cost optimization components and hooks
 */

// Types
export type {
  CostBreakdown,
  CostFactor,
  OptimizationSuggestion,
  OptimizationType,
  ImpactLevel,
  DifficultyLevel,
  BudgetSettings,
  CostOptimizerTab,
  CategoryCosts,
  CostDashboardProps,
  CostBreakdownProps,
  CostRecommendationsProps,
  CostSettingsProps,
} from './types';

// Hooks
export { useCostData } from './useCostData';
export { useCostAnalysis } from './useCostAnalysis';
export { useCostOptimization } from './useCostOptimization';

// Components
export { CostDashboard } from './CostDashboard';
export { CostBreakdownPanel } from './CostBreakdownPanel';
export { CostRecommendations } from './CostRecommendations';
export { CostSettings } from './CostSettings';
