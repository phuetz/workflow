/**
 * Pinecone Vector Store Node Configuration
 * Pinecone serverless vector database for similarity search
 * Vector Store / LangChain Integration
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface PineconeVectorStoreConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const PineconeVectorStoreConfig: React.FC<PineconeVectorStoreConfigProps> = ({ config, onChange }) => {
  const [apiKey, setApiKey] = useState((config.apiKey as string) || '');
  const [environment, setEnvironment] = useState((config.environment as string) || 'us-east1-gcp');
  const [indexName, setIndexName] = useState((config.indexName as string) || '');
  const [namespace, setNamespace] = useState((config.namespace as string) || '');
  const [operation, setOperation] = useState((config.operation as string) || 'upsert');
  const [topK, setTopK] = useState((config.topK as number) || 10);
  const [includeMetadata, setIncludeMetadata] = useState((config.includeMetadata as boolean) ?? true);
  const [includeValues, setIncludeValues] = useState((config.includeValues as boolean) ?? false);

  return (
    <div className="pinecone-config space-y-4">
      <div className="font-semibold text-lg mb-4">Pinecone Vector Store</div>

      <div className="p-3 bg-blue-50 rounded text-sm mb-4">
        <strong>🔐 Authentication</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            onChange({ ...config, apiKey: e.target.value });
          }}
          placeholder="Your Pinecone API key"
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
        />
        <p className="text-xs text-gray-500 mt-1">Get from app.pinecone.io</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Environment</label>
        <select
          value={environment}
          onChange={(e) => {
            setEnvironment(e.target.value);
            onChange({ ...config, environment: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="us-east1-gcp">US East 1 (GCP)</option>
          <option value="us-west1-gcp">US West 1 (GCP)</option>
          <option value="eu-west1-gcp">EU West 1 (GCP)</option>
          <option value="asia-southeast1-gcp">Asia Southeast 1 (GCP)</option>
          <option value="us-east-1-aws">US East 1 (AWS)</option>
          <option value="us-west-2-aws">US West 2 (AWS)</option>
          <option value="eu-west-1-aws">EU West 1 (AWS)</option>
        </select>
      </div>

      <div className="p-3 bg-green-50 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Configuration</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Index Name</label>
        <input
          type="text"
          value={indexName}
          onChange={(e) => {
            setIndexName(e.target.value);
            onChange({ ...config, indexName: e.target.value });
          }}
          placeholder="my-index"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">Name of your Pinecone index</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Namespace (Optional)</label>
        <input
          type="text"
          value={namespace}
          onChange={(e) => {
            setNamespace(e.target.value);
            onChange({ ...config, namespace: e.target.value });
          }}
          placeholder="default"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">Partition within the index</p>
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
          <option value="upsert">Upsert Vectors</option>
          <option value="query">Query Vectors</option>
          <option value="fetch">Fetch by ID</option>
          <option value="delete">Delete Vectors</option>
          <option value="update">Update Metadata</option>
          <option value="describe">Describe Index Stats</option>
        </select>
      </div>

      {operation === 'query' && (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">Top K Results</label>
            <input
              type="number"
              min="1"
              max="100"
              value={topK}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setTopK(value);
                onChange({ ...config, topK: value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Number of results to return (1-100)</p>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => {
                  setIncludeMetadata(e.target.checked);
                  onChange({ ...config, includeMetadata: e.target.checked });
                }}
                className="rounded"
              />
              <span className="text-sm">Include Metadata</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includeValues}
                onChange={(e) => {
                  setIncludeValues(e.target.checked);
                  onChange({ ...config, includeValues: e.target.checked });
                }}
                className="rounded"
              />
              <span className="text-sm">Include Vector Values</span>
            </label>
          </div>
        </>
      )}

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> Pinecone is a serverless vector database for similarity search.
        Supports high-performance vector operations with low latency.
      </div>
    </div>
  );
};
