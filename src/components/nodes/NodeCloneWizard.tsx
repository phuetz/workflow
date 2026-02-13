/**
 * Node Clone Wizard
 * Clone nodes with customization options (like n8n)
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Copy,
  X,
  ChevronRight,
  Check,
  Settings,
  Link,
  Unlink,
  RefreshCw,
  AlertTriangle,
  Info,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface NodeCloneWizardProps {
  nodeIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onClone: (options: CloneOptions) => void;
}

interface CloneOptions {
  count: number;
  positioning: 'below' | 'right' | 'stacked' | 'custom';
  offset: { x: number; y: number };
  preserveConnections: boolean;
  preserveCredentials: boolean;
  preserveExpressions: boolean;
  renamePattern: string;
  resetData: boolean;
}

interface ClonePreview {
  originalId: string;
  originalLabel: string;
  newLabel: string;
  position: { x: number; y: number };
}

const POSITIONING_OPTIONS = [
  {
    id: 'below',
    label: 'Below',
    description: 'Stack clones vertically',
    offset: { x: 0, y: 100 },
  },
  {
    id: 'right',
    label: 'Right',
    description: 'Place clones horizontally',
    offset: { x: 200, y: 0 },
  },
  {
    id: 'stacked',
    label: 'Stacked',
    description: 'Slightly offset diagonally',
    offset: { x: 30, y: 30 },
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Define your own offset',
    offset: { x: 100, y: 100 },
  },
];

const NodeCloneWizard: React.FC<NodeCloneWizardProps> = ({
  nodeIds,
  isOpen,
  onClose,
  onClone,
}) => {
  const { nodes } = useWorkflowStore();
  const [step, setStep] = useState(1);
  const [options, setOptions] = useState<CloneOptions>({
    count: 1,
    positioning: 'below',
    offset: { x: 0, y: 100 },
    preserveConnections: true,
    preserveCredentials: true,
    preserveExpressions: true,
    renamePattern: '{name} (Copy {n})',
    resetData: true,
  });

  // Get selected nodes
  const selectedNodes = useMemo(() => {
    return nodes.filter(n => nodeIds.includes(n.id));
  }, [nodes, nodeIds]);

  // Generate preview
  const preview = useMemo((): ClonePreview[] => {
    const previews: ClonePreview[] = [];
    const positionOption = POSITIONING_OPTIONS.find(p => p.id === options.positioning);
    const offset = options.positioning === 'custom' ? options.offset : (positionOption?.offset || { x: 0, y: 100 });

    selectedNodes.forEach(node => {
      for (let i = 1; i <= options.count; i++) {
        const newLabel = options.renamePattern
          .replace('{name}', node.data?.label || node.data?.type || 'Node')
          .replace('{n}', String(i))
          .replace('{type}', node.data?.type || 'node');

        previews.push({
          originalId: node.id,
          originalLabel: node.data?.label || node.data?.type || 'Node',
          newLabel,
          position: {
            x: node.position.x + offset.x * i,
            y: node.position.y + offset.y * i,
          },
        });
      }
    });

    return previews;
  }, [selectedNodes, options]);

  // Update option
  const updateOption = useCallback(<K extends keyof CloneOptions>(
    key: K,
    value: CloneOptions[K]
  ) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  }, []);

  // Handle positioning change
  const handlePositioningChange = (posId: string) => {
    const pos = POSITIONING_OPTIONS.find(p => p.id === posId);
    if (pos) {
      updateOption('positioning', posId as CloneOptions['positioning']);
      if (posId !== 'custom') {
        updateOption('offset', pos.offset);
      }
    }
  };

  // Handle clone
  const handleClone = () => {
    onClone(options);
    onClose();
  };

  // Step navigation
  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-cyan-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <Copy size={20} className="text-cyan-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Clone Wizard</h2>
              <p className="text-sm text-gray-500">
                {selectedNodes.length} node{selectedNodes.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Progress steps */}
        <div className="flex items-center px-6 py-3 border-b border-gray-100 bg-gray-50">
          {[1, 2, 3].map(s => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 ${step >= s ? 'text-cyan-600' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  step > s ? 'bg-cyan-600 text-white' :
                  step === s ? 'bg-cyan-100 text-cyan-600 ring-2 ring-cyan-600' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {step > s ? <Check size={12} /> : s}
                </div>
                <span className="text-sm font-medium hidden sm:inline">
                  {s === 1 ? 'Count' : s === 2 ? 'Position' : 'Options'}
                </span>
              </div>
              {s < 3 && (
                <div className={`flex-1 h-0.5 mx-3 ${step > s ? 'bg-cyan-600' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Number of Clones
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={options.count}
                    onChange={(e) => updateOption('count', parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                  />
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={options.count}
                    onChange={(e) => updateOption('count', parseInt(e.target.value) || 1)}
                    className="w-16 px-3 py-2 border border-gray-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Rename Pattern
                </label>
                <input
                  type="text"
                  value={options.renamePattern}
                  onChange={(e) => updateOption('renamePattern', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="{name} (Copy {n})"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Available: {'{name}'} = original name, {'{n}'} = clone number, {'{type}'} = node type
                </p>
              </div>

              <div className="p-3 bg-cyan-50 rounded-lg">
                <div className="flex items-center gap-2 text-cyan-700 mb-2">
                  <Sparkles size={16} />
                  <span className="font-medium">Preview</span>
                </div>
                <div className="space-y-1">
                  {preview.slice(0, 3).map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">{p.originalLabel}</span>
                      <ArrowRight size={12} className="text-cyan-500" />
                      <span className="text-cyan-700 font-medium">{p.newLabel}</span>
                    </div>
                  ))}
                  {preview.length > 3 && (
                    <p className="text-xs text-gray-500">...and {preview.length - 3} more</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Clone Positioning
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {POSITIONING_OPTIONS.map(pos => (
                    <button
                      key={pos.id}
                      onClick={() => handlePositioningChange(pos.id)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        options.positioning === pos.id
                          ? 'border-cyan-500 bg-cyan-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-gray-900">{pos.label}</p>
                      <p className="text-xs text-gray-500">{pos.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {options.positioning === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      X Offset
                    </label>
                    <input
                      type="number"
                      value={options.offset.x}
                      onChange={(e) => updateOption('offset', { ...options.offset, x: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Y Offset
                    </label>
                    <input
                      type="number"
                      value={options.offset.y}
                      onChange={(e) => updateOption('offset', { ...options.offset, y: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              )}

              {/* Visual preview */}
              <div className="relative h-32 bg-gray-100 rounded-lg overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-8 grid-rows-4 opacity-30">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div key={i} className="border border-gray-300" />
                  ))}
                </div>
                {/* Original node */}
                <div
                  className="absolute w-16 h-8 bg-gray-400 rounded flex items-center justify-center text-xs text-white"
                  style={{ left: 20, top: 20 }}
                >
                  Original
                </div>
                {/* Clone previews */}
                {preview.slice(0, Math.min(options.count, 3)).map((p, i) => {
                  const offset = POSITIONING_OPTIONS.find(pos => pos.id === options.positioning)?.offset || options.offset;
                  return (
                    <div
                      key={i}
                      className="absolute w-16 h-8 bg-cyan-500 rounded flex items-center justify-center text-xs text-white"
                      style={{
                        left: 20 + (offset.x / 3) * (i + 1),
                        top: 20 + (offset.y / 3) * (i + 1),
                        opacity: 1 - i * 0.2,
                      }}
                    >
                      Clone {i + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.preserveConnections}
                    onChange={(e) => updateOption('preserveConnections', e.target.checked)}
                    className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link size={16} className="text-gray-500" />
                      <span className="font-medium text-gray-900">Preserve Connections</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Clone incoming connections from original nodes</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.preserveCredentials}
                    onChange={(e) => updateOption('preserveCredentials', e.target.checked)}
                    className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Settings size={16} className="text-gray-500" />
                      <span className="font-medium text-gray-900">Preserve Credentials</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Use same credentials in cloned nodes</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.preserveExpressions}
                    onChange={(e) => updateOption('preserveExpressions', e.target.checked)}
                    className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Layers size={16} className="text-gray-500" />
                      <span className="font-medium text-gray-900">Preserve Expressions</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Keep dynamic expressions in configuration</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.resetData}
                    onChange={(e) => updateOption('resetData', e.target.checked)}
                    className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <RefreshCw size={16} className="text-gray-500" />
                      <span className="font-medium text-gray-900">Reset Execution Data</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Clear any stored execution results</p>
                  </div>
                </label>
              </div>

              {/* Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Creating {options.count * selectedNodes.length} new node{options.count * selectedNodes.length !== 1 ? 's' : ''}</li>
                  <li>• Positioning: {POSITIONING_OPTIONS.find(p => p.id === options.positioning)?.label}</li>
                  <li>• {options.preserveConnections ? 'Keeping' : 'Removing'} connections</li>
                  <li>• {options.preserveCredentials ? 'Using same' : 'Clearing'} credentials</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={step > 1 ? prevStep : onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {step > 1 ? 'Back' : 'Cancel'}
          </button>
          {step < 3 ? (
            <button
              onClick={nextStep}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-2 text-sm"
            >
              Next
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleClone}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-2 text-sm"
            >
              <Copy size={16} />
              Clone {options.count * selectedNodes.length} Node{options.count * selectedNodes.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeCloneWizard;
