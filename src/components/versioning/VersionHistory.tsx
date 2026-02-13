/**
 * Version History Component
 * Displays version timeline with metadata and actions
 */

import React, { useState, useEffect } from 'react';
import {
  getVersioningService,
  WorkflowVersion,
  VersionHistory as VersionHistoryType
} from '../../services/WorkflowVersioningService';
import { logger } from '../../services/SimpleLogger';
import { useToast } from '../ui/Toast';

interface VersionHistoryProps {
  workflowId: string;
  branch?: string;
  onVersionSelect?: (version: WorkflowVersion) => void;
  onVersionRestore?: (version: number) => void;
  onVersionTag?: (version: number, tag: string) => void;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  workflowId,
  branch,
  onVersionSelect,
  onVersionRestore,
  onVersionTag
}) => {
  const toast = useToast();
  const [history, setHistory] = useState<VersionHistoryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [showTagModal, setShowTagModal] = useState<number | null>(null);
  const [filterTags, setFilterTags] = useState<string[]>([]);

  const versioningService = getVersioningService();

  useEffect(() => {
    loadHistory();
  }, [workflowId, branch]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const hist = await versioningService.getVersionHistory(workflowId, branch);
      setHistory(hist);
    } catch (error) {
      logger.error('Failed to load version history', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleVersionClick = (version: WorkflowVersion) => {
    setSelectedVersion(version.version);
    if (onVersionSelect) {
      onVersionSelect(version);
    }
  };

  const handleRestore = async (version: number) => {
    if (window.confirm(`Are you sure you want to restore to version ${version}?`)) {
      try {
        await versioningService.restoreVersion({
          workflowId,
          version,
          branch: branch || 'main',
          createBackup: true
        });

        if (onVersionRestore) {
          onVersionRestore(version);
        }

        await loadHistory();
      } catch (error) {
        logger.error('Failed to restore version', { error });
        toast.error('Failed to restore version. See console for details.');
      }
    }
  };

  const handleAddTag = async (version: number) => {
    if (!tagInput.trim()) return;

    try {
      await versioningService.tagVersion(
        workflowId,
        version,
        tagInput.trim(),
        branch || 'main'
      );

      if (onVersionTag) {
        onVersionTag(version, tagInput.trim());
      }

      setTagInput('');
      setShowTagModal(null);
      await loadHistory();
    } catch (error) {
      logger.error('Failed to add tag', { error });
      toast.error('Failed to add tag. See console for details.');
    }
  };

  const handleRemoveTag = async (version: number, tag: string) => {
    try {
      await versioningService.untagVersion(
        workflowId,
        version,
        tag,
        branch || 'main'
      );
      await loadHistory();
    } catch (error) {
      logger.error('Failed to remove tag', { error });
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredVersions = history?.versions.filter(v => {
    if (filterTags.length === 0) return true;
    return filterTags.some(tag => v.metadata.tags.includes(tag));
  }) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!history) {
    return (
      <div className="text-center text-gray-500 py-8">
        No version history available
      </div>
    );
  }

  return (
    <div className="version-history bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Version History</h2>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Current:</span> v{history.currentVersion} on{' '}
            <span className="font-mono bg-gray-100 px-2 py-1 rounded">
              {history.currentBranch}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">{history.versions.length}</span> versions
          </div>
        </div>
      </div>

      {/* Tag Filter */}
      {history.versions.some(v => v.metadata.tags.length > 0) && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by tags:
          </label>
          <div className="flex flex-wrap gap-2">
            {Array.from(
              new Set(history.versions.flatMap(v => v.metadata.tags))
            ).map(tag => (
              <button
                key={tag}
                onClick={() => {
                  if (filterTags.includes(tag)) {
                    setFilterTags(filterTags.filter(t => t !== tag));
                  } else {
                    setFilterTags([...filterTags, tag]);
                  }
                }}
                className={`px-3 py-1 rounded-full text-sm ${
                  filterTags.includes(tag)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {tag}
              </button>
            ))}
            {filterTags.length > 0 && (
              <button
                onClick={() => setFilterTags([])}
                className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-700 hover:bg-red-200"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Version Timeline */}
      <div className="space-y-4">
        {filteredVersions.map((version, index) => {
          const isSelected = selectedVersion === version.version;
          const isCurrent = version.version === history.currentVersion;

          return (
            <div
              key={version.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
              onClick={() => handleVersionClick(version)}
            >
              {/* Version Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div
                    className={`text-lg font-bold ${
                      isCurrent ? 'text-green-600' : 'text-gray-800'
                    }`}
                  >
                    v{version.version}
                  </div>
                  {isCurrent && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                      CURRENT
                    </span>
                  )}
                  <span className="text-xs text-gray-500 font-mono">
                    {version.checksum}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTagModal(version.version);
                    }}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    title="Add tag"
                  >
                    + Tag
                  </button>
                  {!isCurrent && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(version.version);
                      }}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="text-sm text-gray-600 mb-2">
                <div className="flex items-center space-x-4">
                  <span>
                    <span className="font-medium">By:</span> {version.metadata.createdBy}
                  </span>
                  <span>
                    <span className="font-medium">Date:</span>{' '}
                    {formatDate(version.metadata.timestamp)}
                  </span>
                  <span>
                    <span className="font-medium">Size:</span> {formatSize(version.size)}
                  </span>
                  {version.delta && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Delta compressed
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {version.metadata.description && (
                <div className="text-sm text-gray-700 mb-2">
                  {version.metadata.description}
                </div>
              )}

              {/* Commit Message */}
              {version.metadata.commitMessage && (
                <div className="text-sm text-gray-600 italic mb-2 pl-4 border-l-2 border-gray-300">
                  {version.metadata.commitMessage}
                </div>
              )}

              {/* Tags */}
              {version.metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {version.metadata.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                    >
                      {tag}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTag(version.version, tag);
                        }}
                        className="ml-1 hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Merge Info */}
              {version.metadata.mergeInfo && (
                <div className="mt-2 text-xs text-gray-600 bg-purple-50 border border-purple-200 rounded px-2 py-1">
                  <span className="font-medium">Merged:</span>{' '}
                  {version.metadata.mergeInfo.sourceBranch} →{' '}
                  {version.metadata.mergeInfo.targetBranch} (
                  {version.metadata.mergeInfo.mergeStrategy})
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tag Modal */}
      {showTagModal !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">Add Tag to v{showTagModal}</h3>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag(showTagModal)}
              placeholder="Enter tag name (e.g., v1.0.0, production)"
              className="w-full px-3 py-2 border border-gray-300 rounded mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowTagModal(null);
                  setTagInput('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddTag(showTagModal)}
                className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
              >
                Add Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredVersions.length === 0 && filterTags.length > 0 && (
        <div className="text-center text-gray-500 py-8">
          No versions match the selected tags
        </div>
      )}
    </div>
  );
};

export default VersionHistory;
