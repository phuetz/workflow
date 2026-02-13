/**
 * MongoDB Node Configuration
 * NoSQL document database
 */

import React, { useState } from 'react';

interface MongoDBConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const MongoDBConfig: React.FC<MongoDBConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'insertOne');
  const [database, setDatabase] = useState(config.database as string || '');
  const [collection, setCollection] = useState(config.collection as string || '');
  const [document, setDocument] = useState(config.document as string || '{}');
  const [filter, setFilter] = useState(config.filter as string || '{}');
  const [update, setUpdate] = useState(config.update as string || '{}');
  const [options, setOptions] = useState(config.options as string || '{}');

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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
        >
          <option value="insertOne">Insert One</option>
          <option value="insertMany">Insert Many</option>
          <option value="findOne">Find One</option>
          <option value="find">Find Many</option>
          <option value="updateOne">Update One</option>
          <option value="updateMany">Update Many</option>
          <option value="deleteOne">Delete One</option>
          <option value="deleteMany">Delete Many</option>
          <option value="aggregate">Aggregate</option>
          <option value="countDocuments">Count Documents</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Database <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={database}
          onChange={(e) => {
            setDatabase(e.target.value);
            handleChange({ database: e.target.value });
          }}
          placeholder="myDatabase"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Collection <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={collection}
          onChange={(e) => {
            setCollection(e.target.value);
            handleChange({ collection: e.target.value });
          }}
          placeholder="users"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
        />
      </div>

      {(operation === 'insertOne' || operation === 'insertMany') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Document(s) (JSON) <span className="text-red-500">*</span>
          </label>
          <textarea
            value={document}
            onChange={(e) => {
              setDocument(e.target.value);
              handleChange({ document: e.target.value });
            }}
            placeholder={operation === 'insertMany'
              ? '[{"name": "John", "age": 30}, {"name": "Jane", "age": 25}]'
              : '{"name": "John Doe", "email": "john@example.com", "age": 30}'
            }
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            {operation === 'insertMany' ? 'Array of documents' : 'Single document'} to insert. Can use expression: {`{{ $json.data }}`}
          </p>
        </div>
      )}

      {(operation === 'findOne' || operation === 'find' || operation === 'updateOne' || operation === 'updateMany' || operation === 'deleteOne' || operation === 'deleteMany' || operation === 'countDocuments') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter (JSON) <span className="text-red-500">*</span>
          </label>
          <textarea
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              handleChange({ filter: e.target.value });
            }}
            placeholder='{"age": {"$gte": 18}, "status": "active"}'
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            MongoDB query filter. Empty {`{}`} matches all documents.
          </p>
        </div>
      )}

      {(operation === 'updateOne' || operation === 'updateMany') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Update (JSON) <span className="text-red-500">*</span>
          </label>
          <textarea
            value={update}
            onChange={(e) => {
              setUpdate(e.target.value);
              handleChange({ update: e.target.value });
            }}
            placeholder='{"$set": {"status": "inactive"}, "$inc": {"loginCount": 1}}'
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Update operations using MongoDB update operators ($set, $inc, etc.)
          </p>
        </div>
      )}

      {operation === 'aggregate' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pipeline (JSON Array) <span className="text-red-500">*</span>
          </label>
          <textarea
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              handleChange({ filter: e.target.value });
            }}
            placeholder='[{"$match": {"status": "active"}}, {"$group": {"_id": "$category", "count": {"$sum": 1}}}]'
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Aggregation pipeline stages ($match, $group, $project, etc.)
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Options (JSON)
        </label>
        <textarea
          value={options}
          onChange={(e) => {
            setOptions(e.target.value);
            handleChange({ options: e.target.value });
          }}
          placeholder='{"limit": 10, "sort": {"createdAt": -1}, "projection": {"password": 0}}'
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Query options: limit, sort, projection, upsert, etc.
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-md p-3">
        <p className="text-sm text-green-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-green-700">
          Requires MongoDB connection string (mongodb://... or mongodb+srv://...). Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Features</p>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Flexible JSON document storage</li>
          <li>• Powerful aggregation framework</li>
          <li>• Horizontal scalability with sharding</li>
          <li>• Rich query language with operators</li>
          <li>• ACID transactions (replica sets)</li>
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <div className="text-xs text-gray-600 space-y-1">
          <div><strong>Database:</strong> MongoDB</div>
          <div><strong>Max Document Size:</strong> 16 MB</div>
          <div><strong>Documentation:</strong> docs.mongodb.com</div>
        </div>
      </div>
    </div>
  );
};
