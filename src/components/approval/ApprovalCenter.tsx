/**
 * Approval Center - Main approval dashboard component
 * Displays pending approvals, approval history, and statistics
 */

import React, { useState, useEffect, useMemo } from 'react';
import { approvalManager } from '../../workflow/approval/ApprovalManager';
import { ApprovalRequest, ApprovalFilterOptions, ApprovalStatistics } from '../../types/approval';
import { ApprovalList } from './ApprovalList';
import { ApprovalModal } from './ApprovalModal';
import { ApprovalDetails } from './ApprovalDetails';
import { logger } from '../../services/SimpleLogger';
import { useToast } from '../../hooks/useToast';

type TabType = 'pending' | 'approved' | 'rejected' | 'all' | 'expired';

interface ApprovalCenterProps {
  currentUserId?: string;
  currentUserEmail?: string;
  showStats?: boolean;
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
}

export const ApprovalCenter: React.FC<ApprovalCenterProps> = ({
  currentUserId = 'current-user',
  currentUserEmail = 'user@example.com',
  showStats = true,
  autoRefresh = true,
  refreshIntervalMs = 30000, // 30 seconds
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<ApprovalStatistics | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [selectedApprovals, setSelectedApprovals] = useState<Set<string>>(new Set());
  const toast = useToast();

  // Load approvals
  const loadApprovals = () => {
    try {
      const filter: ApprovalFilterOptions = {
        approverId: currentUserId,
      };

      // Apply tab filter
      if (activeTab !== 'all') {
        filter.status = [activeTab as 'pending' | 'approved' | 'rejected' | 'expired'];
      }

      // Apply search
      if (searchQuery) {
        filter.search = searchQuery;
      }

      // Apply priority filter
      if (priorityFilter.length > 0) {
        filter.priority = priorityFilter;
      }

      const result = approvalManager.getApprovals(filter);
      setApprovals(result);

      // Load statistics if enabled
      if (showStats) {
        const stats = approvalManager.getStatistics({ approverId: currentUserId });
        setStatistics(stats);
      }

      setLoading(false);
    } catch (error) {
      logger.error('Failed to load approvals', error);
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadApprovals();
  }, [activeTab, searchQuery, priorityFilter, currentUserId]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadApprovals();
    }, refreshIntervalMs);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshIntervalMs, activeTab, searchQuery, priorityFilter, currentUserId]);

  // Handle approval action
  const handleApprove = (approval: ApprovalRequest) => {
    setSelectedApproval(approval);
    setShowModal(true);
  };

  // Handle view details
  const handleViewDetails = (approval: ApprovalRequest) => {
    setSelectedApproval(approval);
    setShowDetails(true);
  };

  // Handle modal submit
  const handleModalSubmit = async (decision: 'approve' | 'reject', comment?: string) => {
    if (!selectedApproval) return;

    try {
      await approvalManager.submitResponse(
        selectedApproval.id,
        currentUserId,
        decision,
        comment
      );

      setShowModal(false);
      setSelectedApproval(null);
      loadApprovals(); // Refresh list
    } catch (error) {
      logger.error('Failed to submit approval response', error);
      toast.error('Error', error instanceof Error ? error.message : 'Failed to submit response');
    }
  };

  // Handle bulk approval
  const handleBulkApprove = async () => {
    if (selectedApprovals.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to approve ${selectedApprovals.size} requests?`
    );
    if (!confirmed) return;

    try {
      const result = await approvalManager.bulkApprove({
        requestIds: Array.from(selectedApprovals),
        action: 'approve',
        approverId: currentUserId,
      });

      toast.success('Success', `Approved ${result.successful.length} requests. Failed: ${result.failed.length}`);
      setSelectedApprovals(new Set());
      loadApprovals();
    } catch (error) {
      logger.error('Failed to bulk approve', error);
      toast.error('Error', 'Bulk approval failed');
    }
  };

  // Handle bulk reject
  const handleBulkReject = async () => {
    if (selectedApprovals.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to reject ${selectedApprovals.size} requests?`
    );
    if (!confirmed) return;

    try {
      const result = await approvalManager.bulkApprove({
        requestIds: Array.from(selectedApprovals),
        action: 'reject',
        approverId: currentUserId,
      });

      toast.success('Success', `Rejected ${result.successful.length} requests. Failed: ${result.failed.length}`);
      setSelectedApprovals(new Set());
      loadApprovals();
    } catch (error) {
      logger.error('Failed to bulk reject', error);
      toast.error('Error', 'Bulk rejection failed');
    }
  };

  // Tab counts
  const tabCounts = useMemo(() => {
    const allApprovals = approvalManager.getPendingApprovalsForUser(currentUserId);
    return {
      pending: allApprovals.filter(a => a.status === 'pending').length,
      approved: allApprovals.filter(a => a.status === 'approved').length,
      rejected: allApprovals.filter(a => a.status === 'rejected').length,
      expired: allApprovals.filter(a => a.status === 'expired').length,
      all: allApprovals.length,
    };
  }, [approvals, currentUserId]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Approval Center
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your workflow approvals
        </p>
      </div>

      {/* Statistics */}
      {showStats && statistics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="text-blue-600 dark:text-blue-400 text-sm font-medium">Pending</div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {statistics.pending}
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="text-green-600 dark:text-green-400 text-sm font-medium">Approved</div>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {statistics.approved}
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <div className="text-red-600 dark:text-red-400 text-sm font-medium">Rejected</div>
            <div className="text-2xl font-bold text-red-900 dark:text-red-100">
              {statistics.rejected}
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <div className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">Expired</div>
            <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
              {statistics.expired}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-gray-600 dark:text-gray-400 text-sm font-medium">Avg Response</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {Math.round(statistics.averageResponseTimeMs / 1000 / 60)}m
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {(['pending', 'approved', 'rejected', 'expired', 'all'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm capitalize
                ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              {tab}
              {tabCounts[tab] > 0 && (
                <span className="ml-2 py-0.5 px-2 rounded-full bg-gray-100 dark:bg-gray-700 text-xs">
                  {tabCounts[tab]}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search approvals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Priority Filter */}
        <div className="flex gap-2">
          {['low', 'medium', 'high', 'critical'].map((priority) => (
            <button
              key={priority}
              onClick={() => {
                setPriorityFilter((prev) =>
                  prev.includes(priority)
                    ? prev.filter((p) => p !== priority)
                    : [...prev, priority]
                );
              }}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium capitalize
                ${
                  priorityFilter.includes(priority)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }
              `}
            >
              {priority}
            </button>
          ))}
        </div>

        {/* Bulk Actions */}
        {selectedApprovals.size > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleBulkApprove}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Approve Selected ({selectedApprovals.size})
            </button>
            <button
              onClick={handleBulkReject}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Reject Selected ({selectedApprovals.size})
            </button>
          </div>
        )}
      </div>

      {/* Approval List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading approvals...</p>
        </div>
      ) : approvals.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No approvals found</p>
        </div>
      ) : (
        <ApprovalList
          approvals={approvals}
          onApprove={handleApprove}
          onViewDetails={handleViewDetails}
          selectedApprovals={selectedApprovals}
          onSelectApproval={(id) => {
            setSelectedApprovals((prev) => {
              const newSet = new Set(prev);
              if (newSet.has(id)) {
                newSet.delete(id);
              } else {
                newSet.add(id);
              }
              return newSet;
            });
          }}
          enableBulkSelect={activeTab === 'pending'}
        />
      )}

      {/* Approval Modal */}
      {showModal && selectedApproval && (
        <ApprovalModal
          approval={selectedApproval}
          onClose={() => {
            setShowModal(false);
            setSelectedApproval(null);
          }}
          onSubmit={handleModalSubmit}
        />
      )}

      {/* Approval Details */}
      {showDetails && selectedApproval && (
        <ApprovalDetails
          approval={selectedApproval}
          onClose={() => {
            setShowDetails(false);
            setSelectedApproval(null);
          }}
          onApprove={() => {
            setShowDetails(false);
            handleApprove(selectedApproval);
          }}
        />
      )}
    </div>
  );
};

export default ApprovalCenter;
