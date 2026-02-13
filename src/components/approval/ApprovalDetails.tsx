/**
 * Approval Details - Detailed view of an approval request
 */

import React from 'react';
import { ApprovalRequest } from '../../types/approval';
import { approvalManager } from '../../workflow/approval/ApprovalManager';

interface ApprovalDetailsProps {
  approval: ApprovalRequest;
  onClose: () => void;
  onApprove?: () => void;
}

export const ApprovalDetails: React.FC<ApprovalDetailsProps> = ({
  approval,
  onClose,
  onApprove,
}) => {
  const history = approvalManager.getApprovalHistory(approval.id);
  const delegations = approvalManager.getDelegations(approval.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Approval Request Details
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Request ID: {approval.id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Status and Priority */}
          <div className="flex items-center gap-3">
            <span
              className={`
                inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                ${
                  approval.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : approval.status === 'approved'
                    ? 'bg-green-100 text-green-800'
                    : approval.status === 'rejected'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }
              `}
            >
              {approval.status.toUpperCase()}
            </span>
            {approval.priority && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Priority: {approval.priority.toUpperCase()}
              </span>
            )}
          </div>

          {/* Workflow Information */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Workflow Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Workflow:</span>{' '}
                <span className="text-gray-900 dark:text-white font-medium">{approval.workflowName}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Node:</span>{' '}
                <span className="text-gray-900 dark:text-white font-medium">{approval.nodeName}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Execution ID:</span>{' '}
                <span className="text-gray-900 dark:text-white font-mono text-xs">{approval.executionId}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Workflow ID:</span>{' '}
                <span className="text-gray-900 dark:text-white font-mono text-xs">{approval.workflowId}</span>
              </div>
            </div>
          </div>

          {/* Timing Information */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Timing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Created:</span>{' '}
                <span className="text-gray-900 dark:text-white">{new Date(approval.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Updated:</span>{' '}
                <span className="text-gray-900 dark:text-white">{new Date(approval.updatedAt).toLocaleString()}</span>
              </div>
              {approval.expiresAt && (
                <>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Expires:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{new Date(approval.expiresAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Time Remaining:</span>{' '}
                    <span className="text-gray-900 dark:text-white">
                      {Math.max(0, Math.floor((new Date(approval.expiresAt).getTime() - Date.now()) / 60000))} minutes
                    </span>
                  </div>
                </>
              )}
              {approval.timeoutMs && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Timeout:</span>{' '}
                  <span className="text-gray-900 dark:text-white">
                    {Math.floor(approval.timeoutMs / 60000)} minutes
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-600 dark:text-gray-400">Timeout Action:</span>{' '}
                <span className="text-gray-900 dark:text-white capitalize">{approval.timeoutAction}</span>
              </div>
            </div>
          </div>

          {/* Approvers */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Approvers ({approval.approvers.length})
            </h3>
            <div className="text-sm mb-3">
              <span className="text-gray-600 dark:text-gray-400">Approval Mode:</span>{' '}
              <span className="text-gray-900 dark:text-white font-medium capitalize">{approval.approvalMode}</span>
            </div>
            <div className="space-y-2">
              {approval.approvers.map((approver, index) => {
                const response = approval.responses.find(r => r.approverEmail === approver.email);
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{approver.name}</div>
                      {approver.email && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">{approver.email}</div>
                      )}
                      {approver.role && (
                        <div className="text-xs text-gray-500 dark:text-gray-500">{approver.role}</div>
                      )}
                    </div>
                    {response ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={`
                            px-2 py-1 rounded text-xs font-medium
                            ${
                              response.decision === 'approve'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }
                          `}
                        >
                          {response.decision === 'approve' ? 'Approved' : 'Rejected'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(response.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Pending</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data Preview */}
          {approval.dataPreview && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {approval.dataPreview.title}
              </h3>
              {approval.dataPreview.summary && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">{approval.dataPreview.summary}</p>
              )}
              {approval.dataPreview.fields.length > 0 && (
                <div className="space-y-2">
                  {approval.dataPreview.fields.map((field, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-start py-2 border-b border-gray-200 dark:border-gray-600 last:border-0"
                    >
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {field.label}:
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white ml-4 text-right max-w-md break-words">
                        {field.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Responses */}
          {approval.responses.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Responses ({approval.responses.length})
              </h3>
              <div className="space-y-3">
                {approval.responses.map((response) => (
                  <div key={response.id} className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{response.approverName}</div>
                        {response.approverEmail && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">{response.approverEmail}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`
                            inline-block px-2 py-1 rounded text-xs font-medium mb-1
                            ${
                              response.decision === 'approve'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }
                          `}
                        >
                          {response.decision.toUpperCase()}
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(response.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    {response.comment && (
                      <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        {response.comment}
                      </div>
                    )}
                    {response.ipAddress && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        IP: {response.ipAddress}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delegations */}
          {delegations.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Delegations ({delegations.length})
              </h3>
              <div className="space-y-2">
                {delegations.map((delegation) => (
                  <div key={delegation.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 dark:text-white font-medium">{delegation.fromApproverName}</span>
                      <span className="text-gray-500">→</span>
                      <span className="text-gray-900 dark:text-white font-medium">{delegation.toApproverName}</span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {new Date(delegation.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {delegation.reason && (
                      <div className="mt-1 text-gray-600 dark:text-gray-400 text-xs">
                        Reason: {delegation.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit History */}
          {history.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Audit Trail ({history.length})
              </h3>
              <div className="space-y-2">
                {history.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 text-sm">
                    <div className="text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="flex-1">
                      <span className="text-gray-900 dark:text-white font-medium capitalize">
                        {entry.action.replace('_', ' ')}
                      </span>
                      {entry.userName && (
                        <span className="text-gray-600 dark:text-gray-400"> by {entry.userName}</span>
                      )}
                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {JSON.stringify(entry.details)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw Data (for debugging) */}
          <details className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <summary className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer">
              Raw Data (Debug)
            </summary>
            <pre className="mt-3 text-xs text-gray-700 dark:text-gray-300 overflow-x-auto bg-white dark:bg-gray-800 p-3 rounded">
              {JSON.stringify(approval.data, null, 2)}
            </pre>
          </details>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Close
          </button>
          {approval.status === 'pending' && onApprove && (
            <button
              onClick={onApprove}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
            >
              Respond to Request
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalDetails;
