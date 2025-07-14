import React from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Undo, Redo, RotateCcw, History } from 'lucide-react';

export const UndoRedoManager: React.FC = () => {
  const {
    undoHistory,
    redoHistory,
    undo,
    redo,
    clearHistory,
    darkMode,
  } = useWorkflowStore();

  const canUndo = undoHistory.length > 0;
  const canRedo = redoHistory.length > 0;
  const historyLength = undoHistory.length + 1 + redoHistory.length;
  const currentHistoryIndex = undoHistory.length;

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
    <div
      className={`flex items-center gap-2 p-2 rounded-lg shadow-sm border ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      <button
        onClick={handleUndo}
        disabled={!canUndo}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          canUndo
            ? darkMode
              ? 'bg-blue-700 text-white hover:bg-blue-600'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            : darkMode
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
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
            ? darkMode
              ? 'bg-blue-700 text-white hover:bg-blue-600'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            : darkMode
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
        }`}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo size={16} />
        Redo
      </button>

      <div className={`w-px h-6 mx-1 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`} />

      <div className="flex items-center gap-2">
        <History size={14} className={darkMode ? 'text-gray-400' : 'text-gray-400'} />
        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {currentHistoryIndex + 1}/{historyLength}
        </span>
      </div>

      {historyLength > 1 && (
        <button
          onClick={handleClearHistory}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${darkMode ? 'text-red-400 hover:bg-red-700' : 'text-red-600 hover:bg-red-50'}`}
          title="Clear history"
        >
          <RotateCcw size={12} />
          Clear
        </button>
      )}
    </div>
  );
};