/**
 * NodeAnnotation - Component for adding/editing notes on workflow nodes
 * Shows a sticky-note badge on nodes with annotations
 * Clicking opens an edit popover
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StickyNote, X, Check, Edit2 } from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface NodeAnnotationProps {
  nodeId: string;
  annotation?: string;
  showBadgeOnly?: boolean;
  onOpen?: () => void;
}

export const NodeAnnotation: React.FC<NodeAnnotationProps> = ({
  nodeId,
  annotation,
  showBadgeOnly = false,
  onOpen,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(annotation || '');
  const [showTooltip, setShowTooltip] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { updateNode } = useWorkflowStore();

  // Sync editValue when annotation changes externally
  useEffect(() => {
    setEditValue(annotation || '');
  }, [annotation]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Close popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        handleCancel();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isEditing]);

  const handleSave = useCallback(() => {
    const trimmedValue = editValue.trim();
    updateNode(nodeId, { annotation: trimmedValue || undefined });
    setIsEditing(false);
  }, [nodeId, editValue, updateNode]);

  const handleCancel = useCallback(() => {
    setEditValue(annotation || '');
    setIsEditing(false);
  }, [annotation]);

  const handleOpen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    onOpen?.();
  }, [onOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  // If no annotation and badge only mode, don't render
  if (!annotation && showBadgeOnly) {
    return null;
  }

  return (
    <div className="relative">
      {/* Badge - shows when there is an annotation */}
      {annotation && (
        <button
          onClick={handleOpen}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-400 hover:bg-amber-500 flex items-center justify-center shadow-md transition-all duration-200 hover:scale-110 z-20"
          title="View/Edit annotation"
          aria-label="Node annotation"
        >
          <StickyNote size={12} className="text-amber-900" />
        </button>
      )}

      {/* Tooltip preview on hover */}
      {showTooltip && annotation && !isEditing && (
        <div className="absolute -top-14 right-0 bg-amber-50 border border-amber-200 rounded-lg shadow-lg px-3 py-2 max-w-48 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <p className="text-xs text-amber-900 line-clamp-2">{annotation}</p>
          <div className="absolute -bottom-1.5 right-3 w-3 h-3 bg-amber-50 border-r border-b border-amber-200 transform rotate-45" />
        </div>
      )}

      {/* Edit Popover */}
      {isEditing && (
        <div
          ref={popoverRef}
          className="absolute -top-2 right-6 bg-white rounded-lg shadow-2xl border border-gray-200 w-64 z-50 animate-in fade-in slide-in-from-right-2 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-amber-50 rounded-t-lg">
            <div className="flex items-center gap-2">
              <StickyNote size={14} className="text-amber-600" />
              <span className="text-sm font-medium text-amber-900">Note</span>
            </div>
            <button
              onClick={handleCancel}
              className="p-1 hover:bg-amber-100 rounded transition-colors"
              aria-label="Close"
            >
              <X size={14} className="text-amber-700" />
            </button>
          </div>

          {/* Content */}
          <div className="p-3">
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a note to this node..."
              className="w-full h-24 text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
              maxLength={500}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-400">
                {editValue.length}/500
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors flex items-center gap-1"
                >
                  <Check size={12} />
                  Save
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Press Ctrl+Enter to save
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * AddAnnotationButton - Button to add annotation when none exists
 * Used in context menus and toolbars
 */
interface AddAnnotationButtonProps {
  nodeId: string;
  onAdd?: () => void;
}

export const AddAnnotationButton: React.FC<AddAnnotationButtonProps> = ({
  nodeId,
  onAdd,
}) => {
  const { updateNode, nodes } = useWorkflowStore();
  const node = nodes.find(n => n.id === nodeId);
  const hasAnnotation = !!(node?.data as { annotation?: string })?.annotation;

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasAnnotation) {
      // Initialize with empty string to trigger edit mode
      updateNode(nodeId, { annotation: '' });
    }
    onAdd?.();
  }, [nodeId, hasAnnotation, updateNode, onAdd]);

  return (
    <button
      onClick={handleClick}
      className="p-1.5 rounded hover:bg-amber-100 text-gray-500 hover:text-amber-600 transition-colors"
      title={hasAnnotation ? 'Edit note' : 'Add note'}
    >
      {hasAnnotation ? (
        <Edit2 size={14} />
      ) : (
        <StickyNote size={14} />
      )}
    </button>
  );
};

export default NodeAnnotation;
