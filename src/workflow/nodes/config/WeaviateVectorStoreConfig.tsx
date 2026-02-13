/**
 * Weaviate Vector Store Node Configuration
 * Weaviate cloud-native vector database with GraphQL API
 * Vector Store / LangChain Integration
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface WeaviateVectorStoreConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const WeaviateVectorStoreConfig: React.FC<WeaviateVectorStoreConfigProps> = ({ config, onChange }) => {
  const [url, setUrl] = useState((config.url as string) || 'http://localhost:8080');
  const [apiKey, setApiKey] = useState((config.apiKey as string) || '');
  const [className, setClassName] = useState((config.className as string) || 'Document');
  const [operation, setOperation] = useState((config.operation as string) || 'add');
  const [limit, setLimit] = useState((config.limit as number) || 10);
  const [certainty, setCertainty] = useState((config.certainty as number) || 0.7);
  const [includeVector, setIncludeVector] = useState((config.includeVector as boolean) ?? false);
  const [autoschema, setAutoschema] = useState((config.autoschema as boolean) ?? true);

  return (
    <div className="weaviate-config space-y-4">
      <div className="font-semibold text-lg mb-4">Weaviate Vector Store</div>

      <div className="p-3 bg-blue-50 rounded text-sm mb-4">
        <strong>🔐 Authentication</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Weaviate URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            onChange({ ...config, url: e.target.value });
          }}
          placeholder="http://localhost:8080"
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
        />
        <p className="text-xs text-gray-500 mt-1">Weaviate instance URL</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">API Key (Optional)</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            onChange({ ...config, apiKey: e.target.value });
          }}
          placeholder="Optional for authentication"
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
        />
        <p className="text-xs text-gray-500 mt-1">Required for Weaviate Cloud Services</p>
      </div>

      <div className="p-3 bg-green-50 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Configuration</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Class Name</label>
        <input
          type="text"
          value={className}
          onChange={(e) => {
            setClassName(e.target.value);
            onChange({ ...config, className: e.target.value });
          }}
          placeholder="Document"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">Weaviate class (schema) name</p>
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
          <option value="add">Add Objects</option>
          <option value="query">Semantic Search</option>
          <option value="get">Get by ID</option>
          <option value="update">Update Objects</option>
          <option value="delete">Delete Objects</option>
          <option value="hybrid">Hybrid Search (Vector + Keyword)</option>
          <option value="aggregate">Aggregate Query</option>
        </select>
      </div>

      {(operation === 'query' || operation === 'hybrid') && (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">Result Limit</label>
            <input
              type="number"
              min="1"
              max="100"
              value={limit}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setLimit(value);
                onChange({ ...config, limit: value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Certainty Threshold</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={certainty}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                setCertainty(value);
                onChange({ ...config, certainty: value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum certainty (0-1, higher = more certain)</p>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includeVector}
                onChange={(e) => {
                  setIncludeVector(e.target.checked);
                  onChange({ ...config, includeVector: e.target.checked });
                }}
                className="rounded"
              />
              <span className="text-sm">Include Vector</span>
            </label>
          </div>
        </>
      )}

      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={autoschema}
            onChange={(e) => {
              setAutoschema(e.target.checked);
              onChange({ ...config, autoschema: e.target.checked });
            }}
            className="rounded"
          />
          <span className="text-sm">Auto-create Schema</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">Automatically create class if it doesn't exist</p>
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> Weaviate is a cloud-native vector database with GraphQL API.
        Supports semantic search, hybrid search, and auto-schema creation.
      </div>
    </div>
  );
};
