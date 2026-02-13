/**
 * Variable Selector Dropdown
 * Select variables from previous nodes (like n8n)
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Variable,
  ChevronRight,
  ChevronDown,
  Search,
  Database,
  Code,
  Hash,
  Type,
  ToggleLeft,
  List,
  Braces,
  Copy,
  CheckCircle,
  X,
  Clock,
  Zap,
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface VariableSelectorDropdownProps {
  nodeId: string;
  onSelect: (expression: string) => void;
  isOpen: boolean;
  onClose: () => void;
  position?: { x: number; y: number };
}

interface NodeData {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  data: Record<string, unknown>;
}

interface VariableItem {
  path: string;
  value: unknown;
  type: string;
  expression: string;
}

const VariableSelectorDropdown: React.FC<VariableSelectorDropdownProps> = ({
  nodeId,
  onSelect,
  isOpen,
  onClose,
  position,
}) => {
  const { nodes, edges, executionResults, pinnedData } = useWorkflowStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [copiedExpression, setCopiedExpression] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'nodes' | 'globals' | 'recent'>('nodes');
  const containerRef = useRef<HTMLDivElement>(null);

  // Get previous nodes that can provide data
  const previousNodes = useMemo((): NodeData[] => {
    const currentNodeIndex = nodes.findIndex(n => n.id === nodeId);
    const incomingEdges = edges.filter(e => e.target === nodeId);

    return incomingEdges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const nodeData = executionResults?.[edge.source] || pinnedData?.[edge.source] || {};

      return {
        nodeId: edge.source,
        nodeName: sourceNode?.data?.label || sourceNode?.data?.type || 'Unknown',
        nodeType: sourceNode?.data?.type || 'unknown',
        data: nodeData as Record<string, unknown>,
      };
    });
  }, [nodeId, nodes, edges, executionResults, pinnedData]);

  // Global variables available
  const globalVariables: VariableItem[] = useMemo(() => [
    { path: '$now', value: new Date().toISOString(), type: 'DateTime', expression: '{{ $now }}' },
    { path: '$today', value: new Date().toDateString(), type: 'DateTime', expression: '{{ $today }}' },
    { path: '$json', value: '(current item)', type: 'Object', expression: '{{ $json }}' },
    { path: '$item', value: 0, type: 'Number', expression: '{{ $item }}' },
    { path: '$items()', value: '(all items)', type: 'Array', expression: '{{ $items() }}' },
    { path: '$workflow.id', value: 'wf_xxx', type: 'String', expression: '{{ $workflow.id }}' },
    { path: '$workflow.name', value: 'My Workflow', type: 'String', expression: '{{ $workflow.name }}' },
    { path: '$execution.id', value: 'exec_xxx', type: 'String', expression: '{{ $execution.id }}' },
    { path: '$execution.mode', value: 'manual', type: 'String', expression: '{{ $execution.mode }}' },
    { path: '$env', value: '(environment vars)', type: 'Object', expression: '{{ $env }}' },
    { path: '$vars', value: '(workflow vars)', type: 'Object', expression: '{{ $vars }}' },
  ], []);

  // Recent selections (mock - would be persisted in real implementation)
  const [recentSelections] = useState<VariableItem[]>([
    { path: '$json.email', value: 'user@example.com', type: 'String', expression: '{{ $json.email }}' },
    { path: '$json.name', value: 'John Doe', type: 'String', expression: '{{ $json.name }}' },
  ]);

  // Get variables from a data object
  const extractVariables = (
    data: unknown,
    prefix: string,
    expressionPrefix: string
  ): VariableItem[] => {
    const variables: VariableItem[] = [];

    if (data === null || data === undefined) return variables;

    if (Array.isArray(data)) {
      variables.push({
        path: prefix,
        value: `Array[${data.length}]`,
        type: 'Array',
        expression: `{{ ${expressionPrefix} }}`,
      });
      if (data.length > 0 && typeof data[0] === 'object') {
        // Show structure of first item
        const firstItem = data[0] as Record<string, unknown>;
        Object.keys(firstItem).forEach(key => {
          variables.push(...extractVariables(
            firstItem[key],
            `${prefix}[0].${key}`,
            `${expressionPrefix}[0].${key}`
          ));
        });
      }
    } else if (typeof data === 'object') {
      Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        const exprPath = expressionPrefix ? `${expressionPrefix}.${key}` : key;

        if (value !== null && typeof value === 'object') {
          variables.push({
            path,
            value: Array.isArray(value) ? `Array[${value.length}]` : 'Object',
            type: Array.isArray(value) ? 'Array' : 'Object',
            expression: `{{ ${exprPath} }}`,
          });
          // Recursively extract nested variables (limit depth)
          if (path.split('.').length < 5) {
            variables.push(...extractVariables(value, path, exprPath));
          }
        } else {
          variables.push({
            path,
            value,
            type: typeof value,
            expression: `{{ ${exprPath} }}`,
          });
        }
      });
    }

    return variables;
  };

  // Get variables for selected node
  const nodeVariables = useMemo(() => {
    if (!selectedNode) return [];
    const node = previousNodes.find(n => n.nodeId === selectedNode);
    if (!node) return [];

    const expressionPrefix = `$node["${node.nodeName}"].json`;
    return extractVariables(node.data, '', expressionPrefix);
  }, [selectedNode, previousNodes]);

  // Filter variables based on search
  const filteredVariables = useMemo(() => {
    let vars: VariableItem[] = [];

    if (activeTab === 'nodes' && selectedNode) {
      vars = nodeVariables;
    } else if (activeTab === 'globals') {
      vars = globalVariables;
    } else if (activeTab === 'recent') {
      vars = recentSelections;
    }

    if (!searchTerm) return vars;
    return vars.filter(v =>
      v.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(v.value).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activeTab, selectedNode, nodeVariables, globalVariables, recentSelections, searchTerm]);

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'string':
      case 'String':
        return <Type size={12} className="text-amber-500" />;
      case 'number':
      case 'Number':
        return <Hash size={12} className="text-green-500" />;
      case 'boolean':
        return <ToggleLeft size={12} className="text-blue-500" />;
      case 'Array':
        return <List size={12} className="text-purple-500" />;
      case 'Object':
        return <Braces size={12} className="text-cyan-500" />;
      case 'DateTime':
        return <Clock size={12} className="text-orange-500" />;
      default:
        return <Code size={12} className="text-gray-500" />;
    }
  };

  // Handle variable selection
  const handleSelect = (variable: VariableItem) => {
    onSelect(variable.expression);
    onClose();
  };

  // Copy expression
  const handleCopy = (expression: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(expression);
    setCopiedExpression(expression);
    setTimeout(() => setCopiedExpression(null), 2000);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95"
      style={{
        left: position?.x || '50%',
        top: position?.y || '50%',
        transform: !position ? 'translate(-50%, -50%)' : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center gap-2">
          <Variable size={18} className="text-purple-600" />
          <span className="font-semibold text-gray-900">Select Variable</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <X size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-gray-100">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search variables..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            autoFocus
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => { setActiveTab('nodes'); setSelectedNode(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'nodes'
              ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Database size={14} />
          Nodes
        </button>
        <button
          onClick={() => setActiveTab('globals')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'globals'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Zap size={14} />
          Globals
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'recent'
              ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock size={14} />
          Recent
        </button>
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-y-auto">
        {activeTab === 'nodes' && !selectedNode ? (
          // Node list
          <div className="p-2">
            {previousNodes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Database size={32} className="mx-auto opacity-50 mb-2" />
                <p className="text-sm">No connected nodes</p>
              </div>
            ) : (
              previousNodes.map(node => (
                <button
                  key={node.nodeId}
                  onClick={() => setSelectedNode(node.nodeId)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Database size={16} className="text-purple-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900">{node.nodeName}</p>
                    <p className="text-xs text-gray-500">{node.nodeType}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              ))
            )}
          </div>
        ) : (
          // Variable list
          <div className="p-2">
            {activeTab === 'nodes' && selectedNode && (
              <button
                onClick={() => setSelectedNode(null)}
                className="w-full flex items-center gap-2 p-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg mb-2"
              >
                <ChevronDown size={14} className="rotate-90" />
                Back to nodes
              </button>
            )}

            {filteredVariables.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Variable size={32} className="mx-auto opacity-50 mb-2" />
                <p className="text-sm">No variables found</p>
              </div>
            ) : (
              filteredVariables.map((variable, i) => (
                <button
                  key={`${variable.path}-${i}`}
                  onClick={() => handleSelect(variable)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  {getTypeIcon(variable.type)}
                  <div className="flex-1 text-left min-w-0">
                    <code className="text-xs font-mono text-gray-900 truncate block">
                      {variable.path}
                    </code>
                    <p className="text-xs text-gray-500 truncate">
                      {String(variable.value).substring(0, 30)}
                      {String(variable.value).length > 30 && '...'}
                    </p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    {variable.type}
                  </span>
                  <button
                    onClick={(e) => handleCopy(variable.expression, e)}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-all"
                    title="Copy expression"
                  >
                    {copiedExpression === variable.expression ? (
                      <CheckCircle size={12} className="text-green-500" />
                    ) : (
                      <Copy size={12} className="text-gray-400" />
                    )}
                  </button>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
        Click to insert • Right-click to copy
      </div>
    </div>
  );
};

export default VariableSelectorDropdown;
