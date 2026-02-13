/**
 * Elasticsearch Node Configuration
 * Distributed search and analytics engine
 */

import React, { useState } from 'react';

interface ElasticsearchConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const ElasticsearchConfig: React.FC<ElasticsearchConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState((config.operation as string | undefined) || 'search');
  const [index, setIndex] = useState((config.index as string | undefined) || '');
  const [query, setQuery] = useState((config.query as string | undefined) || '{}');
  const [document, setDocument] = useState((config.document as string | undefined) || '{}');
  const [documentId, setDocumentId] = useState((config.documentId as string | undefined) || '');

  const handleChange = (updates: Record<string, unknown>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => {
            setOperation(e.target.value);
            handleChange({ operation: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
        >
          <option value="search">Search</option>
          <option value="index">Index Document</option>
          <option value="get">Get Document</option>
          <option value="update">Update Document</option>
          <option value="delete">Delete Document</option>
          <option value="bulk">Bulk Operation</option>
          <option value="createIndex">Create Index</option>
          <option value="deleteIndex">Delete Index</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Index Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={index}
          onChange={(e) => {
            setIndex(e.target.value);
            handleChange({ index: e.target.value });
          }}
          placeholder="my-index"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Elasticsearch index name (lowercase, no spaces)
        </p>
      </div>

      {(operation === 'get' || operation === 'update' || operation === 'delete') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Document ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={documentId}
            onChange={(e) => {
              setDocumentId(e.target.value);
              handleChange({ documentId: e.target.value });
            }}
            placeholder="doc-123"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
          />
        </div>
      )}

      {operation === 'search' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Query (JSON) <span className="text-red-500">*</span>
          </label>
          <textarea
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              handleChange({ query: e.target.value });
            }}
            placeholder='{"query": {"match": {"title": "search term"}}, "size": 10}'
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Elasticsearch Query DSL. Can use expression: {`{{ $json.query }}`}
          </p>
        </div>
      )}

      {(operation === 'index' || operation === 'update') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Document (JSON) <span className="text-red-500">*</span>
          </label>
          <textarea
            value={document}
            onChange={(e) => {
              setDocument(e.target.value);
              handleChange({ document: e.target.value });
            }}
            placeholder='{"title": "My Document", "content": "Document content...", "tags": ["important"]}'
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Document to index/update. Will be automatically analyzed.
          </p>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-sm text-yellow-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-yellow-700">
          Requires Elasticsearch URL, username, password (if security enabled). Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Features</p>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Full-text search with relevance scoring</li>
          <li>• Distributed and highly available</li>
          <li>• Real-time indexing and search</li>
          <li>• Powerful aggregations and analytics</li>
          <li>• RESTful API with JSON</li>
        </ul>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
        <p className="text-sm text-purple-900 font-medium mb-1">Common Queries</p>
        <div className="text-xs text-purple-700 space-y-1">
          <div><strong>Match:</strong> {`{"query": {"match": {"field": "value"}}}`}</div>
          <div><strong>Bool:</strong> {`{"query": {"bool": {"must": [...], "filter": [...]}}}`}</div>
          <div><strong>Range:</strong> {`{"query": {"range": {"date": {"gte": "2024-01-01"}}}}`}</div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Service:</strong> Elasticsearch</div>
          <div><strong>Default Port:</strong> 9200</div>
          <div><strong>Documentation:</strong> elastic.co/guide</div>
        </p>
      </div>
    </div>
  );
};
