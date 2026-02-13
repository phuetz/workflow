/**
 * Box Node Configuration
 * Box cloud storage operations
 * AGENT 9: Node Library Expansion
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface BoxConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const BoxConfig: React.FC<BoxConfigProps> = ({ config, onChange }) => {
  const [accessToken, setAccessToken] = useState((config.accessToken as string) || '');
  const [operation, setOperation] = useState((config.operation as string) || 'upload');

  return (
    <div className="box-config space-y-4">
      <div className="font-semibold text-lg mb-4">Box</div>

      <div className="p-3 bg-blue-50 rounded text-sm mb-4">
        <strong>🔐 Authentication</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Access Token</label>
        <input
          type="password"
          value={accessToken}
          onChange={(e) => {
            setAccessToken(e.target.value);
            onChange({ ...config, accessToken: e.target.value });
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
          <option value="upload">Upload File</option>
          <option value="download">Download File</option>
          <option value="delete">Delete File</option>
          <option value="list">List Files</option>
        </select>
        
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> Box cloud storage operations. Configure your credentials above.
      </div>
    </div>
  );
};
