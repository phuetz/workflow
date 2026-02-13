/**
 * Version Comparison Component
 * Visual diff viewer for comparing workflow versions
 */

import React, { useState, useEffect } from 'react';
import {
  getVersioningService,
  WorkflowVersion
} from '../../services/WorkflowVersioningService';
import {
  getDiffService,
  WorkflowDiff,
  NodeDiff,
  EdgeDiff,
  ComparisonResult
} from '../../services/WorkflowDiffService';
import { logger } from '../../services/SimpleLogger';
import { useToast } from '../ui/Toast';

interface VersionComparisonProps {
  workflowId: string;
  version1?: number;
  version2?: number;
  branch?: string;
}

export const VersionComparison: React.FC<VersionComparisonProps> = ({
  workflowId,
  version1: initialVersion1,
  version2: initialVersion2,
  branch = 'main'
}) => {
  const toast = useToast();
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [version1, setVersion1] = useState<number | null>(initialVersion1 || null);
  const [version2, setVersion2] = useState<number | null>(initialVersion2 || null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'visual' | 'json' | 'unified'>('visual');
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [jsonDiff, setJsonDiff] = useState<string>('');
  const [unifiedDiff, setUnifiedDiff] = useState<string>('');

  const versioningService = getVersioningService();
  const diffService = getDiffService();

  useEffect(() => {
    loadVersions();
  }, [workflowId, branch]);

  useEffect(() => {
    if (version1 !== null && version2 !== null) {
      compareVersions();
    }
  }, [version1, version2]);

  const loadVersions = async () => {
    try {
      const history = await versioningService.getVersionHistory(workflowId, branch);
      setVersions(history.versions);

      // Auto-select latest two versions if not specified
      if (!version1 && !version2 && history.versions.length >= 2) {
        setVersion1(history.versions[1].version);
        setVersion2(history.versions[0].version);
      }
    } catch (error) {
      logger.error('Failed to load versions', { error });
    }
  };

  const compareVersions = async () => {
    if (version1 === null || version2 === null) return;

    try {
      setLoading(true);

      const v1 = await versioningService.getVersion(workflowId, version1, branch);
      const v2 = await versioningService.getVersion(workflowId, version2, branch);

      if (!v1 || !v2) {
        throw new Error('Version not found');
      }

      const result = await diffService.compareSnapshots(v1.snapshot, v2.snapshot);
      setComparison(result);

      // Generate JSON diff
      const json = await diffService.generateJsonDiff(v1.snapshot, v2.snapshot);
      setJsonDiff(json);

      // Generate unified diff
      const unified = await diffService.generateUnifiedDiff(v1.snapshot, v2.snapshot);
      setUnifiedDiff(unified);
    } catch (error) {
      logger.error('Failed to compare versions', { error });
      toast.error('Failed to compare versions. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  const renderNodeDiff = (nodeDiff: NodeDiff) => {
    const colors = {
      added: 'bg-green-50 border-green-500',
      removed: 'bg-red-50 border-red-500',
      modified: 'bg-yellow-50 border-yellow-500',
      unchanged: 'bg-gray-50 border-gray-300'
    };

    const textColors = {
      added: 'text-green-800',
      removed: 'text-red-800',
      modified: 'text-yellow-800',
      unchanged: 'text-gray-800'
    };

    if (!showUnchanged && nodeDiff.type === 'unchanged') return null;

    return (
      <div
        key={nodeDiff.nodeId}
        className={`border-l-4 p-3 mb-2 rounded ${colors[nodeDiff.type]}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className={`text-xs font-bold uppercase ${textColors[nodeDiff.type]}`}>
              {nodeDiff.type}
            </span>
            <span className="font-mono text-sm">{nodeDiff.nodeId}</span>
          </div>
        </div>

        {nodeDiff.changes && nodeDiff.changes.length > 0 && (
          <div className="mt-2 space-y-1 text-sm">
            {nodeDiff.changes.map((change, idx) => (
              <div key={idx} className="bg-white p-2 rounded">
                <div className="font-medium text-gray-700">{change.property}</div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="bg-red-50 p-2 rounded">
                    <div className="text-xs text-red-600 font-medium mb-1">Old</div>
                    <code className="text-xs">{JSON.stringify(change.oldValue)}</code>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <div className="text-xs text-green-600 font-medium mb-1">New</div>
                    <code className="text-xs">{JSON.stringify(change.newValue)}</code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderEdgeDiff = (edgeDiff: EdgeDiff) => {
    const colors = {
      added: 'bg-green-100 text-green-800',
      removed: 'bg-red-100 text-red-800',
      modified: 'bg-yellow-100 text-yellow-800',
      unchanged: 'bg-gray-100 text-gray-800'
    };

    if (!showUnchanged && edgeDiff.type === 'unchanged') return null;

    return (
      <div
        key={edgeDiff.edgeId}
        className={`inline-block px-3 py-1 rounded-full text-sm mr-2 mb-2 ${colors[edgeDiff.type]}`}
      >
        {edgeDiff.type.toUpperCase()}: {edgeDiff.edgeId}
      </div>
    );
  };

  const renderVisualDiff = () => {
    if (!comparison) return null;

    const stats = {
      additions:
        comparison.diff.summary.nodesAdded + comparison.diff.summary.edgesAdded,
      deletions:
        comparison.diff.summary.nodesRemoved + comparison.diff.summary.edgesRemoved,
      modifications:
        comparison.diff.summary.nodesModified + comparison.diff.summary.edgesModified
    };

    return (
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <div className="text-2xl font-bold text-green-800">{stats.additions}</div>
            <div className="text-sm text-green-600">Additions</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <div className="text-2xl font-bold text-red-800">{stats.deletions}</div>
            <div className="text-sm text-red-600">Deletions</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <div className="text-2xl font-bold text-yellow-800">
              {stats.modifications}
            </div>
            <div className="text-sm text-yellow-600">Modifications</div>
          </div>
        </div>

        {/* Conflicts */}
        {comparison.conflicts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <h3 className="font-semibold text-red-800 mb-2">
              Conflicts ({comparison.conflicts.length})
            </h3>
            <div className="space-y-2">
              {comparison.conflicts.map((conflict, idx) => (
                <div key={idx} className="bg-white p-3 rounded">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-medium text-red-600 uppercase">
                      {conflict.type}
                    </span>
                    <span className="text-sm font-mono">{conflict.resourceId}</span>
                  </div>
                  <div className="text-sm text-gray-700">{conflict.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {comparison.recommendations.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Recommendations</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
              {comparison.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Node Differences */}
        <div>
          <h3 className="text-lg font-semibold mb-3">
            Node Changes ({comparison.diff.nodes.length})
          </h3>
          <div>{comparison.diff.nodes.map(renderNodeDiff)}</div>
        </div>

        {/* Edge Differences */}
        {comparison.diff.edges.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">
              Edge Changes ({comparison.diff.edges.length})
            </h3>
            <div>{comparison.diff.edges.map(renderEdgeDiff)}</div>
          </div>
        )}

        {/* Variable Changes */}
        {comparison.diff.variables && comparison.diff.variables.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Variable Changes</h3>
            <div className="space-y-2">
              {comparison.diff.variables.map((change, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded">
                  <div className="font-medium text-gray-700 mb-2">
                    {change.property}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-red-50 p-2 rounded">
                      <div className="text-xs text-red-600 font-medium mb-1">Old</div>
                      <code className="text-xs">{JSON.stringify(change.oldValue)}</code>
                    </div>
                    <div className="bg-green-50 p-2 rounded">
                      <div className="text-xs text-green-600 font-medium mb-1">New</div>
                      <code className="text-xs">{JSON.stringify(change.newValue)}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderJsonDiff = () => {
    return (
      <div className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto max-h-screen">
        <pre className="text-sm font-mono whitespace-pre">{jsonDiff}</pre>
      </div>
    );
  };

  const renderUnifiedDiff = () => {
    const lines = unifiedDiff.split('\n');

    return (
      <div className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto max-h-screen">
        <pre className="text-sm font-mono">
          {lines.map((line, idx) => {
            let className = 'text-gray-300';
            if (line.startsWith('+')) className = 'text-green-400 bg-green-900 bg-opacity-20';
            if (line.startsWith('-')) className = 'text-red-400 bg-red-900 bg-opacity-20';

            return (
              <div key={idx} className={className}>
                {line}
              </div>
            );
          })}
        </pre>
      </div>
    );
  };

  return (
    <div className="version-comparison bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Version Comparison</h2>

        {/* Version Selectors */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Version 1 (Base)
            </label>
            <select
              value={version1 || ''}
              onChange={(e) => setVersion1(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="">Select version...</option>
              {versions.map(v => (
                <option key={v.id} value={v.version}>
                  v{v.version} - {new Date(v.metadata.timestamp).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Version 2 (Compare)
            </label>
            <select
              value={version2 || ''}
              onChange={(e) => setVersion2(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="">Select version...</option>
              {versions.map(v => (
                <option key={v.id} value={v.version}>
                  v{v.version} - {new Date(v.metadata.timestamp).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex items-center space-x-4">
          <div className="flex border border-gray-300 rounded overflow-hidden">
            <button
              onClick={() => setViewMode('visual')}
              className={`px-4 py-2 text-sm ${
                viewMode === 'visual'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Visual
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={`px-4 py-2 text-sm border-l border-gray-300 ${
                viewMode === 'json'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              JSON
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`px-4 py-2 text-sm border-l border-gray-300 ${
                viewMode === 'unified'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Unified
            </button>
          </div>

          {viewMode === 'visual' && (
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={showUnchanged}
                onChange={(e) => setShowUnchanged(e.target.checked)}
                className="rounded"
              />
              <span>Show unchanged</span>
            </label>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Comparison Results */}
      {!loading && comparison && (
        <div className="mt-6">
          {viewMode === 'visual' && renderVisualDiff()}
          {viewMode === 'json' && renderJsonDiff()}
          {viewMode === 'unified' && renderUnifiedDiff()}
        </div>
      )}

      {/* Empty State */}
      {!loading && !comparison && version1 !== null && version2 !== null && (
        <div className="text-center text-gray-500 py-8">
          Select two versions to compare
        </div>
      )}
    </div>
  );
};

export default VersionComparison;
