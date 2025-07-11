import React, { useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Play, Pause, StepForward, Square, Bug, Eye, EyeOff } from 'lucide-react';

export default function DebugPanel() {
  const { 
    darkMode, 
    debugMode, 
    toggleDebugMode,
    stepByStep,
    toggleStepByStep,
    breakpoints,
    addBreakpoint,
    removeBreakpoint,
    debugStep,
    debugContinue,
    debugStop,
    currentDebugNode,
    debugSession
  } = useWorkflowStore();

  const [watchVariables, setWatchVariables] = useState<string[]>([]);
  const [newVariable, setNewVariable] = useState('');

  const addWatchVariable = () => {
    if (newVariable && !watchVariables.includes(newVariable)) {
      setWatchVariables([...watchVariables, newVariable]);
      setNewVariable('');
    }
  };

  return (
    <div className={`fixed bottom-4 left-4 w-80 ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } border rounded-lg shadow-lg overflow-hidden`}>
      {/* Header */}
      <div className={`p-3 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} border-b flex items-center justify-between`}>
        <div className="flex items-center space-x-2">
          <Bug size={16} className="text-orange-500" />
          <span className="font-semibold">Debug Panel</span>
        </div>
        <button
          onClick={toggleDebugMode}
          className={`p-1 rounded ${
            debugMode 
              ? 'bg-orange-500 text-white' 
              : darkMode ? 'bg-gray-700' : 'bg-gray-200'
          }`}
        >
          {debugMode ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>

      {debugMode && (
        <div className="p-3">
          {/* Debug Controls */}
          <div className="flex items-center space-x-2 mb-4">
            <button
              onClick={debugContinue}
              disabled={!debugSession}
              className="flex-1 bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 disabled:opacity-50 flex items-center justify-center space-x-1"
            >
              <Play size={14} />
              <span>Continue</span>
            </button>
            <button
              onClick={debugStep}
              disabled={!debugSession}
              className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              <StepForward size={14} />
            </button>
            <button
              onClick={debugStop}
              disabled={!debugSession}
              className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 disabled:opacity-50"
            >
              <Square size={14} />
            </button>
          </div>

          {/* Step-by-step toggle */}
          <label className="flex items-center space-x-2 mb-4">
            <input
              type="checkbox"
              checked={stepByStep}
              onChange={toggleStepByStep}
              className="rounded"
            />
            <span className="text-sm">Step-by-step execution</span>
          </label>

          {/* Current Debug Node */}
          {currentDebugNode && (
            <div className="mb-4 p-2 bg-yellow-100 rounded">
              <div className="text-sm font-medium">Current Node:</div>
              <div className="text-xs">{currentDebugNode}</div>
            </div>
          )}

          {/* Breakpoints */}
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Breakpoints</div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {Object.entries(breakpoints).map(([nodeId, enabled]) => (
                <div key={nodeId} className="flex items-center justify-between text-xs">
                  <span>{nodeId.slice(-8)}</span>
                  <button
                    onClick={() => removeBreakpoint(nodeId)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Watch Variables */}
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Watch Variables</div>
            <div className="flex space-x-1 mb-2">
              <input
                type="text"
                value={newVariable}
                onChange={(e) => setNewVariable(e.target.value)}
                placeholder="Variable name"
                className={`flex-1 px-2 py-1 text-xs rounded ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-white border-gray-300'
                } border`}
                onKeyPress={(e) => e.key === 'Enter' && addWatchVariable()}
              />
              <button
                onClick={addWatchVariable}
                className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
              >
                +
              </button>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {watchVariables.map((variable, index) => (
                <div key={index} className="text-xs p-1 bg-gray-100 rounded">
                  <span className="font-mono">{variable}:</span>
                  <span className="ml-1">undefined</span>
                </div>
              ))}
            </div>
          </div>

          {/* Debug Session Info */}
          {debugSession && (
            <div className="text-xs text-gray-500">
              <div>Session: {debugSession.id}</div>
              <div>Started: {new Date(debugSession.startTime).toLocaleTimeString()}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}