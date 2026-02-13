/**
 * Mattermost Node Configuration
 * Mattermost team collaboration
 * AGENT 9: Node Library Expansion
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface MattermostConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const MattermostConfig: React.FC<MattermostConfigProps> = ({ config, onChange }) => {
  const [serverUrl, setServerUrl] = useState((config.serverUrl as string) || '');
  const [accessToken, setAccessToken] = useState((config.accessToken as string) || '');
  const [channelId, setChannelId] = useState((config.channelId as string) || '');
  const [message, setMessage] = useState((config.message as string) || '');

  return (
    <div className="mattermost-config space-y-4">
      <div className="font-semibold text-lg mb-4">Mattermost</div>

      <div className="p-3 bg-blue-50 rounded text-sm mb-4">
        <strong>🔐 Authentication</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Server URL</label>
        <input
          type="text"
          value={serverUrl}
          onChange={(e) => {
            setServerUrl(e.target.value);
            onChange({ ...config, serverUrl: e.target.value });
          }}
          placeholder="https://mattermost.example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-md "
        />
        
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
        <label className="block text-sm font-medium mb-2">Channel ID</label>
        <input
          type="text"
          value={channelId}
          onChange={(e) => {
            setChannelId(e.target.value);
            onChange({ ...config, channelId: e.target.value });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Message</label>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            onChange({ ...config, message: e.target.value });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> Mattermost team collaboration. Configure your credentials above.
      </div>
    </div>
  );
};
