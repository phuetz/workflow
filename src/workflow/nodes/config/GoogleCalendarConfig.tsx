/**
 * Google Calendar Node Configuration
 * Manage Google Calendar events
 * AGENT 9: Node Library Expansion
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface GoogleCalendarConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const GoogleCalendarConfig: React.FC<GoogleCalendarConfigProps> = ({ config, onChange }) => {
  const [serviceAccountJson, setServiceAccountJson] = useState((config.serviceAccountJson as string) || '');
  const [operation, setOperation] = useState((config.operation as string) || 'create');
  const [calendarId, setCalendarId] = useState((config.calendarId as string) || 'primary');

  return (
    <div className="googlecalendar-config space-y-4">
      <div className="font-semibold text-lg mb-4">Google Calendar</div>

      <div className="p-3 bg-blue-50 rounded text-sm mb-4">
        <strong>🔐 Authentication</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Service Account JSON</label>
        <textarea
          value={serviceAccountJson}
          onChange={(e) => {
            setServiceAccountJson(e.target.value);
            onChange({ ...config, serviceAccountJson: e.target.value });
          }}
          placeholder="Paste your service account JSON here"
          className="w-full px-3 py-2 border border-gray-300 rounded-md h-32 font-mono text-sm"
        />

      </div>


      <div className="p-3 bg-green-50 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Configuration</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Operation</label>
        <select
          value={operation}
          onChange={(e) => {
            setOperation(e.target.value);
            onChange({ ...config, operation: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="create">Create Event</option>
          <option value="get">Get Event</option>
          <option value="update">Update Event</option>
          <option value="delete">Delete Event</option>
          <option value="list">List Events</option>
        </select>
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Calendar ID</label>
        <input
          type="text"
          value={calendarId}
          onChange={(e) => {
            setCalendarId(e.target.value);
            onChange({ ...config, calendarId: e.target.value });
          }}
          placeholder="primary or calendar@gmail.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> Manage Google Calendar events. Configure your credentials above.
      </div>
    </div>
  );
};
