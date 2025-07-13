import React from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Copy, Trash2, Group, Square, ClipboardPaste, AlignLeft, AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter } from 'lucide-react';

export const MultiSelectManager: React.FC = () => {
  const {
    nodes,
    selectedNodes,
    setSelectedNodes,
    setNodes,
    darkMode,
    copySelectedNodes,
    pasteNodes,
    deleteSelectedNodes,
    groupSelectedNodes,
    alignNodes,
    distributeNodes,
  } = useWorkflowStore();

  const handleCopyNodes = () => {
    if (selectedNodes.length === 0) return;
    copySelectedNodes();
  };

  const handleDeleteNodes = () => {
    if (selectedNodes.length === 0) return;
    deleteSelectedNodes();
  };

  const handleGroupNodes = () => {
    if (selectedNodes.length < 2) return;
    groupSelectedNodes();
  };

  const handlePasteNodes = () => {
    pasteNodes();
  };

  const handleAlign = (dir: 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY') => {
    alignNodes(dir);
  };

  const handleDistribute = (o: 'horizontal' | 'vertical') => {
    distributeNodes(o);
  };

  const handleMoveNodes = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (selectedNodes.length === 0) return;

    const offset = {
      up: { x: 0, y: -10 },
      down: { x: 0, y: 10 },
      left: { x: -10, y: 0 },
      right: { x: 10, y: 0 }
    }[direction];

    setNodes(
      nodes.map((n: any) =>
        selectedNodes.some((sn: any) => sn.id === n.id)
          ? { ...n, position: { x: n.position.x + offset.x, y: n.position.y + offset.y } }
          : n
      )
    );
  };

  const handleSelectAll = () => {
    setSelectedNodes(nodes);
  };

  const handleDeselectAll = () => {
    setSelectedNodes([]);
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
          case 'v':
            e.preventDefault();
            handlePasteNodes();
            break;
          case 'a':
            e.preventDefault();
            handleSelectAll();
            break;
          case 'g':
            e.preventDefault();
            handleGroupNodes();
            break;
          case 'l':
            e.preventDefault();
            handleAlign('left');
            break;
          case 'h':
            e.preventDefault();
            handleDistribute('horizontal');
            break;
          case 'd':
            e.preventDefault();
            handleDistribute('vertical');
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
    <div
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 rounded-lg shadow-lg border p-3 z-50 ${
        darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Square size={16} className="text-blue-500" />
          <span className={`text-sm font-medium ${darkMode ? 'text-gray-100' : 'text-gray-700'}`}>
            {selectedNodes.length} selected
          </span>
        </div>

        <div className={`w-px h-6 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`} />

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyNodes}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              darkMode ? 'bg-blue-700 text-white hover:bg-blue-600' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
            title="Copy (Ctrl+C)"
          >
            <Copy size={16} />
            Copy
          </button>

          <button
            onClick={handlePasteNodes}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              darkMode ? 'bg-blue-700 text-white hover:bg-blue-600' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
            title="Paste (Ctrl+V)"
          >
            <ClipboardPaste size={16} />
            Paste
          </button>

          {selectedNodes.length >= 2 && (
            <>
              <button
                onClick={() => handleAlign('left')}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
                title="Align Left (Ctrl+L)"
              >
                <AlignLeft size={16} />
              </button>
              <button
                onClick={() => handleDistribute('horizontal')}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
                title="Distribute H (Ctrl+H)"
              >
                <AlignHorizontalJustifyCenter size={16} />
              </button>
              <button
                onClick={() => handleDistribute('vertical')}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
                title="Distribute V (Ctrl+D)"
              >
                <AlignVerticalJustifyCenter size={16} />
              </button>
            </>
          )}

          <button
            onClick={handleDeleteNodes}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              darkMode ? 'bg-red-700 text-white hover:bg-red-600' : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
            title="Delete (Del)"
          >
            <Trash2 size={16} />
            Delete
          </button>

          {selectedNodes.length >= 2 && (
            <button
              onClick={handleGroupNodes}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                darkMode ? 'bg-green-700 text-white hover:bg-green-600' : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
              title="Group (Ctrl+G)"
            >
              <Group size={16} />
              Group
            </button>
          )}

          <button
            onClick={handleDeselectAll}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Deselect (Esc)"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};