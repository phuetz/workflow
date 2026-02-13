/**
 * Node Rename Overlay
 * Inline rename with double-click (like n8n)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Check, X, Edit3 } from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface NodeRenameOverlayProps {
  nodeId: string;
  currentName: string;
  position: { x: number; y: number };
  onClose: () => void;
  onRename: (newName: string) => void;
}

const NodeRenameOverlay: React.FC<NodeRenameOverlayProps> = ({
  nodeId,
  currentName,
  position,
  onClose,
  onRename,
}) => {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { nodes } = useWorkflowStore();

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const validateName = useCallback((newName: string): boolean => {
    if (!newName.trim()) {
      setError('Name cannot be empty');
      return false;
    }
    if (newName.length > 50) {
      setError('Name is too long (max 50 characters)');
      return false;
    }
    // Check for duplicate names (excluding current node)
    const isDuplicate = nodes.some(
      n => n.id !== nodeId && n.data?.label?.toLowerCase() === newName.toLowerCase()
    );
    if (isDuplicate) {
      setError('A node with this name already exists');
      return false;
    }
    setError(null);
    return true;
  }, [nodes, nodeId]);

  const handleSubmit = useCallback(() => {
    if (validateName(name)) {
      onRename(name.trim());
      onClose();
    }
  }, [name, validateName, onRename, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [handleSubmit, onClose]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (error) {
      validateName(newName);
    }
  }, [error, validateName]);

  return (
    <div
      className="fixed z-[200] animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: Math.min(position.x - 100, window.innerWidth - 280),
        top: Math.max(position.y - 30, 10),
      }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[-1]"
        onClick={onClose}
      />

      {/* Rename input panel */}
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden w-64">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
          <Edit3 size={14} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Rename Node</span>
        </div>

        {/* Input */}
        <div className="p-3">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors ${
                error
                  ? 'border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              }`}
              placeholder="Enter node name..."
            />
            {error && (
              <p className="mt-1 text-xs text-red-500">{error}</p>
            )}
          </div>

          {/* Suggestions */}
          <div className="mt-2 text-xs text-gray-500">
            <p>Press Enter to save, Escape to cancel</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-3 py-2 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1"
          >
            <X size={14} />
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!!error}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
              error
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Check size={14} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeRenameOverlay;
