/**
 * Approval List - List component for displaying approvals
 */

import React from 'react';
import { ApprovalRequest } from '../../types/approval';

interface ApprovalListProps {
  approvals: ApprovalRequest[];
  onApprove: (approval: ApprovalRequest) => void;
  onViewDetails: (approval: ApprovalRequest) => void;
  selectedApprovals?: Set<string>;
  onSelectApproval?: (id: string) => void;
  enableBulkSelect?: boolean;
}

export const ApprovalList: React.FC<ApprovalListProps> = ({
  approvals,
  onApprove,
  onViewDetails,
  selectedApprovals = new Set(),
  onSelectApproval,
  enableBulkSelect = false,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'expired':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case 'escalated':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  };

  const getTimeRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null;

    const now = new Date().getTime();
    const expires = new Date(expiresAt).getTime();
    const diff = expires - now;

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }

    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-4">
      {approvals.map((approval) => {
        const timeRemaining = getTimeRemaining(approval.expiresAt);
        const isUrgent = approval.expiresAt && new Date(approval.expiresAt).getTime() - Date.now() < 3600000; // Less than 1 hour

        return (
          <div
            key={approval.id}
            className={`
              border rounded-lg p-4 hover:shadow-md transition-shadow
              ${isUrgent ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700'}
              ${selectedApprovals.has(approval.id) ? 'ring-2 ring-blue-500' : ''}
            `}
          >
            <div className="flex items-start gap-4">
              {/* Bulk Select Checkbox */}
              {enableBulkSelect && onSelectApproval && (
                <input
                  type="checkbox"
                  checked={selectedApprovals.has(approval.id)}
                  onChange={() => onSelectApproval(approval.id)}
                  className="mt-1 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
              )}

              {/* Priority Icon */}
              <div className="text-2xl">{getPriorityIcon(approval.priority)}</div>

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {approval.dataPreview?.title || approval.nodeName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {approval.workflowName}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`
                      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${getStatusColor(approval.status)}
                    `}
                  >
                    {approval.status.toUpperCase()}
                  </span>
                </div>

                {/* Summary */}
                {approval.dataPreview?.summary && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    {approval.dataPreview.summary}
                  </p>
                )}

                {/* Fields Preview */}
                {approval.dataPreview?.fields && approval.dataPreview.fields.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {approval.dataPreview.fields.slice(0, 4).map((field, index) => (
                        <div key={index} className="text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{field.label}:</span>{' '}
                          <span className="text-gray-900 dark:text-white font-medium">
                            {field.value}
                          </span>
                        </div>
                      ))}
                    </div>
                    {approval.dataPreview.fields.length > 4 && (
                      <button
                        onClick={() => onViewDetails(approval)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
                      >
                        +{approval.dataPreview.fields.length - 4} more fields
                      </button>
                    )}
                  </div>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <div className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>{new Date(approval.createdAt).toLocaleString()}</span>
                  </div>

                  {timeRemaining && (
                    <div className={`flex items-center gap-1 ${isUrgent ? 'text-red-600 font-medium' : ''}`}>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>{timeRemaining} remaining</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                    <span>
                      {approval.responses.length}/{approval.approvers.length} responded
                    </span>
                  </div>

                  {approval.approvalMode && (
                    <div className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs capitalize">
                      Mode: {approval.approvalMode}
                    </div>
                  )}
                </div>

                {/* Responses */}
                {approval.responses.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {approval.responses.map((response) => (
                      <div
                        key={response.id}
                        className={`
                          inline-flex items-center gap-1 px-2 py-1 rounded text-xs
                          ${
                            response.decision === 'approve'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }
                        `}
                      >
                        <span>{response.approverName}</span>
                        <span className="font-medium">
                          {response.decision === 'approve' ? '✓' : '✗'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tags */}
                {approval.tags && approval.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {approval.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {approval.status === 'pending' && (
                    <>
                      <button
                        onClick={() => onApprove(approval)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
                      >
                        Review & Respond
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onViewDetails(approval)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ApprovalList;
