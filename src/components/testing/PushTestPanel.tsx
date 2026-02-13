/**
 * Push Test Panel Component
 * Test push notifications before sending to users
 */

import React, { useState } from 'react';
import {
  PushNotificationType,
  PushNotificationPayload,
  PushPriority,
  PushPlatform,
} from '../../types/push';
import { useToast } from '../ui/Toast';

interface PushTestPanelProps {
  userId: string;
  onSend?: (payload: PushNotificationPayload) => Promise<void>;
}

const NOTIFICATION_TYPES: Array<{ value: PushNotificationType; label: string }> = [
  { value: 'workflow_started', label: 'Workflow Started' },
  { value: 'workflow_completed', label: 'Workflow Completed' },
  { value: 'workflow_failed', label: 'Workflow Failed' },
  { value: 'workflow_timeout', label: 'Workflow Timeout' },
  { value: 'approval_request', label: 'Approval Request' },
  { value: 'system_alert', label: 'System Alert' },
  { value: 'system_warning', label: 'System Warning' },
  { value: 'system_error', label: 'System Error' },
  { value: 'custom', label: 'Custom' },
];

const PRIORITIES: Array<{ value: PushPriority; label: string }> = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
];

const PLATFORMS: PushPlatform[] = ['ios', 'android', 'web'];

export const PushTestPanel: React.FC<PushTestPanelProps> = ({ userId, onSend }) => {
  const toast = useToast();
  const [type, setType] = useState<PushNotificationType>('custom');
  const [title, setTitle] = useState('Test Notification');
  const [body, setBody] = useState('This is a test push notification');
  const [priority, setPriority] = useState<PushPriority>('normal');
  const [selectedPlatforms, setSelectedPlatforms] = useState<PushPlatform[]>(['ios', 'android', 'web']);
  const [sound, setSound] = useState('default');
  const [badge, setBadge] = useState(1);
  const [customData, setCustomData] = useState('{}');
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTogglePlatform = (platform: PushPlatform) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platform)) {
        return prev.filter(p => p !== platform);
      } else {
        return [...prev, platform];
      }
    });
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.warning('Please provide both title and body');
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast.warning('Please select at least one platform');
      return;
    }

    // Validate custom data JSON
    let parsedData;
    try {
      parsedData = JSON.parse(customData);
    } catch (error) {
      toast.error('Invalid JSON in custom data');
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      const payload: PushNotificationPayload = {
        type,
        title,
        body,
        priority,
        data: parsedData,
        sound,
        badge,
      };

      // In production, call API
      // const response = await fetch('/api/push/test', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ userId, payload, platforms: selectedPlatforms }),
      // });
      // const result = await response.json();

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (onSend) {
        await onSend(payload);
      }

      setLastResult({
        success: true,
        message: `Test notification sent successfully to ${selectedPlatforms.length} platform(s)`,
      });
    } catch (error: any) {
      setLastResult({
        success: false,
        message: error.message || 'Failed to send test notification',
      });
    } finally {
      setSending(false);
    }
  };

  const loadTemplate = (templateType: PushNotificationType) => {
    switch (templateType) {
      case 'workflow_started':
        setTitle('Workflow Started');
        setBody('Workflow "Data Sync" has started execution');
        setPriority('normal');
        setSound('default');
        break;
      case 'workflow_completed':
        setTitle('Workflow Completed');
        setBody('Workflow "Data Sync" completed successfully in 2.5s');
        setPriority('normal');
        setSound('success');
        break;
      case 'workflow_failed':
        setTitle('Workflow Failed');
        setBody('Workflow "Data Sync" failed: Connection timeout');
        setPriority('high');
        setSound('error');
        break;
      case 'approval_request':
        setTitle('Approval Required');
        setBody('Workflow "Deploy to Production" requires your approval');
        setPriority('high');
        setSound('notification');
        break;
      case 'system_alert':
        setTitle('System Alert');
        setBody('High CPU usage detected on worker-01');
        setPriority('high');
        setSound('alert');
        break;
      case 'system_error':
        setTitle('System Error');
        setBody('Database connection lost');
        setPriority('critical');
        setSound('error');
        break;
      default:
        setTitle('Test Notification');
        setBody('This is a test push notification');
        setPriority('normal');
        setSound('default');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Test Push Notifications</h2>

      <div className="space-y-6">
        {/* Notification Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notification Type
          </label>
          <div className="flex space-x-2">
            <select
              value={type}
              onChange={e => {
                const newType = e.target.value as PushNotificationType;
                setType(newType);
                loadTemplate(newType);
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {NOTIFICATION_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Notification title"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Body *
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Notification message"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority
          </label>
          <div className="flex space-x-2">
            {PRIORITIES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPriority(value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  priority === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Platforms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Platforms
          </label>
          <div className="flex space-x-4">
            {PLATFORMS.map(platform => (
              <label key={platform} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(platform)}
                  onChange={() => handleTogglePlatform(platform)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm capitalize">{platform}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Advanced Options */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Advanced Options</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sound
              </label>
              <input
                type="text"
                value={sound}
                onChange={e => setSound(e.target.value)}
                placeholder="default"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Badge Count
              </label>
              <input
                type="number"
                value={badge}
                onChange={e => setBadge(parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Data (JSON)
            </label>
            <textarea
              value={customData}
              onChange={e => setCustomData(e.target.value)}
              placeholder='{"key": "value"}'
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
          </div>
        </div>

        {/* Result */}
        {lastResult && (
          <div
            className={`p-4 rounded-lg ${
              lastResult.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <p
              className={`text-sm ${
                lastResult.success ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {lastResult.message}
            </p>
          </div>
        )}

        {/* Send Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSend}
            disabled={sending}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'Sending...' : 'Send Test Notification'}
          </button>
        </div>
      </div>
    </div>
  );
};
