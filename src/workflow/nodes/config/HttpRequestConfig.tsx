import React from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';

interface Props { node: any; }

export default function HttpRequestConfig({ node }: Props) {
  const { updateNode, darkMode } = useWorkflowStore();
  const config = node.data.config || {};

  const update = (field: string, value: any) => {
    updateNode(node.id, { config: { ...config, [field]: value } });
  };

  return (
    <div style={{ width: 320, padding: 16 }}>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Method</label>
        <select
          value={config.method || 'GET'}
          onChange={(e) => update('method', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
        >
          {['GET','POST','PUT','DELETE','PATCH'].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">URL</label>
        <input
          type="text"
          value={config.url || ''}
          onChange={(e) => update('url', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
        />
      </div>
    </div>
  );
}
