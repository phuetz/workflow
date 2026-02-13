/**
 * RespondToWebhook Node Configuration
 * Sends a response back to the webhook caller
 */

import React from 'react';

interface RespondToWebhookConfigProps {
  config: {
    respondWith?: 'firstIncomingItem' | 'lastIncomingItem' | 'allIncomingItems' | 'noData' | 'customResponse';
    responseCode?: number;
    responseHeaders?: Array<{ name: string; value: string }>;
    responseBody?: string;
    contentType?: string;
  };
  onChange: (config: RespondToWebhookConfigProps['config']) => void;
}

export const RespondToWebhookConfig: React.FC<RespondToWebhookConfigProps> = ({
  config,
  onChange,
}) => {
  const updateConfig = (updates: Partial<RespondToWebhookConfigProps['config']>) => {
    onChange({ ...config, ...updates });
  };

  const addHeader = () => {
    const headers = config.responseHeaders || [];
    updateConfig({ responseHeaders: [...headers, { name: '', value: '' }] });
  };

  const removeHeader = (index: number) => {
    const headers = [...(config.responseHeaders || [])];
    headers.splice(index, 1);
    updateConfig({ responseHeaders: headers });
  };

  const updateHeader = (index: number, field: 'name' | 'value', value: string) => {
    const headers = [...(config.responseHeaders || [])];
    headers[index] = { ...headers[index], [field]: value };
    updateConfig({ responseHeaders: headers });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Respond With
        </label>
        <select
          value={config.respondWith || 'firstIncomingItem'}
          onChange={(e) => updateConfig({ respondWith: e.target.value as RespondToWebhookConfigProps['config']['respondWith'] })}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="firstIncomingItem">First Incoming Item</option>
          <option value="lastIncomingItem">Last Incoming Item</option>
          <option value="allIncomingItems">All Incoming Items</option>
          <option value="noData">No Data</option>
          <option value="customResponse">Custom Response</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Response Code
        </label>
        <input
          type="number"
          value={config.responseCode || 200}
          onChange={(e) => updateConfig({ responseCode: parseInt(e.target.value, 10) })}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          min={100}
          max={599}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Content-Type
        </label>
        <select
          value={config.contentType || 'application/json'}
          onChange={(e) => updateConfig({ contentType: e.target.value })}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="application/json">application/json</option>
          <option value="text/plain">text/plain</option>
          <option value="text/html">text/html</option>
          <option value="application/xml">application/xml</option>
        </select>
      </div>

      {config.respondWith === 'customResponse' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Response Body
          </label>
          <textarea
            value={config.responseBody || ''}
            onChange={(e) => updateConfig({ responseBody: e.target.value })}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            rows={6}
            placeholder='{"message": "Success"}'
          />
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Response Headers
          </label>
          <button
            onClick={addHeader}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + Add Header
          </button>
        </div>
        <div className="space-y-2">
          {(config.responseHeaders || []).map((header, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={header.name}
                onChange={(e) => updateHeader(index, 'name', e.target.value)}
                placeholder="Header name"
                className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={header.value}
                onChange={(e) => updateHeader(index, 'value', e.target.value)}
                placeholder="Header value"
                className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => removeHeader(index)}
                className="px-3 py-2 text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RespondToWebhookConfig;
