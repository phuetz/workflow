import React from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';
import { WorkflowNode } from '../../../types/workflow';

interface Props { node: WorkflowNode; }

export default function DelayConfig({ node }: Props) {
  const { updateNode, darkMode } = useWorkflowStore();
  const config = (node.data.config || {}) as Record<string, unknown>;

  const update = (field: string, value: unknown) => {
    updateNode(node.id, { config: { ...config, [field]: value } });
  };

  return (
    <div style={{ width: 320, padding: 16 }}>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Delay</label>
        <input
          type="number"
          value={(config.delay as number) || 0}
          onChange={(e) => update('delay', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
        />
      </div>
    </div>
  );
}
