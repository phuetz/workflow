/**
 * Pin Data Panel
 * Allows users to pin test data to nodes (like n8n)
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Pin, PinOff, Play, X, Upload, Download, Trash2, Check, AlertCircle } from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { notificationService } from '../../services/NotificationService';

interface PinDataPanelProps {
  nodeId: string;
  nodeName: string;
  isOpen: boolean;
  onClose: () => void;
}

const PinDataPanel: React.FC<PinDataPanelProps> = ({
  nodeId,
  nodeName,
  isOpen,
  onClose,
}) => {
  const { pinnedData, setPinnedData, executionResults } = useWorkflowStore();
  const [jsonInput, setJsonInput] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  // Get current pinned data for this node
  const currentPinnedData = pinnedData?.[nodeId];
  const hasExecutionData = executionResults?.[nodeId] !== undefined;
  const isPinned = currentPinnedData !== undefined;

  // Initialize JSON input from pinned data
  useState(() => {
    if (currentPinnedData) {
      setJsonInput(JSON.stringify(currentPinnedData, null, 2));
    }
  });

  // Validate and format JSON
  const validateJson = useCallback((input: string): { isValid: boolean; data?: unknown; error?: string } => {
    if (!input.trim()) {
      return { isValid: false, error: 'JSON cannot be empty' };
    }
    try {
      const data = JSON.parse(input);
      return { isValid: true, data };
    } catch (e) {
      return { isValid: false, error: (e as Error).message };
    }
  }, []);

  // Handle JSON input change
  const handleInputChange = useCallback((value: string) => {
    setJsonInput(value);
    const result = validateJson(value);
    setParseError(result.isValid ? null : result.error || null);
  }, [validateJson]);

  // Pin the data
  const handlePinData = useCallback(() => {
    const result = validateJson(jsonInput);
    if (!result.isValid) {
      notificationService.error(result.error || 'Invalid JSON', 'Parse Error');
      return;
    }

    setPinnedData(nodeId, result.data);
    notificationService.success('Data pinned successfully', 'Pin Data');
  }, [jsonInput, validateJson, nodeId, setPinnedData]);

  // Unpin the data
  const handleUnpinData = useCallback(() => {
    setPinnedData(nodeId, undefined);
    setJsonInput('');
    notificationService.info('Data unpinned', 'Pin Data');
  }, [nodeId, setPinnedData]);

  // Use execution data
  const handleUseExecutionData = useCallback(() => {
    if (executionResults?.[nodeId]) {
      const data = JSON.stringify(executionResults[nodeId], null, 2);
      setJsonInput(data);
      setParseError(null);
      notificationService.success('Loaded execution data', 'Pin Data');
    }
  }, [executionResults, nodeId]);

  // Export pinned data
  const handleExport = useCallback(() => {
    if (!currentPinnedData) return;

    const blob = new Blob([JSON.stringify(currentPinnedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pinned-data-${nodeId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notificationService.success('Data exported', 'Export');
  }, [currentPinnedData, nodeId]);

  // Import pinned data
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        handleInputChange(content);
        notificationService.success('Data imported', 'Import');
      };
      reader.readAsText(file);
    };
    input.click();
  }, [handleInputChange]);

  // Format JSON
  const handleFormat = useCallback(() => {
    const result = validateJson(jsonInput);
    if (result.isValid) {
      setJsonInput(JSON.stringify(result.data, null, 2));
      notificationService.success('JSON formatted', 'Format');
    }
  }, [jsonInput, validateJson]);

  // Preview parsed data
  const previewData = useMemo(() => {
    const result = validateJson(jsonInput);
    return result.isValid ? result.data : null;
  }, [jsonInput, validateJson]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isPinned ? 'bg-amber-100' : 'bg-gray-100'}`}>
              {isPinned ? (
                <Pin size={20} className="text-amber-600" />
              ) : (
                <PinOff size={20} className="text-gray-400" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pin Data</h2>
              <p className="text-sm text-gray-500">{nodeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Status Bar */}
        {isPinned && (
          <div className="px-6 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <Check size={16} className="text-amber-600" />
            <span className="text-sm text-amber-700">
              Data is pinned - This node will use pinned data instead of input data during execution
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'edit'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Edit JSON
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'preview'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Preview
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'edit' ? (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center gap-2">
                {hasExecutionData && (
                  <button
                    onClick={handleUseExecutionData}
                    className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                  >
                    <Play size={14} />
                    Use Last Execution
                  </button>
                )}
                <button
                  onClick={handleImport}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                >
                  <Upload size={14} />
                  Import
                </button>
                {currentPinnedData && (
                  <button
                    onClick={handleExport}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                  >
                    <Download size={14} />
                    Export
                  </button>
                )}
                <button
                  onClick={handleFormat}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Format
                </button>
              </div>

              {/* JSON Editor */}
              <div className="relative">
                <textarea
                  value={jsonInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder='Enter JSON data, e.g. {"name": "test", "items": [1, 2, 3]}'
                  className={`w-full h-64 p-4 font-mono text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 ${
                    parseError
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {parseError && (
                  <div className="absolute bottom-2 left-2 right-2 px-3 py-2 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                    <span className="text-xs text-red-600 truncate">{parseError}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-64 overflow-auto bg-gray-50 rounded-lg p-4">
              {previewData ? (
                <pre className="text-sm font-mono text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(previewData, null, 2)}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p>Enter valid JSON to see preview</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            {isPinned && (
              <button
                onClick={handleUnpinData}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} />
                Unpin Data
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePinData}
              disabled={!!parseError || !jsonInput.trim()}
              className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                parseError || !jsonInput.trim()
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Pin size={16} />
              {isPinned ? 'Update Pinned Data' : 'Pin Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PinDataPanel;
