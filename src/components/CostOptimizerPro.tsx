import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { 
  DollarSign, 
  BarChart, 
  TrendingDown, 
  Calculator, 
  Repeat, 
  AlertTriangle, 
  Clock,
  Share2,
  CheckCircle,
  Database,
  Package,
  Sliders,
  Cpu,
  AlertCircle
} from 'lucide-react';

interface CostBreakdown {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  costPerExecution: number;
  monthlyEstimate: number;
  apiProvider?: string;
  executionsPerMonth: number;
  costFactors: {
    factor: string;
    cost: number;
  }[];
}

interface OptimizationSuggestion {
  id: string;
  type: 'caching' | 'batching' | 'consolidation' | 'rate_limiting' | 'scaling' | 'alternative';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  savingsPercent: number;
  savingsAmount: number;
  difficulty: 'easy' | 'medium' | 'complex';
  nodes: string[];
  accepted: boolean;
}

interface BudgetSettings {
  monthlyBudget: number;
  alertThreshold: number;
  overdraftProtection: boolean;
  costCenter: string;
}

export default function CostOptimizerPro() {
  const { 
    nodes, 
    edges, 
    executionHistory,
    darkMode, 
    addLog
  } = useWorkflowStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'optimizations' | 'settings'>('overview');
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown[]>([]);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings>({
    monthlyBudget: 100,
    alertThreshold: 80,
    overdraftProtection: true,
    costCenter: 'Engineering'
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [acceptedOptimizations, setAcceptedOptimizations] = useState<string[]>([]);
  
  useEffect(() => {
    if (isOpen && costBreakdown.length === 0) {
      analyzeCosts();
    }
  }, [isOpen]);

  const analyzeCosts = async () => {
    if (nodes.length === 0) return;
    
    setIsAnalyzing(true);
    
    try {
      // Simulate cost analysis processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate cost breakdown
      const breakdown = generateCostBreakdown();
      setCostBreakdown(breakdown);
      
      // Generate optimization suggestions
      const optimizations = generateOptimizationSuggestions(breakdown);
      setSuggestions(optimizations);
      
      addLog({
        level: 'info',
        message: 'Analyse des coûts terminée',
        data: { 
          totalNodes: breakdown.length,
          totalSuggestions: optimizations.length,
          potentialSavings: calculatePotentialSavings(optimizations)
        }
      });
    } catch (error) {
      console.error("Error in cost analysis:", error);
      addLog({
        level: 'error',
        message: 'Erreur lors de l\'analyse des coûts',
        data: { error: error.message }
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateCostBreakdown = (): CostBreakdown[] => {
    return nodes.map(node => {
      const nodeType = node.data.type;
      const config = node.data.config || {};
      
      // Base cost calculation based on node type
      let costPerExecution = 0;
      const costFactors: {factor: string; cost: number}[] = [];
      let apiProvider = '';
      
      // Calculate cost factors based on node type
      switch (nodeType) {
        case 'openai':
        case 'anthropic':
          const modelType = config.model || 'gpt-3.5-turbo';
          apiProvider = nodeType === 'openai' ? 'OpenAI' : 'Anthropic';
          
          // Calculate token cost
          const maxTokens = config.maxTokens || 1000;
          const modelCost = 
            modelType.includes('gpt-4') ? 0.03 : 
            modelType.includes('claude') ? 0.015 :
            0.002;
          
          costPerExecution = modelCost * (maxTokens / 1000);
          
          costFactors.push({ 
            factor: `API call (${modelType})`, 
            cost: costPerExecution
          });
          
          break;

        case 'httpRequest':
        case 'webhook':
          const url = config.url || '';
          
          // Identify API provider
          if (url.includes('github.com')) {
            apiProvider = 'GitHub';
            costPerExecution = 0.0001;
          } else if (url.includes('stripe.com')) {
            apiProvider = 'Stripe';
            costPerExecution = 0.0002;
          } else if (url.includes('twilio.com')) {
            apiProvider = 'Twilio';
            costPerExecution = 0.0003;
          } else if (url.includes('sendgrid.com')) {
            apiProvider = 'SendGrid';
            costPerExecution = 0.0001;
          } else {
            apiProvider = 'Generic API';
            costPerExecution = 0.0001;
          }
          
          costFactors.push({ 
            factor: 'API call', 
            cost: costPerExecution
          });
          
          break;
          
        case 'mysql':
        case 'postgres':
        case 'mongodb':
          apiProvider = nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
          
          // Database operations cost
          const operation = config.operation || 'query';
          const baseDbCost = 0.00025;
          
          if (operation === 'insert' || operation === 'update') {
            costPerExecution = baseDbCost * 1.5;
            costFactors.push({ 
              factor: 'Write operation', 
              cost: costPerExecution
            });
          } else {
            costPerExecution = baseDbCost;
            costFactors.push({ 
              factor: 'Read operation', 
              cost: costPerExecution
            });
          }
          
          break;
          
        case 's3':
        case 'googleDrive':
        case 'dropbox':
          apiProvider = 
            nodeType === 's3' ? 'AWS S3' : 
            nodeType === 'googleDrive' ? 'Google Drive' : 
            'Dropbox';
          
          // Storage operations cost
          const storageOp = config.operation || 'read';
          const fileSize = config.fileSize || 1; // MB
          
          if (storageOp === 'upload' || storageOp === 'write') {
            costPerExecution = 0.0001 * fileSize;
            costFactors.push({ 
              factor: 'Write operation', 
              cost: 0.0001 * fileSize
            });
            costFactors.push({ 
              factor: 'Storage (per month)', 
              cost: 0.00002 * fileSize * 30
            });
          } else {
            costPerExecution = 0.00005 * fileSize;
            costFactors.push({ 
              factor: 'Read operation', 
              cost: costPerExecution
            });
          }
          
          break;
          
        case 'email':
        case 'gmail':
          apiProvider = nodeType === 'email' ? 'SMTP' : 'Gmail';
          costPerExecution = 0.0001;
          costFactors.push({ 
            factor: 'Email sending', 
            cost: costPerExecution
          });
          break;
          
        case 'slack':
        case 'discord':
        case 'teams':
          apiProvider = 
            nodeType === 'slack' ? 'Slack' :
            nodeType === 'discord' ? 'Discord' :
            'Microsoft Teams';
          costPerExecution = 0.00005;
          costFactors.push({ 
            factor: 'Message sending', 
            cost: costPerExecution
          });
          break;
          
        default:
          // Default processing cost
          costPerExecution = 0.00001;
          costFactors.push({ 
            factor: 'Processing', 
            cost: costPerExecution
          });
      }
      
      // Add data transfer costs if applicable
      if (['httpRequest', 'webhook', 's3', 'googleDrive', 'dropbox'].includes(nodeType)) {
        const transferCost = 0.00001;
        costPerExecution += transferCost;
        costFactors.push({ 
          factor: 'Data transfer', 
          cost: transferCost
        });
      }
      
      // Calculate monthly cost based on execution frequency
      // Estimate executions per month based on workflow type
      let executionsPerMonth = 100; // Default
      
      const triggers = nodes.filter(n => 
        ['trigger', 'webhook', 'schedule', 'rssFeed'].includes(n.data.type)
      );
      
      if (triggers.some(t => t.data.type === 'schedule')) {
        const schedule = triggers.find(t => t.data.type === 'schedule');
        const cronExpression = schedule?.data.config?.cron || '';
        
        if (cronExpression.includes('* * * * *')) {
          executionsPerMonth = 43200; // Every minute
        } else if (cronExpression.includes('*/5 * * * *')) {
          executionsPerMonth = 8640; // Every 5 minutes
        } else if (cronExpression.includes('0 * * * *')) {
          executionsPerMonth = 720; // Every hour
        } else if (cronExpression.includes('0 0 * * *')) {
          executionsPerMonth = 30; // Daily
        } else if (cronExpression.includes('0 0 * * 1-5')) {
          executionsPerMonth = 20; // Weekdays
        } else if (cronExpression.includes('0 0 1 * *')) {
          executionsPerMonth = 1; // Monthly
        } else {
          executionsPerMonth = 100; // Default
        }
      } else if (triggers.some(t => t.data.type === 'webhook')) {
        executionsPerMonth = 500; // Webhook avg
      } else if (triggers.some(t => t.data.type === 'rssFeed')) {
        executionsPerMonth = 200; // RSS feed avg
      }
      
      // Adjust execution count from history if available
      if (executionHistory.length > 0) {
        // Calculate executions per day based on execution history
        const timestamps = executionHistory.map(exec => new Date(exec.timestamp).getTime());
        if (timestamps.length >= 2) {
          const oldestTimestamp = Math.min(...timestamps);
          const newestTimestamp = Math.max(...timestamps);
          const dayDiff = (newestTimestamp - oldestTimestamp) / (1000 * 60 * 60 * 24) || 1;
          const execPerDay = executionHistory.length / dayDiff;
          executionsPerMonth = Math.max(1, Math.round(execPerDay * 30));
        }
      }
      
      const monthlyEstimate = costPerExecution * executionsPerMonth;
      
      return {
        nodeId: node.id,
        nodeName: node.data.label || nodeType,
        nodeType,
        costPerExecution,
        monthlyEstimate,
        apiProvider,
        executionsPerMonth,
        costFactors
      };
    });
  };

  const generateOptimizationSuggestions = (breakdown: CostBreakdown[]): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];
    
    // Sort nodes by monthly cost (descending)
    const sortedNodes = [...breakdown].sort((a, b) => b.monthlyEstimate - a.monthlyEstimate);
    const topExpensiveNodes = sortedNodes.slice(0, 5);
    
    // 1. Check for caching opportunities
    const cachingCandidates = breakdown.filter(node =>
      ['httpRequest', 'openai', 'anthropic', 'mysql', 'postgres'].includes(node.nodeType) &&
      node.executionsPerMonth > 100
    );
    
    if (cachingCandidates.length > 0) {
      const totalCost = cachingCandidates.reduce((sum, node) => sum + node.monthlyEstimate, 0);
      const estimatedSavings = totalCost * 0.6; // 60% savings with caching
      
      suggestions.push({
        id: `opt_${Date.now()}_1`,
        type: 'caching',
        title: 'Implémenter du caching',
        description: `Mise en cache des résultats pour ${cachingCandidates.length} nœud(s) à forte fréquence d'exécution`,
        impact: estimatedSavings > 5 ? 'high' : estimatedSavings > 1 ? 'medium' : 'low',
        savingsPercent: 60,
        savingsAmount: estimatedSavings,
        difficulty: 'easy',
        nodes: cachingCandidates.map(node => node.nodeId),
        accepted: false
      });
    }
    
    // 2. Check for batching opportunities
    const apiCalls = breakdown.filter(node =>
      ['httpRequest', 'webhook'].includes(node.nodeType)
    );
    
    const apiGroups: {[key: string]: CostBreakdown[]} = {};
    apiCalls.forEach(node => {
      const provider = node.apiProvider || 'Generic';
      if (!apiGroups[provider]) {
        apiGroups[provider] = [];
      }
      apiGroups[provider].push(node);
    });
    
    Object.entries(apiGroups).forEach(([provider, nodes]) => {
      if (nodes.length >= 2) {
        const totalCost = nodes.reduce((sum, node) => sum + node.monthlyEstimate, 0);
        const estimatedSavings = totalCost * 0.4; // 40% savings with batching
        
        suggestions.push({
          id: `opt_${Date.now()}_batch_${provider.replace(/\s+/g, '')}`,
          type: 'batching',
          title: `Batching d'appels ${provider}`,
          description: `Regrouper ${nodes.length} appels API ${provider} en requêtes batch`,
          impact: estimatedSavings > 3 ? 'high' : estimatedSavings > 0.5 ? 'medium' : 'low',
          savingsPercent: 40,
          savingsAmount: estimatedSavings,
          difficulty: 'medium',
          nodes: nodes.map(node => node.nodeId),
          accepted: false
        });
      }
    });
    
    // 3. Check for consolidation opportunities
    const transformNodes = nodes.filter(node => 
      ['transform', 'filter', 'sort', 'map'].includes(node.data.type)
    );
    
    if (transformNodes.length >= 3) {
      suggestions.push({
        id: `opt_${Date.now()}_3`,
        type: 'consolidation',
        title: 'Consolider les transformations',
        description: `Combiner ${transformNodes.length} nœuds de transformation pour réduire les étapes`,
        impact: 'medium',
        savingsPercent: 25,
        savingsAmount: transformNodes.length * 0.00001 * 100, // Small savings but performance boost
        difficulty: 'medium',
        nodes: transformNodes.map(node => node.id),
        accepted: false
      });
    }
    
    // 4. Rate limiting for expensive API calls
    topExpensiveNodes.forEach(node => {
      if (['openai', 'anthropic', 'github', 'twitter'].some(api => node.nodeType.includes(api))) {
        suggestions.push({
          id: `opt_${Date.now()}_rate_${node.nodeId}`,
          type: 'rate_limiting',
          title: `Rate limiting pour ${node.nodeName}`,
          description: 'Limiter les appels API pour réduire les coûts et éviter les surcharges',
          impact: 'medium',
          savingsPercent: 20,
          savingsAmount: node.monthlyEstimate * 0.2,
          difficulty: 'easy',
          nodes: [node.nodeId],
          accepted: false
        });
      }
    });
    
    // 5. Suggest cheaper alternatives for expensive services
    topExpensiveNodes.forEach(node => {
      let alternative = '';
      let savingsPercent = 0;
      
      if (node.nodeType === 'openai' && node.costPerExecution > 0.01) {
        alternative = 'Llama 3 (hébergé localement)';
        savingsPercent = 90;
      } else if (node.nodeType === 's3') {
        alternative = 'BackBlaze B2';
        savingsPercent = 75;
      } else if (node.nodeType === 'sendgrid' || node.nodeType.includes('email')) {
        alternative = 'Mailgun';
        savingsPercent = 40;
      } else if (node.nodeType === 'mysql' || node.nodeType === 'postgres') {
        alternative = 'base de données serverless';
        savingsPercent = 50;
      }
      
      if (alternative) {
        suggestions.push({
          id: `opt_${Date.now()}_alt_${node.nodeId}`,
          type: 'alternative',
          title: `Utiliser ${alternative}`,
          description: `Remplacer ${node.nodeName} par une alternative moins coûteuse`,
          impact: 'high',
          savingsPercent,
          savingsAmount: node.monthlyEstimate * (savingsPercent / 100),
          difficulty: 'complex',
          nodes: [node.nodeId],
          accepted: false
        });
      }
    });
    
    // 6. Scaling suggestions for high volume operations
    const highVolumeNodes = breakdown.filter(node => node.executionsPerMonth > 10000);
    
    if (highVolumeNodes.length > 0) {
      suggestions.push({
        id: `opt_${Date.now()}_6`,
        type: 'scaling',
        title: 'Optimisation haute fréquence',
        description: 'Implémenter des stratégies d\'optimisation pour les opérations à haut volume',
        impact: 'high',
        savingsPercent: 30,
        savingsAmount: highVolumeNodes.reduce((sum, node) => sum + node.monthlyEstimate, 0) * 0.3,
        difficulty: 'complex',
        nodes: highVolumeNodes.map(node => node.nodeId),
        accepted: false
      });
    }
    
    return suggestions;
  };

  const calculateTotalCost = (): number => {
    return costBreakdown.reduce((total, node) => total + node.monthlyEstimate, 0);
  };

  const calculatePotentialSavings = (optimizations: OptimizationSuggestion[]): number => {
    const acceptedOptimizations = optimizations.filter(opt => 
      acceptedOptimizations.includes(opt.id)
    );
    
    if (acceptedOptimizations.length === 0) {
      return optimizations.reduce((total, opt) => total + opt.savingsAmount, 0);
    }
    
    return acceptedOptimizations.reduce((total, opt) => total + opt.savingsAmount, 0);
  };

  const toggleOptimization = (id: string) => {
    if (acceptedOptimizations.includes(id)) {
      setAcceptedOptimizations(acceptedOptimizations.filter(optId => optId !== id));
    } else {
      setAcceptedOptimizations([...acceptedOptimizations, id]);
    }
  };

  const applyOptimizations = () => {
    // In a real implementation, this would update node configurations
    // For now, just log the accepted optimizations
    addLog({
      level: 'info',
      message: 'Optimisations de coûts appliquées',
      data: { 
        acceptedOptimizations: acceptedOptimizations.length,
        estimatedSavings: calculatePotentialSavings(
          suggestions.filter(s => acceptedOptimizations.includes(s.id))
        )
      }
    });
    
    // Update suggestions to mark accepted ones
    setSuggestions(suggestions.map(suggestion => ({
      ...suggestion,
      accepted: acceptedOptimizations.includes(suggestion.id)
    })));
    
    // Show success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white font-medium bg-green-500';
    notification.textContent = 'Optimisations appliquées avec succès !';
    document.body.appendChild(notification);
    setTimeout(() => document.body.removeChild(notification), 3000);
  };

  const updateBudgetSettings = (field: keyof BudgetSettings, value: any) => {
    setBudgetSettings({
      ...budgetSettings,
      [field]: value
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'complex': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getBudgetStatusColor = () => {
    const totalCost = calculateTotalCost();
    const percentage = (totalCost / budgetSettings.monthlyBudget) * 100;
    
    if (percentage > 100) return 'text-red-500';
    if (percentage > budgetSettings.alertThreshold) return 'text-yellow-500';
    return 'text-green-500';
  };

  const formatCurrency = (amount: number): string => {
    return '$' + amount.toFixed(amount < 0.1 ? 4 : 2);
  };

  return (
    <>
      {/* Cost Optimizer Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed top-128 left-4 z-40 px-4 py-2 rounded-lg ${
          darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'
        } text-white shadow-lg flex items-center space-x-2 transition-all hover:scale-105`}
      >
        <DollarSign size={16} />
        <span>Cost Optimizer Pro</span>
      </button>

      {/* Cost Optimizer Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <DollarSign className="text-green-500" size={24} />
                <h2 className="text-xl font-bold">Cost Optimizer Pro</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b mb-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-green-500 text-green-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Vue d'Ensemble
              </button>
              <button
                onClick={() => setActiveTab('breakdown')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'breakdown'
                    ? 'border-b-2 border-green-500 text-green-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Détails des Coûts
              </button>
              <button
                onClick={() => setActiveTab('optimizations')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'optimizations'
                    ? 'border-b-2 border-green-500 text-green-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Optimisations
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'settings'
                    ? 'border-b-2 border-green-500 text-green-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Paramètres
              </button>
            </div>

            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-lg font-medium">Analyse des coûts en cours...</p>
                <p className="text-sm text-gray-500 mt-2">Nous optimisons votre workflow pour réduire les coûts...</p>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow-sm border`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-sm text-gray-500">Coût Total Mensuel</div>
                          <DollarSign size={16} className="text-green-500" />
                        </div>
                        <div className="text-2xl font-bold">{formatCurrency(calculateTotalCost())}</div>
                        <div className="text-xs text-gray-500 mt-1">par mois</div>
                      </div>
                      
                      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow-sm border`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-sm text-gray-500">Économies Potentielles</div>
                          <TrendingDown size={16} className="text-blue-500" />
                        </div>
                        <div className="text-2xl font-bold text-blue-500">
                          {formatCurrency(calculatePotentialSavings(suggestions))}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {(calculatePotentialSavings(suggestions) / calculateTotalCost() * 100).toFixed(0)}% d'économies
                        </div>
                      </div>
                      
                      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow-sm border`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-sm text-gray-500">Budget Mensuel</div>
                          <Calculator size={16} className="text-purple-500" />
                        </div>
                        <div className={`text-2xl font-bold ${getBudgetStatusColor()}`}>
                          {formatCurrency(budgetSettings.monthlyBudget)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {calculateTotalCost() > budgetSettings.monthlyBudget ? 'Dépassement de budget' : 'Dans les limites'}
                        </div>
                      </div>
                      
                      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow-sm border`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-sm text-gray-500">Exécutions Mensuelles</div>
                          <Repeat size={16} className="text-orange-500" />
                        </div>
                        <div className="text-2xl font-bold">
                          {costBreakdown.length > 0 ? costBreakdown[0].executionsPerMonth.toLocaleString() : 0}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          estimées
                        </div>
                      </div>
                    </div>

                    {/* Budget Progress */}
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow-sm border`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">Utilisation du Budget</h3>
                        <div className={`text-sm font-medium ${getBudgetStatusColor()}`}>
                          {(calculateTotalCost() / budgetSettings.monthlyBudget * 100).toFixed(0)}%
                        </div>
                      </div>
                      
                      <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            calculateTotalCost() > budgetSettings.monthlyBudget ? 'bg-red-500' :
                            calculateTotalCost() / budgetSettings.monthlyBudget * 100 > budgetSettings.alertThreshold ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, calculateTotalCost() / budgetSettings.monthlyBudget * 100)}%` }}
                        ></div>
                      </div>
                      
                      {calculateTotalCost() > budgetSettings.monthlyBudget && (
                        <div className="flex items-center mt-2 text-sm text-red-500">
                          <AlertTriangle size={16} className="mr-1" />
                          <span>Dépassement de budget de {formatCurrency(calculateTotalCost() - budgetSettings.monthlyBudget)}</span>
                        </div>
                      )}
                    </div>

                    {/* Top Expensive Nodes */}
                    <div>
                      <h3 className="font-medium mb-3">Nœuds les Plus Coûteux</h3>
                      {costBreakdown.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <BarChart size={36} className="mx-auto text-gray-400 mb-3" />
                          <p className="text-gray-500">Aucune donnée de coût disponible</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {costBreakdown
                            .sort((a, b) => b.monthlyEstimate - a.monthlyEstimate)
                            .slice(0, 5)
                            .map((node, index) => (
                              <div
                                key={node.nodeId}
                                className={`p-3 rounded-lg flex items-center ${
                                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                                }`}
                              >
                                <div className="w-8 h-8 rounded-full bg-green-100 text-green-800 flex items-center justify-center flex-shrink-0 mr-3">
                                  {index + 1}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <div className="font-medium">{node.nodeName}</div>
                                    <div className="text-green-600 font-bold">
                                      {formatCurrency(node.monthlyEstimate)}
                                    </div>
                                  </div>
                                  <div className="flex items-center text-xs text-gray-500">
                                    <span>{node.nodeType}</span>
                                    {node.apiProvider && (
                                      <>
                                        <span className="mx-2">•</span>
                                        <span>{node.apiProvider}</span>
                                      </>
                                    )}
                                    <span className="mx-2">•</span>
                                    <span>{node.executionsPerMonth.toLocaleString()} exécutions/mois</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Stats */}
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} grid grid-cols-1 md:grid-cols-2 gap-4`}>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Répartition des Coûts par Catégorie</h4>
                        <div className="space-y-2">
                          {(() => {
                            const categories: {[key: string]: number} = {};
                            
                            costBreakdown.forEach(node => {
                              const category = 
                                node.nodeType.includes('openai') || node.nodeType.includes('anthropic') ? 'AI Services' :
                                ['mysql', 'postgres', 'mongodb'].includes(node.nodeType) ? 'Database' :
                                ['s3', 'googleDrive', 'dropbox'].includes(node.nodeType) ? 'Storage' :
                                ['httpRequest', 'webhook'].includes(node.nodeType) ? 'API Calls' :
                                ['email', 'slack', 'discord'].includes(node.nodeType) ? 'Messaging' :
                                'Other';
                              
                              categories[category] = (categories[category] || 0) + node.monthlyEstimate;
                            });
                            
                            const totalCost = Object.values(categories).reduce((sum, cost) => sum + cost, 0);
                            
                            return Object.entries(categories)
                              .sort(([, costA], [, costB]) => costB - costA)
                              .map(([category, cost]) => (
                                <div key={category} className="flex items-center">
                                  <div className="w-full flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs">{category}</span>
                                      <span className="text-xs font-medium">{formatCurrency(cost)}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                      <div 
                                        className="h-1.5 rounded-full bg-green-500"
                                        style={{ width: `${(cost / totalCost) * 100}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              ));
                          })()}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Opportunités d'Optimisation</h4>
                        <div className="space-y-1">
                          {suggestions.length > 0 ? (
                            suggestions
                              .sort((a, b) => b.savingsAmount - a.savingsAmount)
                              .slice(0, 4)
                              .map(suggestion => (
                                <div key={suggestion.id} className="text-sm flex items-center justify-between">
                                  <div className="flex items-center">
                                    <TrendingDown size={14} className={`mr-2 ${getImpactColor(suggestion.impact)}`} />
                                    <span className="truncate max-w-64">{suggestion.title}</span>
                                  </div>
                                  <span className="font-medium text-blue-500">{formatCurrency(suggestion.savingsAmount)}</span>
                                </div>
                              ))
                          ) : (
                            <div className="text-sm text-gray-500">
                              Aucune optimisation disponible
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'breakdown' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">Détails des Coûts par Nœud</h3>
                      <button
                        onClick={analyzeCosts}
                        className="px-3 py-1 bg-green-500 text-white rounded-md text-sm flex items-center space-x-1"
                      >
                        <RefreshCw size={16} />
                        <span>Rafraîchir</span>
                      </button>
                    </div>

                    {costBreakdown.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <Calculator size={36} className="mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-500">Aucune donnée de coût disponible</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className={`min-w-full ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <tr>
                              <th className="py-2 px-3 text-left text-sm font-medium">Nœud</th>
                              <th className="py-2 px-3 text-left text-sm font-medium">Type</th>
                              <th className="py-2 px-3 text-left text-sm font-medium">Service</th>
                              <th className="py-2 px-3 text-right text-sm font-medium">Coût/Exec</th>
                              <th className="py-2 px-3 text-right text-sm font-medium">Exécutions</th>
                              <th className="py-2 px-3 text-right text-sm font-medium">Coût Mensuel</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {costBreakdown
                              .sort((a, b) => b.monthlyEstimate - a.monthlyEstimate)
                              .map(node => (
                                <tr key={node.nodeId} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                                  <td className="py-3 px-3 text-sm">{node.nodeName}</td>
                                  <td className="py-3 px-3 text-sm">{node.nodeType}</td>
                                  <td className="py-3 px-3 text-sm">{node.apiProvider || 'N/A'}</td>
                                  <td className="py-3 px-3 text-right text-sm">
                                    {node.costPerExecution < 0.001
                                      ? formatCurrency(node.costPerExecution * 1000) + '/1K'
                                      : formatCurrency(node.costPerExecution)
                                    }
                                  </td>
                                  <td className="py-3 px-3 text-right text-sm">{node.executionsPerMonth.toLocaleString()}/mois</td>
                                  <td className="py-3 px-3 text-right text-sm font-medium">
                                    {formatCurrency(node.monthlyEstimate)}
                                  </td>
                                </tr>
                              ))}
                            {/* Total row */}
                            <tr className={`${darkMode ? 'bg-gray-700 font-medium' : 'bg-gray-100 font-medium'}`}>
                              <td colSpan={5} className="py-3 px-3 text-right text-sm">Total</td>
                              <td className="py-3 px-3 text-right text-sm font-bold">
                                {formatCurrency(calculateTotalCost())}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Cost Breakdown by Factor */}
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-4">Détail des Coûts par Nœud</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {costBreakdown
                          .sort((a, b) => b.monthlyEstimate - a.monthlyEstimate)
                          .slice(0, 6)
                          .map(node => (
                            <div
                              key={node.nodeId}
                              className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow-sm border`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <div className="font-medium">{node.nodeName}</div>
                                  <div className="text-sm text-gray-500">
                                    {node.nodeType} {node.apiProvider ? `• ${node.apiProvider}` : ''}
                                  </div>
                                </div>
                                <div className="text-lg font-bold text-green-600">
                                  {formatCurrency(node.monthlyEstimate)}
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                {node.costFactors.map((factor, index) => (
                                  <div key={index} className="flex items-center justify-between text-sm">
                                    <span>{factor.factor}</span>
                                    <span>{formatCurrency(factor.cost)}</span>
                                  </div>
                                ))}
                                <div className="pt-2 text-xs text-gray-500 border-t">
                                  <div className="flex justify-between">
                                    <span>Coût par exécution:</span>
                                    <span>{formatCurrency(node.costPerExecution)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Exécutions par mois:</span>
                                    <span>{node.executionsPerMonth.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'optimizations' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <h3 className="text-lg font-semibold">Optimisations Recommandées</h3>
                        <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${
                          suggestions.length === 0
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {suggestions.length}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-gray-500">
                          Économies: {formatCurrency(calculatePotentialSavings(suggestions.filter(s => acceptedOptimizations.includes(s.id))))}
                        </span>
                        <button
                          onClick={applyOptimizations}
                          disabled={acceptedOptimizations.length === 0}
                          className="px-3 py-1 bg-green-500 text-white rounded-md text-sm flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle size={16} />
                          <span>Appliquer</span>
                        </button>
                      </div>
                    </div>

                    {suggestions.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                        <p className="text-lg font-medium">Workflow déjà optimisé !</p>
                        <p className="text-gray-500">Aucune optimisation supplémentaire n'a été identifiée.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {suggestions
                          .sort((a, b) => b.savingsAmount - a.savingsAmount)
                          .map(suggestion => (
                            <div 
                              key={suggestion.id} 
                              className={`p-4 rounded-lg ${
                                suggestion.accepted || acceptedOptimizations.includes(suggestion.id)
                                  ? darkMode 
                                    ? 'bg-green-900/20 border-green-800' 
                                    : 'bg-green-50 border-green-200'
                                  : darkMode 
                                    ? 'bg-gray-700 border-gray-600' 
                                    : 'bg-white border-gray-200'
                              } border shadow-sm`}
                            >
                              <div className="flex items-start">
                                <div className="mr-3">
                                  {suggestion.type === 'caching' && <Database size={20} className="text-blue-500" />}
                                  {suggestion.type === 'batching' && <Package size={20} className="text-purple-500" />}
                                  {suggestion.type === 'consolidation' && <Sliders size={20} className="text-orange-500" />}
                                  {suggestion.type === 'rate_limiting' && <Activity size={20} className="text-yellow-500" />}
                                  {suggestion.type === 'scaling' && <Cpu size={20} className="text-red-500" />}
                                  {suggestion.type === 'alternative' && <Share2 size={20} className="text-green-500" />}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium">{suggestion.title}</h4>
                                    <div className="flex items-center space-x-2">
                                      <div className="text-sm font-bold text-blue-500">
                                        {formatCurrency(suggestion.savingsAmount)}
                                      </div>
                                      <div className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
                                        -{suggestion.savingsPercent}%
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-sm mt-1">{suggestion.description}</p>
                                  <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center space-x-4 text-xs">
                                      <div className={`flex items-center ${getImpactColor(suggestion.impact)}`}>
                                        <AlertCircle size={12} className="mr-1" />
                                        <span>Impact {suggestion.impact}</span>
                                      </div>
                                      <div className={`flex items-center ${getDifficultyColor(suggestion.difficulty)}`}>
                                        <Clock size={12} className="mr-1" />
                                        <span>
                                          {suggestion.difficulty === 'easy' ? 'Facile' : 
                                           suggestion.difficulty === 'medium' ? 'Moyen' : 
                                           'Complexe'}
                                        </span>
                                      </div>
                                      <div className="text-gray-500">
                                        {suggestion.nodes.length} nœud(s)
                                      </div>
                                    </div>
                                    <div>
                                      <button
                                        onClick={() => toggleOptimization(suggestion.id)}
                                        className={`px-3 py-1 text-sm rounded ${
                                          suggestion.accepted || acceptedOptimizations.includes(suggestion.id)
                                            ? 'bg-gray-200 text-gray-700'
                                            : 'bg-green-500 text-white'
                                        }`}
                                      >
                                        {suggestion.accepted || acceptedOptimizations.includes(suggestion.id) 
                                          ? 'Acceptée' 
                                          : 'Accepter'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Paramètres Budgétaires</h3>
                      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow border space-y-4`}>
                        <div>
                          <label className="block text-sm font-medium mb-2">Budget Mensuel ($)</label>
                          <input
                            type="number"
                            min="0"
                            value={budgetSettings.monthlyBudget}
                            onChange={(e) => updateBudgetSettings('monthlyBudget', Number(e.target.value))}
                            className={`w-full px-3 py-2 border rounded ${
                              darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
                            }`}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Seuil d'Alerte (% du budget)
                          </label>
                          <input
                            type="range"
                            min="50"
                            max="95"
                            value={budgetSettings.alertThreshold}
                            onChange={(e) => updateBudgetSettings('alertThreshold', Number(e.target.value))}
                            className="w-full"
                          />
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>50%</span>
                            <span>{budgetSettings.alertThreshold}%</span>
                            <span>95%</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="overdraftProtection"
                            checked={budgetSettings.overdraftProtection}
                            onChange={(e) => updateBudgetSettings('overdraftProtection', e.target.checked)}
                            className="mr-2"
                          />
                          <label htmlFor="overdraftProtection" className="text-sm">
                            Protection contre le dépassement de budget
                          </label>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-2">Centre de Coûts</label>
                          <select
                            value={budgetSettings.costCenter}
                            onChange={(e) => updateBudgetSettings('costCenter', e.target.value)}
                            className={`w-full px-3 py-2 border rounded ${
                              darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
                            }`}
                          >
                            <option value="Engineering">Engineering</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Sales">Sales</option>
                            <option value="Operations">Operations</option>
                            <option value="IT">IT</option>
                          </select>
                        </div>
                        
                        <button
                          className={`w-full py-2 rounded ${
                            darkMode ? 'bg-green-700 hover:bg-green-600' : 'bg-green-500 hover:bg-green-600'
                          } text-white transition-colors`}
                        >
                          Sauvegarder les Paramètres
                        </button>
                      </div>
                    </div>
                    
                    {/* Cost Notification Settings */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Notifications de Coûts</h3>
                      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow border`}>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm">Alertes par email</div>
                            <div className="relative inline-block w-10 mr-2 align-middle select-none">
                              <input 
                                type="checkbox" 
                                id="emailAlerts"
                                checked={true}
                                className="sr-only"
                              />
                              <label
                                htmlFor="emailAlerts"
                                className="block h-6 overflow-hidden bg-gray-300 rounded-full cursor-pointer"
                              >
                                <span
                                  className={`block h-6 w-6 rounded-full bg-green-500 transform transition-transform ${
                                    true ? 'translate-x-full' : ''
                                  }`}
                                ></span>
                              </label>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="text-sm">Alertes dans l'application</div>
                            <div className="relative inline-block w-10 mr-2 align-middle select-none">
                              <input 
                                type="checkbox" 
                                id="appAlerts"
                                checked={true}
                                className="sr-only"
                              />
                              <label
                                htmlFor="appAlerts"
                                className="block h-6 overflow-hidden bg-gray-300 rounded-full cursor-pointer"
                              >
                                <span
                                  className={`block h-6 w-6 rounded-full bg-green-500 transform transition-transform ${
                                    true ? 'translate-x-full' : ''
                                  }`}
                                ></span>
                              </label>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="text-sm">Rapports hebdomadaires</div>
                            <div className="relative inline-block w-10 mr-2 align-middle select-none">
                              <input 
                                type="checkbox" 
                                id="weeklyReports"
                                checked={true}
                                className="sr-only"
                              />
                              <label
                                htmlFor="weeklyReports"
                                className="block h-6 overflow-hidden bg-gray-300 rounded-full cursor-pointer"
                              >
                                <span
                                  className={`block h-6 w-6 rounded-full bg-green-500 transform transition-transform ${
                                    true ? 'translate-x-full' : ''
                                  }`}
                                ></span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Export Options */}
                    <div className="flex space-x-2 mt-4">
                      <button
                        className="flex-1 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center space-x-2"
                      >
                        <BarChart size={16} />
                        <span>Exporter Rapport CSV</span>
                      </button>
                      <button
                        className="flex-1 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center justify-center space-x-2"
                      >
                        <Share2 size={16} />
                        <span>Partager avec l'équipe</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}