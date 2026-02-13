// UI Component pour l'assistant AI de workflow
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { useAIWorkflowService, SuggestedNode, OptimizationSuggestion, WorkflowPattern, AnomalyDetection } from '../../services/AIWorkflowService';
import { Brain, Sparkles, TrendingUp, AlertTriangle, Zap } from 'lucide-react';
import { logger } from '../../services/SimpleLogger';
import { useToast } from '../ui/Toast';

const AIAssistant: React.FC = () => {
  const toast = useToast();
  const { darkMode, nodes, edges, addNode, setEdges } = useWorkflowStore();
  const aiWorkflowService = useAIWorkflowService();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'optimize' | 'patterns' | 'anomalies'>('suggestions');
  const [suggestions, setSuggestions] = useState<SuggestedNode[]>([]);
  const [optimizations, setOptimizations] = useState<OptimizationSuggestion[]>([]);
  const [patterns, setPatterns] = useState<WorkflowPattern[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyDetection[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeWorkflow = useCallback(async () => {
    setIsAnalyzing(true);

    try {
      // Obtenir les suggestions de nœuds
      const nodeSuggestions = aiWorkflowService.predictNextNodes(nodes);
      setSuggestions(nodeSuggestions);

      // Obtenir les optimisations
      const workflowOptimizations = aiWorkflowService.optimizeWorkflow(nodes);
      setOptimizations(workflowOptimizations);

      // Détecter les patterns
      const workflowPatterns = aiWorkflowService.detectPatterns();
      setPatterns(workflowPatterns);

      // Vérifier les anomalies (simulé pour la démo)
      const detectedAnomalies: AnomalyDetection[] = [];
      nodes.forEach(node => {
        const nodeMetrics = {
          duration: Math.random() * 1000,
          output: {},
          error: Math.random() > 0.9
        };
        if (nodeMetrics.error) {
          const nodeAnomalies = aiWorkflowService.detectAnomalies(node.id, nodeMetrics);
          detectedAnomalies.push(...nodeAnomalies);
        }
      });
      setAnomalies(detectedAnomalies);
    } finally {
      setIsAnalyzing(false);
    }
  }, [aiWorkflowService, nodes, edges]);

  // Analyser le workflow quand il change
  useEffect(() => {
    if (isOpen) {
      analyzeWorkflow();
    }
  }, [nodes, edges, isOpen, analyzeWorkflow]);

  const applySuggestion = useCallback((suggestion: any) => {
    const nodeId = `node-${Date.now()}`;
    const newNode = {
      id: nodeId,
      type: 'default',
      position: suggestion.position,
      data: {
        id: nodeId,
        type: suggestion.nodeType,
        label: suggestion.nodeType.charAt(0).toUpperCase() + suggestion.nodeType.slice(1),
        position: suggestion.position,
        icon: 'Circle',
        color: '#6366f1',
        inputs: 1,
        outputs: 1,
        config: suggestion.config || {}
      }
    };

    addNode(newNode);

    // Connecter au dernier nœud si possible
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      const newEdge = {
        id: `edge-${Date.now()}`,
        source: lastNode.id,
        target: newNode.id,
        type: 'smoothstep' as const
      };
      setEdges([...edges, newEdge]);
    }

    // Réanalyser après ajout
    setTimeout(analyzeWorkflow, 100);
  }, [nodes, edges, addNode, setEdges, analyzeWorkflow]);

  const applyOptimization = useCallback((optimization: any) => {
    // Dans une vraie application, cela appliquerait l'optimisation
    logger.info('Applying optimization:', optimization);
    toast.success(`Optimisation appliquée: ${optimization.description}`);
  }, [toast]);

  const applyPattern = useCallback((pattern: any) => {
    // Dans une vraie application, cela créerait les nœuds du pattern
    logger.info('Applying pattern:', pattern);
    toast.success(`Pattern "${pattern.name}" appliqué`);
  }, [toast]);

  return (
    <>
      {/* AI Assistant Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-20 right-4 z-40 p-3 rounded-full ${
          darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'
        } text-white shadow-lg transition-all hover:scale-105`}
        title="Assistant AI"
      >
        <Brain size={20} />
        {anomalies.length > 0 && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        )}
      </button>

      {/* AI Assistant Panel */}
      {isOpen && (
        <div className={`fixed top-36 right-4 z-30 w-96 max-h-[calc(100vh-10rem)] ${
          darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        } border rounded-lg shadow-xl overflow-hidden flex flex-col`}>
          
          {/* Header */}
          <div className={`p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Brain className="text-purple-500" size={24} />
                <h2 className="text-lg font-semibold">Assistant AI</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('suggestions')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'suggestions'
                    ? darkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                    : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Sparkles size={14} className="inline mr-1" />
                Suggestions
              </button>
              <button
                onClick={() => setActiveTab('optimize')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'optimize'
                    ? darkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                    : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Zap size={14} className="inline mr-1" />
                Optimiser
              </button>
              <button
                onClick={() => setActiveTab('patterns')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'patterns'
                    ? darkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                    : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <TrendingUp size={14} className="inline mr-1" />
                Patterns
              </button>
              <button
                onClick={() => setActiveTab('anomalies')}
                className={`relative flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'anomalies'
                    ? darkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                    : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <AlertTriangle size={14} className="inline mr-1" />
                Alertes
                {anomalies.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {anomalies.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isAnalyzing ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : (
              <>
                {/* Suggestions Tab */}
                {activeTab === 'suggestions' && (
                  <div className="space-y-3">
                    {suggestions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        {nodes.length === 0 
                          ? "Commencez votre workflow pour recevoir des suggestions"
                          : "Aucune suggestion pour le moment"}
                      </div>
                    ) : (
                      suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${
                            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                          } hover:shadow-md transition-shadow`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-sm">
                                  {suggestion.nodeType.charAt(0).toUpperCase() + suggestion.nodeType.slice(1)}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  suggestion.confidence > 0.8 
                                    ? 'bg-green-500/20 text-green-600' 
                                    : suggestion.confidence > 0.5 
                                    ? 'bg-yellow-500/20 text-yellow-600'
                                    : 'bg-gray-500/20 text-gray-600'
                                }`}>
                                  {Math.round(suggestion.confidence * 100)}% confiance
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mb-2">{suggestion.reason}</p>
                            </div>
                            <button
                              onClick={() => applySuggestion(suggestion)}
                              className="ml-2 px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600"
                            >
                              Ajouter
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Optimize Tab */}
                {activeTab === 'optimize' && (
                  <div className="space-y-3">
                    {optimizations.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Votre workflow est déjà optimisé !
                      </div>
                    ) : (
                      optimizations.map((optimization, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${
                            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                          } hover:shadow-md transition-shadow`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              optimization.type === 'parallel' ? 'bg-blue-500/20 text-blue-600' :
                              optimization.type === 'cache' ? 'bg-green-500/20 text-green-600' :
                              optimization.type === 'remove' ? 'bg-red-500/20 text-red-600' :
                              optimization.type === 'replace' ? 'bg-yellow-500/20 text-yellow-600' :
                              'bg-gray-500/20 text-gray-600'
                            }`}>
                              {optimization.type}
                            </span>
                            <button
                              onClick={() => applyOptimization(optimization)}
                              className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                            >
                              Appliquer
                            </button>
                          </div>
                          <p className="text-sm mb-2">{optimization.description}</p>
                          <div className="flex space-x-4 text-xs">
                            <div className="flex items-center space-x-1">
                              <TrendingUp size={12} className={optimization.impact.performance > 0 ? 'text-green-500' : 'text-red-500'} />
                              <span>Perf: {optimization.impact.performance > 0 ? '+' : ''}{optimization.impact.performance}%</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Zap size={12} className={optimization.impact.reliability > 0 ? 'text-green-500' : 'text-red-500'} />
                              <span>Fiabilité: {optimization.impact.reliability > 0 ? '+' : ''}{optimization.impact.reliability}%</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Patterns Tab */}
                {activeTab === 'patterns' && (
                  <div className="space-y-3">
                    {patterns.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Aucun pattern détecté pour le moment
                      </div>
                    ) : (
                      patterns.map((pattern, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${
                            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                          } hover:shadow-md transition-shadow`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm">{pattern.name}</h4>
                            <button
                              onClick={() => applyPattern(pattern)}
                              className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                            >
                              Utiliser
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">{pattern.description}</p>
                          <div className="flex items-center space-x-2 text-xs">
                            <span className="text-gray-400">Utilisé {pattern.frequency} fois</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-400">{pattern.nodes.length} nœuds</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Anomalies Tab */}
                {activeTab === 'anomalies' && (
                  <div className="space-y-3">
                    {anomalies.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <AlertTriangle size={32} className="mx-auto mb-2 opacity-20" />
                        Aucune anomalie détectée
                      </div>
                    ) : (
                      anomalies.map((anomaly, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${
                            anomaly.severity === 'critical' ? 'border-red-500 bg-red-500/10' :
                            anomaly.severity === 'high' ? 'border-orange-500 bg-orange-500/10' :
                            anomaly.severity === 'medium' ? 'border-yellow-500 bg-yellow-500/10' :
                            'border-gray-500 bg-gray-500/10'
                          }`}
                        >
                          <div className="flex items-start space-x-2">
                            <AlertTriangle 
                              size={16} 
                              className={
                                anomaly.severity === 'critical' ? 'text-red-500 mt-0.5' :
                                anomaly.severity === 'high' ? 'text-orange-500 mt-0.5' :
                                anomaly.severity === 'medium' ? 'text-yellow-500 mt-0.5' :
                                'text-gray-500 mt-0.5'
                              }
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-sm">
                                  Nœud #{anomaly.nodeId.slice(-4)}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  anomaly.severity === 'critical' ? 'bg-red-500/20 text-red-600' :
                                  anomaly.severity === 'high' ? 'bg-orange-500/20 text-orange-600' :
                                  anomaly.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-600' :
                                  'bg-gray-500/20 text-gray-600'
                                }`}>
                                  {anomaly.severity}
                                </span>
                              </div>
                              <p className="text-xs mb-1">{anomaly.description}</p>
                              <p className="text-xs text-gray-500">💡 {anomaly.suggestion}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className={`p-3 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-t`}>
            <button
              onClick={analyzeWorkflow}
              disabled={isAnalyzing}
              className="w-full bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 disabled:opacity-50 text-sm font-medium"
            >
              {isAnalyzing ? 'Analyse en cours...' : 'Réanalyser le workflow'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default React.memo(AIAssistant);