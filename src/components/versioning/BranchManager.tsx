/**
 * Branch Manager Component
 * Manage workflow branches with Git-like interface
 */

import React, { useState, useEffect } from 'react';
import {
  getBranchingService,
  Branch,
  BranchGraph
} from '../../services/WorkflowBranchingService';
import { logger } from '../../services/SimpleLogger';
import { useToast } from '../../hooks/useToast';

interface BranchManagerProps {
  workflowId: string;
  currentUserId: string;
  onBranchSwitch?: (branch: string) => void;
  onBranchCreate?: (branch: Branch) => void;
  onBranchDelete?: (branchName: string) => void;
}

export const BranchManager: React.FC<BranchManagerProps> = ({
  workflowId,
  currentUserId,
  onBranchSwitch,
  onBranchCreate,
  onBranchDelete
}) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [branchGraph, setBranchGraph] = useState<BranchGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchFrom, setNewBranchFrom] = useState('main');
  const [newBranchDescription, setNewBranchDescription] = useState('');
  const [mergingBranch, setMergingBranch] = useState<string>('');
  const [mergeStrategy, setMergeStrategy] = useState<'auto' | 'ours' | 'theirs'>('auto');
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const branchingService = getBranchingService();
  const toast = useToast();

  useEffect(() => {
    loadBranches();
  }, [workflowId]);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const branchList = await branchingService.listBranches(workflowId);
      setBranches(branchList);

      const current = branchingService.getCurrentBranch(workflowId);
      setCurrentBranch(current);

      const graph = await branchingService.getBranchGraph(workflowId);
      setBranchGraph(graph);
    } catch (error) {
      logger.error('Failed to load branches', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      toast.warning('Validation Error', 'Branch name is required');
      return;
    }

    try {
      const branch = await branchingService.createBranch({
        workflowId,
        branchName: newBranchName.trim(),
        fromBranch: newBranchFrom,
        createdBy: currentUserId,
        description: newBranchDescription.trim() || undefined
      });

      setBranches([...branches, branch]);
      setShowCreateModal(false);
      setNewBranchName('');
      setNewBranchDescription('');
      setNewBranchFrom('main');

      if (onBranchCreate) {
        onBranchCreate(branch);
      }

      await loadBranches();
    } catch (error) {
      logger.error('Failed to create branch', { error });
      toast.error('Failed to create branch', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleSwitchBranch = async (branchName: string) => {
    try {
      await branchingService.switchBranch(workflowId, branchName);
      setCurrentBranch(branchName);

      if (onBranchSwitch) {
        onBranchSwitch(branchName);
      }

      await loadBranches();
    } catch (error) {
      logger.error('Failed to switch branch', { error });
      toast.error('Failed to switch branch', 'See console for details.');
    }
  };

  const handleDeleteBranch = async (branchName: string) => {
    const branch = branches.find(b => b.name === branchName);

    if (branch?.isProtected) {
      if (!window.confirm(`Branch "${branchName}" is protected. Are you sure you want to delete it?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to delete branch "${branchName}"?`)) {
        return;
      }
    }

    try {
      await branchingService.deleteBranch(workflowId, branchName, branch?.isProtected);
      setBranches(branches.filter(b => b.name !== branchName));

      if (onBranchDelete) {
        onBranchDelete(branchName);
      }

      await loadBranches();
    } catch (error) {
      logger.error('Failed to delete branch', { error });
      toast.error('Failed to delete branch', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleMergeBranch = async () => {
    if (!mergingBranch) {
      toast.warning('Validation Error', 'Please select a branch to merge');
      return;
    }

    try {
      const result = await branchingService.mergeBranches({
        sourceBranch: mergingBranch,
        targetBranch: currentBranch,
        strategy: mergeStrategy,
        createdBy: currentUserId,
        resolveConflicts: false
      });

      if (result.success) {
        toast.success('Branch merged', `Successfully merged ${mergingBranch} into ${currentBranch}`);
        setShowMergeModal(false);
        setMergingBranch('');
        await loadBranches();
      } else {
        toast.error(
          'Merge has conflicts',
          `${result.conflicts.map(c => c.description).join(', ')}. Please resolve conflicts manually.`
        );
      }
    } catch (error) {
      logger.error('Failed to merge branch', { error });
      toast.error('Failed to merge', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleToggleProtection = async (branchName: string, isProtected: boolean) => {
    try {
      await branchingService.setBranchProtection(workflowId, branchName, isProtected);
      await loadBranches();
    } catch (error) {
      logger.error('Failed to toggle branch protection', { error });
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="branch-manager bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Branch Manager</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowMergeModal(true)}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Merge Branch
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              + New Branch
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-medium">Current branch:</span>{' '}
          <span className="font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {currentBranch}
          </span>
        </div>
      </div>

      {/* Branch List */}
      <div className="space-y-3">
        {branches.map(branch => {
          const isCurrent = branch.name === currentBranch;

          return (
            <div
              key={branch.name}
              className={`border rounded-lg p-4 transition-all ${
                isCurrent
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {branch.name}
                    </h3>
                    {isCurrent && (
                      <span className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">
                        CURRENT
                      </span>
                    )}
                    {branch.isDefault && (
                      <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
                        DEFAULT
                      </span>
                    )}
                    {branch.isProtected && (
                      <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded">
                        PROTECTED
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    {branch.description && (
                      <div className="mb-2 text-gray-700">{branch.description}</div>
                    )}
                    <div className="flex items-center space-x-4">
                      <span>
                        <span className="font-medium">Base:</span> v{branch.baseVersion}
                        {branch.baseBranch && ` (from ${branch.baseBranch})`}
                      </span>
                      <span>
                        <span className="font-medium">Head:</span> v{branch.headVersion}
                      </span>
                      <span>
                        <span className="font-medium">Created:</span> {formatDate(branch.createdAt)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Created by:</span> {branch.createdBy}
                    </div>
                    {branch.mergedInto && branch.mergedInto.length > 0 && (
                      <div>
                        <span className="font-medium">Merged into:</span>{' '}
                        {branch.mergedInto.join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  {!isCurrent && (
                    <button
                      onClick={() => handleSwitchBranch(branch.name)}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Switch
                    </button>
                  )}
                  {!branch.isDefault && (
                    <>
                      <button
                        onClick={() =>
                          handleToggleProtection(branch.name, !branch.isProtected)
                        }
                        className={`px-3 py-1 text-sm rounded ${
                          branch.isProtected
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {branch.isProtected ? 'Unprotect' : 'Protect'}
                      </button>
                      <button
                        onClick={() => handleDeleteBranch(branch.name)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Branch Graph Visualization */}
      {branchGraph && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Branch Graph</h3>
          <div className="space-y-2">
            {branchGraph.branches.map(node => (
              <div key={node.branch} className="flex items-center space-x-4">
                <div
                  className={`w-32 px-3 py-2 rounded text-sm font-mono ${
                    node.current ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {node.branch}
                </div>
                <div className="flex-1 text-sm text-gray-600">
                  {node.versions.length} version(s): v{node.versions.join(', v')}
                </div>
              </div>
            ))}
          </div>
          {branchGraph.merges.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">Merge History</h4>
              <div className="space-y-1 text-sm text-gray-600">
                {branchGraph.merges.map((merge, idx) => (
                  <div key={idx}>
                    {merge.from} → {merge.to} (v{merge.version}, {merge.strategy})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Branch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">Create New Branch</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="feature/my-feature"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Branch
                </label>
                <select
                  value={newBranchFrom}
                  onChange={(e) => setNewBranchFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  {branches.map(b => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newBranchDescription}
                  onChange={(e) => setNewBranchDescription(e.target.value)}
                  placeholder="Describe the purpose of this branch..."
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewBranchName('');
                  setNewBranchDescription('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBranch}
                className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
              >
                Create Branch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Branch Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">Merge Branch</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Merge from:
                </label>
                <select
                  value={mergingBranch}
                  onChange={(e) => setMergingBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="">Select branch...</option>
                  {branches
                    .filter(b => b.name !== currentBranch)
                    .map(b => (
                      <option key={b.name} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Into: <span className="font-mono">{currentBranch}</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Merge Strategy
                </label>
                <select
                  value={mergeStrategy}
                  onChange={(e) => setMergeStrategy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="auto">Auto (3-way merge)</option>
                  <option value="ours">Ours (keep current branch changes)</option>
                  <option value="theirs">Theirs (accept incoming changes)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowMergeModal(false);
                  setMergingBranch('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleMergeBranch}
                className="px-4 py-2 text-white bg-purple-500 rounded hover:bg-purple-600"
              >
                Merge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchManager;
