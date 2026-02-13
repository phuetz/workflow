import React from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';
import { WorkflowNode } from '../../../types/workflow';

interface Props {
  node: WorkflowNode;
}

export default function Base64Config({ node }: Props) {
  const { updateNode, darkMode } = useWorkflowStore();
  const config = ((node.data?.config || (node as any).config) || {}) as Record<string, unknown>;

  const update = (field: string, value: unknown) => {
    updateNode(node.id, { config: { ...config, [field]: value } });
  };

  return (
    <div style={{ width: 320, padding: 16 }}>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Operation</label>
        <select
          value={(config.operation as string) || 'encode'}
          onChange={(e) => update('operation', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        >
          <option value="encode">Encode</option>
          <option value="decode">Decode</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Input Field</label>
        <input
          type="text"
          value={(config.inputField as string) || 'data'}
          onChange={(e) => update('inputField', e.target.value)}
          placeholder="data"
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
        />
        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Field name to encode/decode
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Output Field</label>
        <input
          type="text"
          value={(config.outputField as string) || 'base64'}
          onChange={(e) => update('outputField', e.target.value)}
          placeholder="base64"
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
        />
        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Field name for the result
        </p>
      </div>

      <div className="mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={(config.urlSafe as boolean) || false}
            onChange={(e) => update('urlSafe', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">URL-safe encoding</span>
        </label>
        <p className={`text-xs mt-1 ml-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Use URL-safe Base64 alphabet (- and _ instead of + and /)
        </p>
      </div>

      <div className="mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={(config.keepOriginal as boolean) || false}
            onChange={(e) => update('keepOriginal', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Keep original field</span>
        </label>
        <p className={`text-xs mt-1 ml-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Preserve the input field in the output
        </p>
      </div>
    </div>
  );
}
