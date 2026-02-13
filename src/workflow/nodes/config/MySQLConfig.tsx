/**
 * MySQL Node Configuration
 * Relational database management system
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface MySQLConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const MySQLConfig: React.FC<MySQLConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'executeQuery');
  const [query, setQuery] = useState(config.query as string || '');
  const [parameters, setParameters] = useState(config.parameters as string || '[]');

  const handleChange = (updates: Partial<NodeConfig>) => {
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
          <option value="executeQuery">Execute Query</option>
          <option value="insert">Insert</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
        </select>
      </div>

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
          placeholder="SELECT * FROM users WHERE status = ? AND created_at > ?"
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          SQL query with placeholders (?). Can use expression: {`{{ $json.query }}`}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Parameters (JSON Array)
        </label>
        <textarea
          value={parameters}
          onChange={(e) => {
            setParameters(e.target.value);
            handleChange({ parameters: e.target.value });
          }}
          placeholder='["active", "2024-01-01"]'
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Array of parameters to replace placeholders (prevents SQL injection)
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-700">
          Requires MySQL connection details: host, port, username, password, database. Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-sm text-yellow-900 font-medium mb-1">Security Warning</p>
        <p className="text-xs text-yellow-700">
          Always use parameterized queries with placeholders (?) to prevent SQL injection attacks. Never concatenate user input directly into queries.
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-md p-3">
        <p className="text-sm text-green-900 font-medium mb-1">Features</p>
        <ul className="text-xs text-green-700 space-y-1">
          <li>• ACID compliance and transactions</li>
          <li>• Full-text search capabilities</li>
          <li>• Stored procedures and triggers</li>
          <li>• Replication for high availability</li>
          <li>• Partitioning for large datasets</li>
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Database:</strong> MySQL / MariaDB</div>
          <div><strong>Default Port:</strong> 3306</div>
          <div><strong>Documentation:</strong> dev.mysql.com/doc</div>
        </p>
      </div>
    </div>
  );
};
