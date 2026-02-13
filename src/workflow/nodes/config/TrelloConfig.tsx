/**
 * Trello Node Configuration
 * Trello board and card management
 * AGENT 9: Node Library Expansion
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface TrelloConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const TrelloConfig: React.FC<TrelloConfigProps> = ({ config, onChange }) => {
  const [apiKey, setApiKey] = useState((config.apiKey as string) || '');
  const [token, setToken] = useState((config.token as string) || '');
  const [operation, setOperation] = useState((config.operation as string) || 'createCard');

  return (
    <div className="trello-config space-y-4">
      <div className="font-semibold text-lg mb-4">Trello</div>

      <div className="p-3 bg-blue-50 rounded text-sm mb-4">
        <strong>🔐 Authentication</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">API Key</label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            onChange({ ...config, apiKey: e.target.value });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md "
        />
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            onChange({ ...config, token: e.target.value });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
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
          <option value="createCard">Create Card</option>
          <option value="updateCard">Update Card</option>
          <option value="deleteCard">Delete Card</option>
          <option value="getBoard">Get Board</option>
          <option value="listCards">List Cards</option>
        </select>
        
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> Trello board and card management. Configure your credentials above.
      </div>
    </div>
  );
};
