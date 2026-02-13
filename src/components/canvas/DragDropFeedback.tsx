/**
 * Drag & Drop Feedback Components
 * Visual affordances following UX best practices for node-based editors
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Zap, Link2, ArrowRight } from 'lucide-react';

// ============================================================================
// Drag Handle - Visual indicator for draggable nodes
// ============================================================================

interface DragHandleProps {
  isVisible?: boolean;
  isDragging?: boolean;
  className?: string;
}

export const DragHandle: React.FC<DragHandleProps> = ({
  isVisible = true,
  isDragging = false,
  className = '',
}) => {
  if (!isVisible) return null;

  return (
    <div
      className={`
        absolute -left-3 top-1/2 -translate-y-1/2
        w-2 h-8 rounded-full
        bg-gray-300 dark:bg-gray-600
        cursor-grab active:cursor-grabbing
        transition-all duration-200
        hover:bg-primary-400 hover:w-2.5
        ${isDragging ? 'bg-primary-500 w-3 shadow-lg shadow-primary-500/30' : ''}
        ${className}
      `}
      style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
      }}
    />
  );
};

// ============================================================================
// Drop Zone - Visual feedback for valid drop targets
// ============================================================================

interface DropZoneProps {
  isActive?: boolean;
  isOver?: boolean;
  label?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

const variantStyles = {
  default: {
    border: 'border-gray-300 dark:border-gray-600',
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    activeBorder: 'border-primary-400 dark:border-primary-500',
    activeBg: 'bg-primary-50 dark:bg-primary-900/20',
    text: 'text-gray-500 dark:text-gray-400',
    activeText: 'text-primary-600 dark:text-primary-400',
  },
  success: {
    border: 'border-green-300 dark:border-green-600',
    bg: 'bg-green-50 dark:bg-green-900/20',
    activeBorder: 'border-green-400 dark:border-green-500',
    activeBg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
    activeText: 'text-green-700 dark:text-green-300',
  },
  warning: {
    border: 'border-amber-300 dark:border-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    activeBorder: 'border-amber-400 dark:border-amber-500',
    activeBg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400',
    activeText: 'text-amber-700 dark:text-amber-300',
  },
  error: {
    border: 'border-red-300 dark:border-red-600',
    bg: 'bg-red-50 dark:bg-red-900/20',
    activeBorder: 'border-red-400 dark:border-red-500',
    activeBg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
    activeText: 'text-red-700 dark:text-red-300',
  },
};

const sizeStyles = {
  sm: 'p-3 min-h-[60px]',
  md: 'p-4 min-h-[80px]',
  lg: 'p-6 min-h-[120px]',
};

export const DropZone: React.FC<DropZoneProps> = ({
  isActive = false,
  isOver = false,
  label = 'Drop here',
  icon,
  variant = 'default',
  size = 'md',
  className = '',
  children,
}) => {
  const styles = variantStyles[variant];

  return (
    <div
      className={`
        relative rounded-xl border-2 border-dashed
        transition-all duration-200 ease-out
        flex flex-col items-center justify-center gap-2
        ${sizeStyles[size]}
        ${isOver
          ? `${styles.activeBorder} ${styles.activeBg} scale-105 shadow-lg`
          : isActive
          ? `${styles.activeBorder} ${styles.bg}`
          : `${styles.border} ${styles.bg}`
        }
        ${className}
      `}
    >
      {/* Animated border effect when over */}
      {isOver && (
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: `linear-gradient(90deg, transparent, ${variant === 'default' ? '#6366f1' : variant === 'success' ? '#22c55e' : variant === 'warning' ? '#f59e0b' : '#ef4444'}, transparent)`,
              animation: 'shimmer 1.5s infinite',
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      )}

      {/* Icon */}
      {icon || (
        <div
          className={`
            p-2 rounded-lg transition-all duration-200
            ${isOver ? styles.activeText : styles.text}
            ${isOver ? 'scale-110 animate-bounce' : ''}
          `}
        >
          <Plus className="w-6 h-6" />
        </div>
      )}

      {/* Label */}
      <span
        className={`
          text-sm font-medium transition-colors duration-200
          ${isOver ? styles.activeText : styles.text}
        `}
      >
        {label}
      </span>

      {children}
    </div>
  );
};

// ============================================================================
// Connection Preview - Shows potential connection while dragging
// ============================================================================

interface ConnectionPreviewProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isValid?: boolean;
  animated?: boolean;
}

export const ConnectionPreview: React.FC<ConnectionPreviewProps> = ({
  startX,
  startY,
  endX,
  endY,
  isValid = true,
  animated = true,
}) => {
  // Calculate bezier curve control points
  const dx = endX - startX;
  const controlPointOffset = Math.min(Math.abs(dx) * 0.5, 150);

  const path = `M ${startX} ${startY} C ${startX + controlPointOffset} ${startY}, ${endX - controlPointOffset} ${endY}, ${endX} ${endY}`;

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ zIndex: 1000 }}
    >
      {/* Glow effect */}
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Shadow path */}
      <path
        d={path}
        fill="none"
        stroke={isValid ? '#6366f1' : '#ef4444'}
        strokeWidth={4}
        strokeOpacity={0.2}
        strokeLinecap="round"
      />

      {/* Main path */}
      <path
        d={path}
        fill="none"
        stroke={isValid ? '#6366f1' : '#ef4444'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={animated ? '8 4' : 'none'}
        filter="url(#glow)"
        style={animated ? {
          animation: 'dash 0.5s linear infinite',
        } : {}}
      />

      {/* End marker */}
      <circle
        cx={endX}
        cy={endY}
        r={6}
        fill={isValid ? '#6366f1' : '#ef4444'}
        className={animated ? 'animate-pulse' : ''}
      />

      <style>
        {`
          @keyframes dash {
            to {
              stroke-dashoffset: -12;
            }
          }
        `}
      </style>
    </svg>
  );
};

// ============================================================================
// Node Ghost - Preview of node being dragged
// ============================================================================

interface NodeGhostProps {
  x: number;
  y: number;
  label: string;
  icon?: React.ReactNode;
  color?: string;
}

export const NodeGhost: React.FC<NodeGhostProps> = ({
  x,
  y,
  label,
  icon,
  color = '#6366f1',
}) => {
  return (
    <div
      className="fixed pointer-events-none z-[9999] transition-transform duration-75"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%) scale(1.05)',
      }}
    >
      <div
        className="px-4 py-3 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 opacity-90"
        style={{ borderColor: color }}
      >
        <div className="flex items-center gap-2">
          {icon && (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: color }}
            >
              {icon}
            </div>
          )}
          <span className="font-medium text-gray-900 dark:text-gray-100">{label}</span>
        </div>
      </div>

      {/* Drop shadow */}
      <div
        className="absolute inset-0 rounded-xl blur-xl opacity-30 -z-10"
        style={{ backgroundColor: color }}
      />
    </div>
  );
};

// ============================================================================
// Quick Connect Button - Appears when hovering near node edges
// ============================================================================

interface QuickConnectButtonProps {
  position: 'left' | 'right' | 'top' | 'bottom';
  isVisible?: boolean;
  onClick?: () => void;
  onDragStart?: () => void;
}

export const QuickConnectButton: React.FC<QuickConnectButtonProps> = ({
  position,
  isVisible = true,
  onClick,
  onDragStart,
}) => {
  const positionStyles = {
    left: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2',
    right: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2',
    top: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
    bottom: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={onClick}
      onMouseDown={onDragStart}
      className={`
        absolute ${positionStyles[position]}
        w-6 h-6 rounded-full
        bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-500
        hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30
        flex items-center justify-center
        transition-all duration-200
        hover:scale-125
        shadow-md hover:shadow-lg
        z-20
        group
      `}
    >
      <Link2 className="w-3 h-3 text-gray-400 group-hover:text-primary-500 transition-colors" />
    </button>
  );
};

// ============================================================================
// Snap Line - Shows alignment guides
// ============================================================================

interface SnapLineProps {
  orientation: 'horizontal' | 'vertical';
  position: number;
  length: number;
  offset?: number;
}

export const SnapLine: React.FC<SnapLineProps> = ({
  orientation,
  position,
  length,
  offset = 0,
}) => {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className="absolute bg-primary-500 opacity-50 pointer-events-none z-50"
      style={{
        [isHorizontal ? 'top' : 'left']: position,
        [isHorizontal ? 'left' : 'top']: offset,
        [isHorizontal ? 'width' : 'height']: length,
        [isHorizontal ? 'height' : 'width']: 1,
      }}
    >
      {/* End markers */}
      <div
        className={`absolute w-2 h-2 bg-primary-500 rounded-full ${
          isHorizontal ? '-left-1 -top-0.5' : '-top-1 -left-0.5'
        }`}
      />
      <div
        className={`absolute w-2 h-2 bg-primary-500 rounded-full ${
          isHorizontal ? '-right-1 -top-0.5' : '-bottom-1 -left-0.5'
        }`}
      />
    </div>
  );
};

// ============================================================================
// Canvas Instructions - Overlay with usage hints
// ============================================================================

interface CanvasInstructionsProps {
  isVisible?: boolean;
  onDismiss?: () => void;
}

export const CanvasInstructions: React.FC<CanvasInstructionsProps> = ({
  isVisible = true,
  onDismiss,
}) => {
  if (!isVisible) return null;

  const instructions = [
    { icon: <Plus className="w-4 h-4" />, text: 'Drag nodes from sidebar or double-click canvas' },
    { icon: <Link2 className="w-4 h-4" />, text: 'Drag from node edge to connect' },
    { icon: <ArrowRight className="w-4 h-4" />, text: 'Right-click for context menu' },
    { icon: <Zap className="w-4 h-4" />, text: 'Press Space + drag to pan' },
  ];

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl pointer-events-auto max-w-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 text-center">
          Getting Started
        </h3>
        <div className="space-y-3">
          {instructions.map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                {item.icon}
              </div>
              <span className="text-gray-600 dark:text-gray-400">{item.text}</span>
            </div>
          ))}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="mt-4 w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
          >
            Got it!
          </button>
        )}
      </div>
    </div>
  );
};

export default {
  DragHandle,
  DropZone,
  ConnectionPreview,
  NodeGhost,
  QuickConnectButton,
  SnapLine,
  CanvasInstructions,
};
