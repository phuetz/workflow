/**
 * useCostData Hook
 * Generates cost breakdown data for workflow nodes
 */

import { useCallback } from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';
import type { CostBreakdown, CostFactor } from './types';

interface NodeConfig {
  model?: string;
  maxTokens?: number;
  url?: string;
  operation?: string;
  fileSize?: number;
  cronExpression?: string;
}

// Cost constants per node type
const MODEL_COSTS: Record<string, number> = {
  'gpt-4': 0.03,
  'claude': 0.015,
  'default': 0.002,
};

const API_PROVIDERS: Record<string, { name: string; cost: number }> = {
  'github.com': { name: 'GitHub', cost: 0.0001 },
  'stripe.com': { name: 'Stripe', cost: 0.0002 },
  'twilio.com': { name: 'Twilio', cost: 0.0003 },
  'sendgrid.com': { name: 'SendGrid', cost: 0.0001 },
};

const CRON_EXECUTION_RATES: Record<string, number> = {
  '* * * * *': 43200,      // Every minute
  '*/5 * * * *': 8640,     // Every 5 minutes
  '0 * * * *': 720,        // Every hour
  '0 0 * * *': 30,         // Daily
  '0 0 * * 1-5': 20,       // Weekdays
  '0 0 1 * *': 1,          // Monthly
};

export function useCostData() {
  const { nodes, executionHistory } = useWorkflowStore();

  const calculateAICost = useCallback((config: NodeConfig): { cost: number; factors: CostFactor[] } => {
    const modelType = String(config.model || 'gpt-3.5-turbo');
    const maxTokens = Number(config.maxTokens || 1000);

    let modelCost = MODEL_COSTS['default'];
    for (const [key, cost] of Object.entries(MODEL_COSTS)) {
      if (modelType.includes(key)) {
        modelCost = cost;
        break;
      }
    }

    const costPerExecution = modelCost * (maxTokens / 1000);
    return {
      cost: costPerExecution,
      factors: [{ factor: `API call (${modelType})`, cost: costPerExecution }],
    };
  }, []);

  const calculateHttpCost = useCallback((config: NodeConfig): { cost: number; provider: string; factors: CostFactor[] } => {
    const url = String(config.url || '');

    for (const [domain, info] of Object.entries(API_PROVIDERS)) {
      if (url.includes(domain)) {
        return {
          cost: info.cost,
          provider: info.name,
          factors: [{ factor: 'API call', cost: info.cost }],
        };
      }
    }

    return {
      cost: 0.0001,
      provider: 'Generic API',
      factors: [{ factor: 'API call', cost: 0.0001 }],
    };
  }, []);

  const calculateDatabaseCost = useCallback((config: NodeConfig): { cost: number; factors: CostFactor[] } => {
    const operation = config.operation || 'select';
    const baseDbCost = 0.00005;

    if (operation === 'insert' || operation === 'update') {
      return {
        cost: baseDbCost * 1.5,
        factors: [{ factor: 'Write operation', cost: baseDbCost * 1.5 }],
      };
    }

    return {
      cost: baseDbCost,
      factors: [{ factor: 'Read operation', cost: baseDbCost }],
    };
  }, []);

  const calculateStorageCost = useCallback((config: NodeConfig): { cost: number; factors: CostFactor[] } => {
    const storageOp = String(config.operation || 'read');
    const fileSize = Number(config.fileSize || 1);

    if (storageOp === 'upload' || storageOp === 'write') {
      return {
        cost: 0.0001 * fileSize,
        factors: [
          { factor: 'Write operation', cost: 0.0001 * fileSize },
          { factor: 'Storage (per month)', cost: 0.00002 * fileSize * 30 },
        ],
      };
    }

    return {
      cost: 0.00005 * fileSize,
      factors: [{ factor: 'Read operation', cost: 0.00005 * fileSize }],
    };
  }, []);

  const estimateExecutionsPerMonth = useCallback((): number => {
    const triggers = nodes.filter(n =>
      ['trigger', 'webhook', 'schedule', 'rssFeed'].includes(n.data.type)
    );

    if (triggers.some(t => t.data.type === 'schedule')) {
      const triggerConfig = (triggers[0]?.data.config || {}) as NodeConfig;
      const cronExpression = String(triggerConfig.cronExpression || '0 * * * *');

      for (const [pattern, rate] of Object.entries(CRON_EXECUTION_RATES)) {
        if (cronExpression.includes(pattern)) {
          return rate;
        }
      }
      return 100; // Default
    }

    if (triggers.some(t => t.data.type === 'webhook')) return 500;
    if (triggers.some(t => t.data.type === 'rssFeed')) return 200;

    // Adjust based on execution history
    if (executionHistory.length > 0) {
      const timestamps = executionHistory.map(exec => new Date(exec.timestamp).getTime());
      if (timestamps.length >= 2) {
        const daysDiff = (Math.max(...timestamps) - Math.min(...timestamps)) / (1000 * 60 * 60 * 24);
        const execPerDay = executionHistory.length / Math.max(daysDiff, 1);
        return Math.max(1, Math.round(execPerDay * 30));
      }
    }

    return 100;
  }, [nodes, executionHistory]);

  const generateCostBreakdown = useCallback((): CostBreakdown[] => {
    const executionsPerMonth = estimateExecutionsPerMonth();

    return nodes.map(node => {
      const nodeType = node.data.type;
      const nodeConfig = (node.data.config || {}) as NodeConfig;
      let costPerExecution = 0;
      let apiProvider: string | undefined;
      let costFactors: CostFactor[] = [];

      switch (nodeType) {
        case 'openai':
        case 'anthropic': {
          apiProvider = nodeType === 'openai' ? 'OpenAI' : 'Anthropic';
          const result = calculateAICost(nodeConfig);
          costPerExecution = result.cost;
          costFactors = result.factors;
          break;
        }

        case 'httpRequest':
        case 'webhook': {
          const result = calculateHttpCost(nodeConfig);
          costPerExecution = result.cost;
          apiProvider = result.provider;
          costFactors = result.factors;
          break;
        }

        case 'mysql':
        case 'postgres':
        case 'mongodb': {
          apiProvider = nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
          const result = calculateDatabaseCost(nodeConfig);
          costPerExecution = result.cost;
          costFactors = result.factors;
          break;
        }

        case 's3':
        case 'googleDrive':
        case 'dropbox': {
          apiProvider =
            nodeType === 's3' ? 'AWS S3' :
            nodeType === 'googleDrive' ? 'Google Drive' : 'Dropbox';
          const result = calculateStorageCost(nodeConfig);
          costPerExecution = result.cost;
          costFactors = result.factors;
          break;
        }

        case 'email':
        case 'gmail':
          apiProvider = nodeType === 'email' ? 'SMTP' : 'Gmail';
          costPerExecution = 0.0001;
          costFactors = [{ factor: 'Email sending', cost: 0.0001 }];
          break;

        case 'slack':
        case 'discord':
        case 'teams':
          apiProvider =
            nodeType === 'slack' ? 'Slack' :
            nodeType === 'discord' ? 'Discord' : 'Microsoft Teams';
          costPerExecution = 0.00005;
          costFactors = [{ factor: 'Message sending', cost: 0.00005 }];
          break;

        default:
          costPerExecution = 0.00001;
          costFactors = [{ factor: 'Processing', cost: 0.00001 }];
      }

      // Add data transfer costs if applicable
      if (['httpRequest', 'webhook', 's3', 'googleDrive', 'dropbox'].includes(nodeType)) {
        const transferCost = 0.00001;
        costPerExecution += transferCost;
        costFactors.push({ factor: 'Data transfer', cost: transferCost });
      }

      return {
        nodeId: node.id,
        nodeName: node.data.label || nodeType,
        nodeType,
        costPerExecution,
        monthlyEstimate: costPerExecution * executionsPerMonth,
        apiProvider,
        executionsPerMonth,
        costFactors,
      };
    });
  }, [nodes, estimateExecutionsPerMonth, calculateAICost, calculateHttpCost, calculateDatabaseCost, calculateStorageCost]);

  return {
    generateCostBreakdown,
    estimateExecutionsPerMonth,
    nodesCount: nodes.length,
  };
}
