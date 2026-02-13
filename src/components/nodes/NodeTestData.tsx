/**
 * Node Test Data Component
 * Dialog to edit and manage test data for nodes
 */

import React, { useState, useEffect } from 'react';
import { X, Save, FileJson, Copy, Trash2, Database, Wand2 } from 'lucide-react';
import { dataPinningService } from '../../execution/DataPinning';
import { logger } from '../../services/SimpleLogger';

interface NodeTestDataProps {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
  initialData?: Record<string, unknown>;
}

export default function NodeTestData({
  nodeId,
  nodeType,
  nodeLabel,
  isOpen,
  onClose,
  onSave,
  initialData
}: NodeTestDataProps) {
  const [testData, setTestData] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      // Load existing pinned data or initial data
      const pinnedData = dataPinningService.getPinnedData(nodeId);
      if (pinnedData) {
        setTestData(JSON.stringify(pinnedData.data, null, 2));
        setDescription(pinnedData.description || '');
      } else if (initialData) {
        setTestData(JSON.stringify(initialData, null, 2));
      } else {
        setTestData('{}');
      }
      setError('');
    }
  }, [isOpen, nodeId, initialData]);

  const validateJSON = (value: string): boolean => {
    try {
      JSON.parse(value);
      setError('');
      setIsValid(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
      setIsValid(false);
      return false;
    }
  };

  const handleTestDataChange = (value: string) => {
    setTestData(value);
    validateJSON(value);
  };

  const handleSave = () => {
    if (!validateJSON(testData)) {
      return;
    }

    try {
      const parsedData = JSON.parse(testData);
      onSave(parsedData);
      logger.info(`Test data saved for node: ${nodeId}`);
      onClose();
    } catch (err) {
      setError('Failed to save test data');
    }
  };

  const handleGenerateSample = () => {
    const sampleData = dataPinningService.generateSampleData(nodeType);
    setTestData(JSON.stringify(sampleData, null, 2));
    validateJSON(JSON.stringify(sampleData));
  };

  const handleFormatJSON = () => {
    try {
      const parsed = JSON.parse(testData);
      const formatted = JSON.stringify(parsed, null, 2);
      setTestData(formatted);
      setError('');
      setIsValid(true);
    } catch (err) {
      setError('Cannot format invalid JSON');
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(testData);
      logger.info('Test data copied to clipboard');
    } catch (err) {
      logger.error('Failed to copy to clipboard:', err);
    }
  };

  const handleClear = () => {
    setTestData('{}');
    setDescription('');
    setError('');
    setIsValid(true);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Test Data for {nodeLabel}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Node ID: {nodeId} • Type: {nodeType}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this test data..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Test Data Editor */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Test Data (JSON)
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateSample}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                  title="Generate sample data"
                >
                  <Wand2 size={16} />
                  <span>Generate Sample</span>
                </button>
                <button
                  onClick={handleFormatJSON}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Format JSON"
                >
                  <FileJson size={16} />
                  <span>Format</span>
                </button>
                <button
                  onClick={handleCopyToClipboard}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy size={16} />
                  <span>Copy</span>
                </button>
                <button
                  onClick={handleClear}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  title="Clear data"
                >
                  <Trash2 size={16} />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <textarea
              value={testData}
              onChange={(e) => handleTestDataChange(e.target.value)}
              className={`w-full h-96 px-4 py-3 font-mono text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isValid ? 'border-gray-300' : 'border-red-300 bg-red-50'
              }`}
              placeholder='{\n  "key": "value"\n}'
              spellCheck={false}
            />

            {error && (
              <div className="mt-2 flex items-start gap-2 text-sm text-red-600">
                <span className="font-medium">Error:</span>
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Database className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Test Data Usage</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>This data will be used when executing from this node</li>
                  <li>Data can be pinned to nodes for repeated testing</li>
                  <li>Click "Generate Sample" to create example data for this node type</li>
                  <li>Use valid JSON format only</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors ${
              isValid
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            <Save size={18} />
            <span>Save Test Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}
