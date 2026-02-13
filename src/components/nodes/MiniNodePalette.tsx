/**
 * Mini Node Palette
 * Compact floating palette for quick node access (like n8n)
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Plus,
  Zap,
  Code,
  Mail,
  Database,
  GitBranch,
  Clock,
  Webhook,
  Filter,
  Merge,
  ChevronUp,
  ChevronDown,
  Star,
  GripVertical,
} from 'lucide-react';
import { nodeTypes } from '../../data/nodeTypes';

interface MiniNodePaletteProps {
  onAddNode: (nodeType: string, position?: { x: number; y: number }) => void;
  position?: { x: number; y: number };
}

interface QuickNode {
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  category: string;
}

// Most commonly used nodes
const QUICK_NODES: QuickNode[] = [
  { type: 'webhook', label: 'Webhook', icon: <Webhook size={18} />, color: '#8b5cf6', category: 'trigger' },
  { type: 'schedule', label: 'Schedule', icon: <Clock size={18} />, color: '#f59e0b', category: 'trigger' },
  { type: 'http-request', label: 'HTTP', icon: <Zap size={18} />, color: '#3b82f6', category: 'action' },
  { type: 'code', label: 'Code', icon: <Code size={18} />, color: '#10b981', category: 'action' },
  { type: 'condition', label: 'IF', icon: <GitBranch size={18} />, color: '#f59e0b', category: 'flow' },
  { type: 'merge', label: 'Merge', icon: <Merge size={18} />, color: '#6366f1', category: 'flow' },
  { type: 'filter', label: 'Filter', icon: <Filter size={18} />, color: '#ec4899', category: 'transform' },
  { type: 'email', label: 'Email', icon: <Mail size={18} />, color: '#06b6d4', category: 'action' },
];

const MiniNodePalette: React.FC<MiniNodePaletteProps> = ({
  onAddNode,
  position,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [localPosition, setLocalPosition] = useState(position || { x: 80, y: 200 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('favoriteNodes') || '[]');
    } catch {
      return [];
    }
  });
  const paletteRef = useRef<HTMLDivElement>(null);

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.node-button')) return;

    setIsDragging(true);
    const rect = paletteRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  // Handle drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setLocalPosition({
        x: Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 80)),
        y: Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 200)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Toggle favorite
  const toggleFavorite = useCallback((nodeType: string) => {
    setFavorites(prev => {
      const newFavs = prev.includes(nodeType)
        ? prev.filter(f => f !== nodeType)
        : [...prev, nodeType];
      localStorage.setItem('favoriteNodes', JSON.stringify(newFavs));
      return newFavs;
    });
  }, []);

  // Handle node add
  const handleAddNode = useCallback((nodeType: string) => {
    onAddNode(nodeType, {
      x: localPosition.x + 100,
      y: localPosition.y + 50,
    });
  }, [onAddNode, localPosition]);

  // Handle drag node to canvas
  const handleDragStart = useCallback((e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData('text/plain', nodeType);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  // Get sorted nodes (favorites first)
  const sortedNodes = useMemo(() => {
    return [...QUICK_NODES].sort((a, b) => {
      const aFav = favorites.includes(a.type);
      const bFav = favorites.includes(b.type);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });
  }, [favorites]);

  return (
    <div
      ref={paletteRef}
      className={`fixed z-30 bg-white rounded-xl shadow-xl border border-gray-200 select-none transition-all duration-200 ${
        isDragging ? 'cursor-grabbing shadow-2xl scale-105' : ''
      }`}
      style={{
        left: localPosition.x,
        top: localPosition.y,
      }}
    >
      {/* Header */}
      <div
        onMouseDown={handleMouseDown}
        className={`flex items-center justify-between px-3 py-2 border-b border-gray-100 rounded-t-xl bg-gray-50 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-600">Quick Add</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronUp size={14} className="text-gray-500" />
          ) : (
            <ChevronDown size={14} className="text-gray-500" />
          )}
        </button>
      </div>

      {/* Node grid */}
      {isExpanded && (
        <div className="p-2 grid grid-cols-2 gap-1">
          {sortedNodes.map((node) => (
            <div key={node.type} className="relative group">
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, node.type)}
                onClick={() => handleAddNode(node.type)}
                onMouseEnter={() => setHoveredNode(node.type)}
                onMouseLeave={() => setHoveredNode(null)}
                className="node-button w-full flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 transition-all duration-150 active:scale-95"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: node.color }}
                >
                  {node.icon}
                </div>
                <span className="text-xs text-gray-600 font-medium truncate w-full text-center">
                  {node.label}
                </span>
              </button>

              {/* Favorite star */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(node.type);
                }}
                className={`absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                  favorites.includes(node.type)
                    ? 'text-yellow-500'
                    : 'text-gray-300 hover:text-gray-400'
                }`}
              >
                <Star
                  size={12}
                  className={favorites.includes(node.type) ? 'fill-current' : ''}
                />
              </button>

              {/* Tooltip */}
              {hoveredNode === node.type && (
                <div className="absolute left-full top-0 ml-2 z-50 pointer-events-none animate-in fade-in slide-in-from-left-1">
                  <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                    <p className="font-medium">{node.label}</p>
                    <p className="text-gray-400 capitalize">{node.category}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer hint */}
      {isExpanded && (
        <div className="px-2 pb-2">
          <p className="text-[10px] text-gray-400 text-center">
            Drag or click to add
          </p>
        </div>
      )}
    </div>
  );
};

export default MiniNodePalette;
