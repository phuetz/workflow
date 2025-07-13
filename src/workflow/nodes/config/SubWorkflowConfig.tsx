import React from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';

interface Props { node: any; }

export default function SubWorkflowConfig({ node }: Props) {
  const { updateNode, workflows, darkMode } = useWorkflowStore();
  const config = node.data.config || {};

  const update = (field: string, value: any) => {
    updateNode(node.id, { config: { ...config, [field]: value } });
  };

  const workflowEntries = Object.entries(workflows || {});

  return (
    <div style={{ width: 320, padding: 16 }}>
      <label className="block text-sm font-medium mb-1">Workflow</label>
      <select
        value={config.workflowId || ''}
        onChange={(e) => update('workflowId', e.target.value)}
        className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
      >
        <option value="">Select workflow</option>
        {workflowEntries.map(([id, wf]: any) => (
          <option key={id} value={id}>{wf.name || id}</option>
        ))}
      </select>
    </div>
  );
}
