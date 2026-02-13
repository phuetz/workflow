/**
 * ActiveCampaign Node Configuration
 * ActiveCampaign marketing automation
 * AGENT 9: Node Library Expansion
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface ActiveCampaignConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const ActiveCampaignConfig: React.FC<ActiveCampaignConfigProps> = ({ config, onChange }) => {
  const [apiUrl, setApiUrl] = useState((config.apiUrl as string) || '');
  const [apiKey, setApiKey] = useState((config.apiKey as string) || '');
  const [resource, setResource] = useState((config.resource as string) || 'contacts');

  return (
    <div className="activecampaign-config space-y-4">
      <div className="font-semibold text-lg mb-4">ActiveCampaign</div>

      <div className="p-3 bg-blue-50 rounded text-sm mb-4">
        <strong>🔐 Authentication</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">API URL</label>
        <input
          type="text"
          value={apiUrl}
          onChange={(e) => {
            setApiUrl(e.target.value);
            onChange({ ...config, apiUrl: e.target.value });
          }}
          placeholder="https://youraccounת.api-us1.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-md "
        />
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            onChange({ ...config, apiKey: e.target.value });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
        />
        
      </div>


      <div className="p-3 bg-green-50 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Configuration</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Resource</label>
        <select
          value={resource}
          onChange={(e) => {
            setResource(e.target.value);
            onChange({ ...config, resource: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="contacts">Contacts</option>
          <option value="lists">Lists</option>
          <option value="campaigns">Campaigns</option>
          <option value="automations">Automations</option>
        </select>
        
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> ActiveCampaign marketing automation. Configure your credentials above.
      </div>
    </div>
  );
};
