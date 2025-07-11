import React from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Undo, Redo, RotateCcw, History } from 'lucide-react';

export const UndoRedoManager: React.FC = () => {
  const { 
    history, 
    currentHistoryIndex, 
    undo, 
    redo, 
    clearHistory,
    canUndo,
    canRedo
  } = useWorkflowStore();

  const handleUndo = () => {
    if (canUndo) {
      undo();
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      redo();
    }
  };

  const handleClearHistory = () => {
    clearHistory();
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo]);

  return (
    <div className="flex items-center gap-2 p-2 bg-white rounded-lg shadow-sm border">
      <button
        onClick={handleUndo}
        disabled={!canUndo}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          canUndo
            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
        }`}
        title="Undo (Ctrl+Z)"
      >
        <Undo size={16} />
        Undo
      </button>

      <button
        onClick={handleRedo}
        disabled={!canRedo}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          canRedo
            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
        }`}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo size={16} />
        Redo
      </button>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      <div className="flex items-center gap-2">
        <History size={14} className="text-gray-400" />
        <span className="text-xs text-gray-500">
          {currentHistoryIndex + 1}/{history.length}
        </span>
      </div>

      {history.length > 1 && (
        <button
          onClick={handleClearHistory}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-red-600 hover:bg-red-50 transition-colors"
          title="Clear history"
        >
          <RotateCcw size={12} />
          Clear
        </button>
      )}
    </div>
  );
};