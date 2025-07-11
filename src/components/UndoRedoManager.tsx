import React from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Undo, Redo } from 'lucide-react';

export default function UndoRedoManager() {
  const { darkMode, undoHistory, redoHistory, undo, redo } = useWorkflowStore();

  return (
    <div className="flex items-center space-x-1">
      <button
        onClick={undo}
        disabled={undoHistory.length === 0}
        className={`p-2 rounded-lg transition-colors ${
          undoHistory.length === 0
            ? 'opacity-50 cursor-not-allowed'
            : darkMode
              ? 'hover:bg-gray-700 text-gray-300'
              : 'hover:bg-gray-100 text-gray-600'
        }`}
        title={`Undo (${undoHistory.length} actions)`}
      >
        <Undo size={16} />
      </button>
      <button
        onClick={redo}
        disabled={redoHistory.length === 0}
        className={`p-2 rounded-lg transition-colors ${
          redoHistory.length === 0
            ? 'opacity-50 cursor-not-allowed'
            : darkMode
              ? 'hover:bg-gray-700 text-gray-300'
              : 'hover:bg-gray-100 text-gray-600'
        }`}
        title={`Redo (${redoHistory.length} actions)`}
      >
        <Redo size={16} />
      </button>
    </div>
  );
}