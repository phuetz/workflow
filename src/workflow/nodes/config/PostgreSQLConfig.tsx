/**
 * PostgreSQL Node Configuration
 * PostgreSQL database operations
 * AGENT 9: Node Library Expansion
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface PostgreSQLConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const PostgreSQLConfig: React.FC<PostgreSQLConfigProps> = ({ config, onChange }) => {
  const [host, setHost] = useState((config.host as string) || 'localhost');
  const [port, setPort] = useState((config.port as number) || 5432);
  const [database, setDatabase] = useState((config.database as string) || '');
  const [username, setUsername] = useState((config.username as string) || '');
  const [password, setPassword] = useState((config.password as string) || '');
  const [operation, setOperation] = useState((config.operation as string) || 'query');
  const [query, setQuery] = useState((config.query as string) || '');

  return (
    <div className="postgresql-config space-y-4">
      <div className="font-semibold text-lg mb-4">PostgreSQL</div>

      <div className="p-3 bg-blue-50 rounded text-sm mb-4">
        <strong>🔐 Authentication</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Host</label>
        <input
          type="text"
          value={host}
          onChange={(e) => {
            setHost(e.target.value);
            onChange({ ...config, host: e.target.value });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md "
        />
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Port</label>
        <input
          type="number"
          value={port}
          onChange={(e) => {
            const portValue = parseInt(e.target.value, 10) || 5432;
            setPort(portValue);
            onChange({ ...config, port: portValue });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md "
        />

      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Database</label>
        <input
          type="text"
          value={database}
          onChange={(e) => {
            setDatabase(e.target.value);
            onChange({ ...config, database: e.target.value });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md "
        />
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            onChange({ ...config, username: e.target.value });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md "
        />
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            onChange({ ...config, password: e.target.value });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
        />
        
      </div>


      <div className="p-3 bg-green-50 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Configuration</strong>
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
          <option value="query">Execute Query</option>
          <option value="insert">Insert</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
        </select>
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">SQL Query</label>
        <textarea
          rows={4}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange({ ...config, query: e.target.value });
          }}
          placeholder="SELECT * FROM ..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> PostgreSQL database operations. Configure your credentials above.
      </div>
    </div>
  );
};
