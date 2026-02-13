/**
 * Facebook Node Configuration
 * Facebook social platform integration
 * AGENT 9: Node Library Expansion
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface FacebookConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const FacebookConfig: React.FC<FacebookConfigProps> = ({ config, onChange }) => {
  const [accessToken, setAccessToken] = useState((config.accessToken as string) || '');
  const [pageId, setPageId] = useState((config.pageId as string) || '');
  const [operation, setOperation] = useState((config.operation as string) || 'post');
  const [message, setMessage] = useState((config.message as string) || '');

  return (
    <div className="facebook-config space-y-4">
      <div className="font-semibold text-lg mb-4">Facebook</div>

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

      <div>
        <label className="block text-sm font-medium mb-2">Page ID</label>
        <input
          type="text"
          value={pageId}
          onChange={(e) => {
            setPageId(e.target.value);
            onChange({ ...config, pageId: e.target.value });
          }}
          placeholder="Optional for page posts"
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
          <option value="post">Create Post</option>
          <option value="comment">Comment</option>
          <option value="like">Like</option>
        </select>
        
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
        <strong>📝 Note:</strong> Facebook social platform integration. Configure your credentials above.
      </div>
    </div>
  );
};
