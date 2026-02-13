/**
 * Rocket.Chat Node Configuration
 * Rocket.Chat team messaging
 * AGENT 9: Node Library Expansion
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface RocketChatConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const RocketChatConfig: React.FC<RocketChatConfigProps> = ({ config, onChange }) => {
  const [serverUrl, setServerUrl] = useState((config.serverUrl as string) || '');
  const [userId, setUserId] = useState((config.userId as string) || '');
  const [authToken, setAuthToken] = useState((config.authToken as string) || '');
  const [channel, setChannel] = useState((config.channel as string) || '');
  const [message, setMessage] = useState((config.message as string) || '');

  return (
    <div className="rocketchat-config space-y-4">
      <div className="font-semibold text-lg mb-4">Rocket.Chat</div>

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
          placeholder="https://your-server.rocket.chat"
          className="w-full px-3 py-2 border border-gray-300 rounded-md "
        />
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">User ID</label>
        <input
          type="text"
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value);
            onChange({ ...config, userId: e.target.value });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md "
        />
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Auth Token</label>
        <input
          type="password"
          value={authToken}
          onChange={(e) => {
            setAuthToken(e.target.value);
            onChange({ ...config, authToken: e.target.value });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
        />
        
      </div>


      <div className="p-3 bg-green-50 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Configuration</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Channel</label>
        <input
          type="text"
          value={channel}
          onChange={(e) => {
            setChannel(e.target.value);
            onChange({ ...config, channel: e.target.value });
          }}
          placeholder="#general"
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
        <strong>📝 Note:</strong> Rocket.Chat team messaging. Configure your credentials above.
      </div>
    </div>
  );
};
