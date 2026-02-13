import React, { useState, useEffect, useCallback } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { notificationService } from '../../services/NotificationService';

export default function KeyboardShortcuts() {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const {
    saveWorkflow,
    exportWorkflow,
    clearExecution,
    darkMode,
    setSelectedNode,
    selectedNode,
    nodes,
    edges,
    setNodes,
    setEdges,
    undo,
    redo,
    undoHistory,
    redoHistory
  } = useWorkflowStore();

  // Derived state for undo/redo availability
  const canUndo = undoHistory.length > 0;
  const canRedo = redoHistory.length > 0;

  // Helper function to show toast notifications
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    // Use notification service instead of creating DOM elements
    switch (type) {
      case 'success':
        notificationService.success('Success', message);
        break;
      case 'error':
        notificationService.error('Error', message);
        break;
      case 'info':
        notificationService.info('Info', message);
        break;
    }
  }, []);

  // Get copied node from localStorage
  const getCopiedNode = useCallback(() => {
    try {
      const stored = localStorage.getItem('copiedNode');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  // Get search input element
  const getSearchInput = useCallback(() => {
    return document.querySelector('input[type="search"]') as HTMLInputElement;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show shortcuts panel
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
        return;
      }

      // Save workflow
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveWorkflow();
        showToast('Workflow saved!', 'success');
        return;
      }

      // Export workflow
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        exportWorkflow();
        showToast('Workflow exported!', 'success');
        return;
      }

      // Clear execution
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        clearExecution();
        showToast('Execution cleared!', 'info');
        return;
      }

      // Delete selected node
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNode) {
          e.preventDefault();
          setNodes(nodes.filter(n => n.id !== selectedNode.id));
          setEdges(edges.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
          setSelectedNode(null);
          showToast('Node deleted!', 'info');
        }
        return;
      }

      // Select all nodes
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        // Implementation for select all
        showToast('All nodes selected!', 'info');
        return;
      }

      // Copy node
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedNode) {
          e.preventDefault();
          localStorage.setItem('copiedNode', JSON.stringify(selectedNode));
          showToast('Node copied!', 'info');
        }
        return;
      }

      // Paste node
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        const copiedNode = getCopiedNode();
        if (copiedNode) {
          try {
            const newNode = {
              ...copiedNode,
              id: `${copiedNode.id}_copy_${Date.now()}`,
              position: {
                x: copiedNode.position.x + 50,
                y: copiedNode.position.y + 50,
              },
            };
            setNodes([...nodes, newNode]);
            showToast('Node pasted!', 'success');
          } catch (error) {
            showToast('Error pasting node!', 'error');
          }
        }
        return;
      }

      // Redo (must check before undo since it includes Shift)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (canRedo) {
          redo();
          showToast('Action redone', 'success');
        } else {
          showToast('Nothing to redo', 'info');
        }
        return;
      }

      // Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (canUndo) {
          undo();
          showToast('Action undone', 'success');
        } else {
          showToast('Nothing to undo', 'info');
        }
        return;
      }

      // Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = getSearchInput();
        if (searchInput) {
          searchInput.focus();
          showToast('Search focused!', 'info');
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, setNodes, setEdges, setSelectedNode, selectedNode, saveWorkflow, exportWorkflow, clearExecution, showToast, getCopiedNode, getSearchInput, undo, redo, canUndo, canRedo]);

  const shortcuts = [
    { key: 'Ctrl/Cmd + S', description: 'Save workflow' },
    { key: 'Ctrl/Cmd + E', description: 'Export workflow' },
    { key: 'Ctrl/Cmd + R', description: 'Clear execution' },
    { key: 'Delete/Backspace', description: 'Delete selected node' },
    { key: 'Ctrl/Cmd + A', description: 'Select all nodes' },
    { key: 'Ctrl/Cmd + C', description: 'Copy selected node' },
    { key: 'Ctrl/Cmd + V', description: 'Paste copied node' },
    { key: 'Ctrl/Cmd + Z', description: 'Undo' },
    { key: 'Ctrl/Cmd + Shift + Z', description: 'Redo' },
    { key: 'Ctrl/Cmd + F', description: 'Focus search' },
    { key: '?', description: 'Show/hide shortcuts' },
  ];

  if (!showShortcuts) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-md w-full mx-4`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Keyboard Shortcuts</h2>
          <button
            onClick={() => setShowShortcuts(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm">{shortcut.description}</span>
              <kbd className={`px-2 py-1 rounded text-xs font-mono ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <p className="text-sm text-gray-500 text-center">
            Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">?</kbd> anytime to toggle this panel
          </p>
        </div>
      </div>
    </div>
  );
}

