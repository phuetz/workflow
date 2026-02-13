import React, { useState, useEffect } from 'react';
import { Upload, Download, Package, AlertCircle, Check, X, Loader, Copy, ExternalLink, Archive, History } from 'lucide-react';
import { ImportExportService } from '../../services/ImportExportService';
import type { 
  WorkflowExport, 
  ExportFormat, 
  ImportResult, 
  ImportSource,
  ExportOptions,
  ImportOptions,
  BulkExport,
  ExportTemplate
} from '../../types/importExport';
import { useWorkflowStore } from '../../store/workflowStore';
import { format } from 'date-fns';
import { logger } from '../../services/SimpleLogger';

const importExportService = ImportExportService.getInstance();

interface ImportExportDashboardProps {
  workflowId?: string;
  onImportComplete?: (workflowId: string) => void;
}

export const ImportExportDashboard: React.FC<ImportExportDashboardProps> = ({
  workflowId,
  onImportComplete
}) => {
  const { workflows: workflowsObject = {} } = useWorkflowStore();
  // Convert workflows object to array for iteration
  const workflows = Object.values(workflowsObject);
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'bulk' | 'history'>('export');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeCredentials: false,
    includeCustomNodes: false,
    includeEnvironment: false,
    compression: 'none'
  });
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    format: 'json',
    overwriteExisting: false,
    importCredentials: true,
    importCustomNodes: true,
    importEnvironment: true,
    validation: {
      validateNodeTypes: true,
      validateConnections: true,
      validateCredentials: true,
      strictMode: false
    }
  });
  const [exportTemplates, setExportTemplates] = useState<ExportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [bulkExports, setBulkExports] = useState<BulkExport[]>([]);
  const [exportHistory, setExportHistory] = useState<WorkflowExport[]>([]);
  const [importHistory, setImportHistory] = useState<ImportResult[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [importText, setImportText] = useState('');
  const [importSource, setImportSource] = useState<'file' | 'url' | 'text' | 'clipboard'>('file');
  const [importPreview, setImportPreview] = useState<WorkflowExport | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedWorkflows, setSelectedWorkflows] = useState<Set<string>>(new Set());


  useEffect(() => {
    loadExportTemplates();
    loadHistory();
  }, []);

  const loadExportTemplates = () => {
    // Load predefined templates
    const templates: ExportTemplate[] = [
      {
        id: 'basic',
        name: 'Basic Export',
        description: 'Export workflow without credentials',
        format: 'json',
        includeCredentials: false,
        includeCustomNodes: false,
        includeEnvironment: false
      },
      {
        id: 'full',
        name: 'Full Export',
        description: 'Export everything including credentials',
        format: 'json',
        includeCredentials: true,
        includeCustomNodes: true,
        includeEnvironment: true
      },
      {
        id: 'migration',
        name: 'Migration Export',
        description: 'Optimized for platform migration',
        format: 'json',
        includeCredentials: true,
        includeCustomNodes: true,
        includeEnvironment: true,
        transformations: [{
          type: 'sanitize',
          config: { removeExecutionData: true }
        }]
      }
    ];
    setExportTemplates(templates);
  };

  const loadHistory = async () => {
    const [expHistory, impHistory] = await Promise.all([
      importExportService.getExportHistory(),
      importExportService.getImportHistory()
    ]);
    setExportHistory(expHistory);
    setImportHistory(impHistory);
  };

  const handleExport = async () => {
    if (!workflowId) return;
    
    setIsExporting(true);
    try {
      const exported = await importExportService.exportWorkflow(
        workflowId,
        selectedFormat,
        exportOptions
      );
      
      await importExportService.downloadExport(exported);
      loadHistory();
    } catch (error) {
      logger.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleBulkExport = async () => {
    if (selectedWorkflows.size === 0) return;
    
    setIsExporting(true);
    try {
      const exported = await importExportService.exportBulk(
        Array.from(selectedWorkflows),
        selectedFormat,
        exportOptions
      );
      setBulkExports(prev => [...prev, exported]);
      
      // Poll for completion
      const pollInterval = setInterval(async () => {
        const updated = await importExportService.getBulkExportStatus(exported.id);
        setBulkExports(prev => prev.map(be => 
          be.id === exported.id ? updated : be
        ));
        
        if (updated.status === 'completed' || updated.status === 'failed') {
          clearInterval(pollInterval);
          setIsExporting(false);
        }
      }, 1000);
    } catch (error) {
      logger.error('Bulk export failed:', error);
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportResult(null);
    
    try {
      let source: ImportSource;
      
      switch (importSource) {
        case 'file':
          if (!importFile) return;
          source = { type: 'file', data: importFile };
          break;
        case 'url':
          if (!importUrl) return;
          source = { type: 'url', data: new URL(importUrl) };
          break;
        case 'text':
          if (!importText) return;
          source = { type: 'text', data: importText };
          break;
        case 'clipboard':
          source = { type: 'clipboard', data: '' };
          break;
      }
      
      const result = await importExportService.importWorkflow(source, importOptions);
      setImportResult(result);
      
      if (result.success && result.workflowId && onImportComplete) {
        onImportComplete(result.workflowId);
      }
      
      loadHistory();
    } catch (error) {
      logger.error('Import failed:', error);
      setImportResult({
        success: false,
        errors: [{
          type: 'invalid_format',
          message: error instanceof Error ? error.message : 'Import failed'
        }],
        warnings: [],
        statistics: {
          totalNodes: 0,
          importedNodes: 0,
          totalEdges: 0,
          importedEdges: 0,
          totalCredentials: 0,
          importedCredentials: 0,
          executionTime: 0
        },
        mappingsApplied: {}
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (file) {
      setImportFile(file);
      previewImport({ type: 'file', data: file });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const previewImport = async (source: any) => {
    try {
      const preview = await importExportService.previewImport(source);
      setImportPreview(preview);
    } catch (error) {
      logger.error('Failed to preview import:', error);
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = exportTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedFormat(template.format);
      setExportOptions({
        includeCredentials: template.includeCredentials,
        includeCustomNodes: template.includeCustomNodes,
        includeEnvironment: template.includeEnvironment,
        compression: 'none'
      });
      setSelectedTemplate(templateId);
    }
  };

  const toggleWorkflowSelection = (id: string) => {
    setSelectedWorkflows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderExportTab = () => (
    <div className="space-y-6">
      {workflowId ? (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Export Workflow</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Export Format</label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="json">JSON</option>
                <option value="yaml">YAML</option>
                <option value="n8n">n8n</option>
                <option value="zapier">Zapier</option>
                <option value="make">Make (Integromat)</option>
                <option value="powerautomate">Power Automate</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Export Template</label>
              <div className="grid grid-cols-3 gap-3">
                {exportTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template.id)}
                    className={`p-3 border rounded-lg text-left hover:bg-gray-50 ${
                      selectedTemplate === template.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm text-gray-600">{template.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium">Export Options</label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeCredentials}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    includeCredentials: e.target.checked
                  }))}
                  className="rounded"
                />
                <span className="text-sm">Include credentials (encrypted)</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeCustomNodes}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    includeCustomNodes: e.target.checked
                  }))}
                  className="rounded"
                />
                <span className="text-sm">Include custom nodes</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeEnvironment}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    includeEnvironment: e.target.checked
                  }))}
                  className="rounded"
                />
                <span className="text-sm">Include environment configuration</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Compression</label>
              <select
                value={exportOptions.compression || 'none'}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  compression: e.target.value as 'none' | 'gzip' | 'zip'
                }))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="none">None</option>
                <option value="gzip">GZIP</option>
                <option value="zip">ZIP</option>
              </select>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export Workflow
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select a workflow to export</p>
        </div>
      )}
    </div>
  );

  const renderImportTab = () => (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Import Workflow</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Import Source</label>
            <div className="flex gap-2">
              {(['file', 'url', 'text', 'clipboard'] as const).map(source => (
                <button
                  key={source}
                  onClick={() => setImportSource(source)}
                  className={`px-4 py-2 rounded-lg ${
                    importSource === source 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {source.charAt(0).toUpperCase() + source.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {importSource === 'file' && (
            <div>
              <label className="block text-sm font-medium mb-2">Select File</label>
              <input
                type="file"
                accept=".json,.yaml,.yml"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          )}

          {importSource === 'url' && (
            <div>
              <label className="block text-sm font-medium mb-2">URL</label>
              <input
                type="url"
                value={importUrl}
                onChange={(e) => {
                  setImportUrl(e.target.value);
                  if (e.target.value) {
                    previewImport({ type: 'url', data: new URL(e.target.value) });
                  }
                }}
                placeholder="https://example.com/workflow.json"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          )}

          {importSource === 'text' && (
            <div>
              <label className="block text-sm font-medium mb-2">Paste Workflow Data</label>
              <textarea
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  if (e.target.value) {
                    previewImport({ type: 'text', data: e.target.value });
                  }
                }}
                rows={10}
                className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                placeholder="Paste JSON or YAML workflow data here..."
              />
            </div>
          )}

          {importSource === 'clipboard' && (
            <div className="text-center py-4">
              <button
                onClick={async () => {
                  try {
                    const clipboardText = await navigator.clipboard.readText();
                    previewImport({ type: 'clipboard', data: clipboardText });
                  } catch (error) {
                    logger.error('Failed to read from clipboard:', error);
                  }
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Read from Clipboard
              </button>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-sm font-medium">Import Options</label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={importOptions.overwriteExisting}
                onChange={(e) => setImportOptions(prev => ({
                  ...prev,
                  overwriteExisting: e.target.checked
                }))}
                className="rounded"
              />
              <span className="text-sm">Overwrite existing workflow</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={importOptions.importCredentials}
                onChange={(e) => setImportOptions(prev => ({
                  ...prev,
                  importCredentials: e.target.checked
                }))}
                className="rounded"
              />
              <span className="text-sm">Import credentials</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={importOptions.validation?.strictMode}
                onChange={(e) => setImportOptions(prev => ({
                  ...prev,
                  validation: {
                    ...prev.validation!,
                    strictMode: e.target.checked
                  }
                }))}
                className="rounded"
              />
              <span className="text-sm">Strict validation mode</span>
            </label>
          </div>

          {importPreview && (
            <div className="bg-gray-50 border rounded-lg p-4">
              <h4 className="font-medium mb-2">Import Preview</h4>
              <div className="space-y-2 text-sm">
                <div>Name: {importPreview.name}</div>
                <div>Nodes: {importPreview.nodes.length}</div>
                <div>Connections: {importPreview.edges.length}</div>
                <div>Format: {importPreview.format}</div>
                <div>Version: {importPreview.version}</div>
              </div>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={isImporting || !importPreview}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isImporting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import Workflow
              </>
            )}
          </button>

          {importResult && (
            <div className={`border rounded-lg p-4 ${
              importResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {importResult.success ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <X className="w-5 h-5 text-red-600" />
                )}
                <span className={`font-medium ${
                  importResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {importResult.success ? 'Import Successful' : 'Import Failed'}
                </span>
              </div>
              
              {importResult.statistics && (
                <div className="text-sm space-y-1">
                  <div>Imported {importResult.statistics.importedNodes} of {importResult.statistics.totalNodes} nodes</div>
                  <div>Imported {importResult.statistics.importedEdges} of {importResult.statistics.totalEdges} connections</div>
                  {importResult.statistics.totalCredentials > 0 && (
                    <div>Imported {importResult.statistics.importedCredentials} of {importResult.statistics.totalCredentials} credentials</div>
                  )}
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="mt-3">
                  <div className="font-medium text-red-700">Errors:</div>
                  {importResult.errors.map((error, idx) => (
                    <div key={idx} className="text-sm text-red-600">
                      • {error.message}
                    </div>
                  ))}
                </div>
              )}

              {importResult.warnings.length > 0 && (
                <div className="mt-3">
                  <div className="font-medium text-yellow-700">Warnings:</div>
                  {importResult.warnings.map((warning, idx) => (
                    <div key={idx} className="text-sm text-yellow-600">
                      • {warning.message}
                      {warning.suggestion && (
                        <div className="ml-4 text-gray-600">{warning.suggestion}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderBulkTab = () => (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Bulk Export</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Workflows ({selectedWorkflows.size} selected)
            </label>
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {workflows.map(workflow => (
                <label
                  key={workflow.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedWorkflows.has(workflow.id)}
                    onChange={() => toggleWorkflowSelection(workflow.id)}
                    className="rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{workflow.name}</div>
                    <div className="text-sm text-gray-600">
                      {workflow.nodes?.length || 0} nodes · 
                      Updated {format(workflow.updatedAt, 'PPp')}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleBulkExport}
            disabled={isExporting || selectedWorkflows.size === 0}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                Export Selected Workflows
              </>
            )}
          </button>
        </div>
      </div>

      {bulkExports.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Bulk Export History</h3>
          <div className="space-y-3">
            {bulkExports.map(be => (
              <div key={be.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{be.name}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    be.status === 'completed' ? 'bg-green-100 text-green-700' :
                    be.status === 'failed' ? 'bg-red-100 text-red-700' :
                    be.status === 'running' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {be.status}
                  </span>
                </div>
                {be.status === 'running' && (
                  <div className="mb-2">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${be.progress}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="text-sm text-gray-600">
                  {be.workflows.length} workflows · {be.format.toUpperCase()}
                </div>
                {be.result && (
                  <button className="mt-2 text-sm text-blue-600 hover:underline">
                    Download ({(be.result.size / 1024 / 1024).toFixed(2)} MB)
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Export History</h3>
        <div className="space-y-3">
          {exportHistory.map(exp => (
            <div key={exp.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">{exp.name}</div>
                <div className="text-sm text-gray-600">
                  {exp.format.toUpperCase()} · {format(exp.exportedAt, 'PPp')}
                </div>
              </div>
              <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Import History</h3>
        <div className="space-y-3">
          {importHistory.map((imp, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="flex items-center gap-2">
                  {imp.success ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-600" />
                  )}
                  <span className="font-medium">
                    {imp.workflowId || 'Import attempt'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {imp.statistics.importedNodes} nodes · 
                  {imp.statistics.importedEdges} connections
                </div>
              </div>
              {imp.workflowId && (
                <button 
                  onClick={() => onImportComplete?.(imp.workflowId!)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Import & Export</h2>
          <p className="text-gray-600">Export workflows to various formats or import from other platforms</p>
        </div>

        <div className="mb-6">
          <div className="flex gap-2 bg-white p-2 rounded-lg shadow-sm">
            {(['export', 'import', 'bulk', 'history'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded ${
                  activeTab === tab 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab === 'export' && <Download className="w-4 h-4 inline mr-2" />}
                {tab === 'import' && <Upload className="w-4 h-4 inline mr-2" />}
                {tab === 'bulk' && <Archive className="w-4 h-4 inline mr-2" />}
                {tab === 'history' && <History className="w-4 h-4 inline mr-2" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'export' && renderExportTab()}
        {activeTab === 'import' && renderImportTab()}
        {activeTab === 'bulk' && renderBulkTab()}
        {activeTab === 'history' && renderHistoryTab()}
      </div>
    </div>
  );
};