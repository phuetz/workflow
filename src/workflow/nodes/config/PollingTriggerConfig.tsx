/**
 * Polling Trigger Node Configuration
 * Periodically poll an endpoint or data source
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface PollingTriggerConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const PollingTriggerConfig: React.FC<PollingTriggerConfigProps> = ({ config, onChange }) => {
  const [url, setUrl] = useState((config.url as string) || '');
  const [method, setMethod] = useState((config.method as string) || 'GET');
  const [interval, setInterval] = useState((config.interval as number) || 60);
  const [intervalUnit, setIntervalUnit] = useState((config.intervalUnit as string) || 'seconds');
  const [authentication, setAuthentication] = useState((config.authentication as string) || 'none');
  const [authValue, setAuthValue] = useState((config.authValue as string) || '');
  const [headers, setHeaders] = useState((config.headers as string) || '');
  const [dataPath, setDataPath] = useState((config.dataPath as string) || '');
  const [deduplication, setDeduplication] = useState((config.deduplication as boolean) ?? true);
  const [deduplicationKey, setDeduplicationKey] = useState((config.deduplicationKey as string) || 'id');
  const [onlyNewData, setOnlyNewData] = useState((config.onlyNewData as boolean) ?? true);

  const getIntervalInSeconds = () => {
    const multipliers: Record<string, number> = {
      seconds: 1,
      minutes: 60,
      hours: 3600,
      days: 86400,
    };
    return interval * (multipliers[intervalUnit] || 1);
  };

  return (
    <div className="polling-trigger-config space-y-4">
      <div className="font-semibold text-lg mb-4">Polling Trigger</div>

      <div>
        <label className="block text-sm font-medium mb-2">Poll URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            onChange({ ...config, url: e.target.value });
          }}
          placeholder="https://api.example.com/data"
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          API endpoint or data source to poll
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">HTTP Method</label>
        <div className="grid grid-cols-3 gap-2">
          {['GET', 'POST', 'PUT'].map((m) => (
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
        <label className="block text-sm font-medium mb-2">Polling Interval</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={interval}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 1;
              setInterval(value);
              onChange({ ...config, interval: value });
            }}
            min={1}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
          <select
            value={intervalUnit}
            onChange={(e) => {
              setIntervalUnit(e.target.value);
              onChange({ ...config, intervalUnit: e.target.value });
            }}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="seconds">Seconds</option>
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Poll every {interval} {intervalUnit} ({getIntervalInSeconds()} seconds)
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
          <option value="apiKey">API Key Header</option>
          <option value="bearerToken">Bearer Token</option>
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
          placeholder='{"X-Custom-Header": "value", "Accept": "application/json"}'
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Data Extraction Path</label>
        <input
          type="text"
          value={dataPath}
          onChange={(e) => {
            setDataPath(e.target.value);
            onChange({ ...config, dataPath: e.target.value });
          }}
          placeholder="data.items or leave empty for root"
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          JSON path to extract data from response (e.g., "data.items", "results")
        </p>
      </div>

      <div className="space-y-3 pt-2">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={onlyNewData}
            onChange={(e) => {
              setOnlyNewData(e.target.checked);
              onChange({ ...config, onlyNewData: e.target.checked });
            }}
            className="mr-2"
          />
          <span className="text-sm font-medium">Only Trigger on New Data</span>
        </label>
        <p className="text-xs text-gray-500 ml-6">
          Skip execution if response is identical to previous poll
        </p>
      </div>

      <div className="space-y-3">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={deduplication}
            onChange={(e) => {
              setDeduplication(e.target.checked);
              onChange({ ...config, deduplication: e.target.checked });
            }}
            className="mr-2"
          />
          <span className="text-sm font-medium">Enable Deduplication</span>
        </label>
        {deduplication && (
          <div className="ml-6">
            <label className="block text-xs font-medium mb-1">Deduplication Key</label>
            <input
              type="text"
              value={deduplicationKey}
              onChange={(e) => {
                setDeduplicationKey(e.target.value);
                onChange({ ...config, deduplicationKey: e.target.value });
              }}
              placeholder="id, uuid, etc."
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Field to use for identifying unique items
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>🔄 Polling Output:</strong></div>
        <ul className="list-disc list-inside space-y-1">
          <li><code className="bg-white px-1 rounded">{'{{ $json }}'}</code> - Polled data (array or object)</li>
          <li><code className="bg-white px-1 rounded">{'{{ $json.pollTimestamp }}'}</code> - When data was fetched</li>
          <li><code className="bg-white px-1 rounded">{'{{ $json.isNewData }}'}</code> - Whether data changed since last poll</li>
        </ul>
      </div>

      <div className="mt-2 p-3 bg-green-50 rounded text-sm space-y-2">
        <div><strong>💡 Use Cases:</strong></div>
        <ul className="list-disc list-inside space-y-1">
          <li>Monitor RSS feeds or news APIs</li>
          <li>Check for new database records periodically</li>
          <li>Poll third-party APIs without webhooks</li>
          <li>Monitor file storage for new uploads</li>
          <li>Track status changes in external systems</li>
        </ul>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm">
        <div><strong>⚠️ Performance Note:</strong> Be mindful of API rate limits. Avoid polling too frequently unless necessary.</div>
      </div>
    </div>
  );
};

export default PollingTriggerConfig;
