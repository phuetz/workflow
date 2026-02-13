/**
 * Documentation Generator Panel
 * UI component for generating workflow documentation
 */

import React, { useState } from 'react';
import { DocumentationGenerator } from '../../documentation/DocumentationGenerator';
import type { DocumentationConfig, DocumentationProgress } from '../../types/workflowDocumentation';
import { useWorkflowStore } from '../../store/workflowStore';

export const DocumentationGeneratorPanel: React.FC = () => {
  const { nodes, edges, currentWorkflowId, workflows, workflowName } = useWorkflowStore();

  // Build metadata from available store data
  const workflowMetadata = React.useMemo(() => {
    const currentWorkflow = currentWorkflowId ? workflows[currentWorkflowId] : null;
    return {
      id: currentWorkflowId || 'workflow',
      name: currentWorkflow?.name || workflowName || 'Untitled Workflow',
      description: currentWorkflow?.description,
      version: currentWorkflow?.version || '1.0.0',
      tags: currentWorkflow?.tags || [],
      createdAt: currentWorkflow?.createdAt,
      updatedAt: currentWorkflow?.updatedAt,
    };
  }, [currentWorkflowId, workflows, workflowName]);
  const [config, setConfig] = useState<DocumentationConfig>(DocumentationGenerator.getDefaultConfig());
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<DocumentationProgress | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generator = React.useMemo(() => new DocumentationGenerator(), []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const taskId = `task_${Date.now()}`;

      // Register progress callback
      generator.onProgress(taskId, (p) => {
        setProgress(p);
      });

      // Generate documentation
      const doc = await generator.generate(
        workflowMetadata.id,
        nodes,
        edges,
        config,
        workflowMetadata
      );

      setResult(doc.content);

      // Auto-download based on format
      if (config.format !== 'html') {
        downloadDocumentation(doc.content, config.format);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  };

  const downloadDocumentation = (content: string, format: string) => {
    const extensions: Record<string, string> = {
      markdown: 'md',
      json: 'json',
      openapi: 'yaml',
      html: 'html',
      pdf: 'pdf',
    };

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-documentation.${extensions[format] || 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const estimatedTime = React.useMemo(() => {
    return generator.estimateGenerationTime(nodes.length, config.format);
  }, [nodes.length, config.format, generator]);

  return (
    <div className="documentation-generator-panel">
      <div className="panel-header">
        <h2>Generate Documentation</h2>
        <p className="subtitle">
          Auto-generate comprehensive documentation for your workflow
        </p>
      </div>

      <div className="panel-content">
        {/* Format Selection */}
        <div className="form-group">
          <label htmlFor="format">Output Format</label>
          <select
            id="format"
            value={config.format}
            onChange={(e) =>
              setConfig({ ...config, format: e.target.value as any })
            }
            disabled={generating}
          >
            <option value="markdown">Markdown (GitHub-flavored)</option>
            <option value="html">HTML (Static Site)</option>
            <option value="json">JSON (Structured Data)</option>
            <option value="openapi">OpenAPI (API Spec)</option>
            <option value="pdf">PDF (Printable)</option>
          </select>
        </div>

        {/* Content Options */}
        <div className="form-group">
          <label>Include in Documentation</label>
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={config.includeNodeDetails}
                onChange={(e) =>
                  setConfig({ ...config, includeNodeDetails: e.target.checked })
                }
                disabled={generating}
              />
              Node Details & Configuration
            </label>
            <label>
              <input
                type="checkbox"
                checked={config.includeVariables}
                onChange={(e) =>
                  setConfig({ ...config, includeVariables: e.target.checked })
                }
                disabled={generating}
              />
              Variables
            </label>
            <label>
              <input
                type="checkbox"
                checked={config.includeExamples}
                onChange={(e) =>
                  setConfig({ ...config, includeExamples: e.target.checked })
                }
                disabled={generating}
              />
              Input/Output Examples
            </label>
            <label>
              <input
                type="checkbox"
                checked={config.includeAPISpecs}
                onChange={(e) =>
                  setConfig({ ...config, includeAPISpecs: e.target.checked })
                }
                disabled={generating}
              />
              API Documentation
            </label>
          </div>
        </div>

        {/* Diagram Options */}
        <div className="form-group">
          <label>Diagram Settings</label>
          <div className="diagram-options">
            <label>
              <input
                type="checkbox"
                checked={config.embedDiagrams}
                onChange={(e) =>
                  setConfig({ ...config, embedDiagrams: e.target.checked })
                }
                disabled={generating}
              />
              Embed Diagrams
            </label>

            <div className="select-group">
              <label htmlFor="diagramLayout">Layout</label>
              <select
                id="diagramLayout"
                value={config.diagramLayout}
                onChange={(e) =>
                  setConfig({ ...config, diagramLayout: e.target.value as any })
                }
                disabled={generating}
              >
                <option value="auto">Auto</option>
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
                <option value="hierarchical">Hierarchical</option>
              </select>
            </div>

            <div className="select-group">
              <label htmlFor="colorScheme">Color Scheme</label>
              <select
                id="colorScheme"
                value={config.colorScheme}
                onChange={(e) =>
                  setConfig({ ...config, colorScheme: e.target.value as any })
                }
                disabled={generating}
              >
                <option value="category">By Category</option>
                <option value="status">By Status</option>
                <option value="default">Default</option>
              </select>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="form-group">
          <label htmlFor="author">Author (optional)</label>
          <input
            id="author"
            type="text"
            value={config.author || ''}
            onChange={(e) => setConfig({ ...config, author: e.target.value })}
            placeholder="Your name"
            disabled={generating}
          />
        </div>

        {/* Statistics */}
        <div className="stats-bar">
          <div className="stat">
            <span className="label">Nodes:</span>
            <span className="value">{nodes.length}</span>
          </div>
          <div className="stat">
            <span className="label">Connections:</span>
            <span className="value">{edges.length}</span>
          </div>
          <div className="stat">
            <span className="label">Est. Time:</span>
            <span className="value">{estimatedTime.toFixed(0)}ms</span>
          </div>
        </div>

        {/* Progress */}
        {progress && (
          <div className="progress-bar">
            <div className="progress-label">
              {progress.currentStep} ({progress.progress}%)
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Actions */}
        <div className="actions">
          <button
            onClick={handleGenerate}
            disabled={generating || nodes.length === 0}
            className="btn btn-primary"
          >
            {generating ? 'Generating...' : 'Generate Documentation'}
          </button>

          {result && config.format === 'html' && (
            <button
              onClick={() => {
                const win = window.open();
                win?.document.write(result);
              }}
              className="btn btn-secondary"
            >
              Preview HTML
            </button>
          )}
        </div>

        {/* Preview */}
        {result && config.format === 'markdown' && (
          <div className="preview">
            <h3>Preview</h3>
            <pre className="preview-content">{result.substring(0, 1000)}...</pre>
          </div>
        )}

        {result && config.format === 'json' && (
          <div className="preview">
            <h3>Preview</h3>
            <pre className="preview-content">
              {JSON.stringify(JSON.parse(result), null, 2).substring(0, 1000)}...
            </pre>
          </div>
        )}
      </div>

      <style>{`
        .documentation-generator-panel {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }

        .panel-header {
          margin-bottom: 24px;
        }

        .panel-header h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 600;
        }

        .subtitle {
          margin: 0;
          color: #666;
        }

        .panel-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-weight: 500;
          font-size: 14px;
        }

        .form-group select,
        .form-group input[type="text"] {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-left: 8px;
        }

        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 400;
        }

        .diagram-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-left: 8px;
        }

        .select-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stats-bar {
          display: flex;
          gap: 24px;
          padding: 12px;
          background: #f5f5f5;
          border-radius: 4px;
        }

        .stat {
          display: flex;
          gap: 8px;
        }

        .stat .label {
          font-weight: 500;
        }

        .stat .value {
          color: #2196F3;
          font-weight: 600;
        }

        .progress-bar {
          padding: 12px;
          background: #f5f5f5;
          border-radius: 4px;
        }

        .progress-label {
          font-size: 14px;
          margin-bottom: 8px;
          color: #666;
        }

        .progress-track {
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #2196F3;
          transition: width 0.3s ease;
        }

        .error-message {
          padding: 12px;
          background: #ffebee;
          border: 1px solid #ef5350;
          border-radius: 4px;
          color: #c62828;
        }

        .actions {
          display: flex;
          gap: 12px;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #2196F3;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #1976D2;
        }

        .btn-secondary {
          background: #f5f5f5;
          color: #333;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e0e0e0;
        }

        .preview {
          margin-top: 12px;
        }

        .preview h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .preview-content {
          padding: 16px;
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 12px;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
};

export default DocumentationGeneratorPanel;
