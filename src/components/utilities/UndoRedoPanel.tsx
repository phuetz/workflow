/**
 * Undo/Redo Panel
 * Visual history of actions with undo/redo (like n8n)
 */

import React, { useMemo } from 'react';
import {
  Undo2,
  Redo2,
  History,
  Trash2,
  Plus,
  Link2,
  Move,
  Edit3,
  Copy,
  ChevronDown,
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface HistoryEntry {
  id: number;
  type: 'add' | 'delete' | 'move' | 'connect' | 'edit' | 'duplicate' | 'other';
  description: string;
  timestamp: number;
  nodeCount: number;
  edgeCount: number;
}

interface UndoRedoPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const UndoRedoPanel: React.FC<UndoRedoPanelProps> = ({ isOpen, onClose }) => {
  const {
    undoHistory,
    redoHistory,
    nodes,
    edges,
    setNodes,
    setEdges,
    undo,
    redo,
  } = useWorkflowStore();

  // Combine undo history with current state to create full history
  const history = [...undoHistory, { nodes, edges }];
  const historyIndex = undoHistory.length;

  // Build history entries with descriptions
  const historyEntries: HistoryEntry[] = useMemo(() => {
    return history.map((state, index) => {
      const prevState = index > 0 ? history[index - 1] : null;

      let type: HistoryEntry['type'] = 'other';
      let description = 'Unknown action';

      if (prevState) {
        const nodesDiff = state.nodes.length - prevState.nodes.length;
        const edgesDiff = state.edges.length - prevState.edges.length;

        if (nodesDiff > 0) {
          type = 'add';
          description = `Added ${nodesDiff} node${nodesDiff > 1 ? 's' : ''}`;
        } else if (nodesDiff < 0) {
          type = 'delete';
          description = `Deleted ${Math.abs(nodesDiff)} node${Math.abs(nodesDiff) > 1 ? 's' : ''}`;
        } else if (edgesDiff > 0) {
          type = 'connect';
          description = `Added ${edgesDiff} connection${edgesDiff > 1 ? 's' : ''}`;
        } else if (edgesDiff < 0) {
          type = 'delete';
          description = `Removed ${Math.abs(edgesDiff)} connection${Math.abs(edgesDiff) > 1 ? 's' : ''}`;
        } else {
          // Check for position changes
          const movedNodes = state.nodes.filter((node, i) => {
            const prevNode = prevState.nodes.find(n => n.id === node.id);
            return prevNode && (
              prevNode.position.x !== node.position.x ||
              prevNode.position.y !== node.position.y
            );
          });

          if (movedNodes.length > 0) {
            type = 'move';
            description = `Moved ${movedNodes.length} node${movedNodes.length > 1 ? 's' : ''}`;
          } else {
            type = 'edit';
            description = 'Modified node configuration';
          }
        }
      } else {
        description = 'Initial state';
      }

      return {
        id: index,
        type,
        description,
        timestamp: Date.now() - (history.length - index) * 1000,
        nodeCount: state.nodes.length,
        edgeCount: state.edges.length,
      };
    });
  }, [history]);

  // Handle undo/redo
  const handleUndo = () => {
    undo();
  };

  const handleRedo = () => {
    redo();
  };

  // Jump to specific history state
  const handleJumpTo = (index: number) => {
    if (index >= 0 && index < history.length) {
      const currentIndex = historyIndex;
      const diff = index - currentIndex;

      if (diff < 0) {
        // Go backward (undo multiple times)
        for (let i = 0; i < Math.abs(diff); i++) {
          undo();
        }
      } else if (diff > 0) {
        // Go forward (redo multiple times)
        for (let i = 0; i < diff; i++) {
          redo();
        }
      }
    }
  };

  const getIcon = (type: HistoryEntry['type']) => {
    switch (type) {
      case 'add':
        return <Plus size={14} className="text-green-500" />;
      case 'delete':
        return <Trash2 size={14} className="text-red-500" />;
      case 'move':
        return <Move size={14} className="text-blue-500" />;
      case 'connect':
        return <Link2 size={14} className="text-purple-500" />;
      case 'edit':
        return <Edit3 size={14} className="text-amber-500" />;
      case 'duplicate':
        return <Copy size={14} className="text-cyan-500" />;
      default:
        return <History size={14} className="text-gray-400" />;
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const canUndo = undoHistory.length > 0;
  const canRedo = redoHistory.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed right-4 top-20 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-40 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <History size={18} className="text-gray-600" />
          <h3 className="font-semibold text-gray-900">History</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-lg transition-colors ${
              canUndo
                ? 'hover:bg-gray-200 text-gray-700'
                : 'text-gray-300 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded-lg transition-colors ${
              canRedo
                ? 'hover:bg-gray-200 text-gray-700'
                : 'text-gray-300 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors ml-2"
          >
            <ChevronDown size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* History list */}
      <div className="max-h-80 overflow-y-auto">
        {historyEntries.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No history yet
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {[...historyEntries].reverse().map((entry, reverseIndex) => {
              const actualIndex = historyEntries.length - 1 - reverseIndex;
              const isCurrent = actualIndex === historyIndex;

              return (
                <button
                  key={entry.id}
                  onClick={() => handleJumpTo(actualIndex)}
                  className={`w-full px-4 py-2.5 text-left transition-colors ${
                    isCurrent
                      ? 'bg-blue-50 border-l-2 border-blue-500'
                      : actualIndex < historyIndex
                      ? 'hover:bg-gray-50 opacity-60'
                      : 'hover:bg-gray-50 opacity-40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getIcon(entry.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${isCurrent ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                        {entry.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                        <span>{entry.nodeCount} nodes</span>
                        <span>•</span>
                        <span>{entry.edgeCount} edges</span>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                        Current
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 rounded-b-xl text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>{history.length} states saved</span>
          <span>Position: {historyIndex + 1}/{history.length}</span>
        </div>
      </div>
    </div>
  );
};

export default UndoRedoPanel;
