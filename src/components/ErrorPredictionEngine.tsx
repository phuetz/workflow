import React, { useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { AlertTriangle, Shield, Check, Zap, Activity, RefreshCw, Share2, AlertCircle } from 'lucide-react';

interface PredictedError {
  id: string;
  nodeId: string;
  nodeName: string;
  errorType: 'connectivity' | 'data' | 'rate_limit' | 'timeout' | 'auth' | 'validation' | 'resource' | 'logic';
  description: string;
  probability: number; // 0-100
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestedFix: string;
  detectionConfidence: number; // 0-100
}

interface NodeHealth {
  nodeId: string;
  healthScore: number; // 0-100
  factors: {
    factor: string;
    impact: number; // -100 to 100
    description: string;
  }[];
}

export default function ErrorPredictionEngine() {
  const { nodes, edges, executionHistory, darkMode, addLog } = useWorkflowStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [predictedErrors, setPredictedErrors] = useState<PredictedError[]>([]);
  const [nodeHealth, setNodeHealth] = useState<NodeHealth[]>([]);
  const [activeTab, setActiveTab] = useState<'errors' | 'health'>('errors');
  const [showIgnoredErrors, setShowIgnoredErrors] = useState(false);
  const [ignoredErrors, setIgnoredErrors] = useState<string[]>([]);

  const runErrorPrediction = async () => {
    if (nodes.length === 0) return;
    
    setIsScanning(true);
    
    try {
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate AI error predictions
      const predictions = predictPotentialErrors();
      setPredictedErrors(predictions);
      
      // Generate node health assessments
      const health = assessNodeHealth();
      setNodeHealth(health);
      
      addLog({
        level: 'info',
        message: 'Prédiction d\'erreurs terminée',
        data: { 
          predictedErrors: predictions.length,
          healthAssessments: health.length
        }
      });
    } catch (error) {
      console.error("Error in prediction engine:", error);
      addLog({
        level: 'error',
        message: 'Erreur lors de la prédiction',
        data: { error: error.message }
      });
    } finally {
      setIsScanning(false);
    }
  };

  const predictPotentialErrors = (): PredictedError[] => {
    const predictions: PredictedError[] = [];
    
    // Analyze each node for potential errors
    nodes.forEach(node => {
      const nodeType = node.data.type;
      const nodeConfig = node.data.config || {};
      
      // HTTP Request nodes
      if (nodeType === 'httpRequest' || nodeType === 'webhook' || nodeType.includes('api')) {
        // Check for URL validity
        if (!nodeConfig.url || !nodeConfig.url.startsWith('http')) {
          predictions.push({
            id: `err_${Date.now()}_${node.id}_1`,
            nodeId: node.id,
            nodeName: node.data.label || nodeType,
            errorType: 'connectivity',
            description: 'URL invalide ou manquante',
            probability: 95,
            severity: 'high',
            suggestedFix: 'Ajouter une URL valide commençant par http:// ou https://',
            detectionConfidence: 98
          });
        }
        
        // Check for rate limiting issues
        if (nodeConfig.url?.includes('api.github.com') || 
            nodeConfig.url?.includes('api.twitter.com') ||
            nodeConfig.url?.includes('api.openai.com')) {
          predictions.push({
            id: `err_${Date.now()}_${node.id}_2`,
            nodeId: node.id,
            nodeName: node.data.label || nodeType,
            errorType: 'rate_limit',
            description: 'API susceptible aux limites de taux (rate limits)',
            probability: 65,
            severity: 'medium',
            suggestedFix: 'Implémenter un backoff exponentiel et la gestion des erreurs 429',
            detectionConfidence: 85
          });
        }
        
        // Check for timeout possibilities
        if (!nodeConfig.timeout) {
          predictions.push({
            id: `err_${Date.now()}_${node.id}_3`,
            nodeId: node.id,
            nodeName: node.data.label || nodeType,
            errorType: 'timeout',
            description: 'Aucun timeout configuré',
            probability: 40,
            severity: 'medium',
            suggestedFix: 'Définir un timeout approprié (ex: 10000ms)',
            detectionConfidence: 75
          });
        }
      }
      
      // Database nodes
      if (nodeType === 'mysql' || nodeType === 'postgres' || nodeType === 'mongodb') {
        // Check for connection issues
        if (!nodeConfig.host || !nodeConfig.database) {
          predictions.push({
            id: `err_${Date.now()}_${node.id}_4`,
            nodeId: node.id,
            nodeName: node.data.label || nodeType,
            errorType: 'connectivity',
            description: 'Paramètres de connexion incomplets',
            probability: 90,
            severity: 'critical',
            suggestedFix: 'Configurer tous les paramètres de connexion (host, database, user, password)',
            detectionConfidence: 95
          });
        }
        
        // Check for query issues
        if (nodeConfig.query && 
            (nodeConfig.query.includes('DELETE') || nodeConfig.query.includes('DROP')) && 
            !nodeConfig.query.includes('WHERE')) {
          predictions.push({
            id: `err_${Date.now()}_${node.id}_5`,
            nodeId: node.id,
            nodeName: node.data.label || nodeType,
            errorType: 'data',
            description: 'Requête destructive sans clause WHERE',
            probability: 85,
            severity: 'critical',
            suggestedFix: 'Ajouter une clause WHERE spécifique pour éviter la perte de données',
            detectionConfidence: 92
          });
        }
      }
      
      // AI Services
      if (nodeType === 'openai' || nodeType === 'anthropic') {
        if (!nodeConfig.model) {
          predictions.push({
            id: `err_${Date.now()}_${node.id}_6`,
            nodeId: node.id,
            nodeName: node.data.label || nodeType,
            errorType: 'validation',
            description: 'Modèle d\'IA non spécifié',
            probability: 95,
            severity: 'high',
            suggestedFix: 'Spécifier un modèle d\'IA valide',
            detectionConfidence: 98
          });
        }
        
        if (!nodeConfig.maxTokens && nodeType === 'openai') {
          predictions.push({
            id: `err_${Date.now()}_${node.id}_7`,
            nodeId: node.id,
            nodeName: node.data.label || nodeType,
            errorType: 'resource',
            description: 'Limite de tokens non définie',
            probability: 60,
            severity: 'medium',
            suggestedFix: 'Définir maxTokens pour contrôler les coûts et la taille des réponses',
            detectionConfidence: 85
          });
        }
      }
      
      // Email nodes
      if (nodeType === 'email' || nodeType === 'gmail') {
        if (!nodeConfig.to) {
          predictions.push({
            id: `err_${Date.now()}_${node.id}_8`,
            nodeId: node.id,
            nodeName: node.data.label || nodeType,
            errorType: 'validation',
            description: 'Destinataire non spécifié',
            probability: 98,
            severity: 'high',
            suggestedFix: 'Ajouter un ou plusieurs destinataires valides',
            detectionConfidence: 98
          });
        } else if (nodeConfig.to && !nodeConfig.to.includes('@')) {
          predictions.push({
            id: `err_${Date.now()}_${node.id}_9`,
            nodeId: node.id,
            nodeName: node.data.label || nodeType,
            errorType: 'validation',
            description: 'Format d\'email incorrect',
            probability: 90,
            severity: 'high',
            suggestedFix: 'Corriger le format de l\'adresse email',
            detectionConfidence: 95
          });
        }
      }
      
      // Code nodes
      if (nodeType === 'code' || nodeType === 'python') {
        if (!nodeConfig.code) {
          predictions.push({
            id: `err_${Date.now()}_${node.id}_10`,
            nodeId: node.id,
            nodeName: node.data.label || nodeType,
            errorType: 'logic',
            description: 'Code non spécifié',
            probability: 100,
            severity: 'critical',
            suggestedFix: 'Ajouter du code à exécuter',
            detectionConfidence: 100
          });
        } else if (nodeConfig.code && !nodeConfig.code.includes('try') && !nodeConfig.code.includes('catch')) {
          predictions.push({
            id: `err_${Date.now()}_${node.id}_11`,
            nodeId: node.id,
            nodeName: node.data.label || nodeType,
            errorType: 'logic',
            description: 'Gestion d\'erreurs manquante',
            probability: 75,
            severity: 'medium',
            suggestedFix: 'Ajouter un bloc try/catch pour gérer les exceptions',
            detectionConfidence: 85
          });
        }
      }
      
      // Condition nodes
      if (nodeType === 'condition') {
        if (!nodeConfig.condition) {
          predictions.push({
            id: `err_${Date.now()}_${node.id}_12`,
            nodeId: node.id,
            nodeName: node.data.label || nodeType,
            errorType: 'logic',
            description: 'Condition non spécifiée',
            probability: 100,
            severity: 'high',
            suggestedFix: 'Définir une condition d\'évaluation valide',
            detectionConfidence: 98
          });
        }
      }
      
      // Generic checks for all nodes
      
      // Check for outgoing connections
      const outgoingEdges = edges.filter(edge => edge.source === node.id);
      if (outgoingEdges.length === 0 && 
          nodeType !== 'email' && 
          nodeType !== 'slack' && 
          nodeType !== 'webhook' &&
          !node.data.type.includes('notification')) {
        predictions.push({
          id: `err_${Date.now()}_${node.id}_13`,
          nodeId: node.id,
          nodeName: node.data.label || nodeType,
          errorType: 'logic',
          description: 'Nœud terminal sans action de sortie',
          probability: 50,
          severity: 'low',
          suggestedFix: 'Connecter ce nœud à un autre nœud ou à un nœud de notification',
          detectionConfidence: 70
        });
      }
    });
    
    // Check workflow-level issues
    
    // Check for circular references
    const circularPaths = findCircularPaths();
    if (circularPaths.length > 0) {
      predictions.push({
        id: `err_${Date.now()}_workflow_1`,
        nodeId: 'workflow',
        nodeName: 'Workflow Structure',
        errorType: 'logic',
        description: 'Références circulaires détectées dans le workflow',
        probability: 95,
        severity: 'critical',
        suggestedFix: 'Éliminer les boucles infinies en ajoutant une condition de sortie ou en brisant le cycle',
        detectionConfidence: 95
      });
    }
    
    // Check execution history for patterns
    if (executionHistory.length > 0) {
      const failedExecutions = executionHistory.filter(exec => exec.status !== 'success');
      if (failedExecutions.length > 0) {
        // Find common error patterns
        const errorNodes = new Map();
        failedExecutions.forEach(exec => {
          if (exec.errors) {
            exec.errors.forEach(err => {
              const nodeId = err.nodeId;
              errorNodes.set(nodeId, (errorNodes.get(nodeId) || 0) + 1);
            });
          }
        });
        
        // Add predictions for frequent error nodes
        errorNodes.forEach((count, nodeId) => {
          if (count >= 2) { // At least 2 failures
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
              predictions.push({
                id: `err_${Date.now()}_${nodeId}_history`,
                nodeId: nodeId,
                nodeName: node.data.label || node.data.type,
                errorType: 'data',
                description: `Nœud avec échecs fréquents (${count} fois)`,
                probability: Math.min(95, count * 20),
                severity: count > 3 ? 'critical' : 'high',
                suggestedFix: 'Analyser les logs d\'erreur et ajouter une gestion d\'erreurs robuste',
                detectionConfidence: 90
              });
            }
          }
        });
      }
    }
    
    // Remove ignored errors
    return predictions.filter(err => !ignoredErrors.includes(err.id));
  };

  const findCircularPaths = (): string[][] => {
    const adjacencyList: {[key: string]: string[]} = {};
    
    // Build adjacency list from edges
    edges.forEach(edge => {
      if (!adjacencyList[edge.source]) {
        adjacencyList[edge.source] = [];
      }
      adjacencyList[edge.source].push(edge.target);
    });
    
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circularPaths: string[][] = [];
    
    // DFS to find cycles
    const dfs = (nodeId: string, path: string[] = []): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);
      
      const neighbors = adjacencyList[nodeId] || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor, [...path])) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          // Cycle detected
          const cycleStart = path.indexOf(neighbor);
          circularPaths.push(path.slice(cycleStart));
          return true;
        }
      }
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    // Check each node
    Object.keys(adjacencyList).forEach(nodeId => {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    });
    
    return circularPaths;
  };

  const assessNodeHealth = (): NodeHealth[] => {
    return nodes.map(node => {
      // Base health score
      let healthScore = 100;
      const factors: NodeHealth['factors'] = [];
      
      // Node type specific checks
      const nodeType = node.data.type;
      const config = node.data.config || {};
      
      // Factor: Configuration completeness
      const requiredConfigFields: {[key: string]: string[]} = {
        'httpRequest': ['url', 'method'],
        'email': ['to', 'subject', 'body'],
        'mysql': ['host', 'database', 'user'],
        'postgres': ['host', 'database', 'user'],
        'condition': ['condition'],
        'code': ['code'],
        'openai': ['model', 'prompt'],
        'webhook': ['method', 'path']
      };
      
      if (requiredConfigFields[nodeType]) {
        const fields = requiredConfigFields[nodeType];
        const missingFields = fields.filter(field => !config[field]);
        
        if (missingFields.length > 0) {
          const impact = -20 * missingFields.length / fields.length;
          healthScore += impact;
          
          factors.push({
            factor: 'Configuration incomplète',
            impact,
            description: `${missingFields.join(', ')} manquant(s)`
          });
        } else {
          factors.push({
            factor: 'Configuration complète',
            impact: 10,
            description: 'Tous les champs requis sont remplis'
          });
        }
      }
      
      // Factor: Error handling
      const outgoingEdges = edges.filter(edge => edge.source === node.id);
      const hasErrorHandling = outgoingEdges.some(edge => 
        edge.sourceHandle === 'error' || edge.sourceHandle?.includes('false')
      );
      
      if (['code', 'httpRequest', 'mysql', 'postgres', 'openai', 'email'].includes(nodeType)) {
        if (hasErrorHandling) {
          factors.push({
            factor: 'Gestion d\'erreurs',
            impact: 15,
            description: 'Gestion d\'erreurs configurée'
          });
        } else {
          healthScore -= 15;
          factors.push({
            factor: 'Absence de gestion d\'erreurs',
            impact: -15,
            description: 'Ajouter une branche pour gérer les erreurs'
          });
        }
      }
      
      // Factor: Execution history (if available)
      const nodeResults = Object.entries(executionHistory)
        .filter(([id, exec]) => {
          return exec.errors?.some(err => err.nodeId === node.id);
        });
      
      if (nodeResults.length > 0) {
        const impact = -10 * Math.min(3, nodeResults.length);
        healthScore += impact;
        
        factors.push({
          factor: 'Historique d\'échecs',
          impact,
          description: `${nodeResults.length} échec(s) précédent(s)`
        });
      }
      
      // Factor: Connection integrity
      const incomingEdges = edges.filter(edge => edge.target === node.id);
      
      if (incomingEdges.length === 0 && !['trigger', 'webhook', 'schedule', 'manualTrigger'].includes(nodeType)) {
        healthScore -= 25;
        factors.push({
          factor: 'Nœud orphelin',
          impact: -25,
          description: 'Ce nœud n\'est connecté à aucun autre nœud en amont'
        });
      }
      
      // Factor: Heavy operations check
      if (['openai', 'anthropic', 'code', 'python', 'mysql', 'postgres', 'mongodb'].includes(nodeType)) {
        // Check for rate limiting or throttling
        if (!config.rateLimit && !config.throttling) {
          healthScore -= 10;
          factors.push({
            factor: 'Absence de rate limiting',
            impact: -10,
            description: 'Implémenter des mécanismes de throttling pour les opérations lourdes'
          });
        }
        
        // Check for timeout configuration
        if (!config.timeout) {
          healthScore -= 5;
          factors.push({
            factor: 'Timeout non configuré',
            impact: -5,
            description: 'Définir un timeout pour éviter les blocages'
          });
        }
      }
      
      // Factor: Node description
      if (node.data.description) {
        factors.push({
          factor: 'Documentation',
          impact: 5,
          description: 'Nœud documenté'
        });
      }
      
      // Ensure health score is between 0-100
      healthScore = Math.max(0, Math.min(100, healthScore));
      
      return {
        nodeId: node.id,
        healthScore,
        factors
      };
    });
  };

  const ignoreError = (errorId: string) => {
    setIgnoredErrors([...ignoredErrors, errorId]);
    setPredictedErrors(predictedErrors.filter(err => err.id !== errorId));
  };

  const getFilteredPredictions = () => {
    if (showIgnoredErrors) {
      // Show all predictions, including ignored ones
      return predictPotentialErrors();
    }
    // Show only non-ignored predictions
    return predictedErrors.filter(err => !ignoredErrors.includes(err.id));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getErrorTypeIcon = (type: string) => {
    switch (type) {
      case 'connectivity': return <Share2 size={16} />;
      case 'data': return <AlertCircle size={16} />;
      case 'rate_limit': return <Activity size={16} />;
      case 'timeout': return <Clock size={16} />;
      case 'auth': return <Shield size={16} />;
      case 'validation': return <AlertTriangle size={16} />;
      case 'resource': return <Activity size={16} />;
      case 'logic': return <Zap size={16} />;
      default: return <AlertTriangle size={16} />;
    }
  };

  return (
    <>
      {/* Error Prediction Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed top-116 left-4 z-40 px-4 py-2 rounded-lg ${
          darkMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-yellow-500 hover:bg-yellow-600'
        } text-white shadow-lg flex items-center space-x-2 transition-all hover:scale-105`}
      >
        <AlertTriangle size={16} />
        <span>Error Prediction</span>
      </button>

      {/* Error Prediction Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="text-yellow-500" size={24} />
                <h2 className="text-xl font-bold">Error Prediction Engine</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b mb-4">
              <button
                onClick={() => setActiveTab('errors')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'errors'
                    ? 'border-b-2 border-yellow-500 text-yellow-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Erreurs Prédites
              </button>
              <button
                onClick={() => setActiveTab('health')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'health'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Santé des Nœuds
              </button>
            </div>

            {isScanning ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-lg font-medium">Analyse IA en cours...</p>
                <p className="text-sm text-gray-500 mt-2">Détection proactive des erreurs potentielles...</p>
              </div>
            ) : (
              <>
                {activeTab === 'errors' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <h3 className="text-lg font-semibold">Erreurs Potentielles</h3>
                        <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${
                          predictedErrors.length === 0
                            ? 'bg-green-100 text-green-800'
                            : predictedErrors.length < 3
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {predictedErrors.length}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="showIgnored"
                            checked={showIgnoredErrors}
                            onChange={() => setShowIgnoredErrors(!showIgnoredErrors)}
                            className="mr-2"
                          />
                          <label htmlFor="showIgnored" className="text-sm">
                            Afficher ignorées
                          </label>
                        </div>
                        <button
                          onClick={runErrorPrediction}
                          className="px-3 py-1 bg-yellow-500 text-white rounded-md text-sm flex items-center space-x-1"
                        >
                          <RefreshCw size={16} />
                          <span>Analyser</span>
                        </button>
                      </div>
                    </div>

                    {getFilteredPredictions().length === 0 ? (
                      <div className="text-center py-12 bg-green-50 rounded-lg">
                        <Check size={48} className="mx-auto text-green-500 mb-4" />
                        <p className="text-lg font-medium">Aucune erreur prédite !</p>
                        <p className="text-gray-500">Votre workflow semble robuste et ne présente pas de risques d'erreurs détectables.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {getFilteredPredictions()
                          .sort((a, b) => {
                            // Sort by severity first
                            const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                            const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
                            if (severityDiff !== 0) return severityDiff;
                            
                            // Then by probability
                            return b.probability - a.probability;
                          })
                          .map(error => (
                            <div 
                              key={error.id} 
                              className={`p-4 rounded-lg border ${
                                darkMode 
                                  ? 'bg-gray-700 border-gray-600' 
                                  : error.severity === 'critical'
                                  ? 'bg-red-50 border-red-200'
                                  : error.severity === 'high'
                                  ? 'bg-orange-50 border-orange-200'
                                  : 'bg-white border-gray-200'
                              } shadow-sm`}
                            >
                              <div className="flex items-start">
                                <div className={`mt-1 mr-3 ${getSeverityColor(error.severity)}`}>
                                  {getErrorTypeIcon(error.errorType)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <div className="font-medium">{error.description}</div>
                                    <div className={`px-2 py-1 text-xs rounded-full font-medium ${getSeverityBadgeColor(error.severity)}`}>
                                      {error.severity.charAt(0).toUpperCase() + error.severity.slice(1)}
                                    </div>
                                  </div>
                                  <div className="text-sm mt-1">
                                    <span className="font-medium">Nœud :</span> {error.nodeName}
                                  </div>
                                  <div className="text-sm mt-1">
                                    <span className="font-medium">Suggestion :</span> {error.suggestedFix}
                                  </div>
                                  <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                                      <div>
                                        <span className="font-medium">Probabilité :</span> {error.probability}%
                                      </div>
                                      <div>
                                        <span className="font-medium">Confiance :</span> {error.detectionConfidence}%
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => ignoreError(error.id)}
                                      className="text-xs text-gray-500 hover:text-gray-700"
                                    >
                                      Ignorer
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'health' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">Santé des Nœuds</h3>
                      <button
                        onClick={runErrorPrediction}
                        className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm flex items-center space-x-1"
                      >
                        <RefreshCw size={16} />
                        <span>Rafraîchir</span>
                      </button>
                    </div>

                    {nodeHealth.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <Activity size={36} className="mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-500">Cliquez sur Analyser pour évaluer la santé des nœuds</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {nodeHealth
                          .sort((a, b) => a.healthScore - b.healthScore) // Sort by health score (ascending)
                          .map((node, index) => {
                            const targetNode = nodes.find(n => n.id === node.nodeId);
                            if (!targetNode) return null;
                            
                            // Health color
                            const healthColor = 
                              node.healthScore >= 80 ? 'bg-green-500' :
                              node.healthScore >= 60 ? 'bg-yellow-500' :
                              'bg-red-500';
                              
                            return (
                              <div 
                                key={node.nodeId}
                                className={`p-4 rounded-lg ${
                                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                                } border shadow-sm`}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="font-medium">{targetNode.data.label || targetNode.data.type}</div>
                                  <div className="flex items-center space-x-2">
                                    <div className="text-sm font-bold">{node.healthScore}/100</div>
                                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full ${healthColor}`}
                                        style={{ width: `${node.healthScore}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  {node.factors.map((factor, idx) => (
                                    <div key={idx} className="flex items-start text-sm">
                                      <div className={`mt-1 mr-2 ${
                                        factor.impact > 0 ? 'text-green-500' : 'text-red-500'
                                      }`}>
                                        {factor.impact > 0 ? (
                                          <Check size={16} />
                                        ) : (
                                          <AlertTriangle size={16} />
                                        )}
                                      </div>
                                      <div>
                                        <div className="font-medium">{factor.factor}</div>
                                        <div className="text-xs text-gray-500">{factor.description}</div>
                                      </div>
                                      <div className={`ml-auto font-bold ${
                                        factor.impact > 0 ? 'text-green-500' : 'text-red-500'
                                      }`}>
                                        {factor.impact > 0 ? '+' : ''}{factor.impact}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* AI-Powered Tips */}
                <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                  <h4 className="font-medium mb-2 flex items-center">
                    <Shield className="mr-2 text-yellow-500" size={16} />
                    Error Prediction AI
                  </h4>
                  <div className="text-sm space-y-1 text-gray-600">
                    <p>✅ <strong>Analyse proactive</strong> : Détecte les erreurs potentielles avant exécution</p>
                    <p>✅ <strong>Machine Learning</strong> : Apprend des patterns d'erreurs précédents</p>
                    <p>✅ <strong>Suggestions correctives</strong> : Solutions spécifiques pour chaque erreur</p>
                    <p>✅ <strong>Health scoring</strong> : Évaluation de la robustesse de chaque nœud</p>
                  </div>
                </div>
              </>
            )}

            {/* Action buttons */}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setIsOpen(false)}
                className={`px-4 py-2 rounded-lg ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                } transition-colors`}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}