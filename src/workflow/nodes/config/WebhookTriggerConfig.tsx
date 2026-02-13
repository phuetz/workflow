/**
 * Webhook Trigger Node Configuration
 * Receive HTTP webhook requests
 * AGENT 9: Node Library Expansion - Phase 1
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface WebhookTriggerConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const WebhookTriggerConfig: React.FC<WebhookTriggerConfigProps> = ({ config, onChange }) => {
  const [path, setPath] = useState((config.path as string) || '/webhook');
  const [method, setMethod] = useState((config.method as string) || 'POST');
  const [authentication, setAuthentication] = useState((config.authentication as string) || 'none');
  const [apiKey, setApiKey] = useState((config.apiKey as string) || '');
  const [responseMode, setResponseMode] = useState((config.responseMode as string) || 'lastNode');

  return (
    <div className="webhook-trigger-config space-y-4">
      <div className="font-semibold text-lg mb-4">Webhook Trigger</div>

      <div>
        <label className="block text-sm font-medium mb-2">Webhook Path</label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">https://your-domain.com</span>
          <input
            type="text"
            value={path}
            onChange={(e) => {
              setPath(e.target.value);
              onChange({ ...config, path: e.target.value });
            }}
            placeholder="/webhook/my-endpoint"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">Custom path for this webhook endpoint</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">HTTP Method</label>
        <div className="grid grid-cols-4 gap-2">
          {['GET', 'POST', 'PUT', 'DELETE'].map((m) => (
            <button
              key={m}
              onClick={() => {
                setMethod(m);
                onChange({ ...config, method: m });
              }}
              className={`px-4 py-2 rounded ${
                method === m ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Authentication</label>
        <select
          value={authentication}
          onChange={(e) => {
            setAuthentication(e.target.value);
            onChange({ ...config, authentication: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="none">None (Public)</option>
          <option value="apiKey">API Key Header</option>
          <option value="basicAuth">Basic Auth</option>
          <option value="bearerToken">Bearer Token</option>
          <option value="hmac">HMAC Signature</option>
        </select>
      </div>

      {authentication !== 'none' && (
        <div>
          <label className="block text-sm font-medium mb-2">
            {authentication === 'apiKey' ? 'API Key' : 'Token/Secret'}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              onChange({ ...config, apiKey: e.target.value });
            }}
            placeholder="Enter secret key"
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Response Mode</label>
        <select
          value={responseMode}
          onChange={(e) => {
            setResponseMode(e.target.value);
            onChange({ ...config, responseMode: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="lastNode">Last Node Output</option>
          <option value="immediate">Immediate (202 Accepted)</option>
          <option value="custom">Custom Response</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {responseMode === 'lastNode' && 'Wait for workflow to complete and return last node output'}
          {responseMode === 'immediate' && 'Return immediately and process asynchronously'}
          {responseMode === 'custom' && 'Return custom response configured below'}
        </p>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>📡 Webhook URL:</strong></div>
        <div className="bg-white p-2 rounded font-mono text-xs break-all">
          https://your-domain.com{path}
        </div>
        <div className="text-xs">Copy this URL to configure in external services</div>
      </div>

      <div className="mt-2 p-3 bg-green-50 rounded text-sm space-y-2">
        <div><strong>📥 Request Data Access:</strong></div>
        <ul className="list-disc list-inside space-y-1">
          <li><code className="bg-white px-1 rounded">{'{{ $json.body }}'}</code> - Request body</li>
          <li><code className="bg-white px-1 rounded">{'{{ $json.headers }}'}</code> - Request headers</li>
          <li><code className="bg-white px-1 rounded">{'{{ $json.query }}'}</code> - Query parameters</li>
          <li><code className="bg-white px-1 rounded">{'{{ $json.params }}'}</code> - URL parameters</li>
        </ul>
      </div>
    </div>
  );
};
