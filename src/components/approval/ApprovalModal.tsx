/**
 * Approval Modal - Modal dialog for approving/rejecting requests
 */

import React, { useState } from 'react';
import { ApprovalRequest } from '../../types/approval';

interface ApprovalModalProps {
  approval: ApprovalRequest;
  onClose: () => void;
  onSubmit: (decision: 'approve' | 'reject', comment?: string) => Promise<void>;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  approval,
  onClose,
  onSubmit,
}) => {
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!decision) return;

    setSubmitting(true);
    try {
      await onSubmit(decision, comment || undefined);
    } catch (error) {
      // Error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Approval Request
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {approval.workflowName} - {approval.nodeName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              disabled={submitting}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Priority Badge */}
          {approval.priority && (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                priorityColors[approval.priority]
              }`}
            >
              {approval.priority.toUpperCase()}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Data Preview */}
          {approval.dataPreview && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {approval.dataPreview.title}
              </h3>
              {approval.dataPreview.summary && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {approval.dataPreview.summary}
                </p>
              )}
              {approval.dataPreview.fields.length > 0 && (
                <div className="space-y-2">
                  {approval.dataPreview.fields.map((field, index) => (
                    <div key={index} className="flex justify-between items-start">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {field.label}:
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white ml-4 text-right">
                        {field.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Approval Details */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Requested:</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(approval.createdAt).toLocaleString()}
              </span>
            </div>

            {approval.expiresAt && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Expires:</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(approval.expiresAt).toLocaleString()}
                </span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Approval Mode:</span>
              <span className="text-gray-900 dark:text-white capitalize">
                {approval.approvalMode}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Approvers:</span>
              <span className="text-gray-900 dark:text-white">
                {approval.approvers.length} total
                {approval.responses.length > 0 && ` (${approval.responses.length} responded)`}
              </span>
            </div>
          </div>

          {/* Previous Responses */}
          {approval.responses.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Previous Responses
              </h4>
              <div className="space-y-2">
                {approval.responses.map((response) => (
                  <div
                    key={response.id}
                    className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {response.approverName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            response.decision === 'approve'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {response.decision === 'approve' ? 'Approved' : 'Rejected'}
                        </span>
                      </div>
                      {response.comment && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {response.comment}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(response.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decision Selection */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Your Decision
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDecision('approve')}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${
                    decision === 'approve'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-green-300'
                  }
                `}
                disabled={submitting}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className="h-5 w-5 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="font-medium text-gray-900 dark:text-white">Approve</span>
                </div>
              </button>

              <button
                onClick={() => setDecision('reject')}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${
                    decision === 'reject'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-red-300'
                  }
                `}
                disabled={submitting}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className="h-5 w-5 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span className="font-medium text-gray-900 dark:text-white">Reject</span>
                </div>
              </button>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Comment (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Add a comment..."
              disabled={submitting}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!decision || submitting}
            className={`
              px-6 py-2 rounded-lg font-medium
              ${
                decision && !submitting
                  ? decision === 'approve'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Submitting...
              </span>
            ) : (
              `Submit ${decision ? (decision === 'approve' ? 'Approval' : 'Rejection') : 'Decision'}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalModal;
