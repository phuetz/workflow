/**
 * GraphQL Database Node Configuration
 * Dgraph, Hasura, AWS AppSync
 */

import React, { useState } from 'react';

interface GraphQLDatabaseConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const GraphQLDatabaseConfig: React.FC<GraphQLDatabaseConfigProps> = ({ config, onChange }) => {
  const [provider, setProvider] = useState(config.provider as string || 'dgraph');
  const [query, setQuery] = useState(config.query as string || '');
  const [variables, setVariables] = useState(config.variables as string || '{}');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
        <select value={provider} onChange={(e) => { setProvider(e.target.value); onChange({ ...config, provider: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500">
          <option value="dgraph">Dgraph</option>
          <option value="hasura">Hasura</option>
          <option value="appsync">AWS AppSync</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">GraphQL Query/Mutation</label>
        <textarea value={query} onChange={(e) => { setQuery(e.target.value); onChange({ ...config, query: e.target.value }); }}
          placeholder="query { users { id name email } }" rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 font-mono text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Variables (JSON)</label>
        <textarea value={variables} onChange={(e) => { setVariables(e.target.value); onChange({ ...config, variables: e.target.value }); }}
          placeholder='{"id": "123"}' rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 font-mono text-sm" />
      </div>
      <div className="bg-pink-50 border border-pink-200 rounded-md p-3">
        <p className="text-sm text-pink-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-pink-700">Requires GraphQL endpoint URL and authentication token.</p>
      </div>
    </div>
  );
};
