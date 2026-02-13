/**
 * Freshsales CRM Node Configuration
 * Freshsales CRM operations
 * AGENT 9: Node Library Expansion
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface FreshsalesConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

interface FreshsalesNodeConfig extends NodeConfig {
  apiKey?: string;
  domain?: string;
  resource?: string;
}

export const FreshsalesConfig: React.FC<FreshsalesConfigProps> = ({ config, onChange }) => {
  const freshsalesConfig = config as FreshsalesNodeConfig;

  const [apiKey, setApiKey] = useState(freshsalesConfig.apiKey || '');
  const [domain, setDomain] = useState(freshsalesConfig.domain || '');
  const [resource, setResource] = useState(freshsalesConfig.resource || 'contacts');

  return (
    <div className="freshsales-config space-y-4">
      <div className="font-semibold text-lg mb-4">Freshsales CRM</div>

      <div className="p-3 bg-blue-50 rounded text-sm mb-4">
        <strong>🔐 Authentication</strong>
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

      <div>
        <label className="block text-sm font-medium mb-2">Domain</label>
        <input
          type="text"
          value={domain}
          onChange={(e) => {
            setDomain(e.target.value);
            onChange({ ...config, domain: e.target.value });
          }}
          placeholder="your-domain.freshsales.io"
          className="w-full px-3 py-2 border border-gray-300 rounded-md "
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
          <option value="accounts">Accounts</option>
          <option value="deals">Deals</option>
          <option value="leads">Leads</option>
        </select>
        
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> Freshsales CRM operations. Configure your credentials above.
      </div>
    </div>
  );
};
