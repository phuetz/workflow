/**
 * Focus Panel - N8N Style Inline Node Editing
 * Edit node parameters without leaving the canvas
 * Reference: https://community.n8n.io/t/help-us-test-some-canvas-improvements/201703
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, ChevronDown, ChevronUp, Settings, Play, Copy,
  Trash2, Pin, PinOff, Eye, EyeOff, Code2, FileText,
  ChevronRight, HelpCircle, Zap, AlertCircle, CheckCircle,
  Loader2, ExternalLink, MoreHorizontal, Maximize2
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface NodeParameter {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'options' | 'json' | 'expression';
  default?: any;
  required?: boolean;
  description?: string;
  options?: { name: string; value: string }[];
  placeholder?: string;
}

interface FocusPanelProps {
  isOpen: boolean;
  onClose: () => void;
  node: {
    id: string;
    type: string;
    label: string;
    icon?: React.ReactNode;
    color?: string;
    config?: Record<string, any>;
    parameters?: NodeParameter[];
  } | null;
  onSave?: (nodeId: string, config: Record<string, any>) => void;
  onExecute?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onDuplicate?: (nodeId: string) => void;
  onOpenFullEditor?: (nodeId: string) => void;
  position?: 'right' | 'bottom' | 'floating';
  executionStatus?: 'idle' | 'executing' | 'success' | 'error';
  isPinned?: boolean;
  onTogglePin?: (nodeId: string) => void;
}

// ============================================================================
// Sample Parameters (for demo)
// ============================================================================

const getDefaultParameters = (nodeType: string): NodeParameter[] => {
  const parametersByType: Record<string, NodeParameter[]> = {
    'http-request': [
      { name: 'method', displayName: 'Method', type: 'options', required: true, options: [
        { name: 'GET', value: 'GET' },
        { name: 'POST', value: 'POST' },
        { name: 'PUT', value: 'PUT' },
        { name: 'DELETE', value: 'DELETE' },
      ]},
      { name: 'url', displayName: 'URL', type: 'string', required: true, placeholder: 'https://api.example.com/endpoint' },
      { name: 'authentication', displayName: 'Authentication', type: 'options', options: [
        { name: 'None', value: 'none' },
        { name: 'Basic Auth', value: 'basic' },
        { name: 'Bearer Token', value: 'bearer' },
        { name: 'OAuth2', value: 'oauth2' },
      ]},
      { name: 'body', displayName: 'Body', type: 'json', description: 'Request body (for POST/PUT)' },
    ],
    'code': [
      { name: 'language', displayName: 'Language', type: 'options', options: [
        { name: 'JavaScript', value: 'javascript' },
        { name: 'Python', value: 'python' },
      ]},
      { name: 'code', displayName: 'Code', type: 'expression', description: 'Write your custom code here' },
    ],
    'if': [
      { name: 'condition', displayName: 'Condition', type: 'expression', required: true, description: 'Expression that evaluates to true or false' },
    ],
    'slack': [
      { name: 'channel', displayName: 'Channel', type: 'string', required: true, placeholder: '#general' },
      { name: 'message', displayName: 'Message', type: 'expression', required: true, description: 'Message to send' },
    ],
  };

  return parametersByType[nodeType] || [
    { name: 'config', displayName: 'Configuration', type: 'json', description: 'Node configuration' },
  ];
};

// ============================================================================
// Parameter Input Component
// ============================================================================

const ParameterInput: React.FC<{
  parameter: NodeParameter;
  value: any;
  onChange: (value: any) => void;
}> = ({ parameter, value, onChange }) => {
  const [isExpressionMode, setIsExpressionMode] = useState(false);

  const inputClasses = "w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";

  switch (parameter.type) {
    case 'boolean':
      return (
        <button
          onClick={() => onChange(!value)}
          className={`
            relative w-12 h-6 rounded-full transition-colors duration-200
            ${value ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}
          `}
        >
          <div
            className={`
              absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200
              ${value ? 'translate-x-7' : 'translate-x-1'}
            `}
          />
        </button>
      );

    case 'options':
      return (
        <select
          value={value || parameter.default || ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        >
          <option value="">Select...</option>
          {parameter.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.name}</option>
          ))}
        </select>
      );

    case 'number':
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          placeholder={parameter.placeholder}
          className={inputClasses}
        />
      );

    case 'json':
      return (
        <textarea
          value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              onChange(e.target.value);
            }
          }}
          placeholder={parameter.placeholder || '{\n  "key": "value"\n}'}
          rows={4}
          className={`${inputClasses} font-mono text-xs`}
        />
      );

    case 'expression':
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsExpressionMode(!isExpressionMode)}
              className={`
                flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded
                ${isExpressionMode
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }
              `}
            >
              <Code2 className="w-3 h-3" />
              Expression
            </button>
          </div>
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={isExpressionMode ? '{{ $json.field }}' : parameter.placeholder}
            rows={3}
            className={`${inputClasses} ${isExpressionMode ? 'font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/10' : ''}`}
          />
        </div>
      );

    default: // string
      return (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={parameter.placeholder}
          className={inputClasses}
        />
      );
  }
};

// ============================================================================
// Main Component
// ============================================================================

export const FocusPanel: React.FC<FocusPanelProps> = ({
  isOpen,
  onClose,
  node,
  onSave,
  onExecute,
  onDelete,
  onDuplicate,
  onOpenFullEditor,
  position = 'right',
  executionStatus = 'idle',
  isPinned = false,
  onTogglePin,
}) => {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'parameters' | 'settings' | 'output'>('parameters');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  // Initialize config from node
  useEffect(() => {
    if (node?.config) {
      setConfig(node.config);
    } else {
      setConfig({});
    }
  }, [node?.id]);

  const parameters = node ? getDefaultParameters(node.type) : [];

  const handleConfigChange = useCallback((name: string, value: any) => {
    setConfig(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSave = useCallback(() => {
    if (node && onSave) {
      onSave(node.id, config);
    }
  }, [node, config, onSave]);

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  if (!isOpen || !node) return null;

  const positionClasses = {
    right: 'right-0 top-0 h-full w-[380px] border-l',
    bottom: 'bottom-0 left-0 right-0 h-[300px] border-t',
    floating: 'right-4 top-4 h-[calc(100%-2rem)] w-[380px] rounded-2xl shadow-2xl',
  };

  const StatusIcon = executionStatus === 'executing' ? Loader2 :
    executionStatus === 'success' ? CheckCircle :
    executionStatus === 'error' ? AlertCircle : null;

  return (
    <div
      ref={panelRef}
      className={`
        fixed z-50 bg-white dark:bg-gray-900
        border-gray-200 dark:border-gray-700
        flex flex-col overflow-hidden
        animate-slide-in-right
        ${positionClasses[position]}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          {/* Node icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
            style={{ backgroundColor: node.color || '#6b7280' }}
          >
            {node.icon || <Zap className="w-5 h-5" />}
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {node.label}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {node.type}
            </p>
          </div>

          {/* Status indicator */}
          {StatusIcon && (
            <div
              className={`
                p-1.5 rounded-full
                ${executionStatus === 'executing' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-500' :
                  executionStatus === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-500' :
                  'bg-red-100 dark:bg-red-900/30 text-red-500'
                }
              `}
            >
              <StatusIcon className={`w-4 h-4 ${executionStatus === 'executing' ? 'animate-spin' : ''}`} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Pin button */}
          <button
            onClick={() => onTogglePin?.(node.id)}
            className={`
              p-2 rounded-lg transition-colors
              ${isPinned
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }
            `}
            title={isPinned ? 'Unpin data' : 'Pin data'}
          >
            {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>

          {/* Full editor button */}
          <button
            onClick={() => onOpenFullEditor?.(node.id)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Open full editor"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-800">
        {(['parameters', 'settings', 'output'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              flex-1 px-4 py-2.5 text-sm font-medium transition-colors
              ${activeTab === tab
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
            `}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'parameters' && (
          <div className="space-y-4">
            {parameters.map(param => (
              <div key={param.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    {param.displayName}
                    {param.required && <span className="text-red-500">*</span>}
                  </label>
                  {param.description && (
                    <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title={param.description}>
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <ParameterInput
                  parameter={param}
                  value={config[param.name]}
                  onChange={(value) => handleConfigChange(param.name, value)}
                />
              </div>
            ))}

            {parameters.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No parameters to configure</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* Node settings */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Node Settings</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Continue on Fail</span>
                  <button className="relative w-10 h-5 bg-gray-300 dark:bg-gray-600 rounded-full">
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Retry on Fail</span>
                  <button className="relative w-10 h-5 bg-gray-300 dark:bg-gray-600 rounded-full">
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow" />
                  </button>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Notes
              </label>
              <textarea
                placeholder="Add notes about this node..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}

        {activeTab === 'output' && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Execute the node to see output</p>
            <button
              onClick={() => onExecute?.(node.id)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              <Play className="w-4 h-4" />
              Execute Node
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDuplicate?.(node.id)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete?.(node.id)}
              className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onExecute?.(node.id)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Test
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FocusPanel;
