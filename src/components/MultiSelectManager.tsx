import React from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Copy, Trash2, Group, Move, Square } from 'lucide-react';

interface MultiSelectManagerProps {
  selectedNodes: string[];
  onCopyNodes: (nodeIds: string[]) => void;
  onDeleteNodes: (nodeIds: string[]) => void;
  onGroupNodes: (nodeIds: string[]) => void;
  onMoveNodes: (nodeIds: string[], offset: { x: number; y: number }) => void;
}

export const MultiSelectManager: React.FC<MultiSelectManagerProps> = ({
  selectedNodes,
  onCopyNodes,
  onDeleteNodes,
  onGroupNodes,
  onMoveNodes
}) => {
  const { nodes, clearSelection } = useWorkflowStore();

  const handleCopyNodes = () => {
    if (selectedNodes.length === 0) return;
    onCopyNodes(selectedNodes);
  };

  const handleDeleteNodes = () => {
    if (selectedNodes.length === 0) return;
    onDeleteNodes(selectedNodes);
  };

  const handleGroupNodes = () => {
    if (selectedNodes.length < 2) return;
    onGroupNodes(selectedNodes);
  };

  const handleMoveNodes = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (selectedNodes.length === 0) return;
    
    const offset = {
      up: { x: 0, y: -10 },
      down: { x: 0, y: 10 },
      left: { x: -10, y: 0 },
      right: { x: 10, y: 0 }
    }[direction];
    
    onMoveNodes(selectedNodes, offset);
  };

  const handleSelectAll = () => {
    const allNodeIds = nodes.map(node => node.id);
    // This would need to be implemented in the parent component
    console.log('Select all nodes:', allNodeIds);
  };

  const handleDeselectAll = () => {
    clearSelection();
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedNodes.length === 0) return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'c':
            e.preventDefault();
            handleCopyNodes();
            break;
          case 'a':
            e.preventDefault();
            handleSelectAll();
            break;
          case 'g':
            e.preventDefault();
            handleGroupNodes();
            break;
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteNodes();
      }

      if (e.key === 'Escape') {
        handleDeselectAll();
      }

      // Arrow keys for movement
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const direction = e.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right';
        handleMoveNodes(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodes]);

  if (selectedNodes.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border p-3 z-50">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Square size={16} className="text-blue-500" />
          <span className="text-sm font-medium text-gray-700">
            {selectedNodes.length} selected
          </span>
        </div>

        <div className="w-px h-6 bg-gray-200" />

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyNodes}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            title="Copy (Ctrl+C)"
          >
            <Copy size={16} />
            Copy
          </button>

          <button
            onClick={handleDeleteNodes}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
            title="Delete (Del)"
          >
            <Trash2 size={16} />
            Delete
          </button>

          {selectedNodes.length >= 2 && (
            <button
              onClick={handleGroupNodes}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
              title="Group (Ctrl+G)"
            >
              <Group size={16} />
              Group
            </button>
          )}

          <button
            onClick={handleDeselectAll}
            className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            title="Deselect (Esc)"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};