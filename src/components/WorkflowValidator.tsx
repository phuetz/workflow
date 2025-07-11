import React, { useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

export default function WorkflowValidator() {
  const { nodes, edges, validateWorkflow, darkMode } = useWorkflowStore();
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const runValidation = async () => {
    setIsValidating(true);
    
    // Simulation d'une validation complète
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const results = [];
    
    // Vérification des nœuds orphelins
    const connectedNodes = new Set([...edges.map(e => e.source), ...edges.map(e => e.target)]);
    const orphanNodes = nodes.filter(node => !connectedNodes.has(node.id) && nodes.length > 1);
    
    if (orphanNodes.length > 0) {
      results.push({
        type: 'warning',
        message: `${orphanNodes.length} nœud(s) non connecté(s)`,
        details: orphanNodes.map(n => n.data.label || n.id).join(', '),
        severity: 'medium'
      });
    }

    // Vérification des triggers
    const triggers = nodes.filter(node => 
      ['trigger', 'webhook', 'schedule', 'rssFeed'].includes(node.data.type)
    );
    
    if (triggers.length === 0) {
      results.push({
        type: 'error',
        message: 'Aucun déclencheur trouvé',
        details: 'Votre workflow doit avoir au moins un nœud déclencheur',
        severity: 'high'
      });
    }

    // Vérification des configurations
    const unconfiguredNodes = nodes.filter(node => {
      const config = node.data.config || {};
      switch (node.data.type) {
        case 'httpRequest':
          return !config.url;
        case 'email':
          return !config.to || !config.subject;
        case 'slack':
          return !config.channel;
        default:
          return false;
      }
    });

    if (unconfiguredNodes.length > 0) {
      results.push({
        type: 'warning',
        message: `${unconfiguredNodes.length} nœud(s) mal configuré(s)`,
        details: unconfiguredNodes.map(n => n.data.label || n.id).join(', '),
        severity: 'medium'
      });
    }

    // Vérification des boucles infinies
    const hasLoop = checkForLoops(nodes, edges);
    if (hasLoop) {
      results.push({
        type: 'error',
        message: 'Boucle infinie détectée',
        details: 'Votre workflow contient une boucle qui pourrait causer une exécution infinie',
        severity: 'high'
      });
    }

    // Vérification des performances
    if (nodes.length > 50) {
      results.push({
        type: 'info',
        message: 'Workflow complexe détecté',
        details: 'Ce workflow contient plus de 50 nœuds, considérez le diviser en sous-workflows',
        severity: 'low'
      });
    }

    // Succès si aucune erreur
    if (results.filter(r => r.type === 'error').length === 0) {
      results.push({
        type: 'success',
        message: 'Validation réussie',
        details: 'Votre workflow est prêt à être exécuté',
        severity: 'low'
      });
    }

    setValidationResults(results);
    setIsValidating(false);
  };

  const checkForLoops = (nodes: any[], edges: any[]) => {
    // Algorithme simple de détection de cycles
    const visited = new Set();
    const recursionStack = new Set();

    const dfs = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingEdges = edges.filter(e => e.source === nodeId);
      for (const edge of outgoingEdges) {
        if (dfs(edge.target)) return true;
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (dfs(node.id)) return true;
    }

    return false;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="text-red-500" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={20} />;
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      default:
        return <Info className="text-blue-500" size={20} />;
    }
  };

  return (
    <div className={`p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white'} rounded-lg shadow-sm`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">🔍 Validation du Workflow</h2>
        <button
          onClick={runValidation}
          disabled={isValidating || nodes.length === 0}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isValidating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Validation...
            </>
          ) : (
            <>🔍 Valider</>
          )}
        </button>
      </div>

      {nodes.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">Ajoutez des nœuds à votre workflow pour commencer la validation</p>
        </div>
      )}

      {validationResults.length > 0 && (
        <div className="space-y-4">
          {validationResults.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${
                result.type === 'error' ? 'border-red-500 bg-red-50' :
                result.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                result.type === 'success' ? 'border-green-500 bg-green-50' :
                'border-blue-500 bg-blue-50'
              } ${darkMode ? 'bg-opacity-10' : ''}`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  {getIcon(result.type)}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{result.message}</h4>
                  <p className="text-sm opacity-75 mt-1">{result.details}</p>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      result.severity === 'high' ? 'bg-red-100 text-red-800' :
                      result.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {result.severity === 'high' ? 'Critique' :
                       result.severity === 'medium' ? 'Moyen' : 'Info'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Conseils de validation */}
      <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <h3 className="font-semibold mb-2">💡 Conseils de Validation</h3>
        <ul className="text-sm space-y-1 opacity-75">
          <li>• Assurez-vous que votre workflow a au moins un déclencheur</li>
          <li>• Vérifiez que tous les nœuds sont correctement configurés</li>
          <li>• Évitez les boucles infinies dans votre logique</li>
          <li>• Testez votre workflow avec des données réelles</li>
        </ul>
      </div>
    </div>
  );
}