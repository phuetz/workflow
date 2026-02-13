/**
 * Zoho CRM Node Configuration
 * Zoho CRM customer management
 * AGENT 9: Node Library Expansion
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface ZohoCRMConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const ZohoCRMConfig: React.FC<ZohoCRMConfigProps> = ({ config, onChange }) => {
  const [clientId, setClientId] = useState((config.clientId as string) || '');
  const [clientSecret, setClientSecret] = useState((config.clientSecret as string) || '');
  const [refreshToken, setRefreshToken] = useState((config.refreshToken as string) || '');
  const [module, setModule] = useState((config.module as string) || 'Leads');
  const [operation, setOperation] = useState((config.operation as string) || 'create');

  return (
    <div className="zohocrm-config space-y-4">
      <div className="font-semibold text-lg mb-4">Zoho CRM</div>

      <div className="p-3 bg-blue-50 rounded text-sm mb-4">
        <strong>🔐 Authentication</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Client ID</label>
        <input
          type="text"
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            onChange({ ...config, clientId: e.target.value });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md "
        />
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Client Secret</label>
        <input
          type="password"
          value={clientSecret}
          onChange={(e) => {
            setClientSecret(e.target.value);
            onChange({ ...config, clientSecret: e.target.value });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
        />
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Refresh Token</label>
        <input
          type="password"
          value={refreshToken}
          onChange={(e) => {
            setRefreshToken(e.target.value);
            onChange({ ...config, refreshToken: e.target.value });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
        />
        
      </div>


      <div className="p-3 bg-green-50 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Configuration</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Module</label>
        <select
          value={module}
          onChange={(e) => {
            setModule(e.target.value);
            onChange({ ...config, module: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="Leads">Leads</option>
          <option value="Contacts">Contacts</option>
          <option value="Accounts">Accounts</option>
          <option value="Deals">Deals</option>
        </select>
        
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
          <option value="create">Create</option>
          <option value="get">Get</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="search">Search</option>
        </select>
        
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> Zoho CRM customer management. Configure your credentials above.
      </div>
    </div>
  );
};
