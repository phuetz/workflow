/**
 * n8n Workflow Import Modal
 * Allows users to import workflows from n8n format
 */

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileJson, AlertCircle, CheckCircle, AlertTriangle, X, Download, Info } from 'lucide-react';
import { n8nImporter, N8nImporter, ExtendedImportResult } from '../../workflow/N8nImporter';
import { useWorkflowStore } from '../../store/workflowStore';
import { notificationService } from '../../services/NotificationService';
import { logger } from '../../services/SimpleLogger';

interface N8nImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

export const N8nImportModal: React.FC<N8nImportModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [importResult, setImportResult] = useState<ExtendedImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setNodes, setEdges, setWorkflowName, addToHistory } = useWorkflowStore();

  const resetState = useCallback(() => {
    setStep('upload');
    setFileContent('');
    setFileName('');
    setImportResult(null);
    setIsProcessing(false);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);

    try {
      const content = await file.text();
      setFileContent(content);

      // Validate JSON
      const parsed = JSON.parse(content);

      // Check if it's n8n format
      if (!N8nImporter.isN8nWorkflow(parsed)) {
        setError('This does not appear to be a valid n8n workflow file. Please check the format.');
        return;
      }

      // Parse and preview
      const workflow = N8nImporter.parseN8nWorkflow(content);
      setIsProcessing(true);

      const result = await n8nImporter.import(workflow);
      setImportResult(result as ExtendedImportResult);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
      logger.error('Failed to parse n8n workflow:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setError('Please drop a JSON file');
      return;
    }

    // Create a fake event to reuse handleFileSelect logic
    const fakeEvent = {
      target: { files: [file] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await handleFileSelect(fakeEvent);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        setError('Clipboard is empty');
        return;
      }

      setFileContent(text);
      setFileName('clipboard-paste.json');

      const parsed = JSON.parse(text);
      if (!N8nImporter.isN8nWorkflow(parsed)) {
        setError('Clipboard content is not a valid n8n workflow');
        return;
      }

      const workflow = N8nImporter.parseN8nWorkflow(text);
      setIsProcessing(true);

      const result = await n8nImporter.import(workflow);
      setImportResult(result as ExtendedImportResult);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse clipboard content');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!importResult?.nodes || !importResult?.edges) {
      setError('No workflow data to import');
      return;
    }

    setStep('importing');
    setIsProcessing(true);

    try {
      // Save current state for undo
      const currentNodes = useWorkflowStore.getState().nodes;
      const currentEdges = useWorkflowStore.getState().edges;
      addToHistory(currentNodes, currentEdges);

      // Set the imported workflow
      setNodes(importResult.nodes);
      setEdges(importResult.edges);

      if (importResult.metadata?.name) {
        setWorkflowName(importResult.metadata.name);
      }

      setStep('complete');
      notificationService.success(
        `Successfully imported ${importResult.nodes.length} nodes and ${importResult.edges.length} connections`,
        'Workflow Imported'
      );

      logger.info('n8n workflow imported:', {
        nodes: importResult.nodes.length,
        edges: importResult.edges.length,
        warnings: importResult.warnings.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import workflow');
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  }, [importResult, setNodes, setEdges, setWorkflowName, addToHistory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-lg bg-slate-900 shadow-2xl border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <FileJson className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Import n8n Workflow</h2>
              <p className="text-sm text-slate-400">Import workflows created in n8n</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-orange-500/50 hover:bg-slate-800/50 transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                <p className="text-lg font-medium text-white mb-2">
                  Drop your n8n workflow file here
                </p>
                <p className="text-sm text-slate-400">
                  or click to browse for a .json file
                </p>
              </div>

              {/* Clipboard Option */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-sm text-slate-500">or</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>

              <button
                onClick={handlePasteFromClipboard}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-white"
              >
                <Download className="w-4 h-4" />
                Paste from Clipboard
              </button>

              {/* Info Box */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">How to export from n8n:</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-300/80">
                    <li>Open your workflow in n8n</li>
                    <li>Click the menu (three dots) and select "Download"</li>
                    <li>Save the JSON file and upload it here</li>
                  </ol>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && importResult && (
            <div className="space-y-6">
              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-slate-800">
                  <p className="text-2xl font-bold text-white">
                    {importResult.statistics.importedNodes}
                  </p>
                  <p className="text-sm text-slate-400">Nodes</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800">
                  <p className="text-2xl font-bold text-white">
                    {importResult.statistics.importedEdges}
                  </p>
                  <p className="text-sm text-slate-400">Connections</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800">
                  <p className="text-2xl font-bold text-white">
                    {importResult.statistics.executionTime}ms
                  </p>
                  <p className="text-sm text-slate-400">Parse Time</p>
                </div>
              </div>

              {/* Workflow Info */}
              {importResult.metadata && (
                <div className="p-4 rounded-lg bg-slate-800">
                  <h3 className="font-medium text-white mb-2">
                    {importResult.metadata.name}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {importResult.metadata.description}
                  </p>
                  {importResult.metadata.tags && importResult.metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {importResult.metadata.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 text-xs rounded-full bg-slate-700 text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Warnings */}
              {importResult.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-yellow-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Warnings ({importResult.warnings.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {importResult.warnings.map((warning, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm"
                      >
                        <p className="text-yellow-300">{warning.message}</p>
                        {warning.suggestion && (
                          <p className="text-yellow-400/70 mt-1 text-xs">
                            Suggestion: {warning.suggestion}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Errors ({importResult.errors.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {importResult.errors.map((error, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300"
                      >
                        {error.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-4" />
              <p className="text-lg font-medium text-white">Importing workflow...</p>
              <p className="text-sm text-slate-400">This will only take a moment</p>
            </div>
          )}

          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-lg font-medium text-white mb-2">Import Complete!</p>
              <p className="text-sm text-slate-400 text-center max-w-md">
                Your n8n workflow has been successfully imported.
                {importResult?.warnings.length ? (
                  <span className="block mt-2 text-yellow-400">
                    Note: {importResult.warnings.length} warning(s) were generated.
                    Please review node configurations.
                  </span>
                ) : null}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-700">
          {step === 'upload' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            >
              Cancel
            </button>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={resetState}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={!importResult?.success || isProcessing}
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Import Workflow
                  </>
                )}
              </button>
            </>
          )}

          {step === 'complete' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default N8nImportModal;
