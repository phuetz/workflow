/**
 * Wait Node Configuration
 * Configure wait behavior: timer, webhook response, or specific date/time
 */

import React, { useState, useCallback } from 'react';
import {
  Clock,
  Calendar,
  Webhook,
  Timer,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Info,
} from 'lucide-react';

interface WaitConfigProps {
  config: WaitNodeConfig;
  onChange: (config: WaitNodeConfig) => void;
  darkMode?: boolean;
}

interface WaitNodeConfig {
  waitType: 'duration' | 'datetime' | 'webhook' | 'approval';
  // Duration settings
  duration?: {
    value: number;
    unit: 'seconds' | 'minutes' | 'hours' | 'days';
  };
  // DateTime settings
  datetime?: {
    date: string;
    time: string;
    timezone?: string;
  };
  // Webhook settings
  webhook?: {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    timeout?: number;
    authentication?: 'none' | 'basic' | 'header' | 'query';
    authConfig?: Record<string, string>;
  };
  // Approval settings
  approval?: {
    approvers: string[];
    message: string;
    timeout?: number;
    onTimeout: 'approve' | 'reject' | 'continue';
  };
  // Resume options
  resumeOptions?: {
    allowManualResume: boolean;
    notifyOnResume: boolean;
    notificationEmail?: string;
  };
}

const DURATION_UNITS = [
  { value: 'seconds', label: 'Seconds', max: 3600 },
  { value: 'minutes', label: 'Minutes', max: 1440 },
  { value: 'hours', label: 'Hours', max: 168 },
  { value: 'days', label: 'Days', max: 365 },
];

const WAIT_TYPES = [
  {
    value: 'duration',
    label: 'Wait for Duration',
    description: 'Wait for a specific amount of time',
    icon: Timer,
  },
  {
    value: 'datetime',
    label: 'Wait Until Date/Time',
    description: 'Wait until a specific date and time',
    icon: Calendar,
  },
  {
    value: 'webhook',
    label: 'Wait for Webhook',
    description: 'Wait for an external webhook call to resume',
    icon: Webhook,
  },
  {
    value: 'approval',
    label: 'Wait for Approval',
    description: 'Wait for human approval to continue',
    icon: Clock,
  },
];

const WaitConfig: React.FC<WaitConfigProps> = ({ config, onChange, darkMode = false }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update config helper
  const updateConfig = useCallback(
    (updates: Partial<WaitNodeConfig>) => {
      onChange({ ...config, ...updates });
    },
    [config, onChange]
  );

  // Update duration
  const updateDuration = useCallback(
    (updates: Partial<NonNullable<WaitNodeConfig['duration']>>) => {
      updateConfig({
        duration: { ...config.duration, ...updates } as WaitNodeConfig['duration'],
      });
    },
    [config.duration, updateConfig]
  );

  // Update datetime
  const updateDatetime = useCallback(
    (updates: Partial<NonNullable<WaitNodeConfig['datetime']>>) => {
      updateConfig({
        datetime: { ...config.datetime, ...updates } as WaitNodeConfig['datetime'],
      });
    },
    [config.datetime, updateConfig]
  );

  // Update webhook
  const updateWebhook = useCallback(
    (updates: Partial<NonNullable<WaitNodeConfig['webhook']>>) => {
      updateConfig({
        webhook: { ...config.webhook, ...updates } as WaitNodeConfig['webhook'],
      });
    },
    [config.webhook, updateConfig]
  );

  // Update approval
  const updateApproval = useCallback(
    (updates: Partial<NonNullable<WaitNodeConfig['approval']>>) => {
      updateConfig({
        approval: { ...config.approval, ...updates } as WaitNodeConfig['approval'],
      });
    },
    [config.approval, updateConfig]
  );

  const inputClass = `w-full px-3 py-2 rounded-lg text-sm ${
    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
  } border`;

  const labelClass = 'block text-sm font-medium mb-1';

  return (
    <div className="space-y-4">
      {/* Wait Type Selection */}
      <div>
        <label className={labelClass}>Wait Type</label>
        <div className="grid grid-cols-2 gap-2">
          {WAIT_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = config.waitType === type.value;

            return (
              <button
                key={type.value}
                onClick={() => updateConfig({ waitType: type.value as WaitNodeConfig['waitType'] })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10'
                    : darkMode
                    ? 'border-gray-700 hover:border-gray-600'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span className="font-medium text-sm">{type.label}</span>
                </div>
                <p className="text-xs text-gray-500">{type.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Duration Configuration */}
      {config.waitType === 'duration' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Duration</label>
              <input
                type="number"
                value={config.duration?.value || 1}
                onChange={(e) => updateDuration({ value: parseInt(e.target.value) || 1 })}
                min={1}
                className={inputClass}
              />
            </div>
            <div className="w-32">
              <label className={labelClass}>Unit</label>
              <select
                value={config.duration?.unit || 'minutes'}
                onChange={(e) => updateDuration({ unit: e.target.value as 'seconds' | 'minutes' | 'hours' | 'days' })}
                className={inputClass}
              >
                {DURATION_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <div className="flex items-center gap-2 text-sm">
              <Info className="w-4 h-4 text-blue-500" />
              <span>
                Workflow will pause for{' '}
                <strong>
                  {config.duration?.value || 1} {config.duration?.unit || 'minutes'}
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* DateTime Configuration */}
      {config.waitType === 'datetime' && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              value={config.datetime?.date || ''}
              onChange={(e) => updateDatetime({ date: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Time</label>
            <input
              type="time"
              value={config.datetime?.time || ''}
              onChange={(e) => updateDatetime({ time: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Timezone</label>
            <select
              value={config.datetime?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
              onChange={(e) => updateDatetime({ timezone: e.target.value })}
              className={inputClass}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
            </select>
          </div>
        </div>
      )}

      {/* Webhook Configuration */}
      {config.waitType === 'webhook' && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Webhook Path</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">/webhook/wait/</span>
              <input
                type="text"
                value={config.webhook?.path || ''}
                onChange={(e) => updateWebhook({ path: e.target.value })}
                placeholder="unique-path"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>HTTP Method</label>
            <select
              value={config.webhook?.method || 'POST'}
              onChange={(e) => updateWebhook({ method: e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE' })}
              className={inputClass}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Timeout (seconds)</label>
            <input
              type="number"
              value={config.webhook?.timeout || 3600}
              onChange={(e) => updateWebhook({ timeout: parseInt(e.target.value) })}
              min={60}
              max={604800}
              className={inputClass}
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum time to wait for webhook (max 7 days)
            </p>
          </div>

          <div>
            <label className={labelClass}>Authentication</label>
            <select
              value={config.webhook?.authentication || 'none'}
              onChange={(e) => updateWebhook({ authentication: e.target.value as 'none' | 'basic' | 'header' | 'query' })}
              className={inputClass}
            >
              <option value="none">None</option>
              <option value="basic">Basic Auth</option>
              <option value="header">Header Token</option>
              <option value="query">Query Parameter</option>
            </select>
          </div>

          <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
            <div className="flex items-start gap-2 text-sm">
              <Webhook className="w-4 h-4 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Webhook URL:</p>
                <code className="text-xs break-all">
                  {`{{$webhookUrl}}/wait/${config.webhook?.path || 'your-path'}`}
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Configuration */}
      {config.waitType === 'approval' && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Approvers (emails, comma-separated)</label>
            <input
              type="text"
              value={config.approval?.approvers?.join(', ') || ''}
              onChange={(e) =>
                updateApproval({
                  approvers: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
              placeholder="approver@example.com, manager@example.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Approval Message</label>
            <textarea
              value={config.approval?.message || ''}
              onChange={(e) => updateApproval({ message: e.target.value })}
              placeholder="Please approve to continue the workflow..."
              rows={3}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Timeout (hours)</label>
            <input
              type="number"
              value={config.approval?.timeout ? config.approval.timeout / 3600 : 24}
              onChange={(e) => updateApproval({ timeout: parseInt(e.target.value) * 3600 })}
              min={1}
              max={168}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>On Timeout</label>
            <select
              value={config.approval?.onTimeout || 'reject'}
              onChange={(e) => updateApproval({ onTimeout: e.target.value as 'approve' | 'reject' | 'continue' })}
              className={inputClass}
            >
              <option value="approve">Auto-approve</option>
              <option value="reject">Auto-reject</option>
              <option value="continue">Continue anyway</option>
            </select>
          </div>
        </div>
      )}

      {/* Advanced Options */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-2 text-sm ${
            darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          Advanced Options
        </button>

        {showAdvanced && (
          <div className={`mt-3 p-3 rounded-lg space-y-3 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.resumeOptions?.allowManualResume || false}
                onChange={(e) =>
                  updateConfig({
                    resumeOptions: {
                      ...config.resumeOptions,
                      allowManualResume: e.target.checked,
                    } as WaitNodeConfig['resumeOptions'],
                  })
                }
                className="rounded"
              />
              Allow manual resume from UI
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.resumeOptions?.notifyOnResume || false}
                onChange={(e) =>
                  updateConfig({
                    resumeOptions: {
                      ...config.resumeOptions,
                      notifyOnResume: e.target.checked,
                    } as WaitNodeConfig['resumeOptions'],
                  })
                }
                className="rounded"
              />
              Send notification when resumed
            </label>

            {config.resumeOptions?.notifyOnResume && (
              <div>
                <label className={labelClass}>Notification Email</label>
                <input
                  type="email"
                  value={config.resumeOptions?.notificationEmail || ''}
                  onChange={(e) =>
                    updateConfig({
                      resumeOptions: {
                        ...config.resumeOptions,
                        notificationEmail: e.target.value,
                      } as WaitNodeConfig['resumeOptions'],
                    })
                  }
                  placeholder="notify@example.com"
                  className={inputClass}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitConfig;
