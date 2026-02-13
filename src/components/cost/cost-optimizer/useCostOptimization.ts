/**
 * useCostOptimization Hook
 * Generates optimization suggestions based on cost analysis
 */

import { useCallback } from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';
import type { CostBreakdown, OptimizationSuggestion } from './types';

interface AlternativeService {
  alternative: string;
  savingsPercent: number;
}

const ALTERNATIVE_SERVICES: Record<string, AlternativeService> = {
  openai: { alternative: 'Llama 3 (local)', savingsPercent: 90 },
  s3: { alternative: 'BackBlaze B2', savingsPercent: 75 },
  sendgrid: { alternative: 'Mailgun', savingsPercent: 40 },
  mysql: { alternative: 'serverless database', savingsPercent: 50 },
  postgres: { alternative: 'serverless database', savingsPercent: 50 },
};

export function useCostOptimization() {
  const { nodes } = useWorkflowStore();

  const findCachingOpportunities = useCallback(
    (breakdown: CostBreakdown[]): OptimizationSuggestion | null => {
      const cachingCandidates = breakdown.filter(
        node =>
          ['httpRequest', 'openai', 'anthropic', 'mysql', 'postgres'].includes(node.nodeType) &&
          node.executionsPerMonth > 100
      );

      if (cachingCandidates.length === 0) return null;

      const estimatedSavings = cachingCandidates.reduce(
        (sum, node) => sum + node.monthlyEstimate * 0.6,
        0
      );

      return {
        id: `opt_cache_${Date.now()}`,
        type: 'caching',
        title: 'Implement caching',
        description: `Cache results for ${cachingCandidates.length} high-frequency node(s)`,
        impact: estimatedSavings > 5 ? 'high' : estimatedSavings > 1 ? 'medium' : 'low',
        savingsPercent: 60,
        savingsAmount: estimatedSavings,
        difficulty: 'easy',
        nodes: cachingCandidates.map(node => node.nodeId),
        accepted: false,
      };
    },
    []
  );

  const findBatchingOpportunities = useCallback(
    (breakdown: CostBreakdown[]): OptimizationSuggestion[] => {
      const apiCalls = breakdown.filter(node =>
        ['httpRequest', 'webhook'].includes(node.nodeType)
      );

      const apiGroups: Record<string, CostBreakdown[]> = {};
      apiCalls.forEach(node => {
        const provider = node.apiProvider || 'Unknown';
        if (!apiGroups[provider]) {
          apiGroups[provider] = [];
        }
        apiGroups[provider].push(node);
      });

      const suggestions: OptimizationSuggestion[] = [];

      Object.entries(apiGroups).forEach(([provider, providerNodes]) => {
        if (providerNodes.length >= 2) {
          const estimatedSavings = providerNodes.reduce(
            (sum, node) => sum + node.monthlyEstimate * 0.4,
            0
          );

          suggestions.push({
            id: `opt_batch_${provider.replace(/\s+/g, '')}_${Date.now()}`,
            type: 'batching',
            title: `Batch ${provider} calls`,
            description: `Combine ${providerNodes.length} ${provider} API calls into batch requests`,
            impact: estimatedSavings > 3 ? 'high' : estimatedSavings > 0.5 ? 'medium' : 'low',
            savingsPercent: 40,
            savingsAmount: estimatedSavings,
            difficulty: 'medium',
            nodes: providerNodes.map(node => node.nodeId),
            accepted: false,
          });
        }
      });

      return suggestions;
    },
    []
  );

  const findConsolidationOpportunities = useCallback((): OptimizationSuggestion | null => {
    const transformNodes = nodes.filter(node =>
      ['transform', 'filter', 'sort', 'map'].includes(node.data.type)
    );

    if (transformNodes.length < 3) return null;

    return {
      id: `opt_consolidate_${Date.now()}`,
      type: 'consolidation',
      title: 'Consolidate transformations',
      description: `Combine ${transformNodes.length} transformation nodes to reduce steps`,
      impact: 'medium',
      savingsPercent: 25,
      savingsAmount: transformNodes.length * 0.00001 * 100,
      difficulty: 'medium',
      nodes: transformNodes.map(node => node.id),
      accepted: false,
    };
  }, [nodes]);

  const findRateLimitingOpportunities = useCallback(
    (breakdown: CostBreakdown[]): OptimizationSuggestion[] => {
      const topExpensive = [...breakdown]
        .sort((a, b) => b.monthlyEstimate - a.monthlyEstimate)
        .slice(0, 5);

      const suggestions: OptimizationSuggestion[] = [];

      topExpensive.forEach(node => {
        if (
          ['openai', 'anthropic', 'github', 'twitter'].some(api =>
            node.nodeType.includes(api)
          )
        ) {
          suggestions.push({
            id: `opt_rate_${node.nodeId}_${Date.now()}`,
            type: 'rate_limiting',
            title: `Rate limiting for ${node.nodeName}`,
            description: 'Limit API calls to reduce costs and prevent overload',
            impact: 'medium',
            savingsPercent: 20,
            savingsAmount: node.monthlyEstimate * 0.2,
            difficulty: 'easy',
            nodes: [node.nodeId],
            accepted: false,
          });
        }
      });

      return suggestions;
    },
    []
  );

  const findAlternativeServices = useCallback(
    (breakdown: CostBreakdown[]): OptimizationSuggestion[] => {
      const topExpensive = [...breakdown]
        .sort((a, b) => b.monthlyEstimate - a.monthlyEstimate)
        .slice(0, 5);

      const suggestions: OptimizationSuggestion[] = [];

      topExpensive.forEach(node => {
        let altService: AlternativeService | undefined;

        // Check for matching alternative
        if (node.nodeType === 'openai' && node.costPerExecution > 0.01) {
          altService = ALTERNATIVE_SERVICES.openai;
        } else if (ALTERNATIVE_SERVICES[node.nodeType]) {
          altService = ALTERNATIVE_SERVICES[node.nodeType];
        } else if (node.nodeType.includes('email')) {
          altService = ALTERNATIVE_SERVICES.sendgrid;
        }

        if (altService) {
          suggestions.push({
            id: `opt_alt_${node.nodeId}_${Date.now()}`,
            type: 'alternative',
            title: `Use ${altService.alternative}`,
            description: `Replace ${node.nodeName} with a more cost-effective alternative`,
            impact: 'high',
            savingsPercent: altService.savingsPercent,
            savingsAmount: node.monthlyEstimate * (altService.savingsPercent / 100),
            difficulty: 'complex',
            nodes: [node.nodeId],
            accepted: false,
          });
        }
      });

      return suggestions;
    },
    []
  );

  const findScalingOpportunities = useCallback(
    (breakdown: CostBreakdown[]): OptimizationSuggestion | null => {
      const highVolumeNodes = breakdown.filter(node => node.executionsPerMonth > 1000);

      if (highVolumeNodes.length === 0) return null;

      return {
        id: `opt_scale_${Date.now()}`,
        type: 'scaling',
        title: 'High-frequency optimization',
        description: 'Implement optimization strategies for high-volume operations',
        impact: 'high',
        savingsPercent: 30,
        savingsAmount:
          highVolumeNodes.reduce((sum, node) => sum + node.monthlyEstimate, 0) * 0.3,
        difficulty: 'complex',
        nodes: highVolumeNodes.map(node => node.nodeId),
        accepted: false,
      };
    },
    []
  );

  const generateOptimizationSuggestions = useCallback(
    (breakdown: CostBreakdown[]): OptimizationSuggestion[] => {
      const suggestions: OptimizationSuggestion[] = [];

      // Collect all optimization opportunities
      const caching = findCachingOpportunities(breakdown);
      if (caching) suggestions.push(caching);

      suggestions.push(...findBatchingOpportunities(breakdown));

      const consolidation = findConsolidationOpportunities();
      if (consolidation) suggestions.push(consolidation);

      suggestions.push(...findRateLimitingOpportunities(breakdown));
      suggestions.push(...findAlternativeServices(breakdown));

      const scaling = findScalingOpportunities(breakdown);
      if (scaling) suggestions.push(scaling);

      return suggestions;
    },
    [
      findCachingOpportunities,
      findBatchingOpportunities,
      findConsolidationOpportunities,
      findRateLimitingOpportunities,
      findAlternativeServices,
      findScalingOpportunities,
    ]
  );

  return {
    generateOptimizationSuggestions,
  };
}
