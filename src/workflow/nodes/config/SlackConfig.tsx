import React from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';

interface Props { node: any; }

export default function SlackConfig({ node }: Props) {
  const { updateNode, darkMode } = useWorkflowStore();
  const config = node.data.config || {};

  const update = (field: string, value: any) => {
    updateNode(node.id, { config: { ...config, [field]: value } });
  };

  return (
    <div style={{ width: 320, padding: 16 }}>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Channel</label>
        <input
          type="text"
          value={config.channel || ''}
          onChange={(e) => update('channel', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Message</label>
        <textarea
          value={config.message || ''}
          onChange={(e) => update('message', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
        />
      </div>
    </div>
  );
}
