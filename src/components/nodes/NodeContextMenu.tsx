/**
 * Node Context Menu - n8n style right-click menu
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Copy,
  Trash2,
  Settings,
  Pin,
  PinOff,
  Power,
  PowerOff,
  Eye,
  EyeOff,
  Edit3,
  Clipboard,
  Scissors,
  Download,
  ExternalLink,
  HelpCircle,
  MoreHorizontal,
  ChevronRight,
  StickyNote,
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface ContextMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
  action: () => void;
}

interface NodeContextMenuProps {
  nodeId: string;
  position: { x: number; y: number };
  onClose: () => void;
  onExecuteNode: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onCopyNode: (nodeId: string) => void;
  onCutNode: (nodeId: string) => void;
  onPinData: (nodeId: string) => void;
  onToggleDisable: (nodeId: string) => void;
  onOpenConfig: (nodeId: string) => void;
  onRenameNode: (nodeId: string) => void;
  onAddAnnotation?: (nodeId: string) => void;
}

const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
  nodeId,
  position,
  onClose,
  onExecuteNode,
  onDuplicateNode,
  onDeleteNode,
  onCopyNode,
  onCutNode,
  onPinData,
  onToggleDisable,
  onOpenConfig,
  onRenameNode,
  onAddAnnotation,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { nodes, pinnedData } = useWorkflowStore();

  const node = nodes.find(n => n.id === nodeId);
  const isPinned = pinnedData?.[nodeId] !== undefined;
  const isDisabled = node?.data?.disabled === true;
  const hasAnnotation = !!(node?.data as { annotation?: string })?.annotation;

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position if menu would go off-screen
  const adjustedPosition = useCallback(() => {
    const menuWidth = 220;
    const menuHeight = 380;
    const padding = 10;

    let x = position.x;
    let y = position.y;

    if (x + menuWidth > window.innerWidth - padding) {
      x = window.innerWidth - menuWidth - padding;
    }
    if (y + menuHeight > window.innerHeight - padding) {
      y = window.innerHeight - menuHeight - padding;
    }

    return { x: Math.max(padding, x), y: Math.max(padding, y) };
  }, [position]);

  const menuItems: ContextMenuItem[] = [
    {
      id: 'execute',
      label: 'Execute Node',
      icon: <Play size={16} />,
      shortcut: '⌘Enter',
      action: () => {
        onExecuteNode(nodeId);
        onClose();
      },
    },
    {
      id: 'config',
      label: 'Open Settings',
      icon: <Settings size={16} />,
      shortcut: 'Enter',
      action: () => {
        onOpenConfig(nodeId);
        onClose();
      },
    },
    {
      id: 'divider1',
      label: '',
      icon: null,
      divider: true,
      action: () => {},
    },
    {
      id: 'rename',
      label: 'Rename',
      icon: <Edit3 size={16} />,
      shortcut: 'F2',
      action: () => {
        onRenameNode(nodeId);
        onClose();
      },
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: <Copy size={16} />,
      shortcut: '⌘D',
      action: () => {
        onDuplicateNode(nodeId);
        onClose();
      },
    },
    {
      id: 'copy',
      label: 'Copy',
      icon: <Clipboard size={16} />,
      shortcut: '⌘C',
      action: () => {
        onCopyNode(nodeId);
        onClose();
      },
    },
    {
      id: 'cut',
      label: 'Cut',
      icon: <Scissors size={16} />,
      shortcut: '⌘X',
      action: () => {
        onCutNode(nodeId);
        onClose();
      },
    },
    {
      id: 'divider2',
      label: '',
      icon: null,
      divider: true,
      action: () => {},
    },
    {
      id: 'pin',
      label: isPinned ? 'Unpin Data' : 'Pin Data',
      icon: isPinned ? <PinOff size={16} /> : <Pin size={16} />,
      shortcut: 'P',
      action: () => {
        onPinData(nodeId);
        onClose();
      },
    },
    {
      id: 'disable',
      label: isDisabled ? 'Enable Node' : 'Disable Node',
      icon: isDisabled ? <Power size={16} /> : <PowerOff size={16} />,
      shortcut: 'D',
      action: () => {
        onToggleDisable(nodeId);
        onClose();
      },
    },
    {
      id: 'annotation',
      label: hasAnnotation ? 'Edit Note' : 'Add Note',
      icon: <StickyNote size={16} className={hasAnnotation ? 'text-amber-500' : ''} />,
      shortcut: 'N',
      action: () => {
        if (onAddAnnotation) {
          onAddAnnotation(nodeId);
        }
        onClose();
      },
    },
    {
      id: 'divider3',
      label: '',
      icon: null,
      divider: true,
      action: () => {},
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 size={16} />,
      shortcut: 'Del',
      danger: true,
      action: () => {
        onDeleteNode(nodeId);
        onClose();
      },
    },
  ];

  const pos = adjustedPosition();

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-white rounded-lg shadow-2xl border border-gray-200 py-1 min-w-[220px] animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: pos.x,
        top: pos.y,
      }}
    >
      {/* Header with node name */}
      <div className="px-3 py-2 border-b border-gray-100">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {node?.data?.label || node?.data?.type || 'Node'}
        </p>
      </div>

      {/* Menu items */}
      <div className="py-1">
        {menuItems.map((item) => {
          if (item.divider) {
            return <div key={item.id} className="my-1 border-t border-gray-100" />;
          }

          return (
            <button
              key={item.id}
              onClick={item.action}
              disabled={item.disabled}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                item.danger
                  ? 'text-red-600 hover:bg-red-50'
                  : item.disabled
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className={item.danger ? 'text-red-500' : 'text-gray-500'}>
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.shortcut && (
                <kbd className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  {item.shortcut}
                </kbd>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default NodeContextMenu;
