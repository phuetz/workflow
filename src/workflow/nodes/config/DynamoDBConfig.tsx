/**
 * AWS DynamoDB Node Configuration
 * NoSQL database service
 */

import React, { useState } from 'react';

interface DynamoDBConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const DynamoDBConfig: React.FC<DynamoDBConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'putItem');
  const [tableName, setTableName] = useState(config.tableName as string || '');
  const [key, setKey] = useState(config.key as string || '{}');
  const [item, setItem] = useState(config.item as string || '{}');
  const [conditionExpression, setConditionExpression] = useState(config.conditionExpression as string || '');
  const [consistentRead, setConsistentRead] = useState(config.consistentRead as boolean || false);

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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
        >
          <option value="putItem">Put Item</option>
          <option value="getItem">Get Item</option>
          <option value="updateItem">Update Item</option>
          <option value="deleteItem">Delete Item</option>
          <option value="query">Query</option>
          <option value="scan">Scan</option>
          <option value="batchGetItem">Batch Get Items</option>
          <option value="batchWriteItem">Batch Write Items</option>
          <option value="createTable">Create Table</option>
          <option value="deleteTable">Delete Table</option>
          <option value="describeTable">Describe Table</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Table Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={tableName}
          onChange={(e) => {
            setTableName(e.target.value);
            handleChange({ tableName: e.target.value });
          }}
          placeholder="my-table"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          DynamoDB table name. Can use expression: {`{{ $json.tableName }}`}
        </p>
      </div>

      {(operation === 'getItem' || operation === 'deleteItem' || operation === 'updateItem') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Key (JSON) <span className="text-red-500">*</span>
          </label>
          <textarea
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              handleChange({ key: e.target.value });
            }}
            placeholder='{"id": {"S": "123"}}'
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Primary key in DynamoDB format. Types: S (string), N (number), B (binary)
          </p>
        </div>
      )}

      {operation === 'putItem' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item (JSON) <span className="text-red-500">*</span>
          </label>
          <textarea
            value={item}
            onChange={(e) => {
              setItem(e.target.value);
              handleChange({ item: e.target.value });
            }}
            placeholder='{"id": {"S": "123"}, "name": {"S": "John"}, "age": {"N": "30"}}'
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Complete item in DynamoDB format with type descriptors
          </p>
        </div>
      )}

      {(operation === 'getItem' || operation === 'query' || operation === 'scan') && (
        <div className="flex items-center">
          <input
            type="checkbox"
            id="consistentRead"
            checked={consistentRead}
            onChange={(e) => {
              setConsistentRead(e.target.checked);
              handleChange({ consistentRead: e.target.checked });
            }}
            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
          />
          <label htmlFor="consistentRead" className="ml-2 block text-sm text-gray-700">
            Consistent Read
          </label>
          <div className="ml-2 text-xs text-gray-500">
            (uses more throughput, provides latest data)
          </div>
        </div>
      )}

      {(operation === 'putItem' || operation === 'updateItem' || operation === 'deleteItem') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Condition Expression (Optional)
          </label>
          <input
            type="text"
            value={conditionExpression}
            onChange={(e) => {
              setConditionExpression(e.target.value);
              handleChange({ conditionExpression: e.target.value });
            }}
            placeholder="attribute_exists(id) AND #status = :status"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Conditional operation expression (for optimistic locking, etc.)
          </p>
        </div>
      )}

      {(operation === 'query' || operation === 'scan') && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="text-sm text-yellow-900 font-medium mb-1">Performance Note</p>
          <p className="text-xs text-yellow-700">
            <strong>Query:</strong> Fast, requires partition key. Use for known keys.<br />
            <strong>Scan:</strong> Slow, reads entire table. Use sparingly, consider pagination.
          </p>
        </div>
      )}

      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <p className="text-sm text-orange-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-orange-700">
          Requires AWS Access Key ID, Secret Access Key, and region. Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Features</p>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Single-digit millisecond latency</li>
          <li>• Automatic scaling and partitioning</li>
          <li>• ACID transactions support</li>
          <li>• Global tables for multi-region</li>
          <li>• Point-in-time recovery</li>
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Service:</strong> Amazon DynamoDB</div>
          <div><strong>Max Item Size:</strong> 400 KB</div>
          <div><strong>Documentation:</strong> docs.aws.amazon.com/dynamodb</div>
        </p>
      </div>
    </div>
  );
};
