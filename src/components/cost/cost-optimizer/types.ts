/**
 * Cost Optimizer Types
 * Shared type definitions for cost analysis and optimization components
 */

export interface CostBreakdown {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  costPerExecution: number;
  monthlyEstimate: number;
  apiProvider?: string;
  executionsPerMonth: number;
  costFactors: CostFactor[];
}

export interface CostFactor {
  factor: string;
  cost: number;
}

export interface OptimizationSuggestion {
  id: string;
  type: OptimizationType;
  title: string;
  description: string;
  impact: ImpactLevel;
  savingsPercent: number;
  savingsAmount: number;
  difficulty: DifficultyLevel;
  nodes: string[];
  accepted: boolean;
}

export type OptimizationType =
  | 'caching'
  | 'batching'
  | 'consolidation'
  | 'rate_limiting'
  | 'scaling'
  | 'alternative';

export type ImpactLevel = 'high' | 'medium' | 'low';

export type DifficultyLevel = 'easy' | 'medium' | 'complex';

export interface BudgetSettings {
  monthlyBudget: number;
  alertThreshold: number;
  overdraftProtection: boolean;
  costCenter: string;
}

export type CostOptimizerTab = 'overview' | 'breakdown' | 'optimizations' | 'settings';

// Utility type for category grouping
export interface CategoryCosts {
  [category: string]: number;
}

// Props interfaces for sub-components
export interface CostDashboardProps {
  costBreakdown: CostBreakdown[];
  suggestions: OptimizationSuggestion[];
  budgetSettings: BudgetSettings;
  darkMode: boolean;
}

export interface CostBreakdownProps {
  costBreakdown: CostBreakdown[];
  darkMode: boolean;
  onRefresh: () => void;
}

export interface CostRecommendationsProps {
  suggestions: OptimizationSuggestion[];
  acceptedOptimizations: string[];
  darkMode: boolean;
  onToggleOptimization: (id: string) => void;
  onApplyOptimizations: () => void;
}

export interface CostSettingsProps {
  budgetSettings: BudgetSettings;
  darkMode: boolean;
  onUpdateSettings: (field: keyof BudgetSettings, value: number | boolean | string) => void;
}
