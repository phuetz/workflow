/**
 * Push Notification Settings Component
 * User interface for configuring push notification preferences
 */

import React, { useState, useEffect } from 'react';
import { logger } from '../../services/SimpleLogger';
import { useToast } from '../ui/Toast';
import {
  PushNotificationType,
  PushNotificationRule,
  PushPlatform,
  QuietHours,
} from '../../types/push';

interface PushNotificationSettingsProps {
  userId: string;
  onSave?: (rules: PushNotificationRule[]) => void;
}

const NOTIFICATION_TYPES: Array<{
  type: PushNotificationType;
  label: string;
  description: string;
}> = [
  {
    type: 'workflow_started',
    label: 'Workflow Started',
    description: 'Notify when a workflow begins execution',
  },
  {
    type: 'workflow_completed',
    label: 'Workflow Completed',
    description: 'Notify when a workflow completes successfully',
  },
  {
    type: 'workflow_failed',
    label: 'Workflow Failed',
    description: 'Notify when a workflow fails',
  },
  {
    type: 'workflow_timeout',
    label: 'Workflow Timeout',
    description: 'Notify when a workflow exceeds time limit',
  },
  {
    type: 'approval_request',
    label: 'Approval Request',
    description: 'Notify when an approval is required',
  },
  {
    type: 'approval_approved',
    label: 'Approval Granted',
    description: 'Notify when your approval is granted',
  },
  {
    type: 'approval_rejected',
    label: 'Approval Rejected',
    description: 'Notify when your approval is rejected',
  },
  {
    type: 'system_alert',
    label: 'System Alert',
    description: 'Important system notifications',
  },
  {
    type: 'system_warning',
    label: 'System Warning',
    description: 'System warning notifications',
  },
  {
    type: 'system_error',
    label: 'System Error',
    description: 'Critical system error notifications',
  },
];

const PLATFORMS: PushPlatform[] = ['ios', 'android', 'web'];

export const PushNotificationSettings: React.FC<PushNotificationSettingsProps> = ({
  userId,
  onSave,
}) => {
  const toast = useToast();
  const [rules, setRules] = useState<Map<PushNotificationType, PushNotificationRule>>(new Map());
  const [quietHours, setQuietHours] = useState<QuietHours>({
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    days: [0, 1, 2, 3, 4, 5, 6], // All days
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRules();
  }, [userId]);

  const loadRules = async () => {
    try {
      // In production, load from API
      // const response = await fetch(`/api/push/rules/${userId}`);
      // const data = await response.json();

      // For now, initialize with default rules
      const defaultRules = new Map<PushNotificationType, PushNotificationRule>();
      NOTIFICATION_TYPES.forEach(({ type }) => {
        defaultRules.set(type, {
          id: `${userId}_${type}`,
          userId,
          type,
          enabled: true,
          priority: type.includes('error') || type.includes('failed') ? 'high' : 'normal',
          platforms: ['ios', 'android', 'web'],
          createdAt: new Date(),
          updatedAt: new Date(),
        } as PushNotificationRule);
      });

      setRules(defaultRules);
      setLoading(false);
    } catch (error) {
      logger.error('Failed to load rules:', error);
      setLoading(false);
    }
  };

  const handleToggleNotification = (type: PushNotificationType, enabled: boolean) => {
    setRules(prev => {
      const newRules = new Map(prev);
      const rule = newRules.get(type);
      if (rule) {
        rule.enabled = enabled;
        rule.updatedAt = new Date();
        newRules.set(type, rule);
      }
      return newRules;
    });
  };

  const handleTogglePlatform = (type: PushNotificationType, platform: PushPlatform) => {
    setRules(prev => {
      const newRules = new Map(prev);
      const rule = newRules.get(type);
      if (rule) {
        const platforms = rule.platforms as PushPlatform[];
        const index = platforms.indexOf(platform);
        if (index > -1) {
          rule.platforms = platforms.filter(p => p !== platform) as any;
        } else {
          rule.platforms = [...platforms, platform] as any;
        }
        rule.updatedAt = new Date();
        newRules.set(type, rule);
      }
      return newRules;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const rulesArray = Array.from(rules.values());

      // In production, save to API
      // await fetch(`/api/push/rules/${userId}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(rulesArray),
      // });

      onSave?.(rulesArray);
      toast.success('Settings saved successfully!');
    } catch (error) {
      logger.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Push Notification Settings</h2>

      {/* Quiet Hours */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Quiet Hours</h3>
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={quietHours.enabled}
              onChange={e => setQuietHours({ ...quietHours, enabled: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2">Enable quiet hours (non-critical notifications will be silenced)</span>
          </label>

          {quietHours.enabled && (
            <div className="pl-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={quietHours.startTime}
                    onChange={e => setQuietHours({ ...quietHours, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={quietHours.endTime}
                    onChange={e => setQuietHours({ ...quietHours, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone: {quietHours.timezone}
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notification Types */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold mb-4">Notification Types</h3>

        {NOTIFICATION_TYPES.map(({ type, label, description }) => {
          const rule = rules.get(type);
          if (!rule) return null;

          return (
            <div key={type} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={e => handleToggleNotification(type, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label className="ml-2 font-medium text-gray-900">{label}</label>
                  </div>
                  <p className="ml-6 text-sm text-gray-600">{description}</p>

                  {rule.enabled && (
                    <div className="ml-6 mt-3 flex items-center space-x-4">
                      <span className="text-sm text-gray-700">Platforms:</span>
                      {PLATFORMS.map(platform => (
                        <label key={platform} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={(rule.platforms as PushPlatform[]).includes(platform)}
                            onChange={() => handleTogglePlatform(type, platform)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-1 text-sm capitalize">{platform}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="ml-4">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      rule.priority === 'high'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {rule.priority}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};
