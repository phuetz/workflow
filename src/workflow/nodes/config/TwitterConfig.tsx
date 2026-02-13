/**
 * Twitter/X Node Configuration
 * Post and manage Twitter/X content
 * AGENT 9: Node Library Expansion
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface TwitterConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const TwitterConfig: React.FC<TwitterConfigProps> = ({ config, onChange }) => {
  const [apiKey, setApiKey] = useState((config.apiKey as string) || '');
  const [apiSecret, setApiSecret] = useState((config.apiSecret as string) || '');
  const [accessToken, setAccessToken] = useState((config.accessToken as string) || '');
  const [accessTokenSecret, setAccessTokenSecret] = useState((config.accessTokenSecret as string) || '');
  const [operation, setOperation] = useState((config.operation as string) || 'tweet');
  const [text, setText] = useState((config.text as string) || '');

  return (
    <div className="twitter-config space-y-4">
      <div className="font-semibold text-lg mb-4">Twitter/X</div>

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
        <label className="block text-sm font-medium mb-2">API Secret</label>
        <input
          type="password"
          value={apiSecret}
          onChange={(e) => {
            setApiSecret(e.target.value);
            onChange({ ...config, apiSecret: e.target.value });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
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

      <div>
        <label className="block text-sm font-medium mb-2">Access Token Secret</label>
        <input
          type="password"
          value={accessTokenSecret}
          onChange={(e) => {
            setAccessTokenSecret(e.target.value);
            onChange({ ...config, accessTokenSecret: e.target.value });
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
          <option value="tweet">Post Tweet</option>
          <option value="retweet">Retweet</option>
          <option value="like">Like Tweet</option>
          <option value="search">Search Tweets</option>
        </select>
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Tweet Text</label>
        <textarea
          rows={3}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onChange({ ...config, text: e.target.value });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> Post and manage Twitter/X content. Configure your credentials above.
      </div>
    </div>
  );
};
