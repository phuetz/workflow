import React, { useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { nodeTypes } from '../data/nodeTypes';
import { X, Settings, HelpCircle, Activity } from 'lucide-react';

export default function NodeConfigPanel() {
  const {
    selectedNode,
    setSelectedNode,
    updateNode,
    executionResults,
    executionErrors,
    nodeExecutionData,
    darkMode
  } = useWorkflowStore();
  const [activeTab, setActiveTab] = useState('config');

  if (!selectedNode) return null;

  const nodeType = nodeTypes[selectedNode.data.type] || nodeTypes.trigger;
  const nodeResult = executionResults[selectedNode.id];
  const nodeError = executionErrors[selectedNode.id];
  const nodeData = nodeExecutionData[selectedNode.id];

  const updateNodeConfig = (field: string, value: any) => {
    updateNode(selectedNode.id, {
      config: {
        ...selectedNode.data.config,
        [field]: value
      }
    });
  };

  const renderConfigFields = () => {
    const { type } = selectedNode.data;
    const config = selectedNode.data.config || {};

    switch (type) {
      case 'httpRequest':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Method</label>
              <select
                value={config.method || 'GET'}
                onChange={(e) => updateNodeConfig('method', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">URL</label>
              <input
                type="text"
                value={config.url || ''}
                onChange={(e) => updateNodeConfig('url', e.target.value)}
                placeholder="https://api.example.com/endpoint"
                className={`w-full px-3 py-2 border rounded-md ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Headers</label>
              <textarea
                value={config.headers || '{\n  "Content-Type": "application/json"\n}'}
                onChange={(e) => updateNodeConfig('headers', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md h-24 font-mono text-sm ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
                placeholder="JSON headers"
              />
            </div>
            {(config.method === 'POST' || config.method === 'PUT' || config.method === 'PATCH') && (
              <div>
                <label className="block text-sm font-medium mb-1">Body</label>
                <textarea
                  value={config.body || ''}
                  onChange={(e) => updateNodeConfig('body', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md h-32 font-mono text-sm ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                  placeholder="Request body (JSON)"
                />
              </div>
            )}
          </div>
        );

      case 'email':
      case 'gmail':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">To</label>
              <input
                type="email"
                value={config.to || ''}
                onChange={(e) => updateNodeConfig('to', e.target.value)}
                placeholder="recipient@example.com"
                className={`w-full px-3 py-2 border rounded-md ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <input
                type="text"
                value={config.subject || ''}
                onChange={(e) => updateNodeConfig('subject', e.target.value)}
                placeholder="Email subject"
                className={`w-full px-3 py-2 border rounded-md ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Body</label>
              <textarea
                value={config.body || ''}
                onChange={(e) => updateNodeConfig('body', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md h-32 ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
                placeholder="Email content"
              />
            </div>
          </div>
        );

      case 'slack':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Channel</label>
              <input
                type="text"
                value={config.channel || ''}
                onChange={(e) => updateNodeConfig('channel', e.target.value)}
                placeholder="#general"
                className={`w-full px-3 py-2 border rounded-md ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <textarea
                value={config.message || ''}
                onChange={(e) => updateNodeConfig('message', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md h-24 ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
                placeholder="Message content"
              />
            </div>
          </div>
        );

      case 'condition':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Condition</label>
              <input
                type="text"
                value={config.condition || ''}
                onChange={(e) => updateNodeConfig('condition', e.target.value)}
                placeholder="$json.amount > 100"
                className={`w-full px-3 py-2 border rounded-md font-mono ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div className="text-sm text-gray-500">
              Use expressions like: $json.field &gt; value, $json.status === "active"
            </div>
          </div>
        );

      case 'delay':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Delay</label>
              <input
                type="number"
                value={config.delay || '5'}
                onChange={(e) => updateNodeConfig('delay', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit</label>
              <select
                value={config.unit || 'seconds'}
                onChange={(e) => updateNodeConfig('unit', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              >
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
              </select>
            </div>
          </div>
        );

      case 'schedule':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cron Expression</label>
              <input
                type="text"
                value={config.cron || '0 9 * * *'}
                onChange={(e) => updateNodeConfig('cron', e.target.value)}
                placeholder="0 9 * * *"
                className={`w-full px-3 py-2 border rounded-md font-mono ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Timezone</label>
              <select
                value={config.timezone || 'UTC'}
                onChange={(e) => updateNodeConfig('timezone', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              >
                <option value="UTC">UTC</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <Settings className="mx-auto mb-2" size={24} />
            <p>No configuration available for this node type</p>
          </div>
        );
    }
  };

  return (
    <div className={`fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 ${
      darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
    } border-l shadow-lg overflow-hidden flex flex-col z-20`}>
      {/* Header */}
      <div className={`p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b flex items-center justify-between`}>
        <h2 className="text-lg font-semibold">Node Configuration</h2>
        <button
          onClick={() => setSelectedNode(null)}
          className="text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>
      </div>

      {/* Node Info */}
      <div className={`p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b`}>
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-lg ${nodeType.color} flex items-center justify-center`}>
            <div className="text-white font-bold text-sm">
              {selectedNode.data.type.charAt(0).toUpperCase()}
            </div>
          </div>
          <div>
            <h3 className="font-medium">{selectedNode.data.label}</h3>
            <p className="text-sm text-gray-500">{selectedNode.data.type}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b`}>
        {['config', 'results', 'help'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activeTab === tab
                ? darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'config' && <Settings size={16} className="inline mr-1" />}
            {tab === 'results' && <Activity size={16} className="inline mr-1" />}
            {tab === 'help' && <HelpCircle size={16} className="inline mr-1" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'config' && renderConfigFields()}
        
        {activeTab === 'results' && (
          <div className="space-y-4">
            {nodeData ? (
              <>
                <div>
                  <h4 className="font-medium mb-2">Input Data</h4>
                  <pre className={`p-3 rounded-lg text-sm overflow-x-auto ${
                    darkMode ? 'bg-gray-800' : 'bg-gray-100'
                  }`}>
                    {JSON.stringify(nodeData.input, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Output Data</h4>
                  <pre className={`p-3 rounded-lg text-sm overflow-x-auto ${
                    darkMode ? 'bg-gray-800' : 'bg-gray-100'
                  }`}>
                    {JSON.stringify(nodeData.output.data ?? nodeData.output, null, 2)}
                  </pre>
                </div>
              </>
            ) : nodeResult ? (
              <div>
                <h4 className="font-medium mb-2">Execution Result</h4>
                <pre className={`p-3 rounded-lg text-sm overflow-x-auto ${
                  darkMode ? 'bg-gray-800' : 'bg-gray-100'
                }`}>
                  {JSON.stringify(nodeResult.data, null, 2)}
                </pre>
              </div>
            ) : nodeError ? (
              <div>
                <h4 className="font-medium mb-2 text-red-600">Execution Error</h4>
                <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">
                  {nodeError.message}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="mx-auto mb-2" size={24} />
                <p>No execution results yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'help' && (
          <div className="space-y-4">
            <h4 className="font-medium">Node Description</h4>
            <p className="text-sm text-gray-600">{nodeType.description}</p>
            
            <h4 className="font-medium">Usage Tips</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Configure all required fields</li>
              <li>• Test the configuration before executing</li>
              <li>• Use expressions for dynamic values</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}