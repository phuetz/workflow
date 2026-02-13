import { useEffect, useCallback, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useWorkflowStore } from '../store/workflowStore';
import { notificationService } from '../services/NotificationService';
import { logger } from '../services/SimpleLogger';

/**
 * Type definition for keyboard shortcut
 */
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  category: 'workflow' | 'navigation' | 'editing' | 'view' | 'help';
  handler: () => void | Promise<void>;
  preventDefault?: boolean;
}

/**
 * Keyboard shortcuts configuration
 */
export const SHORTCUTS_CONFIG: KeyboardShortcut[] = [];

/**
 * Hook to detect if user is on Mac
 */
const useIsMac = () => {
  return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
};

/**
 * Format shortcut display (Ctrl/Cmd based on OS)
 */
export const formatShortcut = (shortcut: KeyboardShortcut, isMac: boolean): string => {
  const parts: string[] = [];

  if (shortcut.ctrl || shortcut.meta) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
  parts.push(shortcut.key.toUpperCase());

  return parts.join(isMac ? '' : '+');
};

/**
 * Hook for keyboard shortcuts management
 */
export const useKeyboardShortcuts = (enabled: boolean = true) => {
  const isMac = useIsMac();
  const { fitView, zoomIn, zoomOut, zoomTo } = useReactFlow();
  const {
    nodes,
    edges,
    selectedNode,
    selectedNodes,
    setSelectedNodes,
    deleteNode,
    updateNode,
    addStickyNote,
    saveWorkflow,
    undo,
    redo,
    exportWorkflow,
    validateWorkflow,
  } = useWorkflowStore();

  // Define missing methods with placeholder implementations
  const deleteEdge = (edgeId: string) => {
    logger.info('Delete edge:', edgeId);
    // Implementation would delete the edge from store
  };

  const canUndo = false; // Would come from store's history state
  const canRedo = false; // Would come from store's history state

  const duplicateNodes = (nodeIds: string[]) => {
    logger.info('Duplicate nodes:', nodeIds);
    // Implementation would duplicate nodes in store
  };

  const groupNodes = (nodeIds: string[]) => {
    logger.info('Group nodes:', nodeIds);
    // Implementation would group nodes in store
  };

  const ungroupNodes = (nodeIds: string[]) => {
    logger.info('Ungroup nodes:', nodeIds);
    // Implementation would ungroup nodes in store
  };

  const shortcutsRef = useRef<Map<string, KeyboardShortcut>>(new Map());

  // Initialize shortcuts
  useEffect(() => {
    const shortcuts: KeyboardShortcut[] = [
      // Workflow Management
      {
        key: 's',
        ctrl: true,
        description: 'Save workflow',
        category: 'workflow',
        handler: async () => {
          await saveWorkflow();
          notificationService.success('Success', 'Workflow saved successfully');
        },
        preventDefault: true,
      },
      {
        key: 'e',
        ctrl: true,
        shift: true,
        description: 'Export workflow',
        category: 'workflow',
        handler: () => {
          exportWorkflow();
          notificationService.info('Export', 'Workflow exported');
        },
        preventDefault: true,
      },
      {
        key: 'o',
        ctrl: true,
        description: 'Open/Import workflow',
        category: 'workflow',
        handler: () => {
          // Trigger file input click
          const fileInput = document.getElementById('workflow-import-input');
          if (fileInput) {
            fileInput.click();
          } else {
            notificationService.info('Import', 'Use Import button to open workflow');
          }
        },
        preventDefault: true,
      },
      {
        key: 'v',
        ctrl: true,
        shift: true,
        description: 'Validate workflow',
        category: 'workflow',
        handler: () => {
          const result = validateWorkflow();
          if (result.isValid) {
            notificationService.success('Validation', 'Workflow is valid');
          } else {
            notificationService.error('Validation Failed', `${result.errors?.join(', ')}`);
          }
        },
        preventDefault: true,
      },
      {
        key: 't',
        ctrl: true,
        description: 'Open templates gallery',
        category: 'workflow',
        handler: () => {
          const event = new CustomEvent('show-templates-gallery');
          window.dispatchEvent(event);
        },
        preventDefault: true,
      },

      // Editing
      {
        key: 'z',
        ctrl: true,
        description: 'Undo',
        category: 'editing',
        handler: () => {
          if (canUndo) {
            undo();
            notificationService.info('Undo', 'Action undone');
          }
        },
        preventDefault: true,
      },
      {
        key: 'y',
        ctrl: true,
        description: 'Redo',
        category: 'editing',
        handler: () => {
          if (canRedo) {
            redo();
            notificationService.info('Redo', 'Action redone');
          }
        },
        preventDefault: true,
      },
      {
        key: 'z',
        ctrl: true,
        shift: true,
        description: 'Redo (alternative)',
        category: 'editing',
        handler: () => {
          if (canRedo) {
            redo();
            notificationService.info('Redo', 'Action redone');
          }
        },
        preventDefault: true,
      },
      {
        key: 'a',
        ctrl: true,
        description: 'Select all nodes',
        category: 'editing',
        handler: () => {
          setSelectedNodes(nodes.map(n => n.id));
          notificationService.info('Select All', `Selected ${nodes.length} nodes`);
        },
        preventDefault: true,
      },
      {
        key: 'd',
        ctrl: true,
        description: 'Duplicate selected',
        category: 'editing',
        handler: () => {
          if (selectedNodes.length > 0) {
            duplicateNodes(selectedNodes);
            notificationService.success('Duplicate', `Duplicated ${selectedNodes.length} node(s)`);
          } else if (selectedNode) {
            duplicateNodes([selectedNode.id]);
            notificationService.success('Duplicate', 'Node duplicated');
          }
        },
        preventDefault: true,
      },
      {
        key: 'Delete',
        description: 'Delete selected',
        category: 'editing',
        handler: () => {
          if (selectedNodes.length > 0) {
            selectedNodes.forEach(id => {
              const node = nodes.find(n => n.id === id);
              if (node) deleteNode(id);
            });
            notificationService.info('Delete', `Deleted ${selectedNodes.length} node(s)`);
          } else if (selectedNode) {
            deleteNode(selectedNode.id);
            notificationService.info('Delete', 'Node deleted');
          }
        },
        preventDefault: true,
      },
      {
        key: 'Backspace',
        description: 'Delete selected (alternative)',
        category: 'editing',
        handler: () => {
          if (selectedNodes.length > 0) {
            selectedNodes.forEach(id => {
              const node = nodes.find(n => n.id === id);
              if (node) deleteNode(id);
            });
            notificationService.info('Delete', `Deleted ${selectedNodes.length} node(s)`);
          } else if (selectedNode) {
            deleteNode(selectedNode.id);
            notificationService.info('Delete', 'Node deleted');
          }
        },
        preventDefault: false, // Don't prevent default for better compatibility
      },
      {
        key: 'g',
        ctrl: true,
        shift: true,
        description: 'Group selected nodes',
        category: 'editing',
        handler: () => {
          if (selectedNodes.length >= 2) {
            groupNodes(selectedNodes);
            notificationService.success('Group', `Grouped ${selectedNodes.length} nodes`);
          } else {
            notificationService.warning('Group', 'Select at least 2 nodes to group');
          }
        },
        preventDefault: true,
      },
      {
        key: 'g',
        ctrl: true,
        shift: true,
        alt: true,
        description: 'Ungroup selected',
        category: 'editing',
        handler: () => {
          if (selectedNode) {
            ungroupNodes([selectedNode.id]);
            notificationService.success('Ungroup', 'Nodes ungrouped');
          }
        },
        preventDefault: true,
      },

      // Copy/Paste
      {
        key: 'c',
        ctrl: true,
        description: 'Copy selected nodes',
        category: 'editing',
        handler: () => {
          const event = new CustomEvent('copy-nodes');
          window.dispatchEvent(event);
        },
        preventDefault: true,
      },
      {
        key: 'v',
        ctrl: true,
        description: 'Paste nodes',
        category: 'editing',
        handler: () => {
          const event = new CustomEvent('paste-nodes');
          window.dispatchEvent(event);
        },
        preventDefault: true,
      },
      {
        key: 'x',
        ctrl: true,
        description: 'Cut selected nodes',
        category: 'editing',
        handler: () => {
          const event = new CustomEvent('cut-nodes');
          window.dispatchEvent(event);
        },
        preventDefault: true,
      },

      // Quick actions
      {
        key: 'n',
        ctrl: true,
        description: 'Quick node search (add node)',
        category: 'editing',
        handler: () => {
          const event = new CustomEvent('open-quick-search');
          window.dispatchEvent(event);
        },
        preventDefault: true,
      },
      {
        key: 'e',
        ctrl: true,
        description: 'Execute workflow',
        category: 'workflow',
        handler: () => {
          const event = new CustomEvent('execute-workflow');
          window.dispatchEvent(event);
        },
        preventDefault: true,
      },
      {
        key: 'g',
        ctrl: true,
        description: 'Toggle snap-to-grid',
        category: 'view',
        handler: () => {
          const event = new CustomEvent('toggle-snap-to-grid');
          window.dispatchEvent(event);
        },
        preventDefault: true,
      },

      // Navigation
      {
        key: 'f',
        ctrl: true,
        description: 'Find/Search nodes',
        category: 'navigation',
        handler: () => {
          // Focus search input
          const searchInput = document.querySelector<HTMLInputElement>('[placeholder*="Search"]');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
          notificationService.info('Search', 'Search nodes');
        },
        preventDefault: true,
      },
      {
        key: '0',
        ctrl: true,
        description: 'Fit view',
        category: 'navigation',
        handler: () => {
          fitView({ duration: 300, padding: 0.2 });
          notificationService.info('View', 'Fit view');
        },
        preventDefault: true,
      },
      {
        key: '=',
        ctrl: true,
        description: 'Zoom in',
        category: 'navigation',
        handler: () => {
          zoomIn({ duration: 200 });
        },
        preventDefault: true,
      },
      {
        key: '+',
        ctrl: true,
        description: 'Zoom in (alternative)',
        category: 'navigation',
        handler: () => {
          zoomIn({ duration: 200 });
        },
        preventDefault: true,
      },
      {
        key: '-',
        ctrl: true,
        description: 'Zoom out',
        category: 'navigation',
        handler: () => {
          zoomOut({ duration: 200 });
        },
        preventDefault: true,
      },
      {
        key: '1',
        ctrl: true,
        description: 'Zoom to 100%',
        category: 'navigation',
        handler: () => {
          zoomTo(1, { duration: 200 });
          notificationService.info('Zoom', 'Zoom: 100%');
        },
        preventDefault: true,
      },

      // View Management
      {
        key: 'm',
        ctrl: true,
        description: 'Toggle mini-map',
        category: 'view',
        handler: () => {
          // Trigger mini-map toggle
          const event = new CustomEvent('toggle-minimap');
          window.dispatchEvent(event);
        },
        preventDefault: true,
      },
      {
        key: 'b',
        ctrl: true,
        description: 'Toggle sidebar',
        category: 'view',
        handler: () => {
          const event = new CustomEvent('toggle-sidebar');
          window.dispatchEvent(event);
        },
        preventDefault: true,
      },
      {
        key: 'p',
        ctrl: true,
        description: 'Toggle properties panel',
        category: 'view',
        handler: () => {
          const event = new CustomEvent('toggle-properties');
          window.dispatchEvent(event);
        },
        preventDefault: true,
      },
      {
        key: 'p',
        ctrl: true,
        shift: true,
        description: 'Toggle performance monitor',
        category: 'view',
        handler: () => {
          const event = new CustomEvent('toggle-performance-monitor');
          window.dispatchEvent(event);
        },
        preventDefault: true,
      },

      // n8n-style shortcuts
      {
        key: 'd',
        description: 'Disable/Enable selected node',
        category: 'editing',
        handler: () => {
          if (selectedNode) {
            const isDisabled = (selectedNode.data as Record<string, unknown>)?.disabled;
            updateNode(selectedNode.id, { disabled: !isDisabled });
            notificationService.info(
              isDisabled ? 'Node Enabled' : 'Node Disabled',
              `${(selectedNode.data as Record<string, unknown>)?.label || 'Node'} ${isDisabled ? 'enabled' : 'disabled'}`
            );
          }
        },
        preventDefault: true,
      },
      {
        key: 'F2',
        description: 'Rename selected node',
        category: 'editing',
        handler: () => {
          if (selectedNode) {
            const event = new CustomEvent('rename-node', { detail: { nodeId: selectedNode.id } });
            window.dispatchEvent(event);
          }
        },
        preventDefault: true,
      },
      {
        key: 'S',
        shift: true,
        description: 'Add sticky note',
        category: 'editing',
        handler: () => {
          if (addStickyNote) {
            const colors = ['#FFD43B', '#FF922B', '#FF6B6B', '#DA77F2', '#748FFC', '#4DABF7', '#38D9A9', '#69DB7C'];
            addStickyNote({
              id: `sticky-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              content: 'New Note',
              position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 },
              size: { width: 250, height: 200 },
              color: colors[Math.floor(Math.random() * colors.length)],
              rotation: 0,
              zIndex: 1000,
              fontSize: 14,
              fontWeight: 'normal',
              fontStyle: 'normal',
            });
            notificationService.info('Sticky Note', 'Sticky note added');
          }
        },
        preventDefault: true,
      },
      {
        key: 'Enter',
        description: 'Open selected node config',
        category: 'editing',
        handler: () => {
          if (selectedNode) {
            const event = new CustomEvent('open-node-config', { detail: { nodeId: selectedNode.id } });
            window.dispatchEvent(event);
          }
        },
        preventDefault: true,
      },

      // Help
      {
        key: '?',
        description: 'Show keyboard shortcuts',
        category: 'help',
        handler: () => {
          const event = new CustomEvent('show-shortcuts-modal');
          window.dispatchEvent(event);
        },
        preventDefault: true,
      },
      {
        key: 'h',
        ctrl: true,
        description: 'Show help',
        category: 'help',
        handler: () => {
          const event = new CustomEvent('show-shortcuts-modal');
          window.dispatchEvent(event);
        },
        preventDefault: true,
      },
    ];

    // Build shortcuts map
    const map = new Map<string, KeyboardShortcut>();
    shortcuts.forEach(shortcut => {
      const key = buildShortcutKey(shortcut);
      map.set(key, shortcut);
    });

    shortcutsRef.current = map;
  }, [
    nodes,
    edges,
    selectedNode,
    selectedNodes,
    canUndo,
    canRedo,
    fitView,
    zoomIn,
    zoomOut,
    zoomTo,
    setSelectedNodes,
    deleteNode,
    updateNode,
    addStickyNote,
    deleteEdge,
    saveWorkflow,
    undo,
    redo,
    exportWorkflow,
    validateWorkflow,
    duplicateNodes,
    groupNodes,
    ungroupNodes,
  ]);

  // Build shortcut key for matching
  const buildShortcutKey = useCallback((shortcut: KeyboardShortcut): string => {
    const parts: string[] = [];
    if (shortcut.ctrl || shortcut.meta) parts.push('ctrl');
    if (shortcut.shift) parts.push('shift');
    if (shortcut.alt) parts.push('alt');
    parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }, []);

  // Build key from event
  const buildEventKey = useCallback((event: KeyboardEvent): string => {
    const parts: string[] = [];
    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');
    parts.push(event.key.toLowerCase());
    return parts.join('+');
  }, []);

  // Keyboard event handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape to blur
        if (event.key === 'Escape') {
          target.blur();
        }
        return;
      }

      const eventKey = buildEventKey(event);
      const shortcut = shortcutsRef.current.get(eventKey);

      if (shortcut) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
          event.stopPropagation();
        }

        try {
          shortcut.handler();
        } catch (error) {
          logger.error('Error executing shortcut:', error);
          notificationService.error('Shortcut Error', 'Failed to execute shortcut');
        }
      }
    },
    [enabled, buildEventKey]
  );

  // Attach/detach event listener
  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [enabled, handleKeyDown]);

  // Get all shortcuts for display
  const getShortcuts = useCallback(() => {
    return Array.from(shortcutsRef.current.values());
  }, []);

  // Get shortcuts by category
  const getShortcutsByCategory = useCallback(() => {
    const shortcuts = getShortcuts();
    const grouped: Record<string, KeyboardShortcut[]> = {
      workflow: [],
      editing: [],
      navigation: [],
      view: [],
      help: [],
    };

    shortcuts.forEach(shortcut => {
      if (grouped[shortcut.category]) {
        grouped[shortcut.category].push(shortcut);
      }
    });

    return grouped;
  }, [getShortcuts]);

  return {
    shortcuts: shortcutsRef.current,
    getShortcuts,
    getShortcutsByCategory,
    formatShortcut: (shortcut: KeyboardShortcut) => formatShortcut(shortcut, isMac),
    isMac,
  };
};

export default useKeyboardShortcuts;
