/**
 * SSE (Server-Sent Events) Trigger Node Configuration
 * Receive real-time server-sent events from SSE endpoints
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface SSETriggerConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const SSETriggerConfig: React.FC<SSETriggerConfigProps> = ({ config, onChange }) => {
  const [url, setUrl] = useState((config.url as string) || '');
  const [authentication, setAuthentication] = useState((config.authentication as string) || 'none');
  const [authValue, setAuthValue] = useState((config.authValue as string) || '');
  const [headers, setHeaders] = useState((config.headers as string) || '');
  const [eventTypes, setEventTypes] = useState((config.eventTypes as string) || '');
  const [reconnect, setReconnect] = useState((config.reconnect as boolean) ?? true);
  const [reconnectDelay, setReconnectDelay] = useState((config.reconnectDelay as number) || 3000);
  const [maxReconnectAttempts, setMaxReconnectAttempts] = useState(
    (config.maxReconnectAttempts as number) || 10
  );
  const [heartbeatInterval, setHeartbeatInterval] = useState(
    (config.heartbeatInterval as number) || 30000
  );
  const [parseJSON, setParseJSON] = useState((config.parseJSON as boolean) ?? true);

  return (
    <div className="sse-trigger-config space-y-4">
      <div className="font-semibold text-lg mb-4">SSE Trigger</div>

      <div>
        <label className="block text-sm font-medium mb-2">SSE Endpoint URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            onChange({ ...config, url: e.target.value });
          }}
          placeholder="https://api.example.com/events"
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Server-Sent Events stream URL
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Event Types to Listen For</label>
        <input
          type="text"
          value={eventTypes}
          onChange={(e) => {
            setEventTypes(e.target.value);
            onChange({ ...config, eventTypes: e.target.value });
          }}
          placeholder="message, update, notification (comma-separated or leave empty for all)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Specific event types to listen for. Leave empty to receive all events.
        </p>
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
          <option value="none">None</option>
          <option value="bearerToken">Bearer Token</option>
          <option value="apiKey">API Key Header</option>
          <option value="basicAuth">Basic Auth</option>
        </select>
      </div>

      {authentication !== 'none' && (
        <div>
          <label className="block text-sm font-medium mb-2">
            {authentication === 'apiKey' ? 'API Key' : authentication === 'bearerToken' ? 'Bearer Token' : 'Credentials'}
          </label>
          <input
            type="password"
            value={authValue}
            onChange={(e) => {
              setAuthValue(e.target.value);
              onChange({ ...config, authValue: e.target.value });
            }}
            placeholder={authentication === 'basicAuth' ? 'username:password' : 'Enter token or key'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Custom Headers (JSON)</label>
        <textarea
          value={headers}
          onChange={(e) => {
            setHeaders(e.target.value);
            onChange({ ...config, headers: e.target.value });
          }}
          rows={3}
          placeholder='{"X-Custom-Header": "value", "Accept": "text/event-stream"}'
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Note: "Accept: text/event-stream" is added automatically
        </p>
      </div>

      <div className="space-y-3 pt-2">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={parseJSON}
            onChange={(e) => {
              setParseJSON(e.target.checked);
              onChange({ ...config, parseJSON: e.target.checked });
            }}
            className="mr-2"
          />
          <span className="text-sm font-medium">Auto-parse JSON Data</span>
        </label>
        <p className="text-xs text-gray-500 ml-6">
          Automatically parse event data as JSON if possible
        </p>
      </div>

      <div className="border-t pt-4 mt-4">
        <h3 className="font-medium text-sm mb-3">Connection Settings</h3>

        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={reconnect}
              onChange={(e) => {
                setReconnect(e.target.checked);
                onChange({ ...config, reconnect: e.target.checked });
              }}
              className="mr-2"
            />
            <span className="text-sm font-medium">Auto-Reconnect on Disconnect</span>
          </label>

          {reconnect && (
            <>
              <div className="ml-6 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Reconnect Delay (ms)</label>
                  <input
                    type="number"
                    value={reconnectDelay}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1000;
                      setReconnectDelay(value);
                      onChange({ ...config, reconnectDelay: value });
                    }}
                    min={100}
                    step={100}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Max Attempts</label>
                  <input
                    type="number"
                    value={maxReconnectAttempts}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 5;
                      setMaxReconnectAttempts(value);
                      onChange({ ...config, maxReconnectAttempts: value });
                    }}
                    min={1}
                    max={100}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium mb-1">Heartbeat Check Interval (ms)</label>
            <input
              type="number"
              value={heartbeatInterval}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 30000;
                setHeartbeatInterval(value);
                onChange({ ...config, heartbeatInterval: value });
              }}
              min={5000}
              step={1000}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Check connection health every N milliseconds
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>📡 SSE Event Output:</strong></div>
        <ul className="list-disc list-inside space-y-1">
          <li><code className="bg-white px-1 rounded">{'{{ $json.eventType }}'}</code> - Type of SSE event</li>
          <li><code className="bg-white px-1 rounded">{'{{ $json.data }}'}</code> - Event data payload</li>
          <li><code className="bg-white px-1 rounded">{'{{ $json.id }}'}</code> - Event ID (if provided by server)</li>
          <li><code className="bg-white px-1 rounded">{'{{ $json.timestamp }}'}</code> - When event was received</li>
          <li><code className="bg-white px-1 rounded">{'{{ $json.retry }}'}</code> - Server-suggested retry interval</li>
        </ul>
      </div>

      <div className="mt-2 p-3 bg-green-50 rounded text-sm space-y-2">
        <div><strong>💡 Use Cases:</strong></div>
        <ul className="list-disc list-inside space-y-1">
          <li>Real-time stock market updates</li>
          <li>Live sports scores and updates</li>
          <li>Social media feeds and notifications</li>
          <li>IoT sensor data streams</li>
          <li>Live chat and messaging systems</li>
          <li>Server monitoring and log streams</li>
        </ul>
      </div>

      <div className="mt-2 p-3 bg-purple-50 rounded text-sm space-y-2">
        <div><strong>📚 SSE Format Reference:</strong></div>
        <pre className="bg-white p-2 rounded text-xs font-mono overflow-x-auto">
{`event: update
data: {"status": "active", "count": 42}
id: msg-123
retry: 10000`}
        </pre>
        <p className="text-xs">
          Server sends events in this format. This trigger parses and processes them automatically.
        </p>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm">
        <div><strong>🔌 Connection:</strong> The SSE connection remains open while the workflow is active. Connection is closed when workflow is deactivated.</div>
      </div>
    </div>
  );
};

export default SSETriggerConfig;
