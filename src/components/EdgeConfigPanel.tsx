import React from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import ExpressionEditor from './ExpressionEditor';

export default function EdgeConfigPanel() {
  const { selectedEdge, setSelectedEdge, updateEdge, darkMode } = useWorkflowStore();

  if (!selectedEdge) return null;

  const condition = selectedEdge.data?.condition || '';

  const updateCondition = (val: string) => {
    updateEdge(selectedEdge.id, { condition: val });
  };

  return (
    <div className={`fixed right-0 top-16 h-60 w-72 ${
      darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
    } border-l shadow-lg z-20`}
    >
      <div className={`p-4 flex items-center justify-between ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b`}>
        <h2 className="text-lg font-semibold">Edge Configuration</h2>
        <button onClick={() => setSelectedEdge(null)} className="text-gray-500 hover:text-gray-700">
          ×
        </button>
      </div>
      <div className="p-4 space-y-2">
        <label className="block text-sm font-medium mb-1">Condition</label>
        <ExpressionEditor value={condition} onChange={updateCondition} nodeId={selectedEdge.source} height="60px" />
        <p className="text-sm text-gray-500">Use expressions like: $json.value &gt; 5</p>
      </div>
    </div>
  );
}
