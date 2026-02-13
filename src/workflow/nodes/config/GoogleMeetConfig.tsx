/**
 * Google Meet Node Configuration
 * Create and manage Google Meet video calls
 * AGENT 9: Node Library Expansion
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface GoogleMeetConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

interface GoogleMeetNodeConfig extends NodeConfig {
  serviceAccountJson?: string;
  operation?: string;
}

export const GoogleMeetConfig: React.FC<GoogleMeetConfigProps> = ({ config, onChange }) => {
  const typedConfig = config as GoogleMeetNodeConfig;
  const [serviceAccountJson, setServiceAccountJson] = useState(typedConfig.serviceAccountJson || '');
  const [operation, setOperation] = useState(typedConfig.operation || 'createMeeting');

  return (
    <div className="googlemeet-config space-y-4">
      <div className="font-semibold text-lg mb-4">Google Meet</div>

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
          placeholder=""
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md "
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
          <option value="createMeeting">Create Meeting</option>
          <option value="getMeeting">Get Meeting Details</option>
        </select>
        
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> Create and manage Google Meet video calls. Configure your credentials above.
      </div>
    </div>
  );
};
