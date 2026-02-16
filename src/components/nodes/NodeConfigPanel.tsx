import React, { useState, memo, useCallback } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { nodeTypes } from '../../data/nodeTypes';
import { X, Settings, HelpCircle, Activity, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Table, Code, FileJson, Play } from 'lucide-react';
import ExpressionEditor from '../expression/ExpressionEditor';
import { GenericNodeConfig } from '../nodeConfigs/GenericNodeConfig';
import { getNodeConfig, hasNodeConfig } from '../nodeConfigs/configRegistry';
import { NodeConfigDefinition } from '../../types/nodeConfig';

/**
 * DataViewer - n8n-style JSON/Table data viewer for Input/Output tabs
 */
const DataViewer: React.FC<{
  data: unknown;
  hasError?: boolean;
  emptyMessage: string;
  emptyDescription: string;
  darkMode: boolean;
}> = ({ data, hasError, emptyMessage, emptyDescription, darkMode }) => {
  const [viewMode, setViewMode] = React.useState<'json' | 'table'>('json');

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
          darkMode ? 'bg-gray-800' : 'bg-gray-100'
        }`}>
          <Play size={20} className="text-gray-400" />
        </div>
        <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {emptyMessage}
        </p>
        <p className="text-xs text-gray-400 mt-1">{emptyDescription}</p>
      </div>
    );
  }

  // Try to extract array data for table view
  const arrayData = Array.isArray(data) ? data : null;
  const columns = arrayData && arrayData.length > 0 && typeof arrayData[0] === 'object' && arrayData[0] !== null
    ? Object.keys(arrayData[0] as Record<string, unknown>)
    : null;

  return (
    <div className="space-y-2">
      {/* View mode toggle */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setViewMode('json')}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
            viewMode === 'json'
              ? 'bg-[var(--n8n-color-primary,#ff6d5a)] text-white'
              : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileJson size={11} /> JSON
        </button>
        {columns && (
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-[var(--n8n-color-primary,#ff6d5a)] text-white'
                : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Table size={11} /> Table
          </button>
        )}
        {arrayData && (
          <span className="ml-auto text-[10px] text-gray-400">
            {arrayData.length} item{arrayData.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Error banner */}
      {hasError && (
        <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
          <AlertTriangle size={12} className="inline mr-1" />
          Execution failed
        </div>
      )}

      {/* JSON view */}
      {viewMode === 'json' && (
        <pre className={`p-3 rounded-lg text-[11px] overflow-x-auto leading-relaxed font-mono ${
          hasError
            ? 'bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-300'
            : darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-800'
        }`} style={{ maxHeight: '400px' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}

      {/* Table view */}
      {viewMode === 'table' && columns && arrayData && (
        <div className={`rounded-lg border overflow-auto ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`} style={{ maxHeight: '400px' }}>
          <table className="w-full text-[11px]">
            <thead>
              <tr className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-500 w-8">#</th>
                {columns.map(col => (
                  <th key={col} className="px-2 py-1.5 text-left font-semibold text-gray-500 truncate max-w-[120px]">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {arrayData.map((row, i) => (
                <tr key={i} className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                  <td className="px-2 py-1 text-gray-400">{i}</td>
                  {columns.map(col => (
                    <td key={col} className="px-2 py-1 truncate max-w-[120px]">
                      {typeof (row as Record<string, unknown>)[col] === 'object'
                        ? JSON.stringify((row as Record<string, unknown>)[col])
                        : String((row as Record<string, unknown>)[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// This is the NEW modular NodeConfigPanel that uses the configuration registry
const NodeConfigPanel = memo(function NodeConfigPanel({ onClose }: { onClose?: () => void }) {
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

  // Update node config helper - must be before early return to respect hook rules
  const updateNodeConfig = useCallback((field: string, value: unknown) => {
    if (!selectedNode) return;
    updateNode(selectedNode.id, {
      config: {
        ...selectedNode.data.config,
        [field]: value
      }
    });
  }, [selectedNode, updateNode]);

  const handleConfigChange = useCallback((field: string, value: unknown) => {
    updateNodeConfig(field, value);
  }, [updateNodeConfig]);

  if (!selectedNode) return null;

  // Extract type and config from selectedNode
  const type = selectedNode.data?.type || '';
  const config = selectedNode.data?.config || {};

  // Get the configuration definition for this node type
  const configDefinition = hasNodeConfig(type) ? getNodeConfig(type) : null;

  // Get the node type info from nodeTypes
  const nodeType = nodeTypes[type] || { color: 'bg-gray-500', label: type, description: '' };

  // Check if this node type is configurable
  const isConfigurable = configDefinition !== null;
  const totalConfigurableNodes = Object.keys(nodeTypes).filter(t => hasNodeConfig(t)).length;

  // Get execution data for this node
  const nodeResult = executionResults[selectedNode.id] as { data: unknown } | undefined;
  const nodeError = executionErrors[selectedNode.id] as { message: string } | undefined;
  const nodeData = nodeExecutionData[selectedNode.id] as { input: unknown; output: { data?: unknown } | unknown } | undefined;

  // Get the configuration definition for this node type
  const renderDynamicConfig = () => {
    // Use modular configuration if available
    if (configDefinition) {
      return (
        <GenericNodeConfig
          nodeType={type}
          config={config}
          configDefinition={configDefinition as NodeConfigDefinition}
          updateNodeConfig={updateNodeConfig}
          darkMode={darkMode}
          nodeId={selectedNode.id}
        />
      );
    }

    return null;
  };

  const renderConfigFields = () => {
    // Fallback to legacy hardcoded configurations for backward compatibility
    switch (type) {
      case 'httpRequest':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Method</label>
              <select
                value={(config.method as string) || 'GET'}
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
                value={(config.url as string) || ''}
                onChange={(e) => updateNodeConfig('url', e.target.value)}
                placeholder="https://api.example.com/endpoint"
                className={`w-full px-3 py-2 border rounded-md ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Headers</label>
              <ExpressionEditor
                value={(config.headers as string) || '{\n  "Content-Type": "application/json"\n}'}
                onChange={(val) => updateNodeConfig('headers', val)}
                nodeId={selectedNode.id}
                height="100px"
              />
            </div>
            {(config.method === 'POST' || config.method === 'PUT' || config.method === 'PATCH') && (
              <div>
                <label className="block text-sm font-medium mb-1">Body</label>
                <ExpressionEditor
                  value={(config.body as string) || ''}
                  onChange={(val) => updateNodeConfig('body', val)}
                  nodeId={selectedNode.id}
                  height="120px"
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
                value={(config.to as string) || ''}
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
                value={(config.subject as string) || ''}
                onChange={(e) => updateNodeConfig('subject', e.target.value)}
                placeholder="Email subject"
                className={`w-full px-3 py-2 border rounded-md ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Body</label>
              <ExpressionEditor
                value={(config.body as string) || ''}
                onChange={(val) => updateNodeConfig('body', val)}
                nodeId={selectedNode.id}
                height="120px"
              />
            </div>
          </div>
        );


      case 'condition':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Condition</label>
              <ExpressionEditor
                value={(config.condition as string) || ''}
                onChange={(val) => updateNodeConfig('condition', val)}
                nodeId={selectedNode.id}
                height="60px"
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
                value={(config.delay as string | number) || '5'}
                onChange={(e) => updateNodeConfig('delay', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit</label>
              <select
                value={(config.unit as string) || 'seconds'}
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
                value={(config.cron as string) || '0 9 * * *'}
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
                value={(config.timezone as string) || 'UTC'}
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

      default: {
        // Show status for nodes with modular configs coming soon
        
        return (
          <div className="text-center py-8 text-gray-500">
            <Settings className="mx-auto mb-2" size={24} />
            <p className="font-medium mb-2">
              {isConfigurable ? 'Configuration Available' : 'Configuration Not Yet Implemented'}
            </p>
            <p className="text-sm">Node type: {type}</p>
            
            {!isConfigurable && (
              <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <AlertTriangle className="mx-auto mb-2 text-orange-600" size={20} />
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  This node type is one of the {156 - totalConfigurableNodes - 6} types pending configuration
                </p>
                <p className="text-xs mt-2">
                  Progress: {totalConfigurableNodes + 6}/156 node types configured
                </p>
              </div>
            )}
          </div>
        );
      }
    }
  };

  return (
    <div className={`n8n-config-panel h-full w-full ${
      darkMode ? 'bg-[#1e1e2e] border-gray-700' : 'bg-white border-gray-200'
    } overflow-hidden flex flex-col`}>
      {/* n8n-style header: icon + name + close */}
      <div className={`px-4 py-3 ${darkMode ? 'bg-[#252535] border-gray-700' : 'bg-gray-50 border-gray-200'} border-b flex items-center gap-3`}>
        <div className={`w-8 h-8 rounded-lg ${nodeType.color} flex items-center justify-center flex-shrink-0`}>
          <span className="text-white font-bold text-xs">
            {selectedNode.data.type.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-sm truncate ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            {selectedNode.data.label || nodeType.label}
          </h3>
          <p className="text-[11px] text-gray-500 truncate">{selectedNode.data.type}</p>
        </div>
        <button
          onClick={() => {
            setSelectedNode(null);
            onClose?.();
          }}
          className={`p-1.5 rounded-lg transition-colors ${
            darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
          }`}
        >
          <X size={16} />
        </button>
      </div>

      {/* n8n-style tabs: Parameters | Input | Output | Settings */}
      <div className={`flex ${darkMode ? 'border-gray-700' : 'border-gray-200'} border-b`}>
        {[
          { key: 'config', label: 'Parameters', icon: Settings },
          { key: 'input', label: 'Input', icon: ArrowDownToLine },
          { key: 'output', label: 'Output', icon: ArrowUpFromLine },
          { key: 'settings', label: 'Settings', icon: HelpCircle },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-2 py-2 text-[11px] font-medium transition-colors relative ${
              activeTab === tab.key
                ? darkMode ? 'text-white' : 'text-gray-900'
                : darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="flex items-center justify-center gap-1">
              <tab.icon size={12} />
              {tab.label}
            </span>
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: 'var(--n8n-color-primary, #ff6d5a)' }} />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Parameters tab */}
        {activeTab === 'config' && renderConfigFields()}

        {/* Input tab - n8n-style data viewer */}
        {activeTab === 'input' && (
          <DataViewer
            data={nodeData?.input}
            emptyMessage="No input data yet"
            emptyDescription="Execute the workflow to see input data"
            darkMode={darkMode}
          />
        )}

        {/* Output tab - n8n-style data viewer */}
        {activeTab === 'output' && (
          <DataViewer
            data={nodeError ? { error: nodeError.message } : (nodeData ? ((nodeData.output as { data?: unknown })?.data ?? nodeData.output) : nodeResult?.data)}
            hasError={!!nodeError}
            emptyMessage="No output data yet"
            emptyDescription="Execute this node to see results"
            darkMode={darkMode}
          />
        )}

        {/* Settings tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div>
              <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                About
              </h4>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {nodeType.description}
              </p>
            </div>

            <div>
              <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Tips
              </h4>
              <ul className={`text-sm space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <li className="flex items-start gap-2"><span className="text-gray-400">-</span> Configure all required fields</li>
                <li className="flex items-start gap-2"><span className="text-gray-400">-</span> Use expressions (=) for dynamic values</li>
                <li className="flex items-start gap-2"><span className="text-gray-400">-</span> Press D to disable/enable this node</li>
              </ul>
            </div>

            {configDefinition && configDefinition.examples && (
              <div>
                <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Examples
                </h4>
                <div className="space-y-2">
                  {configDefinition.examples.map((example, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded text-sm ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}
                    >
                      <p className="font-medium">{example.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Always re-render when selectedNode changes (managed by store)
  return prevProps.onClose === nextProps.onClose;
});

export default NodeConfigPanel;