/**
 * Azure CosmosDB Node Configuration
 * Globally distributed NoSQL database
 */

import React, { useState } from 'react';

interface CosmosDBConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const CosmosDBConfig: React.FC<CosmosDBConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'createDocument');
  const [databaseId, setDatabaseId] = useState(config.databaseId as string || '');
  const [containerId, setContainerId] = useState(config.containerId as string || '');
  const [document, setDocument] = useState(config.document as string || '{}');
  const [partitionKey, setPartitionKey] = useState(config.partitionKey as string || '');
  const [query, setQuery] = useState(config.query as string || '');

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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600"
        >
          <option value="createDocument">Create Document</option>
          <option value="readDocument">Read Document</option>
          <option value="updateDocument">Update Document</option>
          <option value="deleteDocument">Delete Document</option>
          <option value="query">Query Documents</option>
          <option value="createContainer">Create Container</option>
          <option value="deleteContainer">Delete Container</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Database ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={databaseId}
          onChange={(e) => {
            setDatabaseId(e.target.value);
            handleChange({ databaseId: e.target.value });
          }}
          placeholder="my-database"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Container ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={containerId}
          onChange={(e) => {
            setContainerId(e.target.value);
            handleChange({ containerId: e.target.value });
          }}
          placeholder="my-container"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600"
        />
      </div>

      {(operation === 'createDocument' || operation === 'updateDocument') && (
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
            placeholder='{"id": "doc1", "name": "Item", "category": "electronics"}'
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            JSON document with required "id" field. Can use expression: {`{{ $json.document }}`}
          </p>
        </div>
      )}

      {(operation === 'createDocument' || operation === 'readDocument' || operation === 'updateDocument' || operation === 'deleteDocument') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Partition Key <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={partitionKey}
            onChange={(e) => {
              setPartitionKey(e.target.value);
              handleChange({ partitionKey: e.target.value });
            }}
            placeholder="electronics"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600"
          />
          <p className="text-xs text-gray-500 mt-1">
            Partition key value for the document (must match container partition key path)
          </p>
        </div>
      )}

      {operation === 'query' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SQL Query <span className="text-red-500">*</span>
          </label>
          <textarea
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              handleChange({ query: e.target.value });
            }}
            placeholder='SELECT * FROM c WHERE c.category = "electronics" AND c.price < 1000'
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            CosmosDB SQL query. Use "c" as container alias.
          </p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-700">
          Requires Azure CosmosDB connection string or endpoint + key. Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
        <p className="text-sm text-purple-900 font-medium mb-1">Features</p>
        <ul className="text-xs text-purple-700 space-y-1">
          <li>• Multi-model: SQL, MongoDB, Cassandra, Gremlin, Table APIs</li>
          <li>• Global distribution with multi-region writes</li>
          <li>• Five consistency levels (Strong to Eventual)</li>
          <li>• Automatic indexing</li>
          <li>• Guaranteed single-digit millisecond latency</li>
        </ul>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-sm text-yellow-900 font-medium mb-1">Performance Note</p>
        <p className="text-xs text-yellow-700">
          Partition key design is critical for performance. Choose a key with high cardinality and even distribution.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Service:</strong> Azure CosmosDB</div>
          <div><strong>Max Document Size:</strong> 2 MB</div>
          <div><strong>Documentation:</strong> docs.microsoft.com/azure/cosmos-db</div>
        </p>
      </div>
    </div>
  );
};
