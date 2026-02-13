/**
 * Approval Node Configuration Component
 * UI for configuring approval workflow nodes
 */

import React, { useState } from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';
import { WorkflowNode } from '../../../types/workflow';
import { ApprovalNodeConfig, Approver, NotificationChannel } from '../../../types/approval';
import { getDefaultApprovalConfig, validateApprovalConfig } from '../../approval/ApprovalNode';

interface Props {
  node: WorkflowNode;
}

export default function ApprovalConfig({ node }: Props) {
  const { updateNodeConfig, darkMode } = useWorkflowStore();
  const config = (node.data.config as unknown as ApprovalNodeConfig) || getDefaultApprovalConfig();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const update = (field: keyof ApprovalNodeConfig, value: unknown) => {
    const newConfig = { ...config, [field]: value };
    updateNodeConfig(node.id, newConfig);

    // Validate
    const validation = validateApprovalConfig(newConfig);
    setValidationErrors(validation.errors);
  };

  const addApprover = () => {
    const newApprover: Approver = {
      id: `approver_${Date.now()}`,
      name: '',
      email: '',
      notificationChannels: ['email', 'in-app'],
    };
    update('approvers', [...(config.approvers || []), newApprover]);
  };

  const updateApprover = (index: number, field: keyof Approver, value: unknown) => {
    const approvers = [...(config.approvers || [])];
    approvers[index] = { ...approvers[index], [field]: value };
    update('approvers', approvers);
  };

  const removeApprover = (index: number) => {
    const approvers = [...(config.approvers || [])];
    approvers.splice(index, 1);
    update('approvers', approvers);
  };

  const toggleNotificationChannel = (approverIndex: number, channel: NotificationChannel) => {
    const approvers = [...(config.approvers || [])];
    const channels = approvers[approverIndex].notificationChannels || [];
    const index = channels.indexOf(channel);

    if (index >= 0) {
      channels.splice(index, 1);
    } else {
      channels.push(channel);
    }

    approvers[approverIndex] = { ...approvers[approverIndex], notificationChannels: channels };
    update('approvers', approvers);
  };

  return (
    <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
      <div className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        Approval Configuration
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="text-sm font-medium text-red-800 dark:text-red-400 mb-1">
            Configuration Errors:
          </div>
          <ul className="list-disc list-inside text-xs text-red-700 dark:text-red-300">
            {validationErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Approvers */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Approvers *
        </label>
        <div className="space-y-3">
          {(config.approvers || []).map((approver, index) => (
            <div
              key={index}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Approver {index + 1}
                </div>
                <button
                  onClick={() => removeApprover(index)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  Remove
                </button>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={approver.name || ''}
                  onChange={(e) => updateApprover(index, 'name', e.target.value)}
                  className={`w-full px-2 py-1 text-sm border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                />

                <input
                  type="email"
                  placeholder="Email"
                  value={approver.email || ''}
                  onChange={(e) => updateApprover(index, 'email', e.target.value)}
                  className={`w-full px-2 py-1 text-sm border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                />

                <input
                  type="text"
                  placeholder="Role (optional)"
                  value={approver.role || ''}
                  onChange={(e) => updateApprover(index, 'role', e.target.value)}
                  className={`w-full px-2 py-1 text-sm border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                />

                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Notification Channels:
                </div>
                <div className="flex flex-wrap gap-1">
                  {(['email', 'slack', 'sms', 'in-app'] as NotificationChannel[]).map((channel) => (
                    <button
                      key={channel}
                      onClick={() => toggleNotificationChannel(index, channel)}
                      className={`px-2 py-1 text-xs rounded ${
                        approver.notificationChannels?.includes(channel)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {channel}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addApprover}
            className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            + Add Approver
          </button>
        </div>
      </div>

      {/* Approval Mode */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Approval Mode *
        </label>
        <select
          value={config.approvalMode || 'any'}
          onChange={(e) => update('approvalMode', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${
            darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
          }`}
        >
          <option value="any">Any (one approval is enough)</option>
          <option value="all">All (all must approve)</option>
          <option value="majority">Majority (more than 50%)</option>
          <option value="custom">Custom Logic</option>
        </select>
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Priority
        </label>
        <select
          value={config.priority || 'medium'}
          onChange={(e) => update('priority', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${
            darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
          }`}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Timeout */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Timeout (minutes)
        </label>
        <input
          type="number"
          min="0"
          value={Math.floor((config.timeoutMs || 86400000) / 60000)}
          onChange={(e) => update('timeoutMs', parseInt(e.target.value) * 60000)}
          className={`w-full px-3 py-2 border rounded ${
            darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
          }`}
        />
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Default: 1440 minutes (24 hours)
        </div>
      </div>

      {/* Timeout Action */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Timeout Action
        </label>
        <select
          value={config.timeoutAction || 'reject'}
          onChange={(e) => update('timeoutAction', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${
            darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
          }`}
        >
          <option value="approve">Auto-Approve</option>
          <option value="reject">Auto-Reject</option>
          <option value="escalate">Escalate</option>
          <option value="cancel">Cancel Workflow</option>
        </select>
      </div>

      {/* Notification Channels */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Global Notification Channels
        </label>
        <div className="flex flex-wrap gap-2">
          {(['email', 'slack', 'teams', 'sms', 'in-app'] as NotificationChannel[]).map((channel) => (
            <button
              key={channel}
              onClick={() => {
                const channels = config.notificationChannels || [];
                const index = channels.indexOf(channel);
                if (index >= 0) {
                  channels.splice(index, 1);
                } else {
                  channels.push(channel);
                }
                update('notificationChannels', [...channels]);
              }}
              className={`px-3 py-1 text-sm rounded ${
                config.notificationChannels?.includes(channel)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {channel}
            </button>
          ))}
        </div>
      </div>

      {/* Reminders */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.sendReminders || false}
            onChange={(e) => update('sendReminders', e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Send Reminders</span>
        </label>

        {config.sendReminders && (
          <div className="mt-2">
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Reminder Interval (minutes)
            </label>
            <input
              type="number"
              min="0"
              value={Math.floor((config.reminderIntervalMs || 3600000) / 60000)}
              onChange={(e) => update('reminderIntervalMs', parseInt(e.target.value) * 60000)}
              className={`w-full px-2 py-1 text-sm border rounded ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            />
          </div>
        )}
      </div>

      {/* Audit Trail */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.enableAuditTrail !== false}
            onChange={(e) => update('enableAuditTrail', e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Enable Audit Trail</span>
        </label>
      </div>

      {/* Data Preview Configuration */}
      <div>
        <label className="flex items-center mb-2">
          <input
            type="checkbox"
            checked={config.dataPreviewConfig?.enabled || false}
            onChange={(e) => {
              const newConfig = {
                ...config.dataPreviewConfig,
                enabled: e.target.checked,
              };
              update('dataPreviewConfig', newConfig);
            }}
            className="mr-2"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Enable Data Preview</span>
        </label>

        {config.dataPreviewConfig?.enabled && (
          <div className="space-y-2 ml-6">
            <input
              type="text"
              placeholder="Preview Title"
              value={config.dataPreviewConfig.title || ''}
              onChange={(e) => {
                const newConfig = {
                  ...config.dataPreviewConfig,
                  title: e.target.value,
                };
                update('dataPreviewConfig', newConfig);
              }}
              className={`w-full px-2 py-1 text-sm border rounded ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            />
            <textarea
              placeholder="Summary Expression (e.g., ${user.name} requests approval for ${amount})"
              value={config.dataPreviewConfig.summaryExpression || ''}
              onChange={(e) => {
                const newConfig = {
                  ...config.dataPreviewConfig,
                  summaryExpression: e.target.value,
                };
                update('dataPreviewConfig', newConfig);
              }}
              rows={2}
              className={`w-full px-2 py-1 text-sm border rounded ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            />
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 mt-4 p-2 bg-gray-100 dark:bg-gray-800 rounded">
        <strong>Note:</strong> Workflow execution will pause at this node until approval is received.
        Approvers will be notified via the configured channels.
      </div>
    </div>
  );
}
