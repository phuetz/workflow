import React, { useState } from 'react';
import { WorkflowNode } from '../../../types/workflow';

interface CalendlyConfigProps {
  node: WorkflowNode;
  onChange: (config: Record<string, unknown>) => void;
}

interface CalendlyConfig {
  operation: 'getScheduledEvents' | 'cancelEvent' | 'getEventType' | 'listEventTypes' | 'getCurrentUser' | 'getInvitee';
  eventUuid?: string;
  eventTypeUuid?: string;
  userUri?: string;
  organization?: string;
  minStartTime?: string;
  maxStartTime?: string;
  count?: number;
  status?: 'active' | 'canceled';
  credentials?: {
    personalAccessToken: string;
  };
}

export const CalendlyConfig: React.FC<CalendlyConfigProps> = ({ node, onChange }) => {
  const [config, setConfig] = useState<CalendlyConfig>(
    (node.data.config as unknown as CalendlyConfig) || {
      operation: 'getScheduledEvents',
      count: 20,
      status: 'active',
      credentials: {
        personalAccessToken: ''
      }
    }
  );

  const handleChange = (updates: Partial<CalendlyConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange(newConfig);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Calendly Configuration</h3>
        <p className="text-sm text-gray-600 mb-4">
          Manage scheduling and events with Calendly
        </p>
      </div>

      {/* Credentials */}
      <div>
        <label className="block text-sm font-medium mb-1">Personal Access Token</label>
        <input
          type="password"
          className="w-full p-2 border rounded font-mono text-sm"
          value={config.credentials?.personalAccessToken || ''}
          onChange={(e) => handleChange({
            credentials: { personalAccessToken: e.target.value }
          })}
          placeholder="eyJraWQiOiIxY2UxZ..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Generate token from <a
            href="https://calendly.com/integrations/api_webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Calendly Integrations
          </a>
        </p>
      </div>

      {/* Operation Selection */}
      <div>
        <label className="block text-sm font-medium mb-1">Operation</label>
        <select
          className="w-full p-2 border rounded"
          value={config.operation}
          onChange={(e) => handleChange({ operation: e.target.value as CalendlyConfig['operation'] })}
        >
          <option value="getScheduledEvents">Get Scheduled Events</option>
          <option value="cancelEvent">Cancel Event</option>
          <option value="listEventTypes">List Event Types</option>
          <option value="getEventType">Get Event Type Details</option>
          <option value="getCurrentUser">Get Current User</option>
          <option value="getInvitee">Get Invitee Details</option>
        </select>
      </div>

      {/* Get Scheduled Events */}
      {config.operation === 'getScheduledEvents' && (
        <div className="border-t pt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Organization URI (optional)</label>
            <input
              type="text"
              className="w-full p-2 border rounded font-mono text-sm"
              value={config.organization || ''}
              onChange={(e) => handleChange({ organization: e.target.value })}
              placeholder="https://api.calendly.com/organizations/ORG_UUID"
            />
            <p className="text-xs text-gray-500 mt-1">
              Filter events by organization
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">User URI (optional)</label>
            <input
              type="text"
              className="w-full p-2 border rounded font-mono text-sm"
              value={config.userUri || ''}
              onChange={(e) => handleChange({ userUri: e.target.value })}
              placeholder="https://api.calendly.com/users/USER_UUID"
            />
            <p className="text-xs text-gray-500 mt-1">
              Filter events by user
            </p>
          </div>

          <div>
            <label className="block text-sm mb-1">Minimum Start Time</label>
            <input
              type="datetime-local"
              className="w-full p-2 border rounded"
              value={config.minStartTime || ''}
              onChange={(e) => handleChange({ minStartTime: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Maximum Start Time</label>
            <input
              type="datetime-local"
              className="w-full p-2 border rounded"
              value={config.maxStartTime || ''}
              onChange={(e) => handleChange({ maxStartTime: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Count (max results)</label>
            <input
              type="number"
              min="1"
              max="100"
              className="w-full p-2 border rounded"
              value={config.count || 20}
              onChange={(e) => handleChange({ count: parseInt(e.target.value) })}
            />
            <p className="text-xs text-gray-500 mt-1">
              Number of events to retrieve (1-100)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              className="w-full p-2 border rounded"
              value={config.status}
              onChange={(e) => handleChange({ status: e.target.value as 'active' | 'canceled' })}
            >
              <option value="active">Active</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
        </div>
      )}

      {/* Cancel Event */}
      {config.operation === 'cancelEvent' && (
        <div className="border-t pt-4">
          <label className="block text-sm font-medium mb-1">Event UUID</label>
          <input
            type="text"
            className="w-full p-2 border rounded font-mono text-sm"
            value={config.eventUuid || ''}
            onChange={(e) => handleChange({ eventUuid: e.target.value })}
            placeholder="Enter Event UUID"
          />
          <p className="text-xs text-gray-500 mt-1">
            The unique identifier for the scheduled event to cancel
          </p>
        </div>
      )}

      {/* Get Event Type */}
      {config.operation === 'getEventType' && (
        <div className="border-t pt-4">
          <label className="block text-sm font-medium mb-1">Event Type UUID</label>
          <input
            type="text"
            className="w-full p-2 border rounded font-mono text-sm"
            value={config.eventTypeUuid || ''}
            onChange={(e) => handleChange({ eventTypeUuid: e.target.value })}
            placeholder="Enter Event Type UUID"
          />
        </div>
      )}

      {/* List Event Types */}
      {config.operation === 'listEventTypes' && (
        <div className="border-t pt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Organization URI</label>
            <input
              type="text"
              className="w-full p-2 border rounded font-mono text-sm"
              value={config.organization || ''}
              onChange={(e) => handleChange({ organization: e.target.value })}
              placeholder="https://api.calendly.com/organizations/ORG_UUID"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Count (max results)</label>
            <input
              type="number"
              min="1"
              max="100"
              className="w-full p-2 border rounded"
              value={config.count || 20}
              onChange={(e) => handleChange({ count: parseInt(e.target.value) })}
            />
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
        <strong>⚠️ Note:</strong> Some operations require Premium or Teams plan.
        Check <a
          href="https://developer.calendly.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Calendly API docs
        </a> for details.
      </div>
    </div>
  );
};
