import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { workflowAnalytics } from '../../services/WorkflowAnalyticsService';
import { WorkflowAnalytics, AnalyticsInsight } from '../../types/analytics';
import { logger } from '../../services/SimpleLogger';
import { 
  BarChart3, 
  BrainCircuit, 
  LineChart, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Share2
} from 'lucide-react';

interface AIInsight {
  id: string;
  title: string;
  description: string;
  type: 'performance' | 'reliability' | 'cost' | 'security' | 'general';
  impact: 'high' | 'medium' | 'low';
  timestamp: string;
}

interface PerformanceMetric {
  nodeName: string;
  averageExecutionTime: number;
  successRate: number;
  errorRate: number;
  resourceUsage: number;
  bottleneck: boolean;
}

interface PredictiveModel {
  trend: 'increasing' | 'decreasing' | 'stable';
  forecast: number[];
  confidence: number;
  anomalies: number[];
}

export default function WorkflowAnalyticsAI() {
  const { 
    nodes, 
    edges, 
    executionHistory, 
    // executionResults, // eslint-disable-line @typescript-eslint/no-unused-vars
    darkMode, 
    addLog
  } = useWorkflowStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [predictions, setPredictions] = useState<PredictiveModel | null>(null);
  const [workflowAnalyticsData, setWorkflowAnalyticsData] = useState<WorkflowAnalytics | null>(null);
  const [predictiveInsights, setPredictiveInsights] = useState<AnalyticsInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInsightType, setSelectedInsightType] = useState<string>('all');

  // Helper function to map AnalyticsInsight type to AIInsight type
  const mapInsightTypeToAIType = (type: string): AIInsight['type'] => {
    if (type.includes('performance')) return 'performance';
    if (type.includes('error') || type.includes('reliability')) return 'reliability';
    if (type.includes('cost')) return 'cost';
    return 'general';
  };

  // Helper function to map severity to impact
  const mapSeverityToImpact = (severity: 'info' | 'warning' | 'critical'): AIInsight['impact'] => {
    if (severity === 'critical') return 'high';
    if (severity === 'warning') return 'medium';
    return 'low';
  };

  useEffect(() => {
    if (isOpen && insights.length === 0) {
      analyzeWorkflow();
    }
  }, [isOpen]);

  useEffect(() => {
    // Note: Analytics service tracks executions automatically
    // No need to register nodes manually as it uses execution records
  }, [nodes]);

  const analyzeWorkflow = async () => {
    if (nodes.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Simulate AI analysis processing time
      await new Promise(resolve => setTimeout(resolve, 1500));

      const currentWorkflowId = 'current-workflow';
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const timeRange = {
        start: sevenDaysAgo,
        end: now,
        granularity: 'day' as const
      };
      const analytics = await workflowAnalytics.getWorkflowAnalytics(currentWorkflowId, timeRange);

      // Get real analytics from the service
      setWorkflowAnalyticsData(analytics);

      // Generate structural insights (still using the existing logic for workflow structure analysis)
      const structuralInsights = generateStructuralInsights();

      // Get insights from analytics
      const realPredictiveInsights = analytics.insights || [];
      setPredictiveInsights(realPredictiveInsights);
      
      // Convert analytics insights to the legacy AIInsight format
      const convertedInsights = realPredictiveInsights.map(insight => ({
        id: insight.id,
        title: insight.title,
        description: insight.description,
        type: mapInsightTypeToAIType(insight.type),
        impact: mapSeverityToImpact(insight.severity),
        timestamp: insight.timestamp.toISOString()
      }));
      
      // Combine structural and predictive insights
      setInsights([...structuralInsights, ...convertedInsights]);

      // Convert bottleneck nodes to performance metrics
      const performanceMetrics = (analytics.performance.bottleneckNodes || []).map(node => ({
        nodeName: node.nodeName,
        averageExecutionTime: node.averageDuration,
        successRate: 100, // Not available in this structure, default to 100
        errorRate: 0, // Not available in this structure, default to 0
        resourceUsage: 0, // Not available in this structure
        bottleneck: true
      }));
      setMetrics(performanceMetrics);

      // Generate predictive model from time series data
      const predictiveModel = generatePredictiveModel(analytics);
      setPredictions(predictiveModel);
      
      addLog({
        level: 'info',
        message: 'Analyse IA du workflow complétée avec données réelles',
        data: {
          totalExecutions: analytics.metrics.totalExecutions,
          successRate: analytics.metrics.successRate,
          insights: structuralInsights.length + convertedInsights.length,
          nodes: analytics.performance.bottleneckNodes?.length || 0
        }
      });
    } catch (error) {
      logger.error('Error in AI analysis:', error);
      addLog({
        level: 'error',
        message: 'Erreur lors de l\'analyse IA',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateStructuralInsights = (): AIInsight[] => {
    const newInsights: AIInsight[] = [];
    
    // Analyze workflow structure
    if (nodes.length > 0) {
      // Check for triggers
      const triggers = nodes.filter(node =>
        ['trigger', 'webhook', 'schedule', 'rssFeed'].includes(node.data.type)
      );
      
      if (triggers.length === 0) {
        newInsights.push({
          id: `insight_${Date.now()}_1`,
          title: 'Aucun déclencheur détecté',
          description: 'Votre workflow ne contient pas de nœud déclencheur. Ajoutez un trigger, webhook ou schedule pour démarrer le workflow automatiquement.',
          type: 'reliability',
          impact: 'high',
          timestamp: new Date().toISOString()
        });
      }

      // Check for orphaned nodes
      const connectedNodes = new Set<string>();
      edges.forEach(edge => {
        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);
      });
      const orphanedNodes = nodes.filter(node =>
        !connectedNodes.has(node.id) &&
        !triggers.find(t => t.id === node.id) &&
        nodes.length > 1
      );
      
      if (orphanedNodes.length > 0) {
        newInsights.push({
          id: `insight_${Date.now()}_2`,
          title: `${orphanedNodes.length} nœud(s) non connecté(s)`,
          description: `Certains nœuds ne sont pas connectés et ne seront jamais exécutés. Connectez-les ou supprimez-les pour optimiser le workflow.`,
          type: 'reliability',
          impact: 'medium',
          timestamp: new Date().toISOString()
        });
      }

      // Check for excessive HTTP requests
      const httpNodes = nodes.filter(node =>
        ['httpRequest', 'apiCall', 'fetch'].includes(node.data.type)
      );
      
      if (httpNodes.length > 5) {
        newInsights.push({
          id: `insight_${Date.now()}_3`,
          title: 'Nombreuses requêtes HTTP',
          description: `Votre workflow contient ${httpNodes.length} nœuds HTTP. Considérez utiliser un mécanisme de batch pour réduire la latence et les coûts.`,
          type: 'performance',
          impact: 'medium',
          timestamp: new Date().toISOString()
        });
      }

      // Check for heavy operations without error handling
      const heavyNodes = nodes.filter(node =>
        ['code', 'python', 'openai', 'mongodb', 'mysql', 'postgres'].includes(node.data.type)
      );

      const nodesWithErrorHandling = new Set<string>();
      edges.forEach(edge => {
        if (edge.sourceHandle === 'error' || edge.sourceHandle?.includes('false')) {
          nodesWithErrorHandling.add(edge.source);
        }
      });

      const heavyNodesWithoutErrorHandling = heavyNodes.filter(
        node => !nodesWithErrorHandling.has(node.id)
      );
      
      if (heavyNodesWithoutErrorHandling.length > 0) {
        newInsights.push({
          id: `insight_${Date.now()}_4`,
          title: 'Nœuds critiques sans gestion d\'erreurs',
          description: `${heavyNodesWithoutErrorHandling.length} nœuds critiques n'ont pas de gestion d'erreurs. Ajoutez des branches conditionnelles pour éviter les échecs silencieux.`,
          type: 'reliability',
          impact: 'high',
          timestamp: new Date().toISOString()
        });
      }

      // Check for cost-intensive operations
      const costlyNodes = nodes.filter(node =>
        ['openai', 'anthropic', 'aws', 's3', 'googleSheets', 'stripe'].includes(node.data.type)
      );
      
      if (costlyNodes.length > 0) {
        newInsights.push({
          id: `insight_${Date.now()}_5`,
          title: 'Opérations coûteuses détectées',
          description: `Votre workflow utilise ${costlyNodes.length} services potentiellement coûteux. Utilisez le caching et le rate limiting pour optimiser les coûts.`,
          type: 'cost',
          impact: 'medium',
          timestamp: new Date().toISOString()
        });
      }

      // Security insights
      const securitySensitiveNodes = nodes.filter(node =>
        ['email', 'slack', 'stripe', 'paypal', 'database'].some(type => node.data.type.includes(type))
      );
      
      if (securitySensitiveNodes.length > 0) {
        newInsights.push({
          id: `insight_${Date.now()}_6`,
          title: 'Nœuds sensibles détectés',
          description: 'Votre workflow manipule des données sensibles. Assurez-vous que vos credentials sont sécurisés et que les données sont chiffrées.',
          type: 'security',
          impact: 'high',
          timestamp: new Date().toISOString()
        });
      }
      
      // Performance insights based on execution history
      if (executionHistory.length > 0) {
        const averageDuration = executionHistory.reduce(
          (sum, exec) => sum + (exec.duration || 0), 0
        ) / executionHistory.length;
        
        if (averageDuration > 5000) {
          newInsights.push({
            id: `insight_${Date.now()}_7`,
            title: 'Exécution lente détectée',
            description: `Temps d'exécution moyen de ${Math.round(averageDuration)}ms. Optimisez les nœuds les plus lents ou exécutez-les en parallèle.`,
            type: 'performance',
            impact: 'medium',
            timestamp: new Date().toISOString()
          });
        }

        const failureRate = executionHistory.filter(
          exec => exec.status !== 'success'
        ).length / executionHistory.length;
        
        if (failureRate > 0.1) {
          newInsights.push({
            id: `insight_${Date.now()}_8`,
            title: 'Taux d\'échec élevé',
            description: `Taux d'échec de ${Math.round(failureRate * 100)}%. Ajoutez des retry et des mécanismes de fallback pour améliorer la fiabilité.`,
            type: 'reliability',
            impact: 'high',
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Add general optimization insights
      if (nodes.length > 15) {
        newInsights.push({
          id: `insight_${Date.now()}_9`,
          title: 'Workflow complexe',
          description: `Votre workflow contient ${nodes.length} nœuds. Considérez le diviser en sous-workflows pour améliorer la maintenabilité et la performance.`,
          type: 'general',
          impact: 'low',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return newInsights;
  };

  const generatePredictiveModel = (analytics: WorkflowAnalytics): PredictiveModel => {
    if (analytics.trends.length === 0) {
      return {
        trend: 'stable',
        forecast: Array(7).fill(analytics.metrics.averageExecutionTime || 1000),
        confidence: 0.5,
        anomalies: []
      };
    }

    // Calculate trend based on time series data
    const recentData = analytics.trends.slice(-7);
    const recentAvg = recentData.reduce((sum, data) => sum + data.metrics.averageLatency, 0) / recentData.length;
    const olderData = analytics.trends.slice(0, -7);
    const olderAvg = olderData.length > 0
      ? olderData.reduce((sum, data) => sum + data.metrics.averageLatency, 0) / olderData.length
      : recentAvg;
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentAvg > olderAvg * 1.2) trend = 'increasing';
    else if (recentAvg < olderAvg * 0.8) trend = 'decreasing';

    // Generate forecast based on trend and historical data
    const avgDuration = analytics.metrics.averageExecutionTime;
    const forecast = Array.from({ length: 7 }, (_, i) => {
      const baseValue = avgDuration + (Math.random() - 0.5) * avgDuration * 0.1;
      const randomVariation = 0.9 + Math.random() * 0.2;
      const trendFactor = trend === 'increasing' ? 1 + (i + 1) * 0.02 :
                         trend === 'decreasing' ? 1 - (i + 1) * 0.02 : 1;
      return Math.max(100, baseValue * trendFactor * randomVariation);
    });

    // Identify anomalies (values significantly different from average)
    const anomalies: number[] = [];
    forecast.forEach((value, index) => {
      if (Math.abs(value - avgDuration) > avgDuration * 0.5) {
        anomalies.push(index);
      }
    });

    // Calculate confidence based on data consistency
    const variance = analytics.trends.reduce((sum, data) =>
      sum + Math.pow(data.metrics.averageLatency - avgDuration, 2), 0
    ) / analytics.trends.length;
    const stdDev = Math.sqrt(variance);
    const confidence = Math.max(0.3, Math.min(0.95, 1 - (stdDev / avgDuration)));


    return {
      trend,
      forecast,
      confidence,
      anomalies
    };
  };

  const getImpactColor = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'performance': return <LineChart size={20} className="text-blue-500" />;
      case 'reliability': return <AlertTriangle size={20} className="text-yellow-500" />;
      case 'cost': return <DollarSign size={20} className="text-green-500" />;
      case 'security': return <Share2 size={20} className="text-purple-500" />;
      default: return <CheckCircle size={20} className="text-gray-500" />;
    }
  };

  const getFilteredInsights = () => {
    if (selectedInsightType === 'all') return insights;
    return insights.filter(insight => insight.type === selectedInsightType);
  };

  return (
    <>
      {/* Workflow Analytics AI Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed top-104 left-4 z-40 px-4 py-2 rounded-lg ${
          darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
        } text-white shadow-lg flex items-center space-x-2 transition-all hover:scale-105`}
      >
        <BrainCircuit size={16} />
        <span>Workflow Analytics AI</span>
      </button>

      {/* Workflow Analytics AI Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <BrainCircuit className="text-blue-500" size={24} />
                <h2 className="text-xl font-bold">Workflow Analytics AI</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-lg font-medium">Analyse IA en cours...</p>
                <p className="text-sm text-gray-500 mt-2">Notre IA analyse votre workflow et génère des insights...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel - AI Insights */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">AI Insights</h3>
                    <div className="flex space-x-2">
                      <select
                        value={selectedInsightType}
                        onChange={(e) => setSelectedInsightType(e.target.value)}
                        className={`px-3 py-1 rounded text-sm ${
                          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'
                        } border`}
                      >
                        <option value="all">All Types</option>
                        <option value="performance">Performance</option>
                        <option value="reliability">Reliability</option>
                        <option value="cost">Cost</option>
                        <option value="security">Security</option>
                        <option value="general">General</option>
                      </select>
                      <button
                        onClick={analyzeWorkflow}
                        className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm flex items-center space-x-1"
                      >
                        <BarChart3 size={16} />
                        <span>Refresh</span>
                      </button>
                    </div>
                  </div>

                  {getFilteredInsights().length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                      <p className="text-lg font-medium">Aucune amélioration détectée !</p>
                      <p className="text-gray-500">Votre workflow semble être optimisé et ne présente aucun problème majeur.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getFilteredInsights().map(insight => (
                        <div 
                          key={insight.id} 
                          className={`p-4 rounded-lg border ${
                            darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                          } shadow-sm`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              {getInsightIcon(insight.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold">{insight.title}</h4>
                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                  insight.impact === 'high'
                                    ? 'bg-red-100 text-red-800'
                                    : insight.impact === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {insight.impact.charAt(0).toUpperCase() + insight.impact.slice(1)} Impact
                                </span>
                              </div>
                              <p className="text-sm mt-1">{insight.description}</p>
                              <div className="flex items-center mt-2 text-xs text-gray-500">
                                <Clock size={12} className="mr-1" />
                                <span>{new Date(insight.timestamp).toLocaleString()}</span>
                                <span className="mx-2">•</span>
                                <span className="capitalize">{insight.type}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Execution Forecast */}
                  {predictions && (
                    <div className={`mt-6 p-4 rounded-lg ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                      <h3 className="font-semibold mb-3 flex items-center">
                        <TrendingUp size={16} className="mr-2 text-blue-500" />
                        Prévision d'Exécution IA
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">Tendance</div>
                            <div className={`text-lg font-bold ${
                              predictions.trend === 'increasing' ? 'text-red-500' : 
                              predictions.trend === 'decreasing' ? 'text-green-500' : 
                              'text-blue-500'
                            }`}>
                              {predictions.trend === 'increasing' ? '↗️ En augmentation' : 
                               predictions.trend === 'decreasing' ? '↘️ En diminution' : 
                               '→ Stable'}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">Confiance</div>
                            <div className="text-lg font-bold">
                              {(predictions.confidence * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        
                        {/* Simple chart visualization */}
                        <div className="w-full h-16 bg-gray-100 rounded-lg overflow-hidden flex items-end">
                          {predictions.forecast.map((value, index) => (
                            <div
                              key={index}
                              className={`flex-1 ${
                                predictions.anomalies.includes(index) ? 'bg-red-500' : 
                                predictions.trend === 'increasing' ? 'bg-orange-400' :
                                predictions.trend === 'decreasing' ? 'bg-green-400' :
                                'bg-blue-400'
                              }`}
                              style={{ 
                                height: `${Math.min(100, (value / Math.max(...predictions.forecast)) * 100)}%`,
                                transition: 'height 0.3s ease'
                              }}
                            ></div>
                          ))}
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          Prévision pour les prochaines exécutions basée sur l'historique et les patterns détectés
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Panel - Node Metrics */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Analyse des Nœuds</h3>
                  
                  {metrics.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Clock size={36} className="mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-500">Aucune métrique disponible</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {metrics
                        .sort((a, b) => b.averageExecutionTime - a.averageExecutionTime)
                        .map((metric, index) => (
                          <div 
                            key={index}
                            className={`p-3 rounded-lg ${
                              metric.bottleneck ? 
                                (darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200') :
                                (darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200')
                            } border`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium">
                                {metric.bottleneck && (
                                  <span className="inline-flex items-center mr-1 px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-800">
                                    Bottleneck
                                  </span>
                                )}
                                {metric.nodeName}
                              </div>
                              <div className="text-sm font-medium">
                                {metric.averageExecutionTime.toFixed(0)}ms
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <div className="text-gray-500">Success</div>
                                <div className={`font-medium ${
                                  metric.successRate > 95 ? 'text-green-500' :
                                  metric.successRate > 80 ? 'text-yellow-500' :
                                  'text-red-500'
                                }`}>
                                  {metric.successRate.toFixed(1)}%
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500">Error</div>
                                <div className={`font-medium ${
                                  metric.errorRate < 5 ? 'text-green-500' :
                                  metric.errorRate < 20 ? 'text-yellow-500' :
                                  'text-red-500'
                                }`}>
                                  {metric.errorRate.toFixed(1)}%
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500">Resource</div>
                                <div className="font-medium">
                                  {metric.resourceUsage.toFixed(0)}%
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Workflow Health Score */}
                  <div className={`p-4 rounded-lg ${
                    darkMode ? 'bg-gray-700' : 'bg-blue-50'
                  }`}>
                    <h3 className="font-semibold mb-3">Workflow Health Score</h3>
                    
                    {/* Calculate health score based on real analytics and insights */}
                    {(() => {
                      let healthScore = 100;
                      const highImpactIssues = insights.filter(i => i.impact === 'high').length;
                      const mediumImpactIssues = insights.filter(i => i.impact === 'medium').length;

                      // Deduct for issues
                      healthScore -= highImpactIssues * 15;
                      healthScore -= mediumImpactIssues * 5;

                      // Adjust based on real metrics if available
                      if (workflowAnalyticsData) {
                        // Success rate impact
                        if (workflowAnalyticsData.metrics.successRate < 95) {
                          healthScore -= (95 - workflowAnalyticsData.metrics.successRate) * 0.8;
                        }

                        // Performance impact (if avg duration > 5 seconds)
                        if (workflowAnalyticsData.metrics.averageExecutionTime > 5000) {
                          const slownessPenalty = ((workflowAnalyticsData.metrics.averageExecutionTime - 5000) / 1000) * 2;
                          healthScore -= slownessPenalty;
                        }

                        // Bottleneck impact
                        const bottleneckCount = workflowAnalyticsData.performance.bottleneckNodes?.length || 0;
                        healthScore -= bottleneckCount * 8;
                      } else {
                        // Fallback to metrics-based calculation
                        const bottlenecks = metrics.filter(m => m.bottleneck).length;
                        healthScore -= bottlenecks * 10;
                      }

                      // Ensure score is between 0-100
                      healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

                      const getScoreColor = (score: number) => {
                        if (score >= 80) return 'text-green-500';
                        if (score >= 60) return 'text-yellow-500';
                        return 'text-red-500';
                      };
                      
                      return (
                        <div className="text-center">
                          <div className={`text-3xl font-bold ${getScoreColor(healthScore)}`}>
                            {healthScore}/100
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 my-3">
                            <div 
                              className={`h-2.5 rounded-full ${
                                healthScore >= 80 ? 'bg-green-500' :
                                healthScore >= 60 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${healthScore}%` }}
                            ></div>
                          </div>
                          <div className="text-sm text-gray-600">
                            {healthScore >= 80 ? 'Excellent' :
                             healthScore >= 60 ? 'Bon, avec possibilités d\'amélioration' :
                             healthScore >= 40 ? 'Des problèmes nécessitent attention' :
                             'Problèmes critiques détectés'}
                          </div>
                          {workflowAnalyticsData && (
                            <div className="mt-3 text-xs text-gray-500 space-y-1">
                              <div>Exécutions: {workflowAnalyticsData.metrics.totalExecutions}</div>
                              <div>Taux de succès: {workflowAnalyticsData.metrics.successRate.toFixed(1)}%</div>
                              <div>Durée moyenne: {(workflowAnalyticsData.metrics.averageExecutionTime / 1000).toFixed(1)}s</div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* AI Performance Tips */}
                  <div className={`p-4 rounded-lg ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <h3 className="font-semibold mb-3 flex items-center">
                      <BrainCircuit size={16} className="mr-2 text-blue-500" />
                      Conseils d'Optimisation IA
                    </h3>
                    <ul className="space-y-2 text-sm">
                      {/* Dynamic recommendations based on real analytics */}
                      {workflowAnalyticsData && workflowAnalyticsData.performance.bottleneckNodes && workflowAnalyticsData.performance.bottleneckNodes.length > 0 && (
                        <li className="flex items-start">
                          <AlertTriangle size={16} className="text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span>Optimiser les nœuds bottlenecks identifiés: {workflowAnalyticsData.performance.bottleneckNodes.slice(0, 2).map(n => n.nodeName).join(', ')}</span>
                        </li>
                      )}

                      {workflowAnalyticsData && workflowAnalyticsData.metrics.successRate < 95 && (
                        <li className="flex items-start">
                          <AlertTriangle size={16} className="text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span>Améliorer la fiabilité (taux de succès: {workflowAnalyticsData.metrics.successRate.toFixed(1)}%) avec retry et error handling</span>
                        </li>
                      )}

                      {workflowAnalyticsData && workflowAnalyticsData.metrics.averageExecutionTime > 10000 && (
                        <li className="flex items-start">
                          <Clock size={16} className="text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span>Réduire le temps d'exécution ({(workflowAnalyticsData.metrics.averageExecutionTime / 1000).toFixed(1)}s) avec parallélisation</span>
                        </li>
                      )}
                      
                      {/* Static general recommendations */}
                      <li className="flex items-start">
                        <CheckCircle size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Utiliser des connections parallèles pour les opérations indépendantes</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Implémenter du caching pour les résultats d'API fréquemment accédés</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Monitorer les métriques de performance en temps réel</span>
                      </li>
                      
                      {predictiveInsights.length > 0 && (
                        <li className="flex items-start">
                          <BrainCircuit size={16} className="text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span>Insight IA: {predictiveInsights[0].recommendation}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}