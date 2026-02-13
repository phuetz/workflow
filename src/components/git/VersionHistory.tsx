/**
 * Version History Component
 * Display workflow version history from Git
 */

import React, { useState, useEffect } from 'react';
import { WorkflowVersion } from '../../types/git';
import { getVersionManager } from '../../git/VersionManager';
import { Clock, GitCommit, Tag, User, ChevronRight, RotateCcw } from 'lucide-react';

interface VersionHistoryProps {
  workflowId: string;
  repositoryId: string;
  onSelectVersion?: (version: WorkflowVersion) => void;
  onRollback?: (version: WorkflowVersion) => void;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  workflowId,
  repositoryId,
  onSelectVersion,
  onRollback,
}) => {
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  useEffect(() => {
    loadVersions();
  }, [workflowId, repositoryId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      setError(null);

      const versionManager = getVersionManager();
      const history = await versionManager.getVersionHistory(
        workflowId,
        repositoryId,
        50
      );

      setVersions(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleVersionClick = (version: WorkflowVersion) => {
    setSelectedVersion(version.id);
    onSelectVersion?.(version);
  };

  const handleRollback = (version: WorkflowVersion, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to rollback to version from ${version.timestamp.toLocaleString()}?`)) {
      onRollback?.(version);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
      }
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (days < 7) {
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getComplexityColor = (complexity: number) => {
    if (complexity < 10) return 'text-green-600';
    if (complexity < 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Error: {error}</p>
        <button
          onClick={loadVersions}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <GitCommit className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>No version history found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Version History</h3>
        <span className="text-sm text-gray-500">{versions.length} versions</span>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {versions.map((version, index) => (
          <div
            key={version.id}
            onClick={() => handleVersionClick(version)}
            className={`
              border rounded-lg p-4 cursor-pointer transition-all
              ${selectedVersion === version.id
                ? 'bg-blue-50 border-blue-500 shadow-md'
                : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
              }
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <GitCommit className="h-4 w-4 text-gray-500" />
                  <span className="font-mono text-sm text-gray-700">
                    {version.commitHash.substring(0, 7)}
                  </span>
                  {index === 0 && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                      Current
                    </span>
                  )}
                  {version.tag && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                      <Tag className="h-3 w-3" />
                      {version.tag}
                    </span>
                  )}
                  {version.metadata.production && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Production
                    </span>
                  )}
                  {version.metadata.stable && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                      Stable
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-900 mb-2 font-medium">
                  {version.message.split('\n')[0]}
                </p>

                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {version.author.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(version.timestamp)}
                  </span>
                  <span className={`font-medium ${getComplexityColor(version.metadata.complexity)}`}>
                    {version.metadata.nodeCount} nodes, {version.metadata.edgeCount} connections
                  </span>
                </div>

                {version.metadata.executionCount && version.metadata.executionCount > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    Executed {version.metadata.executionCount} times
                  </div>
                )}
              </div>

              {index > 0 && onRollback && (
                <button
                  onClick={(e) => handleRollback(version, e)}
                  className="ml-4 p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Rollback to this version"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </div>

            {selectedVersion === version.id && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-600 space-y-1">
                  <p><strong>Branch:</strong> {version.branch}</p>
                  <p><strong>Commit:</strong> {version.commitHash}</p>
                  {version.message.split('\n').length > 1 && (
                    <div className="mt-2 p-2 bg-gray-50 rounded">
                      <p className="whitespace-pre-wrap">{version.message.split('\n').slice(1).join('\n')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
