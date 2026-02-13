/**
 * useCostAnalysis Hook
 * Cost calculation and analysis utilities
 */

import { useCallback } from 'react';
import type { CostBreakdown, OptimizationSuggestion, BudgetSettings, CategoryCosts } from './types';

export function useCostAnalysis() {
  const calculateTotalCost = useCallback((breakdown: CostBreakdown[]): number => {
    return breakdown.reduce((total, node) => total + node.monthlyEstimate, 0);
  }, []);

  const calculatePotentialSavings = useCallback(
    (suggestions: OptimizationSuggestion[], acceptedOptimizations: string[]): number => {
      const acceptedList = suggestions.filter(opt => acceptedOptimizations.includes(opt.id));

      if (acceptedList.length === 0) {
        return suggestions.reduce((total, opt) => total + opt.savingsAmount, 0);
      }

      return acceptedList.reduce((total, opt) => total + opt.savingsAmount, 0);
    },
    []
  );

  const getBudgetStatusColor = useCallback(
    (totalCost: number, settings: BudgetSettings): string => {
      const percentage = (totalCost / settings.monthlyBudget) * 100;

      if (percentage > 100) return 'text-red-500';
      if (percentage > settings.alertThreshold) return 'text-yellow-500';
      return 'text-green-500';
    },
    []
  );

  const getBudgetPercentage = useCallback(
    (totalCost: number, settings: BudgetSettings): number => {
      return (totalCost / settings.monthlyBudget) * 100;
    },
    []
  );

  const isBudgetExceeded = useCallback(
    (totalCost: number, settings: BudgetSettings): boolean => {
      return totalCost > settings.monthlyBudget;
    },
    []
  );

  const calculateCostsByCategory = useCallback((breakdown: CostBreakdown[]): CategoryCosts => {
    const categories: CategoryCosts = {};

    breakdown.forEach(node => {
      const category =
        node.nodeType.includes('openai') || node.nodeType.includes('anthropic')
          ? 'AI Services'
          : ['mysql', 'postgres', 'mongodb'].includes(node.nodeType)
          ? 'Database'
          : ['s3', 'googleDrive', 'dropbox'].includes(node.nodeType)
          ? 'Storage'
          : ['httpRequest', 'webhook'].includes(node.nodeType)
          ? 'API Calls'
          : ['email', 'slack', 'discord'].includes(node.nodeType)
          ? 'Messaging'
          : 'Other';

      categories[category] = (categories[category] || 0) + node.monthlyEstimate;
    });

    return categories;
  }, []);

  const getTopExpensiveNodes = useCallback(
    (breakdown: CostBreakdown[], limit: number = 5): CostBreakdown[] => {
      return [...breakdown]
        .sort((a, b) => b.monthlyEstimate - a.monthlyEstimate)
        .slice(0, limit);
    },
    []
  );

  const formatCurrency = useCallback((amount: number): string => {
    return '$' + amount.toFixed(amount < 0.1 ? 4 : 2);
  }, []);

  const getDifficultyColor = useCallback((difficulty: string): string => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-500';
      case 'medium':
        return 'text-yellow-500';
      case 'complex':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  }, []);

  const getImpactColor = useCallback((impact: string): string => {
    switch (impact) {
      case 'high':
        return 'text-green-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  }, []);

  return {
    calculateTotalCost,
    calculatePotentialSavings,
    getBudgetStatusColor,
    getBudgetPercentage,
    isBudgetExceeded,
    calculateCostsByCategory,
    getTopExpensiveNodes,
    formatCurrency,
    getDifficultyColor,
    getImpactColor,
  };
}
