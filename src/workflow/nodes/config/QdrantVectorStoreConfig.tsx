/**
 * Qdrant Vector Store Node Configuration
 * Qdrant high-performance vector similarity search engine
 * Vector Store / LangChain Integration
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface QdrantVectorStoreConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const QdrantVectorStoreConfig: React.FC<QdrantVectorStoreConfigProps> = ({ config, onChange }) => {
  const [url, setUrl] = useState((config.url as string) || 'http://localhost:6333');
  const [apiKey, setApiKey] = useState((config.apiKey as string) || '');
  const [collectionName, setCollectionName] = useState((config.collectionName as string) || 'documents');
  const [operation, setOperation] = useState((config.operation as string) || 'upsert');
  const [vectorSize, setVectorSize] = useState((config.vectorSize as number) || 1536);
  const [distance, setDistance] = useState((config.distance as string) || 'Cosine');
  const [limit, setLimit] = useState((config.limit as number) || 10);
  const [scoreThreshold, setScoreThreshold] = useState((config.scoreThreshold as number) || 0.7);
  const [withPayload, setWithPayload] = useState((config.withPayload as boolean) ?? true);
  const [withVector, setWithVector] = useState((config.withVector as boolean) ?? false);

  return (
    <div className="qdrant-config space-y-4">
      <div className="font-semibold text-lg mb-4">Qdrant Vector Store</div>

      <div className="p-3 bg-blue-50 rounded text-sm mb-4">
        <strong>🔗 Connection</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Qdrant URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            onChange({ ...config, url: e.target.value });
          }}
          placeholder="http://localhost:6333"
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
        />
        <p className="text-xs text-gray-500 mt-1">Qdrant server URL</p>
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
        <p className="text-xs text-gray-500 mt-1">Required for Qdrant Cloud</p>
      </div>

      <div className="p-3 bg-green-50 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Configuration</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Collection Name</label>
        <input
          type="text"
          value={collectionName}
          onChange={(e) => {
            setCollectionName(e.target.value);
            onChange({ ...config, collectionName: e.target.value });
          }}
          placeholder="documents"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">Name of the collection to use</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Vector Size</label>
        <input
          type="number"
          min="1"
          max="4096"
          value={vectorSize}
          onChange={(e) => {
            const value = parseInt(e.target.value);
            setVectorSize(value);
            onChange({ ...config, vectorSize: value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">Dimension of vectors (e.g., 1536 for OpenAI)</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Distance Metric</label>
        <select
          value={distance}
          onChange={(e) => {
            setDistance(e.target.value);
            onChange({ ...config, distance: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="Cosine">Cosine</option>
          <option value="Euclid">Euclidean</option>
          <option value="Dot">Dot Product</option>
        </select>
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
          <option value="upsert">Upsert Points</option>
          <option value="search">Search Vectors</option>
          <option value="retrieve">Retrieve by ID</option>
          <option value="delete">Delete Points</option>
          <option value="scroll">Scroll Points</option>
          <option value="count">Count Points</option>
          <option value="createCollection">Create Collection</option>
          <option value="deleteCollection">Delete Collection</option>
        </select>
      </div>

      {operation === 'search' && (
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
            <label className="block text-sm font-medium mb-2">Score Threshold</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={scoreThreshold}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                setScoreThreshold(value);
                onChange({ ...config, scoreThreshold: value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum similarity score (0-1)</p>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={withPayload}
                onChange={(e) => {
                  setWithPayload(e.target.checked);
                  onChange({ ...config, withPayload: e.target.checked });
                }}
                className="rounded"
              />
              <span className="text-sm">Include Payload</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={withVector}
                onChange={(e) => {
                  setWithVector(e.target.checked);
                  onChange({ ...config, withVector: e.target.checked });
                }}
                className="rounded"
              />
              <span className="text-sm">Include Vector</span>
            </label>
          </div>
        </>
      )}

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> Qdrant is a high-performance vector similarity search engine.
        Optimized for large-scale production deployments with filtering and payload support.
      </div>
    </div>
  );
};
