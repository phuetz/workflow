// Composant d'avertissement de performance
import React, { useState, useEffect } from 'react';
import { useWorkflowPerformance } from './WorkflowPerformanceProvider';
import { useWorkflowStore } from '../../store/workflowStore';
import { AlertTriangle, X, Zap, TrendingUp } from 'lucide-react';

export default function PerformanceWarning() {
  const { darkMode } = useWorkflowStore();
  const { performanceScore, recommendations, isOptimizing, optimizePerformance } = useWorkflowPerformance();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Afficher l'avertissement si le score est bas et non ignoré
    if (performanceScore < 60 && !isDismissed) {
      setIsVisible(true);
    } else if (performanceScore >= 80) {
      setIsVisible(false);
      setIsDismissed(false); // Réinitialiser pour la prochaine fois
    }
  }, [performanceScore, isDismissed]);

  if (!isVisible) return null;

  const getSeverityClass = () => {
    if (performanceScore < 30) return 'border-red-500 bg-red-500/10';
    if (performanceScore < 60) return 'border-yellow-500 bg-yellow-500/10';
    // This case should never be reached since warning only shows when score < 60
    return 'border-yellow-500 bg-yellow-500/10'; // Default to warning color
  };

  const getSeverityColor = () => {
    if (performanceScore < 30) return 'text-red-500';
    if (performanceScore < 60) return 'text-yellow-500';
    // This case should never be reached since warning only shows when score < 60
    return 'text-yellow-500'; // Default to warning color
  };

  const getSeverityIcon = () => {
    if (performanceScore < 30) return 'text-red-500';
    if (performanceScore < 60) return 'text-yellow-500';
    return 'text-yellow-500'; // Default to warning color
  };

  return (
    <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4 
      ${darkMode ? 'text-white' : 'text-gray-900'} 
      ${getSeverityClass()} 
      border rounded-lg shadow-lg backdrop-blur-sm animate-fadeIn`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={20} className={getSeverityIcon()} />
            <h3 className="font-semibold">Performance dégradée</h3>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Score */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm">Score de performance</span>
            <span className={`text-sm font-bold ${
              performanceScore < 30 ? 'text-red-500' :
              performanceScore < 60 ? 'text-yellow-500' :
              'text-blue-500'
            }`}>
              {performanceScore}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                performanceScore < 30 ? 'bg-red-500' :
                performanceScore < 60 ? 'bg-yellow-500' :
                'bg-blue-500'
              }`}
              style={{ width: `${performanceScore}%` }}
            />
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Recommandations :</h4>
            <ul className="space-y-1">
              {recommendations.slice(0, 3).map((rec, index) => (
                <li key={index} className="text-xs flex items-start">
                  <span className="mr-1">•</span>
                  <span className="opacity-80">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={optimizePerformance}
            disabled={isOptimizing}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg
              ${darkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              } 
              disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
          >
            {isOptimizing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                <span className="text-sm">Optimisation...</span>
              </>
            ) : (
              <>
                <Zap size={16} />
                <span className="text-sm">Optimiser maintenant</span>
              </>
            )}
          </button>
          
          <button
            onClick={() => setIsDismissed(true)}
            className={`px-4 py-2 rounded-lg text-sm
              ${darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              } transition-all`}
          >
            Ignorer
          </button>
        </div>

        {/* Performance tips */}
        <div className={`mt-3 pt-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center space-x-2 text-xs opacity-70">
            <TrendingUp size={14} />
            <span>Astuce : Réduisez le nombre de nœuds visibles pour améliorer les performances</span>
          </div>
        </div>
      </div>
    </div>
  );
}