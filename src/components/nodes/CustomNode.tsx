import React, { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import { AlertTriangle, Plus, Search, X, Play, Copy, Trash2, Settings, Pin, MoreHorizontal, Maximize2, StickyNote, Power } from 'lucide-react';
import { nodeTypes, nodeCategories } from '../../data/nodeTypes';
import { useWorkflowStore } from '../../store/workflowStore';
import { logger } from '../../services/SimpleLogger';
import { getNodeIcon } from './NodeIcons';
import { getBorderColor, getConfigInfo, getPortCounts } from './NodeHelpers';
import { NodeContent } from './NodeContent';
import { NodePorts } from './NodePorts';
import { DisabledNodeOverlay } from './NodeDisableToggle';
import { notificationService } from '../../services/NotificationService';
import type { NodeType, WorkflowNode } from '../../types/workflow';

/**
 * AnnotationEditor - Inline editor popover for node annotations
 */
interface AnnotationEditorProps {
  nodeId: string;
  annotation?: string;
  onClose: () => void;
}

const AnnotationEditor: React.FC<AnnotationEditorProps> = ({ nodeId, annotation, onClose }) => {
  const [editValue, setEditValue] = React.useState(annotation || '');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const { updateNode } = useWorkflowStore();

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        handleSave();
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
  }, [editValue]);

  const handleSave = () => {
    const trimmedValue = editValue.trim();
    updateNode(nodeId, { annotation: trimmedValue || undefined });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
    e.stopPropagation();
  };

  return (
    <div
      ref={popoverRef}
      className="absolute -top-2 left-full ml-3 bg-white rounded-lg shadow-2xl border border-gray-200 w-64 z-50 animate-in fade-in slide-in-from-left-2 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-amber-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <StickyNote size={14} className="text-amber-600" />
          <span className="text-sm font-medium text-amber-900">Note</span>
        </div>
        <button
          onClick={onClose}
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
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors"
            >
              Save
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Ctrl+Enter to save
        </p>
      </div>
    </div>
  );
};

interface CustomNodeProps {
  data: {
    type: string;
    label?: string;
    config?: Record<string, unknown>;
    category?: string;
    annotation?: string;
    [key: string]: unknown;
  };
  id: string;
  selected?: boolean;
}

const CustomNode = memo(function CustomNode({ data, id, selected }: CustomNodeProps) {
  const {
    setSelectedNode,
    setSelectedEdge,
    executionResults,
    executionErrors,
    currentExecutingNode,
    nodeExecutionStatus,
    nodes,
    edges,
    setNodes,
    setEdges,
    addToHistory,
    breakpoints,
    addBreakpoint,
    removeBreakpoint,
    debugSession,
  } = useWorkflowStore();

  // State
  const [showTooltip, setShowTooltip] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddSearch, setQuickAddSearch] = useState('');
  const [isHovering, setIsHovering] = useState(false);
  const [showAnnotationEditor, setShowAnnotationEditor] = useState(false);
  const quickAddRef = useRef<HTMLInputElement>(null);

  // Get node type configuration
  const nodeType: NodeType = nodeTypes[data.type] || {
    type: data.type,
    label: data.type,
    icon: 'help-circle',
    color: 'bg-gray-500',
    category: 'core',
    inputs: 1,
    outputs: 1,
    description: 'Unknown node type',
    errorHandle: true
  };

  // Execution status
  const hasError = executionErrors?.[id];
  const hasResult = executionResults?.[id];
  const isExecuting = currentExecutingNode === id;
  const isConfigured = data.config && Object.keys(data.config).length > 0;

  // Breakpoint status
  const hasBreakpoint = breakpoints?.[id] === true;
  const isDebugPaused = debugSession?.status === 'paused' && debugSession?.currentNode === id;

  // Memoized values
  const nodeIcon = useMemo(() => getNodeIcon(data.type), [data.type]);
  const borderColor = useMemo(
    () => getBorderColor(isExecuting, !!hasError, !!hasResult, isConfigured),
    [isExecuting, hasError, hasResult, isConfigured]
  );
  const configInfo = useMemo(
    () => getConfigInfo(data.config, data.type),
    [data.config, data.type]
  );
  const { inputCount, outputCount } = useMemo(
    () => getPortCounts(data.type, nodeType),
    [data.type, nodeType]
  );

  // Filter node types for quick add
  const filteredNodeTypes = useMemo(() => {
    if (!quickAddSearch.trim()) {
      // Show popular nodes when no search
      const popular = ['http-request', 'code', 'set-variable', 'condition', 'merge', 'split'];
      return Object.values(nodeTypes)
        .filter(n => popular.includes(n.type) || n.category === 'action')
        .slice(0, 8);
    }
    const query = quickAddSearch.toLowerCase();
    return Object.values(nodeTypes)
      .filter(n =>
        n.label.toLowerCase().includes(query) ||
        n.type.toLowerCase().includes(query) ||
        n.category?.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [quickAddSearch]);

  // Handle breakpoint toggle
  const handleToggleBreakpoint = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasBreakpoint) {
      removeBreakpoint(id);
      notificationService.info('Breakpoint removed', `Breakpoint removed from ${data.label || data.type}`);
    } else {
      addBreakpoint(id);
      notificationService.info('Breakpoint added', `Breakpoint added to ${data.label || data.type}`);
    }
    logger.info('Breakpoint toggled:', id, !hasBreakpoint);
  }, [id, hasBreakpoint, addBreakpoint, removeBreakpoint, data.label, data.type]);

  // Handle quick add node
  const handleQuickAddNode = useCallback((nodeTypeKey: string) => {
    const newId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const currentNode = nodes.find(n => n.id === id);
    if (!currentNode) return;

    const selectedNodeType = nodeTypes[nodeTypeKey];
    const newNode: WorkflowNode = {
      id: newId,
      type: 'custom',
      position: {
        x: currentNode.position.x + 250,
        y: currentNode.position.y,
      },
      data: {
        id: newId,
        type: nodeTypeKey,
        label: selectedNodeType?.label || nodeTypeKey,
        position: {
          x: currentNode.position.x + 250,
          y: currentNode.position.y,
        },
        icon: selectedNodeType?.icon || 'help-circle',
        color: selectedNodeType?.color || 'bg-gray-500',
        inputs: selectedNodeType?.inputs || 1,
        outputs: selectedNodeType?.outputs || 1,
        config: {},
      },
    };

    const newEdge = {
      id: `edge_${id}_${newId}`,
      source: id,
      target: newId,
      sourceHandle: 'output-0',
      targetHandle: 'input-0',
    };

    addToHistory(nodes, edges);
    setNodes([...nodes, newNode]);
    setEdges([...edges, newEdge]);
    setShowQuickAdd(false);
    setQuickAddSearch('');
    setSelectedNode(newNode);
    logger.info('Quick add node:', nodeTypeKey);
  }, [id, nodes, edges, setNodes, setEdges, addToHistory, setSelectedNode]);

  // Focus input when quick add opens
  useEffect(() => {
    if (showQuickAdd && quickAddRef.current) {
      setTimeout(() => quickAddRef.current?.focus(), 50);
    }
  }, [showQuickAdd]);

  // Tooltip handling
  const tooltipTimeout = useRef<NodeJS.Timeout | null>(null);

  const hideTooltip = useCallback(() => {
    if (tooltipTimeout.current) {
      clearTimeout(tooltipTimeout.current);
      tooltipTimeout.current = null;
    }
    setShowTooltip(false);
  }, []);

  useEffect(() => {
    return () => {
      if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    };
  }, []);

  // Click handling with debouncing
  const isProcessingClick = useRef(false);
  const lastClickTime = useRef(0);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    e.stopPropagation();

    // Prevent rapid successive clicks (100ms debounce)
    if (now - lastClickTime.current < 100) {
      logger.info('Click ignored due to debouncing');
      return;
    }

    // Prevent concurrent click processing
    if (isProcessingClick.current) {
      logger.info('Click ignored - already processing');
      return;
    }

    isProcessingClick.current = true;
    lastClickTime.current = now;

    try {
      const currentNode = nodes.find(n => n.id === id);
      if (currentNode) {
        setSelectedNode(currentNode);
      }
      setSelectedEdge(null);
      logger.info('Node selected:', id, data.label || data.type);
    } catch (error) {
      logger.error('Error during node selection:', error);
    } finally {
      // Reset processing flag after a short delay
      setTimeout(() => {
        isProcessingClick.current = false;
      }, 50);
    }
  }, [id, data, setSelectedNode, setSelectedEdge]);

  // Show error node for invalid node types
  if (!nodeType) {
    logger.error(`Node type ${data.type} not found in nodeTypes`);
    return (
      <div className="relative cursor-pointer">
        <div className="w-24 h-16 bg-red-100 border-2 border-red-500 border-dashed rounded-lg flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle size={16} className="text-red-500 mx-auto mb-1" />
            <span className="text-xs text-red-600 font-medium">Unknown</span>
          </div>
        </div>
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
          <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded shadow-sm">
            Type: {data.type}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="relative cursor-pointer group"
      role="button"
      tabIndex={0}
      aria-label={`Configure ${data.label || data.type} node`}
      aria-describedby={`${id}-status ${id}-config-info`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setShowQuickAdd(false);
          (e.target as HTMLElement).blur();
        }
      }}
      onMouseEnter={() => {
        if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
        setShowTooltip(true);
        setIsHovering(true);
      }}
      onMouseLeave={() => {
        tooltipTimeout.current = setTimeout(hideTooltip, 200);
        setIsHovering(false);
        // Don't close quick add immediately to allow clicking it
        if (!showQuickAdd) {
          setShowQuickAdd(false);
        }
      }}
      onFocus={() => {
        if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
        setShowTooltip(true);
      }}
      onBlur={hideTooltip}
    >
      {/* Main node content */}
      <div className="relative">
        <NodeContent
          nodeIcon={nodeIcon}
          isConfigured={isConfigured}
          isExecuting={isExecuting}
          hasResult={!!hasResult}
          hasError={!!hasError}
          borderColor={borderColor}
          selected={selected}
          label={data.label || nodeType?.label || data.type}
          itemCount={hasResult ? (Array.isArray(hasResult) ? hasResult.length : 1) : undefined}
        />

        {/* Disabled node overlay (n8n-style) */}
        <DisabledNodeOverlay nodeId={id} />

        {/* Annotation badge - shows when node has annotation */}
        {data.annotation && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAnnotationEditor(true);
            }}
            onMouseEnter={() => setShowTooltip(false)}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-400 hover:bg-amber-500 flex items-center justify-center shadow-md transition-all duration-200 hover:scale-110 z-20"
            title="View/Edit note"
            aria-label="Node annotation"
          >
            <StickyNote size={12} className="text-amber-900" />
          </button>
        )}

        {/* Breakpoint indicator - red dot on the left side */}
        <button
          onClick={handleToggleBreakpoint}
          onMouseEnter={() => setShowTooltip(false)}
          className={`absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200 z-20 ${
            hasBreakpoint
              ? isDebugPaused
                ? 'bg-yellow-500 ring-2 ring-yellow-300 animate-pulse shadow-lg scale-125'
                : 'bg-red-500 hover:bg-red-600 shadow-md hover:scale-110'
              : 'bg-transparent border-2 border-gray-300 hover:border-red-400 hover:bg-red-100 opacity-0 group-hover:opacity-100'
          }`}
          title={hasBreakpoint ? (isDebugPaused ? 'Paused at breakpoint' : 'Remove breakpoint') : 'Add breakpoint'}
          aria-label={hasBreakpoint ? 'Remove breakpoint' : 'Add breakpoint'}
        >
          {hasBreakpoint && (
            <div className={`w-2 h-2 rounded-full ${isDebugPaused ? 'bg-yellow-200' : 'bg-red-300'}`} />
          )}
        </button>

        {/* Debug paused overlay */}
        {isDebugPaused && (
          <div className="absolute inset-0 rounded-lg border-2 border-yellow-400 bg-yellow-400/10 pointer-events-none animate-pulse" />
        )}
      </div>

      {/* Annotation Editor Popover */}
      {showAnnotationEditor && (
        <AnnotationEditor
          nodeId={id}
          annotation={data.annotation}
          onClose={() => setShowAnnotationEditor(false)}
        />
      )}

      {/* Input/Output ports */}
      <NodePorts
        inputCount={inputCount}
        outputCount={outputCount}
        nodeType={data.type}
        hasErrorHandle={nodeType?.errorHandle !== false}
      />

      {/* Quick Action Toolbar - appears on hover (n8n style) */}
      {isHovering && !showQuickAdd && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 px-1 py-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* Execute single node */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              notificationService.info('Execute single node coming soon', 'Execute Node');
              logger.info('Execute single node:', id);
            }}
            className="p-1.5 rounded hover:bg-green-100 text-gray-500 hover:text-green-600 transition-colors"
            title="Execute this node only (Shift+Enter)"
          >
            <Play size={14} />
          </button>

          {/* Duplicate node */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const currentNode = nodes.find(n => n.id === id);
              if (currentNode) {
                const newId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const newNode: WorkflowNode = {
                  ...currentNode,
                  id: newId,
                  position: {
                    x: currentNode.position.x + 50,
                    y: currentNode.position.y + 50,
                  },
                  data: {
                    ...currentNode.data,
                    id: newId,
                    position: {
                      x: currentNode.position.x + 50,
                      y: currentNode.position.y + 50,
                    }
                  }
                };
                addToHistory(nodes, edges);
                setNodes([...nodes, newNode]);
                notificationService.success('Node duplicated', `Successfully duplicated ${data.label || data.type}`);
              }
            }}
            className="p-1.5 rounded hover:bg-blue-100 text-gray-500 hover:text-blue-600 transition-colors"
            title="Duplicate node (Ctrl+D)"
          >
            <Copy size={14} />
          </button>

          {/* Disable/Enable node (D key) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const isDisabled = (data as Record<string, unknown>).disabled;
              useWorkflowStore.getState().updateNode(id, { disabled: !isDisabled });
              notificationService.info(
                isDisabled ? 'Node enabled' : 'Node disabled',
                `${data.label || data.type} ${isDisabled ? 'enabled' : 'disabled'}`
              );
            }}
            className={`p-1.5 rounded transition-colors ${
              (data as Record<string, unknown>).disabled
                ? 'hover:bg-green-100 text-red-500 hover:text-green-600'
                : 'hover:bg-orange-100 text-gray-500 hover:text-orange-600'
            }`}
            title={`${(data as Record<string, unknown>).disabled ? 'Enable' : 'Disable'} node (D)`}
          >
            <Power size={14} />
          </button>

          {/* Pin data */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              notificationService.info('Pin data coming soon', 'Pin Data');
            }}
            className="p-1.5 rounded hover:bg-yellow-100 text-gray-500 hover:text-yellow-600 transition-colors"
            title="Pin test data (P)"
          >
            <Pin size={14} />
          </button>

          {/* Add/Edit annotation */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAnnotationEditor(true);
            }}
            className={`p-1.5 rounded transition-colors ${
              data.annotation
                ? 'hover:bg-amber-100 text-amber-500 hover:text-amber-600'
                : 'hover:bg-amber-100 text-gray-500 hover:text-amber-600'
            }`}
            title={data.annotation ? 'Edit note' : 'Add note'}
          >
            <StickyNote size={14} />
          </button>

          {/* Delete node */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToHistory(nodes, edges);
              setNodes(nodes.filter(n => n.id !== id));
              setEdges(edges.filter(edge => edge.source !== id && edge.target !== id));
              notificationService.success('Node deleted', `Successfully deleted ${data.label || data.type}`);
            }}
            className="p-1.5 rounded hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
            title="Delete node (Delete)"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* Quick Add Button (+) - n8n style */}
      {(isHovering || showQuickAdd) && outputCount > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowQuickAdd(!showQuickAdd);
          }}
          className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 z-20 ${
            showQuickAdd
              ? 'bg-blue-500 text-white scale-110'
              : 'bg-white border-2 border-gray-300 text-gray-500 hover:border-blue-500 hover:text-blue-500 hover:scale-110'
          } shadow-md`}
          title="Add connected node"
        >
          {showQuickAdd ? <X size={12} /> : <Plus size={14} />}
        </button>
      )}

      {/* Quick Add Popup */}
      {showQuickAdd && (
        <div
          className="absolute left-full top-1/2 -translate-y-1/2 ml-6 bg-white rounded-lg shadow-2xl border border-gray-200 w-64 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={quickAddRef}
                type="text"
                value={quickAddSearch}
                onChange={(e) => setQuickAddSearch(e.target.value)}
                placeholder="Search nodes..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredNodeTypes.length > 0) {
                    handleQuickAddNode(filteredNodeTypes[0].type);
                  } else if (e.key === 'Escape') {
                    setShowQuickAdd(false);
                  }
                  e.stopPropagation();
                }}
              />
            </div>
          </div>

          {/* Node List */}
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredNodeTypes.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-500 text-sm">
                No nodes found
              </div>
            ) : (
              filteredNodeTypes.map((nt) => (
                <button
                  key={nt.type}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickAddNode(nt.type);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 rounded-md transition-colors group"
                >
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center text-white text-xs"
                    style={{ backgroundColor: nt.color || '#6b7280' }}
                  >
                    {nt.label?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {nt.label}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {nt.category}
                    </div>
                  </div>
                  <Plus size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 rounded-b-lg">
            <p className="text-xs text-gray-500">
              Press Enter to add, Esc to close
            </p>
          </div>
        </div>
      )}

      {/* Config info subtitle (below node, n8n-style) */}
      {configInfo && configInfo !== 'Not configured' && (
        <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-center">
          <div className="text-[10px] text-gray-400 dark:text-gray-500 max-w-32 truncate">
            {configInfo}
          </div>
        </div>
      )}

      {/* Error message tooltip (n8n-style inline error) */}
      {hasError && !isExecuting && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-red-50 border border-red-200 text-red-700 text-[10px] px-2 py-0.5 rounded-md shadow-sm max-w-40 truncate">
            {typeof hasError === 'object' && hasError !== null && 'message' in (hasError as Record<string, unknown>)
              ? String((hasError as Record<string, unknown>).message)
              : 'Error'}
          </div>
        </div>
      )}

      {/* Tooltip - shows annotation preview if exists, otherwise description */}
      {showTooltip && !showAnnotationEditor && !hasError && (
        data.annotation ? (
          <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-amber-50 border border-amber-200 rounded-lg shadow-lg px-3 py-2 max-w-56 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-1.5 mb-1">
              <StickyNote size={10} className="text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Note</span>
            </div>
            <p className="text-xs text-amber-900 line-clamp-3 break-words">{data.annotation}</p>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-50 border-r border-b border-amber-200 transform rotate-45" />
          </div>
        ) : (
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap z-10 pointer-events-none">
            {nodeType?.description || 'No description available'}
          </div>
        )
      )}

      {/* Accessibility: Hidden status info */}
      <div id={`${id}-status`} className="sr-only">
        {isExecuting ? "En cours d'exécution" :
         hasError ? "Erreur lors de l'exécution" :
         hasResult ? "Exécution réussie" :
         "Non exécuté"}
      </div>
      <div id={`${id}-config-info`} className="sr-only">
        {Object.keys(data.config || {}).length > 0
          ? "Nœud configuré"
          : "Nœud non configuré - cliquez pour configurer"}
      </div>

      {/* Accessibility: Live region for status changes */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isExecuting && "Exécution du nœud en cours"}
        {hasError && !isExecuting && "Erreur lors de l'exécution du nœud"}
        {hasResult && !isExecuting && !hasError && "Nœud exécuté avec succès"}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if critical props change
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.data.type === nextProps.data.type &&
    prevProps.data.label === nextProps.data.label &&
    prevProps.data.annotation === nextProps.data.annotation &&
    JSON.stringify(prevProps.data.config) === JSON.stringify(nextProps.data.config)
  );
});

export default CustomNode;
