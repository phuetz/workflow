import React from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';
import { WorkflowNode } from '../../../types/workflow';

interface Props {
  node: WorkflowNode;
}

export default function DebugHelperConfig({ node }: Props) {
  const { updateNode, darkMode } = useWorkflowStore();
  const config = ((node.data?.config || (node as any).config) || {}) as Record<string, unknown>;

  const update = (field: string, value: unknown) => {
    updateNode(node.id, { config: { ...config, [field]: value } });
  };

  return (
    <div style={{ width: 320, padding: 16 }}>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Output Mode</label>
        <select
          value={(config.outputMode as string) || 'passthrough'}
          onChange={(e) => update('outputMode', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        >
          <option value="passthrough">Pass Through</option>
          <option value="log">Log Only</option>
          <option value="console">Console Output</option>
          <option value="break">Breakpoint</option>
        </select>
        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          How to handle debug output
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Log Level</label>
        <select
          value={(config.logLevel as string) || 'info'}
          onChange={(e) => update('logLevel', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        >
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Message</label>
        <input
          type="text"
          value={(config.message as string) || ''}
          onChange={(e) => update('message', e.target.value)}
          placeholder="Debug checkpoint"
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
        />
        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Custom message to include in logs
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Fields to Log</label>
        <input
          type="text"
          value={(config.fields as string) || ''}
          onChange={(e) => update('fields', e.target.value)}
          placeholder="field1, field2, field3"
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
        />
        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Comma-separated list of fields (leave empty for all)
        </p>
      </div>

      <div className="mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={(config.includeMetadata as boolean) || true}
            onChange={(e) => update('includeMetadata', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Include metadata</span>
        </label>
        <p className={`text-xs mt-1 ml-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Add timestamp, node ID, and execution context
        </p>
      </div>

      <div className="mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={(config.prettyPrint as boolean) || true}
            onChange={(e) => update('prettyPrint', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Pretty print JSON</span>
        </label>
      </div>

      <div className="mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={(config.pauseExecution as boolean) || false}
            onChange={(e) => update('pauseExecution', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Pause execution</span>
        </label>
        <p className={`text-xs mt-1 ml-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Wait for manual continue when in breakpoint mode
        </p>
      </div>
    </div>
  );
}
