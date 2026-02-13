/**
 * Zoom Node Configuration
 * Create and manage Zoom meetings
 * AGENT 9: Node Library Expansion - Auto-generated
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface ZoomConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const ZoomConfig: React.FC<ZoomConfigProps> = ({ config, onChange }) => {
  const [apiKey, setApiKey] = useState((config.apiKey as string) || '');
  const [apiSecret, setApiSecret] = useState((config.apiSecret as string) || '');
  const [operation, setOperation] = useState((config.operation as string) || 'createMeeting');

  return (
    <div className="zoom-config space-y-4">
      <div className="font-semibold text-lg mb-4">Zoom</div>


      <div>
        <label className="block text-sm font-medium mb-2">API Key</label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            onChange({ ...config, apiKey: e.target.value });
          }}
          placeholder="Zoom API key"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">API Secret</label>
        <input
          type="text"
          value={apiSecret}
          onChange={(e) => {
            setApiSecret(e.target.value);
            onChange({ ...config, apiSecret: e.target.value });
          }}
          placeholder="Zoom API secret"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
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
          <option value="getMeeting">Get Meeting</option>
          <option value="updateMeeting">Update Meeting</option>
          <option value="deleteMeeting">Delete Meeting</option>
        </select>
        
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
        <strong>📝 Note:</strong> Configure Zoom integration settings above.
      </div>
    </div>
  );
};
