import React, { useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Bug, Play, Pause, StepForward, RotateCcw, Eye, X, AlertCircle } from 'lucide-react';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onClose }) => {
  const { 
    nodes, 
    debugState, 
    breakpoints, 
    watchVariables,
    toggleBreakpoint,
    addWatchVariable,
    removeWatchVariable,
    stepDebug,
    resumeDebug,
    pauseDebug
  } = useWorkflowStore();
  
  const [activeTab, setActiveTab] = useState<'breakpoints' | 'variables' | 'console'>('breakpoints');
  const [newVariable, setNewVariable] = useState('');

  const handleAddVariable = () => {
    if (newVariable.trim()) {
      addWatchVariable(newVariable.trim());
      setNewVariable('');
    }
  };

  const handleToggleBreakpoint = (nodeId: string) => {
    toggleBreakpoint(nodeId);
  };

  const handleStep = () => {
    stepDebug();
  };

  const handleResume = () => {
    resumeDebug();
  };

  const handlePause = () => {
    pauseDebug();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-4 top-20 w-96 bg-white rounded-lg shadow-xl border z-50">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Bug size={20} className="text-red-500" />
          Debug Panel
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex items-center justify-center p-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <button
            onClick={handleStep}
            disabled={debugState.status !== 'paused'}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              debugState.status === 'paused'
                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            title="Step"
          >
            <StepForward size={16} />
            Step
          </button>
          
          <button
            onClick={debugState.status === 'running' ? handlePause : handleResume}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              debugState.status === 'running'
                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
            title={debugState.status === 'running' ? 'Pause' : 'Resume'}
          >
            {debugState.status === 'running' ? <Pause size={16} /> : <Play size={16} />}
            {debugState.status === 'running' ? 'Pause' : 'Resume'}
          </button>
          
          <button
            onClick={() => console.log('Reset debug session')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
            title="Reset"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>

      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('breakpoints')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'breakpoints'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <AlertCircle size={16} />
          Breakpoints ({breakpoints.length})
        </button>
        <button
          onClick={() => setActiveTab('variables')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'variables'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Eye size={16} />
          Variables ({watchVariables.length})
        </button>
        <button
          onClick={() => setActiveTab('console')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'console'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Bug size={16} />
          Console
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {activeTab === 'breakpoints' && (
          <div className="p-4 space-y-3">
            <div className="text-sm font-medium text-gray-800">
              Debug Status: <span className={`capitalize ${
                debugState.status === 'running' ? 'text-green-600' :
                debugState.status === 'paused' ? 'text-yellow-600' :
                'text-gray-600'
              }`}>
                {debugState.status}
              </span>
            </div>
            
            {debugState.currentNode && (
              <div className="bg-yellow-50 p-3 rounded-lg">
                <div className="text-sm font-medium text-yellow-800">Currently at:</div>
                <div className="text-sm text-yellow-700">{debugState.currentNode}</div>
              </div>
            )}
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-800">Breakpoints</div>
              {nodes.map((node) => (
                <div key={node.id} className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                    <span className="text-sm text-gray-700">{node.type}</span>
                  </div>
                  <button
                    onClick={() => handleToggleBreakpoint(node.id)}
                    className={`w-4 h-4 rounded-full border-2 transition-colors ${
                      breakpoints.includes(node.id)
                        ? 'bg-red-500 border-red-500'
                        : 'border-gray-300 hover:border-red-300'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'variables' && (
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newVariable}
                onChange={(e) => setNewVariable(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddVariable()}
                placeholder="Variable name (e.g., $json.email)"
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddVariable}
                disabled={!newVariable.trim()}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                <Eye size={16} />
              </button>
            </div>
            
            <div className="space-y-2">
              {watchVariables.map((variable) => (
                <div key={variable.name} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">{variable.name}</span>
                    <button
                      onClick={() => removeWatchVariable(variable.name)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    <span className="bg-gray-200 px-2 py-1 rounded font-mono">
                      {JSON.stringify(variable.value) || 'undefined'}
                    </span>
                  </div>
                </div>
              ))}
              
              {watchVariables.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">
                  No variables being watched. Add one above to start debugging.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'console' && (
          <div className="p-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-800">Debug Console</div>
              <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-xs min-h-[200px]">
                <div className="space-y-1">
                  <div>[DEBUG] Workflow execution started</div>
                  <div>[INFO] Processing node: webhook-trigger</div>
                  <div>[DEBUG] Input data: {JSON.stringify({ test: 'data' })}</div>
                  <div>[INFO] Node executed successfully</div>
                  <div>[DEBUG] Output data: {JSON.stringify({ result: 'success' })}</div>
                  <div className="text-yellow-400">[WARN] High memory usage detected</div>
                  <div>[INFO] Moving to next node...</div>
                  <div className="text-blue-400">[BREAKPOINT] Paused at node: data-transform</div>
                  <div className="text-gray-400">Waiting for user action...</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};