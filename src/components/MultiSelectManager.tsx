import React from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Copy, Trash2, Group, Ungroup } from 'lucide-react';

export default function MultiSelectManager() {
  const { 
    selectedNodes, 
    deleteSelectedNodes, 
    copySelectedNodes, 
    groupSelectedNodes,
    ungroupSelectedNodes,
    darkMode 
  } = useWorkflowStore();

  if (selectedNodes.length === 0) return null;

  return (
    <div className={`absolute top-20 left-1/2 transform -translate-x-1/2 z-50 ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } border rounded-lg shadow-lg p-2 flex items-center space-x-2`}>
      <span className="text-sm font-medium px-2">
        {selectedNodes.length} selected
      </span>
      
      <div className="h-4 w-px bg-gray-300"></div>
      
      <button
        onClick={copySelectedNodes}
        className={`p-2 rounded hover:${darkMode ? 'bg-gray-700' : 'bg-gray-100'} transition-colors`}
        title="Copy selected nodes"
      >
        <Copy size={16} />
      </button>
      
      <button
        onClick={groupSelectedNodes}
        className={`p-2 rounded hover:${darkMode ? 'bg-gray-700' : 'bg-gray-100'} transition-colors`}
        title="Group selected nodes"
      >
        <Group size={16} />
      </button>
      
      <button
        onClick={ungroupSelectedNodes}
        className={`p-2 rounded hover:${darkMode ? 'bg-gray-700' : 'bg-gray-100'} transition-colors`}
        title="Ungroup selected nodes"
      >
        <Ungroup size={16} />
      </button>
      
      <button
        onClick={deleteSelectedNodes}
        className={`p-2 rounded hover:bg-red-100 text-red-500 transition-colors`}
        title="Delete selected nodes"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}