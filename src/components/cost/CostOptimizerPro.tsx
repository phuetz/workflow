/**
 * CostOptimizerPro Component
 * Main cost optimization panel with tabs for overview, breakdown, optimizations, and settings
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { logger } from '../../services/SimpleLogger';
import { DollarSign } from 'lucide-react';

import {
  CostDashboard,
  CostBreakdownPanel,
  CostRecommendations,
  CostSettings,
  useCostData,
  useCostOptimization,
  useCostAnalysis,
} from './cost-optimizer';

import type {
  CostBreakdown,
  OptimizationSuggestion,
  BudgetSettings,
  CostOptimizerTab,
} from './cost-optimizer';

const DEFAULT_BUDGET_SETTINGS: BudgetSettings = {
  monthlyBudget: 100,
  alertThreshold: 80,
  overdraftProtection: true,
  costCenter: 'Engineering',
};

const TABS: { id: CostOptimizerTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'breakdown', label: 'Cost Details' },
  { id: 'optimizations', label: 'Optimizations' },
  { id: 'settings', label: 'Settings' },
];

export default function CostOptimizerPro() {
  const { darkMode, addLog } = useWorkflowStore();
  const { generateCostBreakdown, nodesCount } = useCostData();
  const { generateOptimizationSuggestions } = useCostOptimization();
  const { calculatePotentialSavings } = useCostAnalysis();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CostOptimizerTab>('overview');
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown[]>([]);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings>(DEFAULT_BUDGET_SETTINGS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [acceptedOptimizations, setAcceptedOptimizations] = useState<string[]>([]);

  const analyzeCosts = useCallback(async () => {
    if (nodesCount === 0) return;

    setIsAnalyzing(true);

    try {
      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 2000));

      const breakdown = generateCostBreakdown();
      setCostBreakdown(breakdown);

      const optimizations = generateOptimizationSuggestions(breakdown);
      setSuggestions(optimizations);

      addLog({
        level: 'info',
        message: 'Cost analysis completed',
        data: {
          totalNodes: breakdown.length,
          totalSuggestions: optimizations.length,
          potentialSavings: calculatePotentialSavings(optimizations, []),
        },
      });
    } catch (error: unknown) {
      logger.error('Error in cost analysis:', error);
      addLog({
        level: 'error',
        message: 'Error during cost analysis',
        data: { error: (error as Error).message },
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [nodesCount, generateCostBreakdown, generateOptimizationSuggestions, addLog, calculatePotentialSavings]);

  useEffect(() => {
    if (isOpen && costBreakdown.length === 0) {
      analyzeCosts();
    }
  }, [isOpen, analyzeCosts, costBreakdown.length]);

  const toggleOptimization = useCallback((id: string) => {
    setAcceptedOptimizations(prev =>
      prev.includes(id) ? prev.filter(optId => optId !== id) : [...prev, id]
    );
  }, []);

  const applyOptimizations = useCallback(() => {
    addLog({
      level: 'info',
      message: 'Cost optimizations applied',
      data: {
        acceptedOptimizations: acceptedOptimizations.length,
        estimatedSavings: calculatePotentialSavings(
          suggestions.filter(s => acceptedOptimizations.includes(s.id)),
          acceptedOptimizations
        ),
      },
    });

    setSuggestions(prev =>
      prev.map(suggestion => ({
        ...suggestion,
        accepted: acceptedOptimizations.includes(suggestion.id),
      }))
    );

    // Show success notification
    showNotification('Optimizations applied successfully!');
  }, [acceptedOptimizations, suggestions, addLog, calculatePotentialSavings]);

  const updateBudgetSettings = useCallback(
    (field: keyof BudgetSettings, value: number | boolean | string) => {
      setBudgetSettings(prev => ({ ...prev, [field]: value }));
    },
    []
  );

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed top-128 left-4 z-40 px-4 py-2 rounded-lg ${
          darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'
        } text-white shadow-lg flex items-center space-x-2 transition-all hover:scale-105`}
      >
        <DollarSign size={16} />
        <span>Cost Optimizer Pro</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className={`${
              darkMode ? 'bg-gray-800' : 'bg-white'
            } rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto`}
          >
            {/* Header */}
            <ModalHeader onClose={() => setIsOpen(false)} />

            {/* Tabs */}
            <TabNavigation
              tabs={TABS}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {/* Content */}
            {isAnalyzing ? (
              <LoadingState />
            ) : (
              <TabContent
                activeTab={activeTab}
                costBreakdown={costBreakdown}
                suggestions={suggestions}
                budgetSettings={budgetSettings}
                acceptedOptimizations={acceptedOptimizations}
                darkMode={darkMode}
                onRefresh={analyzeCosts}
                onToggleOptimization={toggleOptimization}
                onApplyOptimizations={applyOptimizations}
                onUpdateSettings={updateBudgetSettings}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

// --- Sub-components ---

interface ModalHeaderProps {
  onClose: () => void;
}

function ModalHeader({ onClose }: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-3">
        <DollarSign className="text-green-500" size={24} />
        <h2 className="text-xl font-bold">Cost Optimizer Pro</h2>
      </div>
      <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
        x
      </button>
    </div>
  );
}

interface TabNavigationProps {
  tabs: { id: CostOptimizerTab; label: string }[];
  activeTab: CostOptimizerTab;
  onTabChange: (tab: CostOptimizerTab) => void;
}

function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex border-b mb-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === tab.id
              ? 'border-b-2 border-green-500 text-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-lg font-medium">Analyzing costs...</p>
      <p className="text-sm text-gray-500 mt-2">
        We are optimizing your workflow to reduce costs...
      </p>
    </div>
  );
}

interface TabContentProps {
  activeTab: CostOptimizerTab;
  costBreakdown: CostBreakdown[];
  suggestions: OptimizationSuggestion[];
  budgetSettings: BudgetSettings;
  acceptedOptimizations: string[];
  darkMode: boolean;
  onRefresh: () => void;
  onToggleOptimization: (id: string) => void;
  onApplyOptimizations: () => void;
  onUpdateSettings: (field: keyof BudgetSettings, value: number | boolean | string) => void;
}

function TabContent({
  activeTab,
  costBreakdown,
  suggestions,
  budgetSettings,
  acceptedOptimizations,
  darkMode,
  onRefresh,
  onToggleOptimization,
  onApplyOptimizations,
  onUpdateSettings,
}: TabContentProps) {
  switch (activeTab) {
    case 'overview':
      return (
        <CostDashboard
          costBreakdown={costBreakdown}
          suggestions={suggestions}
          budgetSettings={budgetSettings}
          darkMode={darkMode}
        />
      );
    case 'breakdown':
      return (
        <CostBreakdownPanel
          costBreakdown={costBreakdown}
          darkMode={darkMode}
          onRefresh={onRefresh}
        />
      );
    case 'optimizations':
      return (
        <CostRecommendations
          suggestions={suggestions}
          acceptedOptimizations={acceptedOptimizations}
          darkMode={darkMode}
          onToggleOptimization={onToggleOptimization}
          onApplyOptimizations={onApplyOptimizations}
        />
      );
    case 'settings':
      return (
        <CostSettings
          budgetSettings={budgetSettings}
          darkMode={darkMode}
          onUpdateSettings={onUpdateSettings}
        />
      );
    default:
      return null;
  }
}

// --- Utilities ---

function showNotification(message: string) {
  const notification = document.createElement('div');
  notification.className =
    'fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white font-medium bg-green-500';
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => document.body.removeChild(notification), 3000);
}
