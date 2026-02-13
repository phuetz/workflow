/**
 * Error Prediction Engine - Main component
 * Refactored to use extracted modules from ./prediction/
 */

import React from 'react';
import { AlertTriangle, Shield } from 'lucide-react';
import { usePrediction } from './prediction/usePrediction';
import ErrorPredictionList from './prediction/ErrorPredictionList';
import NodeHealthList from './prediction/NodeHealthList';

export default function ErrorPredictionEngine() {
  const {
    isOpen,
    isScanning,
    predictedErrors,
    nodeHealth,
    activeTab,
    showIgnoredErrors,
    darkMode,
    nodes,
    setIsOpen,
    setActiveTab,
    setShowIgnoredErrors,
    runErrorPrediction,
    ignoreError,
    getFilteredPredictions
  } = usePrediction();

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
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="text-yellow-500" size={24} />
                <h2 className="text-xl font-bold">Error Prediction Engine</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                x
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
                Erreurs Predites
              </button>
              <button
                onClick={() => setActiveTab('health')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'health'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sante des Noeuds
              </button>
            </div>

            {/* Content */}
            {isScanning ? (
              <ScanningIndicator />
            ) : (
              <>
                {activeTab === 'errors' && (
                  <ErrorPredictionList
                    predictions={getFilteredPredictions()}
                    darkMode={darkMode}
                    showIgnoredErrors={showIgnoredErrors}
                    onIgnore={ignoreError}
                    onRefresh={runErrorPrediction}
                    onToggleShowIgnored={() => setShowIgnoredErrors(!showIgnoredErrors)}
                  />
                )}

                {activeTab === 'health' && (
                  <NodeHealthList
                    nodeHealth={nodeHealth}
                    nodes={nodes}
                    darkMode={darkMode}
                    onRefresh={runErrorPrediction}
                  />
                )}

                {/* AI-Powered Tips */}
                <AIPoweredTips darkMode={darkMode} />
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

/**
 * Scanning indicator component
 */
function ScanningIndicator() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-lg font-medium">Analyse IA en cours...</p>
      <p className="text-sm text-gray-500 mt-2">Detection proactive des erreurs potentielles...</p>
    </div>
  );
}

/**
 * AI-Powered Tips component
 */
interface AIPoweredTipsProps {
  darkMode: boolean;
}

function AIPoweredTips({ darkMode }: AIPoweredTipsProps) {
  return (
    <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
      <h4 className="font-medium mb-2 flex items-center">
        <Shield className="mr-2 text-yellow-500" size={16} />
        Error Prediction AI
      </h4>
      <div className="text-sm space-y-1 text-gray-600">
        <p>
          <strong>Analyse proactive</strong> : Detecte les erreurs potentielles avant execution
        </p>
        <p>
          <strong>Machine Learning</strong> : Apprend des patterns d'erreurs precedents
        </p>
        <p>
          <strong>Suggestions correctives</strong> : Solutions specifiques pour chaque erreur
        </p>
        <p>
          <strong>Health scoring</strong> : Evaluation de la robustesse de chaque noeud
        </p>
      </div>
    </div>
  );
}
